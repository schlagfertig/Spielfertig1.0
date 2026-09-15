import { C } from "./core";
import { FoldBtn } from "./songPanels";
import { ChartStrip, hasChart } from "./chart";

export function GigNowCard({
  song, notes, chart, prefs, narrow, ron,
  lyricsOpen, canEdit, onPick, onLyrics, onEdit, onSkip,
}) {
  const lines = notes ? notes.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 3) : [];
  const fill = ron ? C.red : C.teal;
  return (
    <div onClick={onPick} style={{
      background: fill,
      border: "2px solid " + fill,
      borderRadius: 12,
      padding: narrow ? "12px 14px" : "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: narrow ? 12 : 20,
      cursor: "pointer",
      boxShadow: "0 0 22px 2px " + (ron ? C.redBorder : C.tealBorder),
      minHeight: narrow ? 96 : 112,
      color: "#000",
    }}>
      <div style={{ flexShrink:0, width:28, textAlign:"center", color:"#000", fontSize:18 }}>▶</div>
      <div style={{ flex:"0 1 42%", minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:"#000", opacity:.7 }}>
          Now
        </div>
        <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:800, fontSize: narrow ? 22 : 28, letterSpacing:"-0.02em", lineHeight:1.12, color:"#000", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginTop:2 }}>
          {song.title}
        </div>
        {song.bpm > 0 && (
          <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize: narrow ? 16 : 20, color:"#000", marginTop:6, letterSpacing:"0.02em" }}>
            {song.bpm} BPM
          </div>
        )}
        <div style={{ color:"rgba(0,0,0,0.55)", fontSize:12, marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {song.artist}
        </div>
        {prefs.chart && hasChart(chart) && <ChartStrip chart={chart}/>}
      </div>
      <div style={{
        flex:1, minWidth:0, alignSelf:"stretch",
        borderLeft: "1px solid rgba(0,0,0,0.18)",
        paddingLeft: narrow ? 12 : 18,
        display:"flex", flexDirection:"column", justifyContent:"center"
      }}>
        {lines.length ? lines.map((line, i) => (
          <div key={i} style={{
            color: "#000",
            fontFamily:"'Raleway',sans-serif",
            fontWeight: i === 0 ? 700 : 600,
            fontStyle:"italic",
            fontSize: narrow ? 15 : 17,
            lineHeight:1.3,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
          }}>{line}</div>
        )) : (
          <div style={{ color:"rgba(0,0,0,0.4)", fontFamily:"'Raleway',sans-serif", fontSize:13 }}>Keine Notiz</div>
        )}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        {prefs.lyrics && song.lyrics && (
          <FoldBtn on={lyricsOpen} title="Lyrics" icon="\uD83D\uDCD3" onClick={onLyrics}/>
        )}
        {canEdit && (
          <button onClick={onEdit} title="Notizen bearbeiten"
            style={{background:"transparent",border:"1px solid rgba(0,0,0,0.28)",borderRadius:4,color:"#000",cursor:"pointer",padding:"4px 7px",fontSize:14}}>✎</button>
        )}
        <button onClick={onSkip} title="Song streichen"
          style={{background:"transparent", border:"1px solid rgba(0,0,0,0.28)", borderRadius:4, color:"#000", cursor:"pointer", padding:"4px 7px", fontSize:12, fontWeight:700, letterSpacing:"0.04em"}}>
          AUS
        </button>
      </div>
    </div>
  );
}
