import { useState, useMemo } from "react";
import { C, sb, SETS } from "./core";
import { Btn, Field, SealLine, Spinner } from "./ui";
import { SongRowMove } from "./songRow";
import { exportPDF } from "./songPdf";
import { GigMode } from "./gigMode";

function PlaylistEditor({ playlist, allSongs, playlistSongs, onBack, onRefresh, bandName, bandId, canEdit, show, theme, toggleTheme }) {
  const [activeSet, setActiveSet] = useState("Set 1");
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [gigMode, setGigMode]     = useState(false);
  const [printNotes, setPrintNotes] = useState(true);

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

  if (gigMode) {
    return (
      <GigMode
        playlist={playlist}
        songsInSet={songsInSet}
        setCounts={setCounts}
        activeSet={activeSet}
        onSetChange={(set)=>{ setActiveSet(set); setSearch(""); }}
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

export { PlaylistEditor };
