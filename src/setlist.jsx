import { useState } from "react";
import { C, sb } from "./core";
import { Btn, Field, SealLine, Modal, Confirm } from "./ui";
import { PlaylistEditor } from "./playlistEditor";

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

export { SetlistManager };
export { PlaylistEditor } from "./playlistEditor";
