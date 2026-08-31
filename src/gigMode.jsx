import { useState, useEffect } from "react";
import { C, SETS, dStyle } from "./core";
import { GigMetronome } from "./gig";
import { SongFold, FoldBtn } from "./songPanels";

function useWakeLock(active) {
  useEffect(() => {
    if (!active) return;
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
  }, [active]);
}

function GigMode({ playlist, songsInSet, setCounts, activeSet, onSetChange, theme, toggleTheme, onClose }) {
  const [currentSongId, setCurrentSongId] = useState(null);
  const [gigLyricsId, setGigLyricsId] = useState(null);
  const [gigNotesId, setGigNotesId] = useState(null);
  useWakeLock(true);

  const drummerColor = (d) => d==="Ron" ? C.red : d==="Tom" ? C.teal : C.gray;

  const pickSong = (song) => {
    const isCurrent = currentSongId === song.ps_id;
    if (isCurrent) {
      setCurrentSongId(null);
      return;
    }
    setCurrentSongId(song.ps_id);
    if (song.specialties) setGigNotesId(song.ps_id);
  };

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:C.bgCard,borderBottom:"1px solid "+C.grayDim,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onClose} title="Gig-Mode schließen" style={{background:"transparent",border:"1px solid "+C.tealBorder,borderRadius:8,color:C.teal,cursor:"pointer",fontSize:26,lineHeight:1,padding:"6px 14px",flexShrink:0}}>✕</button>
        <button onClick={toggleTheme} title="Hell/Dunkel" style={{background:"transparent",border:"1px solid "+C.tealBorder,borderRadius:"50%",color:C.teal,cursor:"pointer",fontSize:18,width:40,height:40,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{theme==="dark"?"☀️":"🌙"}</button>
        <div style={{flex:1,color:C.white,fontWeight:400,fontSize:24,fontFamily:"'Bebas Neue',cursive",letterSpacing:"0.05em"}}>{playlist.name}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {SETS.map(set=>(
            <button key={set} onClick={()=>{onSetChange(set); setCurrentSongId(null);}} style={{
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
          const notesOpen = gigNotesId === song.ps_id;
          const lyricsOpen = gigLyricsId === song.ps_id;
          const foldOpen = (notesOpen && song.specialties) || (lyricsOpen && song.lyrics);
          return (
            <div key={song.id} style={{ display:"flex", flexDirection:"column" }}>
              <div onClick={()=>pickSong(song)}
                style={{
                  background: isCurrent ? (song.drummer==="Ron"?C.redDim:C.tealDim) : isNext ? C.bgNext : "transparent",
                  border: "2px solid " + (isCurrent ? (song.drummer==="Ron"?C.red:C.teal) : isNext ? C.borderNext : C.borderSong),
                  borderRadius: foldOpen ? "7px 7px 0 0" : 7,
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
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:"auto"}}>
                  {song.bpm>0&&<GigMetronome bpm={song.bpm} autoStart={isCurrent} size={54}/>}
                  {song.specialties&&<FoldBtn on={notesOpen} title="Notizen" icon="📝" onClick={()=>setGigNotesId(id=>id===song.ps_id?null:song.ps_id)}/>}
                  {song.lyrics&&<FoldBtn on={lyricsOpen} title="Lyrics" icon="📓" onClick={()=>setGigLyricsId(id=>id===song.ps_id?null:song.ps_id)}/>}
                  {song.drummer&&<div style={{
                    color:dCol, border:"1px solid "+dCol, borderRadius:4,
                    padding:"5px 12px", fontSize:13, fontWeight:700,
                    letterSpacing:"0.08em", minWidth:44, textAlign:"center"
                  }}>{song.drummer}</div>}
                </div>
              </div>
              <SongFold
                notes={song.specialties}
                lyrics={song.lyrics}
                notesOpen={notesOpen}
                lyricsOpen={lyricsOpen}
                border={st.border}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { GigMode };
