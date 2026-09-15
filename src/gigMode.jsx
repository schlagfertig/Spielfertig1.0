import { useState, useEffect } from "react";
import { C, SETS, dStyle, sb } from "./core";
import { useIsNarrow, HeadToggle, Btn, Field, Modal } from "./ui";
import { GigMetronome, BpmBadge } from "./gig";
import { GigDock } from "./gigDock";
import { SongFold, FoldBtn } from "./songPanels";
import { useViewPrefs, ViewPrefBar } from "./viewPrefs";
import { ChartStrip, hasChart, songChart, songNotes, packSpecialties, chartSummary } from "./chart";
import { useWakeLock } from "./wakeLock";

const REGULAR_SETS = SETS.filter(s => s !== "Zugaben");

function firstNoteLine(text) {
  if (!text) return "";
  return String(text).split(/\r?\n/).map(l=>l.trim()).find(Boolean) || "";
}

function readSkipped(playlistId) {
  try {
    const raw = sessionStorage.getItem("sf_skip_" + playlistId);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function GigMode({ playlist, songsInSet, setCounts, activeSet, onSetChange, theme, toggleTheme, onClose, canEdit, onRefresh }) {
  const [currentSongId, setCurrentSongId] = useState(null);
  const [gigLyricsId, setGigLyricsId] = useState(null);
  const [gigNotesId, setGigNotesId] = useState(null);
  const [prefs, togglePref] = useViewPrefs();
  const narrow = useIsNarrow();
  const [headOpen, setHeadOpen] = useState(false);
  const showExtra = !narrow || headOpen;
  const [skipped, setSkipped] = useState(() => readSkipped(playlist?.id));
  const [editSong, setEditSong] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  useWakeLock(true);

  useEffect(() => {
    try { sessionStorage.setItem("sf_skip_" + playlist.id, JSON.stringify(skipped)); } catch (_) {}
  }, [skipped, playlist.id]);

  const skipSet = new Set(skipped);
  const isSkipped = (song) => skipSet.has(song.ps_id);
  const toggleSkip = (song, e) => {
    if (e) e.stopPropagation();
    const id = song.ps_id;
    setSkipped(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    if (currentSongId === id) setCurrentSongId(null);
  };

  const drummerColor = (d) => d==="Ron" ? C.red : d==="Tom" ? C.teal : C.gray;

  const lastRegular = [...REGULAR_SETS].reverse().find(s => (setCounts[s]||0) > 0) || "Set 1";
  const encoreCount = setCounts["Zugaben"] || 0;
  const viewSet = activeSet === "Zugaben" ? lastRegular : activeSet;
  const gigTabs = REGULAR_SETS.filter(s => (setCounts[s]||0) > 0 || s === "Set 1");

  const pickSong = (song) => {
    if (isSkipped(song)) return;
    const isCurrent = currentSongId === song.ps_id;
    if (isCurrent) {
      setCurrentSongId(null);
      return;
    }
    setCurrentSongId(song.ps_id);
    if (prefs.notes && songNotes(song)) setGigNotesId(song.ps_id);
  };

  const selectSong = (song) => {
    if (!song || isSkipped(song)) return;
    setCurrentSongId(song.ps_id);
    if (prefs.notes && songNotes(song)) setGigNotesId(song.ps_id);
  };

  const switchSet = (set) => {
    onSetChange(set);
    setCurrentSongId(null);
  };

  const openNotesEdit = (song, e) => {
    if (e) e.stopPropagation();
    setEditSong(song);
    setEditNotes(songNotes(song));
  };

  const saveNotes = async () => {
    if (!editSong) return;
    setEditSaving(true);
    try {
      await sb.update("songs", { specialties: packSpecialties(editNotes, songChart(editSong)) }, "id=eq." + editSong.id);
      if (onRefresh) await onRefresh();
      setEditSong(null);
    } catch (_) {}
    setEditSaving(false);
  };

  const live = songsInSet.filter(s => !skipSet.has(s.ps_id));
  const current = live.find(s => s.ps_id === currentSongId) || null;
  const currentLiveIdx = current ? live.findIndex(s => s.ps_id === current.ps_id) : -1;
  const nextSong = currentLiveIdx >= 0 ? (live[currentLiveIdx + 1] || null) : (live[0] || null);
  const nextChart = nextSong ? songChart(nextSong) : null;
  const nextChartText = nextChart && hasChart(nextChart) ? chartSummary(nextChart) : "";
  const bpmNow = current && current.bpm > 0 ? current.bpm : 0;
  const bpmNext = nextSong && nextSong.bpm > 0 ? nextSong.bpm : 0;
  const bpmDelta = bpmNow && bpmNext && bpmNow !== bpmNext ? bpmNext - bpmNow : 0;

  const showDock = !!(current || nextSong);
  const showClickDock = !!(current && prefs.click && current.bpm > 0);

  let encoreStarted = false;

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:C.bgCard,flexShrink:0}}>
        <div style={{padding: narrow ? "8px 12px" : "10px 16px", display:"flex", alignItems:"center", gap:8}}>
          <button onClick={onClose} title="Gig-Mode schließen" style={{background:"transparent",border:"1px solid "+C.tealBorder,borderRadius:8,color:C.teal,cursor:"pointer",fontSize:26,lineHeight:1,padding:"6px 14px",flexShrink:0}}>✕</button>
          {showExtra && (
            <button onClick={toggleTheme} title="Hell/Dunkel" style={{background:"transparent",border:"1px solid "+C.tealBorder,borderRadius:"50%",color:C.teal,cursor:"pointer",fontSize:18,width:40,height:40,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{theme==="dark"?"☀️":"🌙"}</button>
          )}
          <div style={{flex:1,minWidth:0,color:C.white,fontWeight:400,fontSize: narrow ? 18 : 24,fontFamily:"'Bebas Neue',cursive",letterSpacing:"0.05em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{playlist.name}</div>
          {narrow && <HeadToggle open={headOpen} onClick={()=>setHeadOpen(o=>!o)}/>}
        </div>
        <div style={{
          background:"#071412",
          borderTop:"1px solid "+C.tealBorder,
          borderBottom:"1px solid "+C.tealBorder,
          padding: narrow ? "8px 12px" : "8px 16px",
          display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"
        }}>
          <div style={{ color:C.teal, fontSize:9, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", marginRight:4 }}>Sets</div>
          {gigTabs.map(set=>{
            const n = setCounts[set]||0;
            const isLast = set === lastRegular && encoreCount > 0;
            const label = isLast ? `${set} (${n}+${encoreCount})` : `${set} (${n})`;
            return (
              <button key={set} onClick={()=>switchSet(set)} style={{
                background:viewSet===set?C.teal:"transparent",
                color:viewSet===set?"#000":C.gray,
                border:"1px solid "+(viewSet===set?C.teal:C.grayDim),
                borderRadius:4,padding:"6px 14px",fontSize:12,fontWeight:700,
                letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"
              }}>{label}</button>
            );
          })}
        </div>
        {showExtra && (
          <div style={{ padding: narrow ? "8px 12px 10px" : "8px 16px 10px", background:"#0a0a0a", borderBottom:"1px solid #151515" }}>
            <div style={{ color:C.grayDim, fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>Anzeige</div>
            <ViewPrefBar prefs={prefs} toggle={togglePref} />
          </div>
        )}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:5,paddingBottom: showDock ? (showClickDock ? 180 : 140) : 10}}>
        {songsInSet.map((song,i)=>{
          const skippedRow = isSkipped(song);
          const isEncore = song.set_name === "Zugaben" || song.isEncore;
          const showEncoreHead = isEncore && !encoreStarted;
          if (isEncore) encoreStarted = true;
          const st = prefs.drummer ? dStyle(song.drummer) : { bg: C.bgCard, border: C.borderSong };
          const isCurrent = !skippedRow && currentSongId === song.ps_id;
          const currentLiveIdxRow = live.findIndex(s=>s.ps_id===currentSongId);
          const thisLiveIdx = live.findIndex(s=>s.ps_id===song.ps_id);
          const isNext = !skippedRow && currentSongId && !isCurrent && thisLiveIdx === currentLiveIdxRow + 1;
          const opacity = skippedRow ? 0.38 : !currentSongId ? 1 : isCurrent ? 1 : isNext ? 0.75 : 0.35;
          const dCol = drummerColor(song.drummer);
          const ron = prefs.drummer && song.drummer==="Ron";
          const notes = songNotes(song);
          const chart = songChart(song);
          const notesOpen = !skippedRow && prefs.notes && gigNotesId === song.ps_id;
          const lyricsOpen = !skippedRow && prefs.lyrics && gigLyricsId === song.ps_id;
          const foldOpen = (notesOpen && notes) || (lyricsOpen && song.lyrics);
          const preview = (prefs.notes && !notesOpen && notes) ? firstNoteLine(notes) : "";
          const encoreIdx = isEncore ? songsInSet.filter((s,j)=>j<=i && (s.set_name==="Zugaben"||s.isEncore)).length : 0;
          const setNum = songsInSet.slice(0,i+1).filter(s=>s.set_name!=="Zugaben"&&!s.isEncore).length;
          return (
            <div key={song.ps_id || song.id} style={{ display:"flex", flexDirection:"column" }}>
              {showEncoreHead && (
                <div style={{
                  margin:"10px 4px 6px",
                  padding:"8px 4px 6px",
                  borderTop:"2px solid "+C.tealBorder,
                  color:C.teal,
                  fontFamily:"'Bebas Neue',cursive",
                  fontSize:18,
                  letterSpacing:"0.14em",
                  textAlign:"center"
                }}>● ZUGABEN ●</div>
              )}
              <div onClick={()=>pickSong(song)}
                style={{
                  background: skippedRow ? "#0a0a0a" : isCurrent ? (ron?C.redDim:C.tealDim) : isNext ? C.bgNext : "transparent",
                  border: "2px solid " + (skippedRow ? "#2a2a2a" : isCurrent ? (ron?C.red:C.teal) : isNext ? C.borderNext : C.borderSong),
                  borderRadius: foldOpen ? "7px 7px 0 0" : 7,
                  padding:"9px 13px", display:"flex", alignItems:"center", gap:10,
                  cursor: skippedRow ? "default" : "pointer", opacity, transition:"all .2s",
                  boxShadow: isCurrent ? "0 0 16px 2px " + (ron?C.redBorder:C.tealBorder) : "none"
                }}>
                <div style={{width:28,textAlign:"center",flexShrink:0}}>
                  {skippedRow
                    ? <div style={{color:C.grayDim,fontSize:11,letterSpacing:".04em"}}>⊘</div>
                    : isCurrent
                    ? <div style={{color:ron?C.red:C.teal,fontSize:16}}>▶</div>
                    : isNext
                      ? <div style={{color:C.textMute,fontSize:10,letterSpacing:".04em"}}>NEXT</div>
                      : <div style={{color:C.grayDim,fontSize:13,fontFamily:"'Space Mono',monospace"}}>{isEncore ? encoreIdx : setNum}</div>}
                </div>
                <div style={{width:36,minWidth:36,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {notes && !skippedRow && (
                    <FoldBtn on={notesOpen} title={notesOpen?"Notiz schließen":"Notiz hinterlegt"} icon="📝" onClick={()=>setGigNotesId(id=>id===song.ps_id?null:song.ps_id)}/>
                  )}
                </div>
                <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                  <div style={{
                    color: skippedRow ? C.grayDim : isCurrent?C.white:C.textDim,
                    fontFamily:"'Raleway',sans-serif", fontWeight:600,
                    fontSize: isCurrent?24:isNext?19:21,
                    lineHeight:1.15, transition:"font-size .2s",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                    textDecoration: skippedRow ? "line-through" : "none"
                  }}>{song.title}</div>
                  <div style={{color:isCurrent?C.gray:C.textMute,fontSize:11,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {skippedRow ? "gestrichen" : song.artist}
                  </div>
                  {preview && !skippedRow && (
                    <div style={{color:isCurrent?C.gray:C.textMute,fontSize:12,fontStyle:"italic",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {preview}
                    </div>
                  )}
                  {prefs.chart && isCurrent && hasChart(chart) && <ChartStrip chart={chart}/>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:"auto"}}>
                  {prefs.lyrics && song.lyrics && !skippedRow && <FoldBtn on={lyricsOpen} title="Lyrics" icon="📓" onClick={()=>setGigLyricsId(id=>id===song.ps_id?null:song.ps_id)}/>}
                  {prefs.click && song.bpm>0 && !skippedRow && (
                    showClickDock
                      ? (isCurrent ? null : <BpmBadge bpm={song.bpm} size={54}/>)
                      : <GigMetronome bpm={song.bpm} autoStart={false} size={54}/>
                  )}
                  {prefs.drummer && song.drummer && !skippedRow && <div style={{
                    color:dCol, border:"1px solid "+dCol, borderRadius:4,
                    padding:"5px 12px", fontSize:13, fontWeight:700,
                    letterSpacing:"0.08em", minWidth:44, textAlign:"center"
                  }}>{song.drummer}</div>}
                  {canEdit && (
                    <button onClick={(e)=>openNotesEdit(song,e)} title="Notizen bearbeiten"
                      style={{background:"transparent",border:"1px solid #333",borderRadius:4,color:C.gray,cursor:"pointer",padding:"4px 7px",fontSize:14}}>✎</button>
                  )}
                  <button onClick={(e)=>toggleSkip(song,e)} title={skippedRow ? "Wieder aktivieren" : "Song streichen"}
                    style={{background: skippedRow ? C.tealDim : "transparent", border:"1px solid "+(skippedRow?C.teal:"#333"), borderRadius:4, color: skippedRow?C.teal:C.grayDim, cursor:"pointer", padding:"4px 7px", fontSize:12, fontWeight:700, letterSpacing:"0.04em"}}>
                    {skippedRow ? "AN" : "AUS"}
                  </button>
                </div>
              </div>
              <SongFold
                notes={prefs.notes ? notes : ""}
                lyrics={prefs.lyrics ? song.lyrics : ""}
                notesOpen={notesOpen}
                lyricsOpen={lyricsOpen}
                border={st.border}
                onEditNotes={canEdit ? ()=>openNotesEdit(song) : undefined}
              />
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
          showClick={showClickDock}
          onNext={() => selectSong(nextSong)}
        />
      )}
      {editSong && (
        <Modal title={"Notizen · " + editSong.title} onClose={()=>setEditSong(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <Field value={editNotes} onChange={setEditNotes} rows={8} placeholder={"z.B. Count-In\nBD auf 1\nSchluss: Keys"}/>
            <Btn full disabled={editSaving} onClick={saveNotes}>{editSaving ? "Speichere…" : "Speichern"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export { GigMode };
