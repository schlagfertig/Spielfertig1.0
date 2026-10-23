import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { C, sb, SETS, encodeShare, fmtDuration } from "./core";
import { songDuration } from "./chart";
import { Btn, Field, SealLine, Spinner, useIsNarrow, useSwipeBack, ToolTile } from "./ui";
import { SongRowMove } from "./songRow";
import { exportPDF } from "./songPdf";
import { GigMode } from "./gigMode";
import { parseSetlistText, matchParsedSongs } from "./playlistImport";
import { useViewPrefs, ViewPrefBar } from "./viewPrefs";

const REGULAR_SETS = SETS.filter(s => s !== "Zugaben");

function PlaylistEditor({ playlist, allSongs, playlistSongs, onBack, onRefresh, bandName, bandId, canEdit, show, theme, toggleTheme, startInGig, onWideEditor }) {
  useSwipeBack(onBack);
  const [activeSet, setActiveSet] = useState("Set 1");
  const [search, setSearch]       = useState("");
  const [poolSearch, setPoolSearch] = useState("");
  const narrow = useIsNarrow();
  const desktop = !useIsNarrow(1023);
  const [poolOpen, setPoolOpen]   = useState(() => typeof window === "undefined" || window.innerWidth > 720);
  const [addSet, setAddSet]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [gigMode, setGigMode]     = useState(!!startInGig);
  const [orderEdit, setOrderEdit] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPrefs, togglePrintPref] = useViewPrefs();
  const [dragId, setDragId]       = useState(null);
  const [over, setOver]           = useState(null);
  const [ghost, setGhost]         = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importClear, setImportClear] = useState(true);
  const dragRef = useRef(null);
  const [picked, setPicked] = useState([]);

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
  const setDurations = SETS.reduce((a,s)=>{
    const list = mySongs.filter(ps=>ps.set_name===s).map(hydrate);
    a[s] = list.reduce((sum, x) => sum + songDuration(x), 0);
    a[s+"_missing"] = list.filter(x=>!songDuration(x)).length;
    return a;
  },{});
  const lastRegular = [...REGULAR_SETS].reverse().find(s => (setCounts[s]||0) > 0) || "Set 1";
  const encoreSongs = (songsBySet["Zugaben"] || []).map(s => ({...s, isEncore: true}));
  const gigActive = activeSet === "Zugaben" ? lastRegular : activeSet;
  const songsInSet = gigActive === lastRegular ? [...(songsBySet[gigActive] || []), ...encoreSongs] : (songsBySet[gigActive] || []);
  const usedIds = new Set(mySongs.map(ps=>ps.song_id));
  const pq = poolSearch.toLowerCase();
  const available = bandSongs.filter(s=>!usedIds.has(s.id)).filter(s=>!pq || s.title?.toLowerCase().includes(pq) || (s.artist?.toLowerCase()??"").includes(pq)).sort((a,b)=>a.title.localeCompare(b.title));
  const showDrummer = new Set(mySongs.map(s=>{ const song = allSongs.find(x=>x.id===s.song_id); return song?.drummer; }).filter(Boolean)).size>1;
  const parsedImport = useMemo(() => parseSetlistText(importText), [importText]);
  const matchedImport = useMemo(() => matchParsedSongs(parsedImport, bandSongs), [parsedImport, bandSongs]);
  const importHits = matchedImport.filter(r => r.song);
  const importMiss = matchedImport.filter(r => !r.song);

  const togglePick = (song) => {
    if (!song || saving) return;
    setPicked(list => list.some(s => s.id === song.id) ? list.filter(s => s.id !== song.id) : [...list, song]);
  };
  const addManyToSet = async (songs, setName) => {
    const batch = (songs || []).filter(s => s && !usedIds.has(s.id));
    if (!batch.length || saving) return;
    setSaving(true);
    let pos = mySongs.filter(ps=>ps.set_name===setName&&ps.playlist_id===playlist.id).length;
    const seen = new Set();
    for (const song of batch) {
      if (seen.has(song.id)) continue;
      seen.add(song.id);
      pos += 1;
      await sb.insert("playlist_songs", { playlist_id:playlist.id, song_id:song.id, set_name:setName, position:pos });
    }
    setPicked([]);
    await onRefresh();
    setSaving(false);
    if (show) show(seen.size + " Songs in " + setName);
  };
  const addToSet = async (song, setName, toPos) => {
    if (!song || saving) return;
    setSaving(true);
    const items = mySongs.filter(ps=>ps.set_name===setName&&ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    const pos = Math.max(1, Math.min(toPos || items.length+1, items.length+1));
    await sb.insert("playlist_songs", { playlist_id:playlist.id, song_id:song.id, set_name:setName, position:pos });
    for (let i=0;i<items.length;i++) {
      const newPos = i+1 >= pos ? i+2 : i+1;
      if (items[i].position !== newPos) await sb.update("playlist_songs",{position:newPos},"id=eq."+items[i].id);
    }
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
  const runImport = async () => {
    if (!importHits.length || saving) return;
    setSaving(true);
    if (importClear) { for (const ps of mySongs) await sb.delete("playlist_songs", "id=eq."+ps.id); }
    const counts = {};
    SETS.forEach(s => { counts[s] = importClear ? 0 : mySongs.filter(ps=>ps.set_name===s).length; });
    const already = new Set(importClear ? [] : mySongs.map(ps=>ps.song_id));
    for (const row of importHits) {
      if (already.has(row.song.id)) continue;
      counts[row.set] = (counts[row.set] || 0) + 1;
      await sb.insert("playlist_songs", { playlist_id: playlist.id, song_id: row.song.id, set_name: row.set, position: counts[row.set] });
      already.add(row.song.id);
    }
    await onRefresh(); setSaving(false); setImportOpen(false); show(importHits.length + " Songs importiert");
  };

  const dragged = dragRef.current;
  const draggedTitle = dragged?.song?.title || "";
  const beginDrag = (payload, e) => {
    if (!canEdit || saving || !orderEdit) return;
    dragRef.current = payload;
    setDragId(payload.kind === "pool" ? "pool-"+payload.song.id : payload.song.ps_id);
    if (e?.dataTransfer) { e.dataTransfer.effectAllowed = "copyMove"; e.dataTransfer.setData("text/plain", payload.kind === "pool" ? "pool-"+payload.song.id : String(payload.song.ps_id)); }
  };
  const endDrag = () => { setDragId(null); setOver(null); setGhost(null); dragRef.current = null; };
  const dropAt = (setName, pos) => {
    const payload = dragRef.current; endDrag();
    if (!payload) return;
    if (payload.kind === "pool") addToSet(payload.song, setName, pos);
    else moveSong(payload.song, setName, pos);
  };
  useEffect(() => {
    if (!dragId) return;
    const onUp = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slot = el && el.closest && el.closest("[data-drop]");
      if (slot) { const [setName, pos] = slot.getAttribute("data-drop").split("|"); dropAt(setName, parseInt(pos, 10)); }
      else endDrag();
    };
    const onMove = (e) => {
      setGhost({ x: e.clientX, y: e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slot = el && el.closest && el.closest("[data-drop]");
      if (slot) { const [setName, pos] = slot.getAttribute("data-drop").split("|"); setOver({ set: setName, pos: parseInt(pos, 10) }); }
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("dragend", endDrag);
    return () => { window.removeEventListener("pointerup", onUp); window.removeEventListener("pointermove", onMove); window.removeEventListener("dragend", endDrag); };
  }, [dragId]);

  useLayoutEffect(() => {
    if (!onWideEditor) return undefined;
    onWideEditor(desktop && !gigMode);
    return () => onWideEditor(false);
  }, [desktop, gigMode, onWideEditor]);

  if (gigMode) {
    return <GigMode playlist={playlist} songsInSet={songsInSet} setCounts={setCounts} setDurations={setDurations} activeSet={gigActive} onSetChange={(set)=>{ setActiveSet(set === "Zugaben" ? lastRegular : set); setSearch(""); }} theme={theme} toggleTheme={toggleTheme} onClose={()=>setGigMode(false)} canEdit={canEdit} onRefresh={onRefresh} />;
  }

  const sharePl = async (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    await sb.update("playlists", { is_shared: true }, "id=eq." + playlist.id);
    const ps = playlistSongs.filter(p => p.playlist_id === playlist.id);
    const ids = new Set(ps.map(p => p.song_id));
    const songs = allSongs.filter(s => ids.has(s.id));
    const packed = encodeShare({ playlist: { ...playlist, is_shared: true }, ps, songs, bandName: bandName || "" });
    const url = window.location.origin + "/?share=" + playlist.id + (packed ? "#d=" + encodeURIComponent(packed) : "");
    if (navigator.clipboard&&navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(()=>show("Link kopiert! An Putzerfische senden 🐟")).catch(()=>show(url,"success"));
    } else { show(url,"success"); }
  };

  const poolSongRow = (song) => (
    <div key={song.id} onClick={()=>{ if (!orderEdit) togglePick(song); }} onPointerDown={orderEdit?(e)=>{ e.preventDefault(); beginDrag({ kind:"pool", song }, e); setGhost({ x:e.clientX, y:e.clientY }); }:undefined} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 8px", background: picked.some(s=>s.id===song.id)?"#161a1d":"#1c2226", borderRadius:4, border:"1px solid "+(dragId==="pool-"+song.id||picked.some(s=>s.id===song.id)?C.teal:"#2f383d"), opacity: dragId==="pool-"+song.id ? .45 : 1, cursor: orderEdit?"grab":"pointer", touchAction: orderEdit?"none":"auto", userSelect:"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
        <div style={{ width:22, height:22, borderRadius:11, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, fontFamily:"'Space Mono',monospace", background: picked.some(s=>s.id===song.id)?C.teal:"#151515", color: picked.some(s=>s.id===song.id)?"#000":C.grayDim }}>{picked.findIndex(s=>s.id===song.id)>=0 ? picked.findIndex(s=>s.id===song.id)+1 : ""}</div>
        <div style={{ minWidth:0 }}><span style={{ color:C.white, fontSize:13 }}>{song.title}</span><span style={{ color:C.grayDim, fontSize:12 }}> · {song.artist}</span></div>
      </div>
      <div onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}><Btn size="sm" onClick={(e)=>{ e.stopPropagation(); addToSet(song, activeSet); }}>＋ {activeSet.replace("Set ","S")}</Btn></div>
    </div>
  );
  const renderPool = (column) => {
    if (!canEdit) return null;
    const open = column || poolOpen;
    const pickedBar = picked.length>0 && (
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:8, padding:"8px", background:"#161a1d", border:"1px solid "+C.tealBorder, borderRadius:6 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase" }}>{picked.length} gewählt · Tipp-Reihenfolge</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          {picked.map((s,i)=>(
            <button key={s.id} type="button" onClick={()=>togglePick(s)} style={{ background:"#1c2226", border:"1px solid "+C.tealBorder, color:C.white, borderRadius:4, padding:"3px 7px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{i+1}. {s.title}</button>
          ))}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, alignItems:"center" }}>
          {SETS.map(set=>(
            <Btn key={set} size="sm" disabled={saving} onClick={()=>addManyToSet(picked, set)}>→ {set.replace("Set ","S")}</Btn>
          ))}
          <Btn variant="ghost" size="sm" onClick={()=>setPicked([])}>Leeren</Btn>
        </div>
      </div>
    );
    const head = (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom: open?8:0 }}>
        <div style={{ color:C.teal, fontSize:12, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase" }}>Songpool <span style={{ color:C.grayDim, fontWeight:600, letterSpacing:0 }}>({available.length} frei)</span></div>
        {!column && <Btn variant="outline" size="sm" onClick={()=>setPoolOpen(o=>!o)}>{poolOpen?"Einklappen":"Aufklappen"}</Btn>}
      </div>
    );
    const tools = (
      <>
        <Field value={poolSearch} onChange={setPoolSearch} placeholder="Pool durchsuchen…"/>
        <div style={{ color:C.grayDim, fontSize:11, margin:"6px 0 8px" }}>{orderEdit ? "Ziehen und auf ein Set legen — oder antippen zum Sammeln." : "Tippe Songs an — Reihenfolge wie du tippst. Dann ein Set wählen."}</div>
        {pickedBar}
      </>
    );
    const list = available.length===0
      ? <div style={{ color:C.grayDim, fontSize:12, padding: column ? "4px 12px 12px" : "8px 0" }}>Keine freien Songs{pq?" für diese Suche":" — alle sind schon in der Playlist"}.</div>
      : <div style={column
          ? { display:"flex", flexDirection:"column", gap:4, padding:"0 12px 12px" }
          : { display:"flex", flexDirection:"column", gap:4, maxHeight:220, overflowY:"auto" }}>{available.map(poolSongRow)}</div>;
    if (!column) {
      return (
        <div style={{ background:C.bgCard, border:"1px solid #2f383d", borderRadius:6, padding:12 }}>
          {head}
          {open && (<>{tools}{list}</>)}
        </div>
      );
    }
    return (
      <div style={{ background:C.bgCard, border:"1px solid #2f383d", borderRadius:6, position:"sticky", top:"calc(var(--sf-head, 96px) + 8px)", width:"clamp(250px, 24vw, 340px)", flex:"0 0 clamp(250px, 24vw, 340px)", maxHeight:"calc(100vh - var(--sf-head, 96px) - 16px)", overflowY:"auto", alignSelf:"flex-start", zIndex:3 }}>
        <div style={{ position:"sticky", top:0, zIndex:2, background:C.bgCard, padding:"12px 12px 4px" }}>
          {head}
          {tools}
        </div>
        {list}
      </div>
    );
  };
  const renderSet = (set, column) => {
    const list = songsBySet[set] || [];
    const isOverSet = over && over.set === set;
    return (
      <div key={set} id={"set-block-"+set.replace(/\s+/g,"-")} style={{ background:C.bgCard, border:"1px solid "+(isOverSet?C.teal:(column && activeSet===set?C.tealBorder:"#2f383d")), borderRadius:6, padding:12, transition:"border-color .15s", ...(column ? { minWidth:0 } : null) }}>
        <div data-drop={set+"|"+(list.length+1)} onDragOver={e=>{ e.preventDefault(); setOver({ set, pos: list.length+1 }); }} onDrop={e=>{ e.preventDefault(); dropAt(set, list.length+1); }} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, paddingBottom:8, borderBottom:"2px solid "+C.tealBorder, ...(column ? { flexWrap:"wrap", gap:6, position:"sticky", top:"calc(var(--sf-head, 96px) + 8px)", background:C.bgCard, zIndex:2 } : null) }}>
          <div style={{ color:C.teal, fontSize:13, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", ...(column ? { minWidth:0 } : null) }}>{set} <span style={{ color:C.grayDim, fontWeight:600, letterSpacing:0, fontSize:11 }}>· {list.length} Songs{setDurations[set] ? " · "+fmtDuration(setDurations[set])+(setDurations[set+"_missing"] ? "+" : "") : ""}</span></div>
          {canEdit&&<Btn variant="outline" size="sm" onClick={()=>setAddSet(addSet===set?null:set)} style={column?{flexShrink:0}:{}}>{addSet===set?"✕ Schließen":"+ Liste"}</Btn>}
        </div>
        {addSet===set&&(
          <div style={{ marginBottom:12, background:"#080808", border:"1px solid #2f383d", borderRadius:4, padding:10 }}>
            {available.length===0 ? <div style={{ color:C.grayDim, fontSize:12 }}>Keine freien Songs.</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:180, overflowY:"auto" }}>
                {available.map(song=>(
                  <div key={song.id} onClick={()=>togglePick(song)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", background: picked.some(s=>s.id===song.id)?"#161a1d":"#1c2226", border:"1px solid "+(picked.some(s=>s.id===song.id)?C.teal:"transparent"), borderRadius:3, cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                      <div style={{ width:20, textAlign:"center", color:C.teal, fontSize:11, fontWeight:800, fontFamily:"'Space Mono',monospace" }}>{picked.findIndex(s=>s.id===song.id)>=0 ? picked.findIndex(s=>s.id===song.id)+1 : ""}</div>
                      <div><span style={{ color:C.white, fontSize:13 }}>{song.title}</span><span style={{ color:C.grayDim, fontSize:12 }}> · {song.artist}</span></div>
                    </div>
                    <div onClick={e=>e.stopPropagation()}><Btn size="sm" onClick={()=>addToSet(song, set)} disabled={saving}>+</Btn></div>
                  </div>
                ))}
                {picked.length>0 && (
                  <div style={{ display:"flex", gap:6, marginTop:8 }}>
                    <Btn size="sm" disabled={saving} onClick={()=>addManyToSet(picked, set)}>{picked.length} in {set} übernehmen</Btn>
                    <Btn variant="ghost" size="sm" onClick={()=>setPicked([])}>Leeren</Btn>
                  </div>
                )}
              </div>}
          </div>
        )}
        {list.length===0 ? (
          <div data-drop={set+"|1"} onDragOver={e=>{ e.preventDefault(); setOver({ set, pos: 1 }); }} onDrop={e=>{ e.preventDefault(); dropAt(set, 1); }} style={{ textAlign:"center", color:isOverSet?C.teal:C.grayDim, padding:22, fontSize:13, border:"1px dashed "+(isOverSet?C.teal:"#222"), borderRadius:4 }}>{dragId ? "Hier ablegen" : "Leeres Set — aus dem Pool herziehen"}</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {list.map((song) => {
              const dropPos = song.position;
              const isOverHere = isOverSet && over.pos === dropPos && dragId !== song.ps_id;
              return (
                <div key={song.ps_id} data-drop={set+"|"+dropPos} style={column ? { minWidth:0 } : undefined}>
                  {isOverHere && <div style={{ height:3, background:C.teal, borderRadius:2, margin:"0 8px 4px" }}/>}
                  <SongRowMove song={song} mySongs={mySongs} playlist={playlist} showDrummer={showDrummer} canEdit={canEdit} onDelete={canEdit?(()=>removeFromSet(song)):undefined} onRefresh={onRefresh} setSaving={setSaving} saving={saving} draggable={canEdit && orderEdit} isDragging={dragId===song.ps_id} dropActive={isOverHere} onDragStart={(e)=>beginDrag({ kind:"set", song }, e)} onDragOver={(e)=>{ e.preventDefault(); setOver({ set, pos: dropPos }); }} onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); dropAt(set, dropPos); }} onGripPointerDown={orderEdit?(e)=>{ e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); beginDrag({ kind:"set", song }, e); setGhost({ x:e.clientX, y:e.clientY }); }:undefined} columns={column} />
                </div>
              );
            })}
            {isOverSet && over.pos === list.length+1 && dragId && (<div style={{ height:3, background:C.teal, borderRadius:2, margin:"4px 8px 0" }}/>)}
          </div>
        )}
      </div>
    );
  };
  const setChipBar = (
    <div style={{ background:"#161a1d", border:"1px solid "+C.tealBorder, borderRadius:6, padding:"8px 10px", display:"flex", gap:5, flexWrap: desktop ? "wrap" : "nowrap", alignItems:"center", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
      <div style={{ color:C.teal, fontSize:9, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", flexShrink:0 }}>Sets</div>
      {SETS.map(set=>(
        <button key={set} onClick={()=>{ if (!desktop) { const el = document.getElementById("set-block-"+set.replace(/\s+/g,"-")); if (el) el.scrollIntoView({ behavior:"smooth", block:"start" }); } setActiveSet(set); }} style={{ background:activeSet===set?C.teal:"transparent", color:activeSet===set?"#000":C.gray, border:"1px solid "+(activeSet===set?C.teal:"#222"), borderRadius:3, padding:"5px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
          {set} <span style={{ opacity:.7 }}>({setCounts[set]}{setDurations[set] ? " · "+fmtDuration(setDurations[set]) : ""})</span>
        </button>
      ))}
    </div>
  );

  return (
    <div data-editor-layout={desktop ? "desktop" : "mobile"} style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0, overflowX: desktop ? "visible" : "hidden" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
          <Btn variant="ghost" size="sm" onClick={onBack} style={{ padding:"6px 8px", flexShrink:0 }}>{narrow ? "←" : "← Zurück"}</Btn>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:C.white, fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{playlist.name}</div>
            <div style={{ color:C.grayDim, fontSize:11 }}>{mySongs.length} Songs{orderEdit ? " · Reihenfolge an" : ""}</div>
          </div>
          {saving&&<Spinner/>}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {canEdit && <ToolTile icon="↕" label={orderEdit ? "Fertig" : "Folge"} active={orderEdit} onClick={()=>setOrderEdit(o=>!o)}/>}
          {canEdit && <ToolTile icon="📥" label="Import" onClick={()=>setImportOpen(true)}/>}
          <ToolTile icon="🖨" label="PDF" onClick={()=>setPrintOpen(true)}/>
          <ToolTile icon="🔗" label="Teilen" onClick={sharePl}/>
          <ToolTile icon="🎸" label="Gig" primary onClick={()=>setGigMode(true)}/>
        </div>
      </div>
      <SealLine/>
      {desktop ? (
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, minWidth:0 }}>
          {renderPool(true)}
          <div style={{ flex:"1 1 auto", minWidth:0, display:"flex", flexDirection:"column", gap:10 }}>
            {setChipBar}
            <Field value={search} onChange={setSearch} placeholder="In der Playlist suchen…"/>
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${SETS.length}, minmax(0, 1fr))`, gap:10, alignItems:"start", minWidth:0 }}>
              {SETS.map((set) => renderSet(set, true))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {setChipBar}
          <Field value={search} onChange={setSearch} placeholder="In der Playlist suchen…"/>
          {renderPool(false)}
          {SETS.map((set) => renderSet(set, false))}
        </>
      )}
      {ghost && draggedTitle && (<div style={{ position:"fixed", left: ghost.x+12, top: ghost.y+12, pointerEvents:"none", zIndex:400, background:"#1c2226", border:"1px solid "+C.teal, borderRadius:6, padding:"6px 10px", color:C.white, fontSize:13, fontWeight:600, boxShadow:"0 8px 24px rgba(0,0,0,.6)" }}>{draggedTitle}</div>)}
      {printOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.bgCard, border:"1px solid "+C.grayDim, borderRadius:8, padding:22, maxWidth:440, width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ color:C.teal, fontWeight:700, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" }}>Setlist drucken</span>
              <Btn variant="ghost" size="sm" onClick={()=>setPrintOpen(false)}>✕</Btn>
            </div>
            <div style={{ color:C.grayDim, fontSize:12, marginBottom:12 }}>Punkte abwählen = größere Schrift für die Boden-Setlist. Drummer-Farben gibt es auf dem Ausdruck nicht.</div>
            <ViewPrefBar prefs={printPrefs} toggle={togglePrintPref} />
            <div style={{ height:14 }}/><Btn full onClick={()=>{ exportPDF(playlist, allSongs, playlistSongs, bandName, printPrefs); setPrintOpen(false); }}>Drucken</Btn>
          </div>
        </div>
      )}
      {importOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.bgCard, border:"1px solid "+C.grayDim, borderRadius:8, padding:22, maxWidth:640, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ color:C.teal, fontWeight:700, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" }}>Setlist importieren</span>
              <Btn variant="ghost" size="sm" onClick={()=>setImportOpen(false)}>✕</Btn>
            </div>
            <div style={{ color:C.grayDim, fontSize:12, marginBottom:10 }}>Text einfügen. SET 1 / SET 2 / SET 3 / ZUGABEN werden erkannt.</div>
            <Field rows={10} value={importText} onChange={setImportText} placeholder={"SET 1\n1. Titel – Artist"}/>
            <label style={{ display:"flex", alignItems:"center", gap:8, margin:"10px 0", color:C.gray, fontSize:12 }}><input type="checkbox" checked={importClear} onChange={e=>setImportClear(e.target.checked)} />Bestehende Songs vorher leeren</label>
            {matchedImport.length>0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ color:C.teal, fontSize:11, fontWeight:700, marginBottom:6 }}>{importHits.length} erkannt · {importMiss.length} ohne Treffer</div>
                <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
                  {matchedImport.map((row, i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:12, padding:"4px 6px", background:"#080808", borderRadius:3 }}>
                      <span style={{ color:C.grayDim, minWidth:64 }}>{row.set}</span>
                      <span style={{ flex:1, color: row.song ? C.white : C.red }}>{row.title}</span>
                      <span style={{ color: row.song ? C.teal : C.red }}>{row.song ? "→ "+row.song.title : "nicht gefunden"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Btn full disabled={!importHits.length||saving} onClick={runImport}>{saving ? "Importiere…" : (importHits.length + " Songs übernehmen")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export { PlaylistEditor };
