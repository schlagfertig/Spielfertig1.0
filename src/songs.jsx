import { useState } from "react";
import { C, sb, SETS, dStyle, getBandLogo, getLogo } from "./core";
import { Btn, Field, Sel, Badge, Modal, Confirm, Spinner } from "./ui";
import { useMetronome } from "./audio";

function SongRow({ song, onDelete, onEdit, pos, draggable, onDragStart, onDrop, isDragging, extra, showDrummer=true }) {
  const st = dStyle(song.drummer);
  const { active, beat, toggle } = useMetronome(song.bpm);
  const [showLyrics, setShowLyrics] = useState(false);
  const pulseColor  = beat?"#fff":active?C.teal:C.grayDim;
  const pulseGlow   = beat?`0 0 10px 4px ${C.teal}`:active?`0 0 4px 1px ${C.tealBorder}`:"none";
  const pulseBorder = active?`1px solid ${beat?"#fff":C.teal}`:"1px solid #2a2a2a";
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div draggable={draggable} onDragStart={onDragStart} onDragOver={e=>e.preventDefault()} onDrop={onDrop}
        style={{ background:isDragging?"#0a0a0a":st.bg, border:`1px solid ${isDragging?C.teal:st.border}`, borderRadius: showLyrics?"6px 6px 0 0":6, padding:"9px 13px", display:"flex", flexDirection:"column", gap:6, opacity:isDragging?.4:1, transition:"background .1s", cursor:draggable?"grab":"default" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {pos!==undefined&&<div style={{ color:C.grayDim, fontSize:11, width:18, textAlign:"right", flexShrink:0, fontFamily:"'Space Mono',monospace" }}>{pos}</div>}
          {draggable&&<div style={{ color:C.grayDim, fontSize:13, flexShrink:0 }}>⠿</div>}
          {song.bpm>0&&(
            <button onClick={toggle} title={`${active?"Stop":"Start"} (${song.bpm} BPM)`}
              style={{ background:"transparent", border:pulseBorder, borderRadius:"50%", width:32, height:32, flexShrink:0, cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:pulseGlow, transition:"border-color .05s,box-shadow .05s" }}>
              <div style={{ width:14, height:14, borderRadius:"50%", background:pulseColor, transition:"background .05s", boxShadow:beat?`0 0 6px 3px ${C.teal}`:"none"}}/>
            </button>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, color:C.white, fontSize:15, lineHeight:1.25, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{song.title}</div>
            <div style={{ color:C.gray, fontSize:12 }}>
              {song.artist}
              {song.bpm>0&&<span style={{ color:active?C.teal:C.grayDim, fontFamily:"'Space Mono',monospace", fontSize:11, marginLeft:6, transition:"color .2s" }}>{song.bpm} BPM</span>}
            </div>
          </div>
          {song.drummer&&showDrummer&&<Badge color={st.badge}>{song.drummer}</Badge>}
          {song.lyrics&&<button onClick={e=>{e.stopPropagation();setShowLyrics(v=>!v);}} title="Lyrics" style={{ background:"transparent", border:"none", color:showLyrics?C.teal:C.grayDim, cursor:"pointer", padding:"4px 6px", fontSize:17, flexShrink:0 }}>📓</button>}
          {onEdit&&<button onClick={e=>{e.stopPropagation();onEdit(song);}} style={{ background:"transparent", border:"none", color:C.grayDim, cursor:"pointer", padding:"4px 6px", fontSize:17, flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color=C.teal} onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>✎</button>}
          {onDelete&&<button onClick={e=>{e.stopPropagation();onDelete(song);}} style={{ background:"transparent", border:"none", color:C.grayDim, cursor:"pointer", padding:"4px 6px", fontSize:17, flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>✕</button>}
          {extra&&extra}
        </div>
        {song.specialties&&<div style={{ color:C.grayDim, fontSize:12, fontStyle:"italic", whiteSpace:"pre-wrap", lineHeight:1.5, paddingLeft: song.bpm>0?40:0 }}>{song.specialties}</div>}
      </div>
      {showLyrics&&song.lyrics&&(
        <div style={{ background:"#080808", border:`1px solid ${st.border}`, borderTop:"none", borderRadius:"0 0 6px 6px", padding:"12px 15px", color:"#cfcfcf", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap" }}>
          {song.lyrics}
        </div>
      )}
    </div>
  );
}

function exportPDF(playlist, allSongs, playlistSongs, bandName, withNotes) {
  const ps          = playlistSongs.filter(p=>p.playlist_id===playlist.id);
  const regularSets = ["Set 1","Set 2","Set 3"].filter(s=>ps.some(p=>p.set_name===s));
  const zugaben     = ps.filter(p=>p.set_name==="Zugaben").sort((a,b)=>a.position-b.position);
  const teal        = "#5cc8b8";
  const tomCol      = "#0a7a6e";
  const ronCol      = "#a83030";
  const date        = new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});

  function songRows(items, startIdx) {
    return items.map((p,i) => {
      const s = allSongs.find(x=>x.id===p.song_id);
      if (!s) return "";
      const isTom  = s.drummer==="Tom";
      const isRon  = s.drummer==="Ron";
      const dCol   = isTom ? tomCol : isRon ? ronCol : "#777";
      const rowBg  = isTom ? "#f0faf8" : isRon ? "#fdf2f2" : "#fafafa";
      const bpmStr = s.bpm ? "<div class='sbpm'>" + s.bpm + " BPM</div>" : "";
      const notesCell = withNotes
        ? "<td class='ncol'>" + (s.specialties ? s.specialties.replace(/\n/g,"<br>") : "") + "</td>"
        : "";
      return "<tr style='background:" + rowBg + "'>"
        + "<td class='num'>" + (startIdx+i+1) + "</td>"
        + "<td class='tcol'><span class='stitle'>" + s.title + "</span></td>"
        + "<td class='acol'><span class='sartist'>" + (s.artist||"") + "</span>" + bpmStr + "</td>"
        + notesCell
        + "<td class='dcol'><span style='color:" + dCol + ";border:1px solid " + dCol + "'>" + (s.drummer||"") + "</span></td>"
        + "</tr>";
    }).join("");
  }

  let pages = "";
  regularSets.forEach((set, si) => {
    const items  = ps.filter(p=>p.set_name===set).sort((a,b)=>a.position-b.position);
    const isLast = si === regularSets.length - 1;
    let zuSection = "";
    if (isLast && zugaben.length) {
      zuSection = "<tr><td colspan='4' class='zusep'>&#9679; ZUGABEN &#9679;</td></tr>" + songRows(zugaben, 0);
    }
    pages += "<div class='page" + (isLast ? "" : " brk") + "'>"
      + "<img class='wm' src='" + getLogo() + "' alt=''/>"
      + "<div class='hdr'>"
      +   "<div class='hbrand'>SPIELFERTIG<span style='color:" + teal + "'>&#8253;</span></div>"
      +   "<div class='hright'>"
      +   (getBandLogo(bandName) ? "<img src='" + getBandLogo(bandName) + "' style='height:46px;max-width:220px;object-fit:contain;display:block;margin-left:auto;margin-bottom:2px'>" : "<div class='hband'>" + bandName + "</div>")
      +   "<div class='hinfo'>" + playlist.name + " &nbsp;·&nbsp; " + date + "</div></div>"
      + "</div>"
      + "<div class='seal'></div>"
      + "<div class='settitle'>" + set + " <span class='setcount'>(" + items.length + " Songs)</span></div>"
      + "<table><tbody>"
      + songRows(items, 0)
      + zuSection
      + "</tbody></table>"
      + "<div class='footer'>SCHLAGFERTIG&#8253; &nbsp;·&nbsp; Thomas Schuster &nbsp;·&nbsp; ZEIT FÜR GUTEN SOUND</div>"
      + "</div>";
  });

  const notesColCss = withNotes
    ? ".ncol{width:32%;padding:3px 6px;font-size:9px;color:#666;font-style:italic;vertical-align:top;line-height:1.4;white-space:pre-wrap}"
    : "";

  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'>"
    + "<title>" + playlist.name + "</title>"
    + "<link href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;600;700;800;900&display=swap' rel='stylesheet'>"
    + "<style>"
    + "@page{size:A4;margin:8mm 18mm}"
    + "*{box-sizing:border-box;margin:0;padding:0}"
    + "body{font-family:'Raleway',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#111}"
    + ".page{position:relative;min-height:277mm;display:flex;flex-direction:column}"
    + ".brk{page-break-after:always}"
    + ".wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:240px;opacity:.04;pointer-events:none}"
    + ".hdr{display:flex;align-items:center;gap:10px;padding-bottom:4px;position:relative;z-index:1}"
    + ".hbrand{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.06em;flex-shrink:0}"
    + ".hright{flex:1;text-align:right}"
    + ".hband{font-family:'Bebas Neue',cursive;font-size:16px;letter-spacing:.05em;color:#444}"
    + ".hinfo{font-size:9px;color:#999;margin-top:1px}"
    + ".seal{height:2px;background:linear-gradient(90deg,transparent," + teal + "," + teal + ",transparent);margin:3px 0 5px;position:relative;z-index:1}"
    + ".settitle{font-family:'Bebas Neue',cursive;font-size:17px;letter-spacing:.12em;color:" + teal + ";margin-bottom:3px;position:relative;z-index:1}"
    + ".setcount{font-size:13px;color:#bbb;letter-spacing:0}"
    + "table{width:100%;border-collapse:collapse;position:relative;z-index:1}"
    + "tr{border-bottom:1px solid #ebebeb}"
    + "td{vertical-align:middle;padding:4px 4px}"
    + ".num{width:22px;color:#aaa;font-size:14px;text-align:right;padding-right:6px;font-family:'Raleway';font-weight:800}"
    + ".tcol{padding:3px 5px;vertical-align:middle}"
    + ".acol{padding:3px 5px;vertical-align:middle}"
    + ".stitle{font-family:'Raleway',sans-serif;font-size:14px;letter-spacing:.01em;line-height:1.2;font-weight:800}"
    + ".sartist{font-family:'Raleway',sans-serif;font-weight:400;font-size:11px;letter-spacing:.01em;color:#444}"
    + ".sbpm{font-size:9px;color:#bbb;margin-top:1px}"
    + ".bpm{font-weight:700}"
    + notesColCss
    + ".dcol{width:42px;text-align:right;padding:5px 4px}"
    + ".dcol span{font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 5px;border-radius:2px}"
    + ".zusep{padding:5px 5px 3px;font-family:'Bebas Neue',cursive;font-size:15px;letter-spacing:.15em;color:#bbb;border-bottom:1px solid #e0e0e0}"
    + ".footer{margin-top:auto;padding-top:4px;font-size:8px;color:#ccc;text-align:center;border-top:1px solid #f0f0f0;letter-spacing:.1em;text-transform:uppercase}"
    + "</style></head><body>"
    + pages
    + "</body></html>";

  const closeBtn = "<div class='close-btn'>"
    + "<button onclick='window.close()' style='position:fixed;top:16px;right:16px;background:#000;color:#5cc8b8;border:1px solid #5cc8b8;border-radius:4px;padding:8px 18px;font-family:Raleway,sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;z-index:999'>← SCHLIESSEN</button>"
    + "</div>";
  const htmlWithBtn = html.replace("</body>", closeBtn + "<style>@media print{.close-btn{display:none}}</style></body>");
  const w = window.open("","_blank");
  w.document.write(htmlWithBtn);
  w.document.close();
  w.document.fonts.ready.then(()=>w.print());
}

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
        <Field value={form.specialties} onChange={v=>setForm(f=>({...f,specialties:v}))} placeholder="Besonderheiten (optional)" style={{ marginBottom:8 }}/>
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
          <Field value={editSong.specialties||""} onChange={v=>setEdit(s=>({...s,specialties:v}))} placeholder="Besonderheiten"/>
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

function SongRowMove({ song, mySongs, playlist, onDelete, onRefresh, setSaving, saving, showDrummer=true, canEdit=true }) {
  const [open, setOpen] = useState(false);
  const [newSet, setNewSet] = useState(song.set_name);
  const [newPos, setNewPos] = useState(String(song.position));
  const [notes, setNotes] = useState(song.specialties||"");
  const apply = async () => {
    setOpen(false);
    setSaving(true);
    const targetSet = newSet;
    const targetPos = parseInt(newPos) || 1;
    const psId = song.ps_id;
    const setItems = mySongs.filter(ps=>ps.set_name===song.set_name && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    const targetItems = mySongs.filter(ps=>ps.set_name===targetSet && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    if (targetSet === song.set_name) {
      const others = setItems.filter(ps=>ps.id!==psId);
      const clamped = Math.max(1, Math.min(targetPos, setItems.length));
      others.splice(clamped-1, 0, setItems.find(ps=>ps.id===psId));
      for (let i=0;i<others.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+others[i].id);
    } else {
      const oldOthers = setItems.filter(ps=>ps.id!==psId);
      for (let i=0;i<oldOthers.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+oldOthers[i].id);
      const newOthers = [...targetItems];
      const clamped = Math.max(1, Math.min(targetPos, targetItems.length+1));
      newOthers.splice(clamped-1, 0, { id: psId });
      for (let i=0;i<newOthers.length;i++) await sb.update("playlist_songs",{set_name:targetSet,position:i+1},"id=eq."+newOthers[i].id);
    }
    if (notes !== (song.specialties||"")) {
      await sb.update("songs", { specialties: notes }, "id=eq."+song.id);
    }
    await onRefresh(); setSaving(false);
  };
  return (
    <div style={{ position:"relative" }}>
      <SongRow song={song} pos={song.position} showDrummer={showDrummer} onDelete={onDelete}
        onEdit={canEdit?(()=>{ setNewSet(song.set_name); setNewPos(String(song.position)); setNotes(song.specialties||""); setOpen(!open); }):undefined}/>
      {open&&(
        <div style={{ position:"absolute", right:0, top:"100%", zIndex:100, background:"#1a1a1a", border:"1px solid "+C.tealBorder, borderRadius:8, padding:14, minWidth:220, boxShadow:"0 8px 32px rgba(0,0,0,.8)" }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Verschieben nach</div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>SET</div>
              <select value={newSet} onChange={e=>setNewSet(e.target.value)}
                style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:12, fontFamily:"inherit", width:"100%" }}>
                {SETS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ width:64 }}>
              <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>PLATZ</div>
              <input type="number" min="1" value={newPos} onChange={e=>setNewPos(e.target.value)}
                style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:13, fontFamily:"'Space Mono',monospace", width:"100%", textAlign:"center" }}/>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>NOTIZEN</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="z.B. Drums beginnt, Count-In…" rows={2}
              style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:12, fontFamily:"inherit", width:"100%", resize:"none", lineHeight:1.5 }}/>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <Btn variant="ghost" size="sm" onClick={()=>setOpen(false)}>Abbrechen</Btn>
            <Btn size="sm" onClick={apply} disabled={saving}>OK ✓</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export { SongRow, exportPDF, SongDatabase, SongRowMove };
