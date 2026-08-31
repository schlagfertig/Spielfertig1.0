import { useState } from "react";
import { C, getBandLogo, bandLogoImgStyle } from "./core";
import { Btn, SealLine } from "./ui";
import { SongDatabase } from "./songs";
import { SetlistManager } from "./setlist";
import { MemberManager } from "./members";

function BandDetail({ band, songs, gigs, playlists, playlistSongs, allBands, user, onBack, onRefresh, show, theme, toggleTheme }) {
  const [tab, setTab] = useState("songs");
  const canEdit = band.user_id === user.id;
  const logo = getBandLogo(band.name);
  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <header style={{ borderBottom:"1px solid #111", background:"rgba(0,0,0,.97)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"8px 16px 0", display:"flex", alignItems:"center" }}>
          <Btn variant="outline" size="md" onClick={onBack} style={{fontSize:20,padding:"6px 18px"}}>← Zurück</Btn>
        </div>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"6px 16px 10px", display:"flex", justifyContent:"center" }}>
          {logo
            ? <img src={logo} alt={band.name} style={bandLogoImgStyle({ height:90, maxWidth:"80%" })}/>
            : <div style={{ color:C.white, fontWeight:400, fontSize:26, fontFamily:"'Bebas Neue',cursive", letterSpacing:"0.06em" }}>{band.name}</div>}
        </div>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 10px", display:"flex", gap:6 }}>
            {[{key:"songs",label:"🎵 Songs"},{key:"setlist",label:"📋 Setlist"},{key:"members",label:"👥 Team"}].map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{ flex:1, background:tab===key?C.teal:"transparent", color:tab===key?"#000":C.gray, border:`1px solid ${tab===key?C.teal:"#222"}`, borderRadius:4, padding:"8px 0", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
            ))}
        </div>
        <SealLine color={band.color}/>
      </header>
      <main style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px" }}>
        {tab==="songs"   &&<SongDatabase band={band} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} allBands={allBands} canEdit={canEdit} onRefresh={onRefresh} show={show}/>}
        {tab==="setlist" &&<SetlistManager band={band} allSongs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} canEdit={canEdit} onRefresh={onRefresh} show={show} theme={theme} toggleTheme={toggleTheme}/>}
        {tab==="members" &&<MemberManager band={band} canEdit={canEdit} show={show}/>}
      </main>
    </div>
  );
}

export { BandDetail };
