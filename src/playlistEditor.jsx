import { useState, useMemo, useEffect, useRef } from "react";
import { C, sb, SETS } from "./core";
import { Btn, Field, SealLine, Spinner } from "./ui";
import { SongRowMove } from "./songRow";
import { exportPDF } from "./songPdf";
import { GigMode } from "./gigMode";

const REGULAR_SETS = SETS.filter(s => s !== "Zugaben");

function PlaylistEditor({ playlist, allSongs, playlistSongs, onBack, onRefresh, bandName, bandId, canEdit, show, theme, toggleTheme }) {
  const [activeSet, setActiveSet] = useState("Set 1");
  const [search, setSearch]       = useState("");
  const [addSet, setAddSet]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [gigMode, setGigMode]     = useState(false);
  const [printNotes, setPrintNotes] = useState(true);
  const [dragId, setDragId]       = useState(null);
  const [over, setOver]           = useState(null);
  const [ghost, setGhost]         = useState(null);
  const dragRef = useRef(null);

  const mySongs  = playlistSongs.filter(ps=>ps.playlist_id===playlist.id);
  const bandSongs= allSongs.filter(s=>s.band_id===bandId);

  const hydrate = (ps) => ({...ps,...(allSongs.find(s=>s.id===ps.song_id)||{}), ps_id:ps.id, set_name:ps.set_name, position:ps.position});

  const q = search.toLowerCase();
  const match = (s) => !q || s.title?.toLowerCase().includes(q) || (s.artist?.toLowerCase()??"").includes(q);

  const songsBySet = useMemo(()=>{
    const map = {};
    SETS.forEach(set => {
      map[set] = mySongs.filter(ps=>ps.set_name===set).map(hydrate).filter(match).sort((a,b)=>a.position-b.position);
    });
    return map;
  }, [mySongs, search, allSongs]);

  const setCounts = SETS.reduce((a,s)=>{a[s]=mySongs.filter(ps=>ps.set_name===s).length;return a;},{});
  const lastRegular = [...REGULAR_SETS].reverse().find(s => (setCounts[s]||0) > 0) || "Set 1";
  const encoreSongs = (songsBySet["Zugaben"] || []).map(s => ({...s, isEncore: true}));

  const gigActive = activeSet === "Zugaben" ? lastRegular : activeSet;
  const songsInSet = gigActive === lastRegular
    ? [...(songsBySet[gigActive] || []), ...encoreSongs]
    : (songsBySet[gigActive] || []);

  const usedIds = new Set(mySongs.map(ps=>ps.song_id));
  const available = bandSongs.filter(s=>!usedIds.has(s.id));
  const showDrummer = new Set(mySongs.map(s=>{
    const song = allSongs.find(x=>x.id===s.song_id);
    return song?.drummer;
  }).filter(Boolean)).size>1;

  const addToSet = async (song, setName) => {
    setSaving(true);
    const pos = mySongs.filter(ps=>ps.set_name===setName&&ps.playlist_id===playlist.id).length+1;
    await sb.insert("playlist_songs", { playlist_id:playlist.id, song_id:song.id, set_name:setName, position:pos });
    await onRefresh(); setSaving(false);
  };

  const removeFromSet = async (song) => {
    setSaving(true);
    const psId = song.ps_id;
    await sb.delete("playlist_songs", "id=eq."+psId);
    const remaining = mySongs.filter(x=>x.set_name===song.set_name&&x.playlist_id===playlist.id&&x.id!==psId).sort((a,b)=>a.position-b.position);
    for (let i=0;i<remaining.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+remaining[i].id);
    await onRefresh(); setSaving(false);
  };

  const moveSong = async (song, toSet, toPos) => {
    if (!song || saving) return;
    const psId = song.ps_id;
    const fromSet = song.set_name;
    if (fromSet === toSet && song.position === toPos) return;
    setSaving(true);
    const itemsOf = (set) => mySongs.filter(ps=>ps.set_name===set && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    if (fromSet === toSet) {
      const items = itemsOf(fromSet);
      const others = items.filter(ps=>ps.id!==psId);
      const clamped = Math.max(1, Math.min(toPos, items.length));
      const self = items.find(ps=>ps.id===psId);
      others.splice(clamped-1, 0, self);
      for (let i=0;i<others.length;i++) {
        if (others[i].position !== i+1) await sb.update("playlist_songs",{position:i+1},"id=eq."+others[i].id);
      }
    } else {
      const oldOthers = itemsOf(fromSet).filter(ps=>ps.id!==psId);
      for (let i=0;i<oldOthers.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+oldOthers[i].id);
      const targetItems = itemsOf(toSet);
      const clamped = Math.max(1, Math.min(toPos, targetItems.length+1));
      const ids = targetItems.map(x=>x.id);
      ids.splice(clamped-1, 0, psId);
      for (let i=0;i<ids.length;i++) await sb.update("playlist_songs",{set_name:toSet,position:i+1},"id=eq."+ids[i]);
    }
    await onRefresh(); setSaving(false);
  };

  const draggedSong = dragId ? mySongs.map(hydrate).find(s=>s.ps_id===dragId) : null;

  const beginDrag = (song, e) => {
    if (!canEdit || saving) return;
    setDragId(song.ps_id);
    dragRef.current = song;
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(song.ps_id));
    }
  };

  const endDrag = () => {
    setDragId(null);
    setOver(null);
    setGhost(null);
    dragRef.current = null;
  };

  const dropAt = (setName, pos) => {
    const song = dragRef.current || draggedSong;
    endDrag();
    if (song) moveSong(song, setName, pos);
  };

  useEffect(() => {
    if (!dragId) return;
    const onUp = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slot = el && el.closest && el.closest("[data-drop]");
      if (slot) {
        const [setName, pos] = slot.getAttribute("data-drop").split("|");
        dropAt(setName, parseInt(pos, 10));
      } else {
        endDrag();
      }
    };
    const onMove = (e) => {
      setGhost({ x: e.clientX, y: e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slot = el && el.closest && el.closest("[data-drop]");
      if (slot) {
        const [setName, pos] = slot.getAttribute("data-drop").split("|");
        setOver({ set: setName, pos: parseInt(pos, 10) });
      }
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("dragend", endDrag);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("dragend", endDrag);
    };
  }, [dragId]);

  if (gigMode) {
    return (
      <GigMode
        playlist={playlist}
        songsInSet={songsInSet}
        setCounts={setCounts}
        activeSet={gigActive}
        onSetChange={(set)=>{ setActiveSet(set === "Zugaben" ? lastRegular : set); setSearch(""); }}
        theme={theme}
        toggleTheme={toggleTheme}
        onClose={()=>setGigMode(false)}
      />
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Zurück</Btn>
        <div style={{ flex:1 }}>
          <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{playlist.name}</div>
          <div style={{ color:C.grayDim, fontSize:11 }}>{mySongs.length} Songs gesamt · zum Planen ziehen</div>
        </div>
        <div style={{display:"flex",gap:3,alignItems:"center"}}>
          <Btn variant="outline" size="sm" onClick={()=>exportPDF(playlist,allSongs,playlistSongs,bandName,printNotes)}>🖨 PDF</Btn>
          <button onClick={()=>setPrintNotes(!printNotes)} title={printNotes?"Notizen werden gedruckt":"Notizen nicht drucken"} style={{background:printNotes?C.tealDim:"transparent",border:"1px solid "+(printNotes?C.tealBorder:"#333"),color:printNotes?C.teal:C.grayDim,borderRadius:4,padding:"5px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700,transition:"all .15s"}}>📝</button>
        </div>
        <Btn variant="outline" size="sm" onClick={async(e)=>{
          if (e) { e.stopPropagation(); e.preventDefault(); }
          await sb.update("playlists", { is_shared: true }, "id=eq." + playlist.id);
          const url = window.location.origin + "/?share=" + playlist.id;
          if (navigator.clipboard&&navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(()=>show("Link kopiert! An Putzerfische senden 🐟")).catch(()=>show(url,"success"));
          } else { show(url,"success"); }
        }}>🔗 Teilen</Btn>
        <Btn variant="primary" size="sm" onClick={()=>setGigMode(true)}>🎸 Gig</Btn>
        {saving&&<Spinner/>}
      </div>
      <SealLine/>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {SETS.map(set=>(
          <button key={set} onClick={()=>{
            const el = document.getElementById("set-block-"+set.replace(/\s+/g,"-"));
            if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
            setActiveSet(set);
          }} style={{ background:activeSet===set?C.teal:"transparent", color:activeSet===set?"#000":C.gray, border:"1px solid "+(activeSet===set?C.teal:"#222"), borderRadius:3, padding:"5px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>
            {set} <span style={{ opacity:.7 }}>({setCounts[set]})</span>
          </button>
        ))}
      </div>
      <Field value={search} onChange={setSearch} placeholder="In der Playlist suchen…"/>

      {SETS.map((set, si) => {
        const list = songsBySet[set] || [];
        const isOverSet = over && over.set === set;
        return (
          <div key={set} id={"set-block-"+set.replace(/\s+/g,"-")} style={{
            background:C.bgCard,
            border:"1px solid "+(isOverSet?C.teal:"#1a1a1a"),
            borderRadius:6,
            padding:12,
            transition:"border-color .15s"
          }}>
            <div
              data-drop={set+"|"+(list.length+1)}
              onDragOver={e=>{ e.preventDefault(); setOver({ set, pos: list.length+1 }); }}
              onDrop={e=>{ e.preventDefault(); dropAt(set, list.length+1); }}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, paddingBottom:8, borderBottom:"2px solid "+C.tealBorder }}
            >
              <div style={{ color:C.teal, fontSize:13, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase" }}>
                {set} <span style={{ color:C.grayDim, fontWeight:600, letterSpacing:0, fontSize:11 }}>· {list.length} Songs</span>
              </div>
              {canEdit&&<Btn variant="outline" size="sm" onClick={()=>setAddSet(addSet===set?null:set)}>{addSet===set?"✕ Schließen":"+ Hinzufügen"}</Btn>}
            </div>

            {addSet===set&&(
              <div style={{ marginBottom:12, background:"#080808", border:"1px solid #1a1a1a", borderRadius:4, padding:10 }}>
                {available.length===0
                  ? <div style={{ color:C.grayDim, fontSize:12 }}>Alle Songs der Band sind schon in dieser Playlist.</div>
                  : <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:180, overflowY:"auto" }}>
                      {available.map(song=>(
                        <div key={song.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", background:"#0d0d0d", borderRadius:3 }}>
                          <div><span style={{ color:C.white, fontSize:13 }}>{song.title}</span><span style={{ color:C.grayDim, fontSize:12 }}> · {song.artist}</span></div>
                          <Btn size="sm" onClick={()=>addToSet(song, set)} disabled={saving}>+</Btn>
                        </div>
                      ))}
                    </div>}
              </div>
            )}

            {list.length===0 ? (
              <div
                data-drop={set+"|1"}
                onDragOver={e=>{ e.preventDefault(); setOver({ set, pos: 1 }); }}
                onDrop={e=>{ e.preventDefault(); dropAt(set, 1); }}
                style={{ textAlign:"center", color:isOverSet?C.teal:C.grayDim, padding:22, fontSize:13, border:"1px dashed "+(isOverSet?C.teal:"#222"), borderRadius:4 }}
              >{dragId ? "Hier ablegen" : "Leeres Set — Song herziehen oder hinzufügen"}</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {list.map((song) => {
                  const dropPos = song.position;
                  const isOverHere = isOverSet && over.pos === dropPos && dragId !== song.ps_id;
                  return (
                    <div key={song.ps_id} data-drop={set+"|"+dropPos}>
                      {isOverHere && <div style={{ height:3, background:C.teal, borderRadius:2, margin:"0 8px 4px" }}/>}
                      <SongRowMove
                        song={song} mySongs={mySongs} playlist={playlist} showDrummer={showDrummer} canEdit={canEdit}
                        onDelete={canEdit?(()=>removeFromSet(song)):undefined} onRefresh={onRefresh} setSaving={setSaving} saving={saving}
                        draggable={canEdit}
                        isDragging={dragId===song.ps_id}
                        dropActive={isOverHere}
                        onDragStart={(e)=>beginDrag(song, e)}
                        onDragOver={(e)=>{ e.preventDefault(); setOver({ set, pos: dropPos }); }}
                        onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); dropAt(set, dropPos); }}
                        onGripPointerDown={(e)=>{ e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); beginDrag(song, e); setGhost({ x:e.clientX, y:e.clientY }); }}
                      />
                    </div>
                  );
                })}
                {isOverSet && over.pos === list.length+1 && dragId && (
                  <div style={{ height:3, background:C.teal, borderRadius:2, margin:"4px 8px 0" }}/>
                )}
              </div>
            )}
            {si < SETS.length-1 && <div style={{ height:1, background:"transparent" }}/>}
          </div>
        );
      })}

      {ghost && draggedSong && (
        <div style={{
          position:"fixed", left: ghost.x+12, top: ghost.y+12, pointerEvents:"none", zIndex:400,
          background:"#111", border:"1px solid "+C.teal, borderRadius:6, padding:"6px 10px",
          color:C.white, fontSize:13, fontWeight:600, boxShadow:"0 8px 24px rgba(0,0,0,.6)"
        }}>{draggedSong.title}</div>
      )}
    </div>
  );
}

export { PlaylistEditor };
