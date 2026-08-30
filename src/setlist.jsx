import { useState, useMemo, useEffect } from "react";
import { C, sb, SETS, dStyle } from "./core";
import { Btn, Field, SealLine, Spinner, Modal, Confirm } from "./ui";
import { SongRowMove, exportPDF } from "./songs";
import { GigMetronome } from "./gig";

function PlaylistEditor({ playlist, allSongs, playlistSongs, onBack, onRefresh, bandName, bandId, canEdit, show, theme, toggleTheme }) {
  const [activeSet, setActiveSet] = useState("Set 1");
  const [search, setSearch]       = useState("");
  const [dragId, setDragId]       = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [gigMode, setGigMode]     = useState(false);
  const [printNotes, setPrintNotes] = useState(true);
  const [currentSongId, setCurrentSongId] = useState(null);
  const [gigLyricsId, setGigLyricsId] = useState(null);

  useEffect(()=>{
    if (!gigMode) return;
    if (!("wakeLock" in navigator)) return;
    let lock = null;
    let cancelled = false;
    const request = async () => {
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) { l.release(); return; }
        lock = l;
      } catch(_) {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") request(); };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) { try { lock.release(); } catch(_) {} }
    };
  },[gigMode]);

  const mySongs  = playlistSongs.filter(ps=>ps.playlist_id===playlist.id);
  const bandSongs= allSongs.filter(s=>s.band_id===bandId);

  const songsInSet = useMemo(()=>
    mySongs.filter(ps=>ps.set_name===activeSet)
      .map(ps=>({...ps,...(allSongs.find(s=>s.id===ps.song_id)||{}), ps_id:ps.id, set_name:ps.set_name, position:ps.position}))
      .filter(s=>s.title?.toLowerCase().includes(search.toLowerCase())||(s.artist?.toLowerCase()??"").includes(search.toLowerCase()))
      .sort((a,b)=>a.position-b.position),
    [mySongs,activeSet,search,allSongs]);

  const setCounts = SETS.reduce((a,s)=>{a[s]=mySongs.filter(ps=>ps.set_name===s).length;return a;},{});
  const inSetIds  = mySongs.filter(ps=>ps.set_name===activeSet).map(ps=>ps.song_id);
  const available = bandSongs.filter(s=>!inSetIds.includes(s.id));

  const addToSet = async (song) => {
    setSaving(true);
    const pos = mySongs.filter(ps=>ps.set_name===activeSet&&ps.playlist_id===playlist.id).length+1;
    await sb.insert("playlist_songs", { playlist_id:playlist.id, song_id:song.id, set_name:activeSet, position:pos });
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

  const handleDrop = async (targetId) => {
    if (!dragId||dragId===targetId) return;
    const fi=songsInSet.findIndex(s=>s.id===dragId), ti=songsInSet.findIndex(s=>s.id===targetId);
    if (fi===-1||ti===-1) return;
    setSaving(true);
    const items=[...songsInSet]; const [mv]=items.splice(fi,1); items.splice(ti,0,mv);
    for (let i=0;i<items.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+items[i].id);
    setDragId(null); await onRefresh(); setSaving(false);
  };

  if (gigMode) {
    const drummerColor = (d) => d==="Ron" ? C.red : d==="Tom" ? C.teal : C.gray;
    return (
      <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:C.bgCard,borderBottom:"1px solid "+C.grayDim,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setGigMode(false)} title="Gig-Mode schließen" style={{background:"transparent",border:"1px solid "+C.tealBorder,borderRadius:8,color:C.teal,cursor:"pointer",fontSize:26,lineHeight:1,padding:"6px 14px",flexShrink:0}}>✕</button>
          <button onClick={toggleTheme} title="Hell/Dunkel" style={{background:"transparent",border:"1px solid "+C.tealBorder,borderRadius:"50%",color:C.teal,cursor:"pointer",fontSize:18,width:40,height:40,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{theme==="dark"?"☀️":"🌙"}</button>
          <div style={{flex:1,color:C.white,fontWeight:400,fontSize:24,fontFamily:"'Bebas Neue',cursive",letterSpacing:"0.05em"}}>{playlist.name}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {SETS.map(set=>(
              <button key={set} onClick={()=>{setActiveSet(set); setCurrentSongId(null);}} style={{
                background:activeSet===set?C.teal:"transparent",
                color:activeSet===set?"#000":C.gray,
                border:"1px solid "+(activeSet===set?C.teal:C.grayDim),
                borderRadius:4,padding:"6px 14px",fontSize:12,fontWeight:700,
                letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"
              }}>{set} ({setCounts[set]})</button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:5}}>
          {songsInSet.map((song,i)=>{
            const st = dStyle(song.drummer);
            const isCurrent = currentSongId === song.ps_id;
            const currentIdx = songsInSet.findIndex(s=>s.ps_id===currentSongId);
            const isNext = currentSongId && !isCurrent && i === currentIdx + 1;
            const opacity = !currentSongId ? 1 : isCurrent ? 1 : isNext ? 0.75 : 0.35;
            const dCol = drummerColor(song.drummer);
            return (
              <div key={song.id} style={{ display:"flex", flexDirection:"column" }}>
                <div onClick={()=>setCurrentSongId(isCurrent ? null : song.ps_id)}
                  style={{
                    background: isCurrent ? (song.drummer==="Ron"?C.redDim:C.tealDim) : isNext ? C.bgNext : "transparent",
                    border: "2px solid " + (isCurrent ? (song.drummer==="Ron"?C.red:C.teal) : isNext ? C.borderNext : C.borderSong),
                    borderRadius: (gigLyricsId===song.ps_id&&song.lyrics) ? "7px 7px 0 0" : 7,
                    padding:"9px 13px", display:"flex", alignItems:"center", gap:10,
                    cursor:"pointer", opacity, transition:"all .2s",
                    boxShadow: isCurrent ? "0 0 16px 2px " + (song.drummer==="Ron"?C.redBorder:C.tealBorder) : "none"
                  }}>
                  <div style={{width:22,textAlign:"center",flexShrink:0}}>
                    {isCurrent
                      ? <div style={{color:song.drummer==="Ron"?C.red:C.teal,fontSize:16}}>▶</div>
                      : isNext
                        ? <div style={{color:C.textMute,fontSize:10,letterSpacing:".04em"}}>NEXT</div>
                        : <div style={{color:C.grayDim,fontSize:13,fontFamily:"'Space Mono',monospace"}}>{i+1}</div>}
                  </div>
                  <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                    <div style={{
                      color: isCurrent?C.white:C.textDim,
                      fontFamily:"'Raleway',sans-serif", fontWeight:600,
                      fontSize: isCurrent?24:isNext?19:21,
                      lineHeight:1.15, transition:"font-size .2s",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
                    }}>{song.title}</div>
                    <div style={{color:isCurrent?C.gray:C.textMute,fontSize:11,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {song.artist}
                    </div>
                    {song.specialties&&<div style={{color:C.textDim,fontSize:14,fontStyle:"italic",whiteSpace:"pre-wrap",lineHeight:1.5,marginTop:2}}>{song.specialties}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:"auto"}}>
                    {song.bpm>0&&<GigMetronome bpm={song.bpm} autoStart={isCurrent} size={54}/>}
                    {song.lyrics&&<button onClick={(e)=>{e.stopPropagation();setGigLyricsId(id=>id===song.ps_id?null:song.ps_id);}}
                      title="Lyrics"
                      style={{background:"transparent",border:"none",color:gigLyricsId===song.ps_id?C.teal:C.grayDim,cursor:"pointer",fontSize:22,padding:"2px 4px"}}>📓</button>}
                    {song.drummer&&<div style={{
                      color:dCol, border:"1px solid "+dCol, borderRadius:4,
                      padding:"5px 12px", fontSize:13, fontWeight:700,
                      letterSpacing:"0.08em", minWidth:44, textAlign:"center"
                    }}>{song.drummer}</div>}
                  </div>
                </div>
                {gigLyricsId===song.ps_id&&song.lyrics&&(
                  <div onClick={(e)=>e.stopPropagation()}
                    style={{background:C.lyricsBg,border:"2px solid "+st.border,borderTop:"none",borderRadius:"0 0 7px 7px",padding:"14px 16px",color:C.lyricsText,fontSize:18,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                    {song.lyrics}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Zurück</Btn>
        <div style={{ flex:1 }}>
          <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{playlist.name}</div>
          <div style={{ color:C.grayDim, fontSize:11 }}>{mySongs.length} Songs gesamt</div>
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
          <button key={set} onClick={()=>{setActiveSet(set);setSearch("");}} style={{ background:activeSet===set?C.teal:"transparent", color:activeSet===set?"#000":C.gray, border:"1px solid "+(activeSet===set?C.teal:"#222"), borderRadius:3, padding:"5px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>
            {set} <span style={{ opacity:.7 }}>({setCounts[set]})</span>
          </button>
        ))}
      </div>
      <Field value={search} onChange={setSearch} placeholder="Im Set suchen…"/>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>{activeSet} · {songsInSet.length} Songs</div>
          {canEdit&&<Btn variant="outline" size="sm" onClick={()=>setShowAdd(!showAdd)}>{showAdd?"✕ Schließen":"+ Hinzufügen"}</Btn>}
        </div>
        {showAdd&&<div style={{ marginBottom:12, background:"#080808", border:"1px solid #1a1a1a", borderRadius:4, padding:10 }}>
          {available.length===0?<div style={{ color:C.grayDim, fontSize:12 }}>Alle Songs bereits in diesem Set.</div>
          :<div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:180, overflowY:"auto" }}>
            {available.map(song=>(
              <div key={song.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", background:"#0d0d0d", borderRadius:3 }}>
                <div><span style={{ color:C.white, fontSize:13 }}>{song.title}</span><span style={{ color:C.grayDim, fontSize:12 }}> · {song.artist}</span></div>
                <Btn size="sm" onClick={()=>addToSet(song)} disabled={saving}>+</Btn>
              </div>
            ))}
          </div>}
        </div>}
        {songsInSet.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:24, fontSize:13 }}>Keine Songs in diesem Set</div>
        :<div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {songsInSet.map(song=>(
            <SongRowMove key={song.id} song={song} mySongs={mySongs} playlist={playlist} showDrummer={new Set(mySongs.map(s=>s.drummer).filter(Boolean)).size>1} canEdit={canEdit}
              onDelete={canEdit?(()=>removeFromSet(song)):undefined} onRefresh={onRefresh} setSaving={setSaving} saving={saving}/>
          ))}
        </div>}
      </div>
    </div>
  );
}

function SetlistManager({ band, allSongs, gigs, playlists, playlistSongs, canEdit, onRefresh, show, theme, toggleTheme }) {
  const [view, setView]         = useState("gigs");
  const [selGig, setSelGig]     = useState(null);
  const [selPl, setSelPl]       = useState(null);
  const [gigName, setGigName]   = useState(""); const [gigDate, setGigDate] = useState("");
  const [plName, setPlName]     = useState("");
  const [confirm, setConfirm]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [renaming, setRenaming]   = useState(null);
  const [renameTxt, setRenameTxt] = useState("");
  const [template, setTemplate]   = useState(null);
  const [tmplGig,  setTmplGig]    = useState("");
  const [tmplName, setTmplName]   = useState("");
  const [copying,  setCopying]    = useState(false);

  const bandGigs   = gigs.filter(g=>g.band_id===band.id);
  const gigPls     = playlists.filter(p=>p.gig_id===selGig?.id);

  if (view==="editor"&&selPl) return <PlaylistEditor playlist={selPl} allSongs={allSongs} playlistSongs={playlistSongs} canEdit={canEdit} onBack={()=>setView("playlists")} onRefresh={onRefresh} bandName={band.name} bandId={band.id} show={show} theme={theme} toggleTheme={toggleTheme}/>;

  if (view==="playlists"&&selGig) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Btn variant="ghost" size="sm" onClick={()=>setView("gigs")}>← Gigs</Btn>
        <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{selGig.name}</div>
      </div>
      <SealLine/>
      {canEdit&&(
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:14 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neue Playlist</div>
        <div style={{ display:"flex", gap:8 }}>
          <Field value={plName} onChange={setPlName} placeholder="Playlist-Name…"/>
          <Btn onClick={async()=>{ if(plName){ setSaving(true); await sb.insert("playlists",{gig_id:selGig.id,name:plName}); setPlName(""); await onRefresh(); show("Playlist erstellt!"); setSaving(false); }}} disabled={!plName||saving}>Erstellen</Btn>
        </div>
      </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {gigPls.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, fontSize:13 }}>Noch keine Playlists</div>
        :gigPls.map(p=>(
          <div key={p.id} style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:C.white, fontWeight:600, fontSize:14 }}>{p.name}</div>
              <div style={{ color:C.grayDim, fontSize:11 }}>{playlistSongs.filter(ps=>ps.playlist_id===p.id).length} Songs</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn size="sm" onClick={()=>{setSelPl(p);setView("editor");}}>Oeffnen →</Btn>
              {canEdit&&<Btn variant="outline" size="sm" onClick={()=>{setTemplate(p);setTmplName(p.name+" (Kopie)");setTmplGig("");}}>⎘</Btn>}
              {canEdit&&<Btn variant="outline" size="sm" onClick={()=>{setRenaming(p);setRenameTxt(p.name);}}>✎</Btn>}
              {canEdit&&<Btn variant="danger" size="sm" onClick={()=>setConfirm({type:"pl",item:p})}>✕</Btn>}
            </div>
          </div>
        ))}
      </div>
      {template&&<Modal title={"Als Vorlage: "+template.name} onClose={()=>setTemplate(null)}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ color:C.grayDim, fontSize:12 }}>Alle Songs werden in die neue Playlist kopiert.</div>
          <Field value={tmplName} onChange={setTmplName} placeholder="Name der neuen Playlist"/>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Ziel-Gig</div>
          <select value={tmplGig} onChange={e=>setTmplGig(e.target.value)}
            style={{ background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit" }}>
            <option value="">— Gig wählen —</option>
            {bandGigs.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Btn full disabled={!tmplGig||!tmplName||copying} onClick={async()=>{
            setCopying(true);
            const newPl = await sb.insert("playlists",{gig_id:parseInt(tmplGig),name:tmplName});
            const srcSongs = playlistSongs.filter(ps=>ps.playlist_id===template.id);
            for (const ps of srcSongs) {
              await sb.insert("playlist_songs",{playlist_id:newPl.id,song_id:ps.song_id,set_name:ps.set_name,position:ps.position});
            }
            await onRefresh(); show("Playlist kopiert!"); setTemplate(null); setCopying(false);
          }}>{copying?"Kopiere…":"Playlist erstellen ✓"}</Btn>
        </div>
      </Modal>}
      {renaming&&<Modal title="Playlist umbenennen" onClose={()=>setRenaming(null)}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Field value={renameTxt} onChange={setRenameTxt} placeholder="Neuer Name…"/>
          <Btn full disabled={!renameTxt||saving} onClick={async()=>{
            setSaving(true);
            await sb.update("playlists",{name:renameTxt},"id=eq."+renaming.id);
            await onRefresh(); show("Playlist umbenannt!"); setRenaming(null); setSaving(false);
          }}>Umbenennen ✓</Btn>
        </div>
      </Modal>}
      {confirm&&<Confirm msg={'"'+confirm.item.name+'" löschen?'} onOk={async()=>{ await sb.delete("playlists","id=eq."+confirm.item.id); await onRefresh(); show("Playlist gelöscht."); setConfirm(null); }} onCancel={()=>setConfirm(null)}/>}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Gig-Verwaltung</div>
      <SealLine/>
      {canEdit&&(
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:14 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neuer Gig</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Field value={gigName} onChange={setGigName} placeholder="Gig-Name"/>
          <Field value={gigDate} onChange={setGigDate} type="date" placeholder="Datum"/>
          <Btn full disabled={!gigName||saving} onClick={async()=>{ setSaving(true); await sb.insert("gigs",{band_id:band.id,name:gigName,date:gigDate||null}); setGigName(""); setGigDate(""); await onRefresh(); show("Gig erstellt!"); setSaving(false); }}>Gig erstellen</Btn>
        </div>
      </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {bandGigs.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, fontSize:13 }}>Noch keine Gigs</div>
        :bandGigs.map(gig=>(
          <div key={gig.id} onClick={()=>{setSelGig(gig);setView("playlists");}}
            style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1a"}>
            <div>
              <div style={{ color:C.white, fontWeight:600, fontSize:14 }}>{gig.name}</div>
              {gig.date&&<div style={{ color:C.grayDim, fontSize:11 }}>{new Date(gig.date+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}</div>}
              <div style={{ color:C.grayDim, fontSize:11 }}>{playlists.filter(p=>p.gig_id===gig.id).length} Playlists</div>
            </div>
            {canEdit&&<div onClick={e=>e.stopPropagation()}>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({item:gig})}>✕</Btn>
            </div>}
          </div>
        ))}
      </div>
      {confirm&&<Confirm msg={`Gig „${confirm.item.name}" löschen?`} onOk={async()=>{ await sb.delete("gigs","id=eq."+confirm.item.id); await onRefresh(); show("Gig gelöscht."); setConfirm(null); }} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

export { PlaylistEditor, SetlistManager };
