import { useState } from "react";
import { C, sb, SETS } from "./core";
import { Btn, Field, Sel, Modal, Confirm, Spinner } from "./ui";
import { SongRow } from "./songRow";

function SongDatabase({ band, songs, gigs, playlists, playlistSongs, allBands, canEdit, onRefresh, show }) {
  const [search, setSearch]   = useState("");
  const [form, setForm]       = useState({ title:"", artist:"", bpm:"", drummer:band.drummers[0]||"Tom", specialties:"" });
  const [editSong, setEdit]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [copyTarget, setCopyTarget] = useState("");
  const [showCopy, setShowCopy]     = useState(false);
  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const [addTarget, setAddTarget] = useState(null);
  const [atGig,    setAtGig]    = useState("");
  const [atPl,     setAtPl]     = useState("");
  const [atSet,    setAtSet]    = useState("Set 1");
  const [atSaving, setAtSaving] = useState(false);
  const [sortBy, setSortBy] = useState("none");
  const bandSongs = songs.filter(s=>s.band_id===band.id);
  const filtered = bandSongs
    .filter(s=>s.title.toLowerCase().includes(search.toLowerCase())||(s.artist?.toLowerCase()??"").includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sortBy==="title") return a.title.localeCompare(b.title);
      if(sortBy==="artist") return (a.artist||"").localeCompare(b.artist||"");
      return 0;
    });

  const handleAdd = async () => {
    if (!form.title||!form.artist||!form.bpm) return;
    setSaving(true);
    await sb.insert("songs", { band_id:band.id, title:form.title, artist:form.artist, bpm:parseInt(form.bpm), drummer:form.drummer, specialties:form.specialties });
    setForm({ title:"", artist:"", bpm:"", drummer:band.drummers[0]||"Tom", specialties:"" });
    await onRefresh(); show("Song hinzugefügt!"); setSaving(false);
  };
  const handleDelete = async (song) => {
    await sb.delete("songs", "id=eq."+song.id);
    await onRefresh(); show("Song gelöscht."); setConfirm(null);
  };
  const handleUpdate = async () => {
    await sb.update("songs", { title:editSong.title, artist:editSong.artist, bpm:parseInt(editSong.bpm), drummer:editSong.drummer, specialties:editSong.specialties, lyrics:editSong.lyrics||null }, "id=eq."+editSong.id);
    await onRefresh(); show("Song gespeichert!"); setEdit(null);
  };
  const handleBulkDelete = async () => {
    setBulkSaving(true);
    for (const id of selected) { await sb.delete("songs", "id=eq." + id); }
    await onRefresh();
    show(selected.length + " Songs gelöscht.");
    setSelected([]); setSelectMode(false); setBulkConfirm(false); setBulkSaving(false);
  };
  const handleBulkCopy = async () => {
    if (!copyTarget) return;
    setBulkSaving(true);
    const targetId = parseInt(copyTarget);
    const toCopy = bandSongs.filter(s=>selected.includes(s.id));
    for (const s of toCopy) {
      await sb.insert("songs", { band_id: targetId, title: s.title, artist: s.artist, bpm: s.bpm, drummer: s.drummer, specialties: s.specialties || null });
    }
    await onRefresh();
    show(toCopy.length + " Songs kopiert.");
    setSelected([]); setSelectMode(false); setShowCopy(false); setCopyTarget(""); setBulkSaving(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
      <div style={{ display:"flex", gap:8 }}>
        {band.drummers.map(d=>(
          <div key={d} style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:4, padding:"8px 12px", textAlign:"center" }}>
            <div style={{ color:d==="Ron"?C.red:C.teal, fontSize:20, fontWeight:800, fontFamily:"'Space Mono',monospace" }}>{bandSongs.filter(s=>s.drummer===d).length}</div>
            <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase" }}>{d}</div>
          </div>
        ))}
        <div style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:4, padding:"8px 12px", textAlign:"center" }}>
          <div style={{ color:C.gray, fontSize:20, fontWeight:800, fontFamily:"'Space Mono',monospace" }}>{bandSongs.length}</div>
          <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase" }}>Songs</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <Btn variant={selectMode?"primary":"outline"} size="sm" onClick={(e)=>{if(e){e.stopPropagation();e.preventDefault();}setSelectMode(m=>!m);setSelected([]);}}>
          {selectMode ? "✕ Auswahl beenden" : "☑ Auswählen"}
        </Btn>
        {selectMode && (
          <>
            <Btn variant="ghost" size="sm" onClick={(e)=>{if(e){e.stopPropagation();}setSelected(filtered.map(s=>s.id));}}>Alle</Btn>
            <Btn variant="ghost" size="sm" onClick={(e)=>{if(e){e.stopPropagation();}setSelected([]);}}>Keine</Btn>
            <span style={{ color:C.gray, fontSize:12, marginLeft:"auto" }}>{selected.length} gewählt</span>
            <Btn variant="outline" size="sm" disabled={!selected.length} onClick={(e)=>{if(e){e.stopPropagation();}setShowCopy(true);}}>⎘ In Band</Btn>
            <Btn variant="danger" size="sm" disabled={!selected.length} onClick={(e)=>{if(e){e.stopPropagation();}setBulkConfirm(true);}}>🗑 Löschen</Btn>
          </>
        )}
      </div>
      <Field value={search} onChange={setSearch} placeholder="Suchen…"/>
      <div style={{display:"flex",gap:6}}>
        {[{k:"none",l:"Standard"},{k:"title",l:"A–Z Titel"},{k:"artist",l:"A–Z Interpret"}].map(({k,l})=>(
          <button key={k} onClick={()=>setSortBy(k)} style={{
            flex:1, background:sortBy===k?C.teal:"transparent",
            color:sortBy===k?"#000":C.gray,
            border:"1px solid "+(sortBy===k?C.teal:"#222"),
            borderRadius:4, padding:"5px 0", fontSize:11, fontWeight:700,
            letterSpacing:"0.06em", textTransform:"uppercase",
            cursor:"pointer", fontFamily:"inherit"
          }}>{l}</button>
        ))}
      </div>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:15 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neuer Song</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          <Field value={form.title}  onChange={v=>setForm(f=>({...f,title:v}))}  placeholder="Titel *"/>
          <Field value={form.artist} onChange={v=>setForm(f=>({...f,artist:v}))} placeholder="Artist *"/>
          <Field value={form.bpm}    onChange={v=>setForm(f=>({...f,bpm:v}))}    placeholder="BPM *" type="number"/>
          <Sel   value={form.drummer} onChange={v=>setForm(f=>({...f,drummer:v}))} options={band.drummers}/>
        </div>
        <div style={{ marginBottom:8 }}>
          <div style={{ color:C.grayDim, fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Notizen</div>
          <Field value={form.specialties} onChange={v=>setForm(f=>({...f,specialties:v}))} placeholder={"z.B. Count-In\nBD auf 1\nSchluss: Keys"} rows={3}/>
        </div>
        <Btn full disabled={!form.title||!form.artist||!form.bpm||saving} onClick={handleAdd}>{saving?<Spinner/>:"Song hinzufügen"}</Btn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {filtered.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:32, fontSize:13 }}>Keine Songs</div>
        :filtered.map(song=>(
          <div key={song.id} style={{position:"relative", display:"flex", alignItems:"stretch", gap:8}}>
            {selectMode && (
              <button onClick={(e)=>{e.stopPropagation();toggleSel(song.id);}}
                style={{ flexShrink:0, width:38, borderRadius:4, cursor:"pointer",
                  background: selected.includes(song.id) ? C.tealDim : "#0a0a0a",
                  border: "1px solid " + (selected.includes(song.id) ? C.tealBorder : "#222"),
                  color: selected.includes(song.id) ? C.teal : C.grayDim, fontSize:18 }}>
                {selected.includes(song.id) ? "✓" : ""}
              </button>
            )}
            <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <SongRow song={song} showDrummer={(band.drummers||[]).length>1}
              onDelete={canEdit?(s=>setConfirm(s)):undefined}
              onEdit={canEdit?(s=>setEdit({...s,bpm:String(s.bpm)})):undefined}
              extra={canEdit?(<button onClick={e=>{e.stopPropagation();setAddTarget(song);setAtGig("");setAtPl("");setAtSet("Set 1");}}
                style={{background:"transparent",border:"none",color:C.grayDim,cursor:"pointer",padding:"6px 10px",fontSize:16}}
                title="Zur Setlist hinzufügen"
                onMouseEnter={e=>e.currentTarget.style.color=C.teal}
                onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>➡️</button>):undefined}/>
            {addTarget?.id===song.id&&(
              <div style={{background:"#1a1a1a",border:"1px solid "+C.tealBorder,borderRadius:8,padding:14,marginTop:4,display:"flex",flexDirection:"column",gap:8,zIndex:10}}>
                <div style={{color:C.teal,fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Zur Setlist hinzufügen</div>
                <select value={atGig} onChange={e=>{setAtGig(e.target.value);setAtPl("");}}
                  style={{background:"#0a0a0a",border:"1px solid #333",color:C.white,borderRadius:4,padding:"7px 8px",fontSize:12,fontFamily:"inherit"}}>
                  <option value="">— Gig wählen —</option>
                  {(gigs||[]).filter(g=>g.band_id===band.id).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {atGig&&<select value={atPl} onChange={e=>setAtPl(e.target.value)}
                  style={{background:"#0a0a0a",border:"1px solid #333",color:C.white,borderRadius:4,padding:"7px 8px",fontSize:12,fontFamily:"inherit"}}>
                  <option value="">— Playlist wählen —</option>
                  {(playlists||[]).filter(p=>p.gig_id===parseInt(atGig)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>}
                {atPl&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {SETS.map(s=><button key={s} onClick={()=>setAtSet(s)} style={{
                    background:atSet===s?C.teal:"transparent",color:atSet===s?"#000":C.gray,
                    border:"1px solid "+(atSet===s?C.teal:"#333"),borderRadius:4,
                    padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"
                  }}>{s}</button>)}
                </div>}
                <div style={{display:"flex",gap:6}}>
                  <Btn variant="ghost" size="sm" onClick={()=>setAddTarget(null)}>Abbrechen</Btn>
                  {atPl&&<Btn size="sm" disabled={atSaving} onClick={async()=>{
                    setAtSaving(true);
                    const plId=parseInt(atPl);
                    const already=(playlistSongs||[]).some(ps=>ps.playlist_id===plId&&ps.song_id===song.id);
                    if(already){ show("Song ist bereits in dieser Playlist!","error"); setAtSaving(false); return; }
                    const pos=(playlistSongs||[]).filter(ps=>ps.playlist_id===plId&&ps.set_name===atSet).length+1;
                    await sb.insert("playlist_songs",{playlist_id:plId,song_id:song.id,set_name:atSet,position:pos});
                    await onRefresh(); show("Song hinzugefügt ✓"); setAddTarget(null); setAtSaving(false);
                  }}>Hinzufügen ✓</Btn>}
                </div>
              </div>
            )}
            </div>
          </div>
        ))}
      </div>
      {editSong&&<Modal title="Song bearbeiten" onClose={()=>setEdit(null)}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Field value={editSong.title}       onChange={v=>setEdit(s=>({...s,title:v}))}       placeholder="Titel"/>
          <Field value={editSong.artist}      onChange={v=>setEdit(s=>({...s,artist:v}))}      placeholder="Artist"/>
          <Field value={editSong.bpm}         onChange={v=>setEdit(s=>({...s,bpm:v}))}         placeholder="BPM" type="number"/>
          <Sel   value={editSong.drummer}     onChange={v=>setEdit(s=>({...s,drummer:v}))}     options={band.drummers}/>
          <div>
            <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Notizen</div>
            <Field value={editSong.specialties||""} onChange={v=>setEdit(s=>({...s,specialties:v}))} placeholder={"z.B. Count-In\nBD auf 1\nSchluss: Keys"} rows={5}/>
          </div>
          <div>
            <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Lyrics</div>
            <Field value={editSong.lyrics||""} onChange={v=>setEdit(s=>({...s,lyrics:v}))} placeholder="Songtext hier einfügen…" rows={8}/>
          </div>
          <Btn full onClick={handleUpdate}>Speichern</Btn>
        </div>
      </Modal>}
      {confirm&&<Confirm msg={`„${confirm.title}" wirklich löschen?`} onOk={()=>handleDelete(confirm)} onCancel={()=>setConfirm(null)}/>}
      {bulkConfirm&&<Confirm msg={selected.length+" Songs wirklich löschen? Das kann nicht rückgängig gemacht werden."} onOk={handleBulkDelete} onCancel={()=>setBulkConfirm(false)}/>}
      {showCopy&&<Modal title={selected.length+" Songs in andere Band kopieren"} onClose={()=>{setShowCopy(false);setCopyTarget("");}}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ color:C.grayDim, fontSize:12 }}>Die markierten Songs werden als Kopie in der Ziel-Band angelegt. Das Original bleibt erhalten.</div>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Ziel-Band</div>
          <select value={copyTarget} onChange={e=>setCopyTarget(e.target.value)}
            style={{ background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit" }}>
            <option value="">— Band wählen —</option>
            {(allBands||[]).filter(b=>b.id!==band.id).map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
          </select>
          <Btn full disabled={!copyTarget||bulkSaving} onClick={handleBulkCopy}>{bulkSaving?<Spinner/>:"Kopieren ✓"}</Btn>
        </div>
      </Modal>}
    </div>
  );
}

export { SongDatabase };
export { SongRow, SongRowMove } from "./songRow";
export { exportPDF } from "./songPdf";
