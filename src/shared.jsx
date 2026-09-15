import { useState, useEffect, useRef } from "react";
import { C, sb, SETS, dStyle, getBandLogo, getLogo, bandLogoImgStyle } from "./core";
import { SealIcon, Spinner, useIsNarrow, HeadToggle } from "./ui";
import { GigMetronome, BpmBadge } from "./gig";
import { GigDock } from "./gigDock";
import { GigNowCard } from "./gigNow";
import { SongFold, FoldBtn } from "./songPanels";
import { useViewPrefs, ViewPrefBar } from "./viewPrefs";
import { hasChart, songChart, songNotes, chartSummary } from "./chart";
import { useWakeLock } from "./wakeLock";

function rowId(song) {
  if (!song) return "";
  return song.ps_id || (String(song.id) + ":" + String(song.position || ""));
}

function SharedView({ playlistId }) {
  const [data, setData]         = useState(null);
  const [activeSet, setActiveSet] = useState("Set 1");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [lyricsId, setLyricsId] = useState(null);
  const [notesId, setNotesId]   = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [prefs, togglePref]     = useViewPrefs();
  const narrow = useIsNarrow();
  const [headOpen, setHeadOpen] = useState(false);
  const showExtra = !narrow || headOpen;
  const [skipped, setSkipped] = useState([]);
  const listRef = useRef(null);
  const nowRef = useRef(null);
  useWakeLock(true);
  const skipSet = new Set(skipped);
  const toggleSkip = (id, e) => {
    if (e) e.stopPropagation();
    setSkipped(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    if (currentId === id) setCurrentId(null);
  };

  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        const q = (table, options) => sb.query(table, { ...options, anon: true });
        const pls = await q("playlists", { select:"*", filter:"id=eq."+playlistId });
        const playlist = Array.isArray(pls)&&pls[0] ? pls[0] : null;
        if (!playlist) { if (!cancelled) { setError("Setlist nicht gefunden oder nicht freigegeben."); setLoading(false); } return; }
        const ps = await q("playlist_songs", { select:"*", filter:"playlist_id=eq."+playlistId, order:"position.asc" });
        const psArr = Array.isArray(ps) ? ps : [];
        const ids = [...new Set(psArr.map(p=>p.song_id))];
        let songs = [];
        if (ids.length) {
          const sres = await q("songs", { select:"*", filter:"id=in.("+ids.join(",")+")" });
          songs = Array.isArray(sres) ? sres : [];
        }
        let bandName = "";
        const gres = await q("gigs", { select:"*", filter:"id=eq."+playlist.gig_id });
        const gig = Array.isArray(gres)&&gres[0] ? gres[0] : null;
        if (gig) {
          const bres = await q("bands", { select:"*", filter:"id=eq."+gig.band_id });
          if (Array.isArray(bres)&&bres[0]) bandName = bres[0].name;
        }
        const firstSet = SETS.find(s=>psArr.some(p=>p.set_name===s)) || "Set 1";
        if (cancelled) return;
        setActiveSet(firstSet);
        setData({ playlist, ps:psArr, songs, bandName });
      } catch(e) { if (!cancelled) setError("Fehler beim Laden."); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  },[playlistId]);

  useEffect(() => {
    if (!currentId) return;
    const list = listRef.current;
    const el = nowRef.current;
    if (!list || !el) return;
    const pin = () => {
      const top = list.getBoundingClientRect().top;
      const y = el.getBoundingClientRect().top;
      list.scrollTo({ top: list.scrollTop + (y - top) - 6, behavior: "smooth" });
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(pin));
    return () => cancelAnimationFrame(id);
  }, [currentId]);

  const drummerColor = (d) => d==="Ron" ? C.red : d==="Tom" ? C.teal : C.gray;
  const setCounts = SETS.reduce((a,s)=>{ a[s]=(data?.ps||[]).filter(p=>p.set_name===s).length; return a; },{});
  const songsInSet = (data?.ps||[])
    .filter(p=>p.set_name===activeSet)
    .map(p=>({
      ...(data.songs.find(s=>s.id===p.song_id)||{}),
      position:p.position,
      ps_id: p.id || (p.song_id + ":" + p.position),
    }))
    .sort((a,b)=>a.position-b.position);

  const live = songsInSet.filter(s => !skipSet.has(rowId(s)));
  const current = live.find(s => rowId(s) === currentId) || null;
  const currentLiveIdx = current ? live.findIndex(s => rowId(s) === rowId(current)) : -1;
  const nextSong = currentLiveIdx >= 0 ? (live[currentLiveIdx + 1] || null) : (live[0] || null);
  const nextChart = nextSong ? songChart(nextSong) : null;
  const nextChartText = nextChart && hasChart(nextChart) ? chartSummary(nextChart) : "";
  const bpmNow = current && current.bpm > 0 ? current.bpm : 0;
  const bpmNext = nextSong && nextSong.bpm > 0 ? nextSong.bpm : 0;
  const bpmDelta = bpmNow && bpmNext && bpmNow !== bpmNext ? bpmNext - bpmNow : 0;
  const showDock = !!(current || nextSong);
  const showClickDock = !!(current && prefs.click && current.bpm > 0);

  const pickSong = (song) => {
    const id = rowId(song);
    if (skipSet.has(id)) return;
    setCurrentId(cur => cur === id ? null : id);
  };
  const selectSong = (song) => {
    if (!song || skipSet.has(rowId(song))) return;
    setCurrentId(rowId(song));
  };
  const switchSet = (set) => {
    setActiveSet(set);
    setCurrentId(null);
    setLyricsId(null);
    setNotesId(null);
  };

  const fontStyle = { fontFamily:"'Raleway',sans-serif" };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, ...fontStyle }}>
      <SealIcon size={52}/><Spinner/>
      <div style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.15em" }}>SETLIST LÄDT…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:24, textAlign:"center", ...fontStyle }}>
      <SealIcon size={48}/>
      <div style={{ color:C.red, fontSize:14 }}>{error}</div>
    </div>
  );

  const bandLogo = getBandLogo(data.bandName);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"'Raleway',sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#000}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}" }</style>
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <img src={getLogo()} alt="" style={{ width:340, height:"auto", objectFit:"contain", opacity:0.07, userSelect:"none" }}/>
      </div>
      <div style={{ background:"#0a0a0a", borderBottom:"1px solid #1a1a1a", flexShrink:0, position:"relative", zIndex:1 }}>
        {bandLogo && showExtra && (
          <div style={{ padding:"16px 18px 8px", display:"flex", justifyContent:"center", borderBottom:"1px solid #111" }}>
            <img src={bandLogo} alt={data.bandName} style={bandLogoImgStyle({ height:100, maxWidth:"85%" })}/>
          </div>
        )}
        <div style={{ padding: "8px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ color:C.white, fontWeight:700, fontSize:17, fontFamily:"'Bebas Neue',cursive", letterSpacing:"0.05em", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{data.playlist.name}</div>
            {!narrow && <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", flexShrink:0 }}>NUR ANSICHT</div>}
            {narrow && <HeadToggle open={headOpen} onClick={()=>setHeadOpen(o=>!o)}/>}
          </div>
        </div>
        <div style={{ background:"#071412", borderTop:"1px solid "+C.tealBorder, borderBottom:"1px solid "+C.tealBorder, padding:"8px 14px", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ color:C.teal, fontSize:9, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase" }}>Sets</div>
          {SETS.filter(set => (setCounts[set]||0) > 0 || set === activeSet).map(set=>(
            <button key={set} onClick={()=>switchSet(set)} style={{
              background:activeSet===set?C.teal:"transparent",
              color:activeSet===set?"#000":C.gray,
              border:"1px solid "+(activeSet===set?C.teal:"#333"),
              borderRadius:4, padding:"6px 14px", fontSize:12, fontWeight:700,
              letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit"
            }}>{set} ({setCounts[set]})</button>
          ))}
        </div>
        {showExtra && (
          <div style={{ padding:"8px 14px 10px", background:"#0a0a0a" }}>
            <div style={{ color:C.grayDim, fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>Anzeige</div>
            <ViewPrefBar prefs={prefs} toggle={togglePref} />
          </div>
        )}
      </div>
      <div ref={listRef} style={{ flex:1, overflowY:"auto", padding:"12px 14px", paddingBottom: showDock ? 24 : 12, display:"flex", flexDirection:"column", gap:5, position:"relative", zIndex:1 }}>
        {songsInSet.length===0
          ? <div style={{ textAlign:"center", color:C.grayDim, padding:32, fontSize:14 }}>Keine Songs in diesem Set</div>
          : songsInSet.map((song)=>{
              const id = rowId(song);
              const skippedRow = skipSet.has(id);
              const isCurrent = !skippedRow && currentId === id;
              const currentLiveIdxRow = live.findIndex(s=>rowId(s)===currentId);
              const thisLiveIdx = live.findIndex(s=>rowId(s)===id);
              const isNext = !skippedRow && currentId && !isCurrent && thisLiveIdx === currentLiveIdxRow + 1;
              const opacity = skippedRow ? 0.38 : !currentId ? 1 : isCurrent ? 1 : isNext ? 0.75 : 0.35;
              const st = prefs.drummer ? dStyle(song.drummer) : { bg:"#0d0d0d", border:"#1a1a1a" };
              const dCol = drummerColor(song.drummer);
              const notes = songNotes(song);
              const chart = songChart(song);
              const notesOpen = !skippedRow && prefs.notes && notesId===id;
              const lyricsOpen = !skippedRow && prefs.lyrics && lyricsId===id;
              const foldOpen = (notesOpen && notes) || (lyricsOpen && song.lyrics);
              const preview = (prefs.notes && !notesOpen && notes)
                ? String(notes).split(/\r?\n/).map(l=>l.trim()).find(Boolean)
                : "";
              return (
                <div key={id} ref={isCurrent ? nowRef : null} style={{ display:"flex", flexDirection:"column" }}>
                {isCurrent ? (
                  <GigNowCard
                    song={song}
                    notes={notes}
                    chart={chart}
                    prefs={prefs}
                    narrow={narrow}
                    lyricsOpen={lyricsOpen}
                    canEdit={false}
                    onPick={()=>pickSong(song)}
                    onLyrics={()=>setLyricsId(x=>x===id?null:id)}
                    onEdit={()=>{}}
                    onSkip={(e)=>toggleSkip(id,e)}
                  />
                ) : (
                <div onClick={()=>pickSong(song)} style={{ background:skippedRow?"#0a0a0a":(isNext?C.bgNext:st.bg), border:"2px solid "+(skippedRow?"#2a2a2a":isNext?C.borderNext:st.border), borderRadius: foldOpen?"7px 7px 0 0":7, padding:"9px 13px", display:"flex", alignItems:"center", gap:10, opacity, cursor: skippedRow?"default":"pointer" }}>
                  <div style={{ color:C.grayDim, fontSize: isNext?10:13, fontFamily:"'Space Mono',monospace", width:28, textAlign:"center", flexShrink:0 }}>{skippedRow?"⊘":isNext?"NEXT":song.position}</div>
                  <div style={{width:36,minWidth:36,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {notes && !skippedRow && <FoldBtn on={notesOpen} title={notesOpen?"Notiz schließen":"Notiz hinterlegt"} kind="notes" onClick={()=>setNotesId(x=>x===id?null:id)}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.white, fontWeight:600, fontFamily:"'Raleway',sans-serif", fontSize: isNext?18:21, lineHeight:1.15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", textDecoration: skippedRow?"line-through":"none" }}>{song.title}</div>
                    <div style={{ color:"#888", fontSize:12, marginTop:1 }}>{skippedRow?"gestrichen":song.artist}</div>
                    {preview&&<div style={{ color:"#bbb", fontSize:12, fontStyle:"italic", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{preview}</div>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, marginLeft:"auto" }}>
                    {prefs.lyrics && song.lyrics && !skippedRow && <FoldBtn on={lyricsOpen} title="Lyrics" kind="lyrics" onClick={()=>setLyricsId(x=>x===id?null:id)}/>}
                    {prefs.click && song.bpm>0 && !skippedRow && (
                      showClickDock ? <BpmBadge bpm={song.bpm} size={50}/> : <GigMetronome bpm={song.bpm} size={50}/>
                    )}
                    {prefs.drummer && song.drummer && !skippedRow &&<div style={{ color:dCol, border:"1px solid "+dCol, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700, letterSpacing:"0.08em" }}>{song.drummer}</div>}
                    <button onClick={(e)=>toggleSkip(id,e)} title={skippedRow?"Wieder aktivieren":"Song streichen"}
                      style={{background:skippedRow?C.tealDim:"transparent",border:"1px solid "+(skippedRow?C.teal:"#333"),borderRadius:4,color:skippedRow?C.teal:C.grayDim,cursor:"pointer",padding:"3px 6px",fontSize:11,fontWeight:700}}>{skippedRow?"AN":"AUS"}</button>
                  </div>
                </div>
                )}
                <SongFold notes={prefs.notes?notes:""} lyrics={prefs.lyrics?song.lyrics:""} notesOpen={notesOpen} lyricsOpen={lyricsOpen} border={st.border}/>
              </div>
              );
            })}
      </div>
      {showDock && (
        <GigDock
          current={current}
          nextSong={nextSong}
          bpmNow={bpmNow}
          bpmNext={bpmNext}
          bpmDelta={bpmDelta}
          nextChartText={nextChartText}
          narrow={narrow}
          stack={narrow}
          showClick={showClickDock}
          onNext={() => selectSong(nextSong)}
        />
      )}
      <div style={{ padding:"6px 18px", textAlign:"center", borderTop:"1px solid #111", flexShrink:0, position:"relative", zIndex:1 }}>
        <div style={{ color:"#222", fontSize:10, letterSpacing:"0.15em" }}>SPIELFERTIG<span style={{ color:C.teal }}>‽</span> · SCHLAGFERTIG‽</div>
      </div>
    </div>
  );
}

export { SharedView };
