import { C } from "./core";
import { FoldBtn } from "./songPanels";
import { ChartStrip, hasChart } from "./chart";

export function GigNowCard({
  song, notes, chart, prefs, narrow,
  lyricsOpen, canEdit, onPick, onLyrics, onEdit, onSkip,
}) {
  const lines = notes ? notes.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 3) : [];
  return (
    <div onClick={onPick} style={{
      background: C.teal,
      border: "2px solid " + C.teal,
      borderRadius: 12,
      padding: narrow ? "12px 12px" : "14px 18px",
      display: "flex",
      flexDirection: narrow ? "column" : "row",
      alignItems: narrow ? "stretch" : "center",
      gap: narrow ? 10 : 20,
      cursor: "pointer",
      boxShadow: "0 0 22px 2px " + C.tealBorder,
      minHeight: narrow ? 0 : 112,
      color: "#000",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
        <div style={{ flexShrink:0, width:24, textAlign:"center", color:"#000", fontSize:18 }}>▶</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:"#000", opacity:.7 }}>
            Now
          </div>
          <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:800, fontSize: narrow ? 20 : 28, letterSpacing:"-0.02em", lineHeight:1.12, color:"#000", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginTop:2 }}>
            {song.title}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"baseline", marginTop:4, minWidth:0 }}>
            {song.bpm > 0 && (
              <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize: narrow ? 15 : 20, color:"#000", letterSpacing:"0.02em", flexShrink:0 }}>
                {song.bpm} BPM
              </div>
            )}
            <div style={{ color:"rgba(0,0,0,0.55)", fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {song.artist}
            </div>
          </div>
          {prefs.chart && hasChart(chart) && <ChartStrip chart={chart}/>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {prefs.lyrics && song.lyrics && (
            <FoldBtn on={lyricsOpen} title="Lyrics" kind="lyrics" onClick={onLyrics}/>
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
      <div style={{
        borderTop: narrow ? "1px solid rgba(0,0,0,0.18)" : "none",
        borderLeft: narrow ? "none" : "1px solid rgba(0,0,0,0.18)",
        paddingTop: narrow ? 8 : 0,
        paddingLeft: narrow ? 0 : 18,
        flex: narrow ? "none" : 1,
        minWidth: 0,
      }}>
        {lines.length ? lines.map((line, i) => (
          <div key={i} style={{
            color: "#000",
            fontFamily:"'Raleway',sans-serif",
            fontWeight: i === 0 ? 700 : 600,
            fontStyle:"italic",
            fontSize: narrow ? 14 : 17,
            lineHeight:1.3,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
          }}>{line}</div>
        )) : (
          <div style={{ color:"rgba(0,0,0,0.4)", fontFamily:"'Raleway',sans-serif", fontSize:13 }}>Keine Notiz</div>
        )}
      </div>
    </div>
  );
}
