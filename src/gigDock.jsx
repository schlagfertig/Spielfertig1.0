import { C } from "./core";
import { GigMetronome } from "./gig";

export function GigDock({ current, nextSong, bpmNow, bpmNext, bpmDelta, nextChartText, narrow, onNext, showClick }) {
  const disabled = !nextSong || (current && nextSong.ps_id === current.ps_id);
  const clickSize = narrow ? 112 : 148;
  return (
    <div style={{
      flexShrink:0, background:"#071412", borderTop:"1px solid "+C.tealBorder,
      padding: narrow ? "10px 12px" : "12px 16px",
      display:"flex", alignItems:"center", gap:14, zIndex:5
    }}>
      {showClick && current && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <GigMetronome bpm={current.bpm} autoStart size={clickSize}/>
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onNext}
        style={{
          flex:1, minWidth:0, textAlign:"left",
          background: nextSong ? C.teal : "#111",
          color: nextSong ? "#000" : C.grayDim,
          border:"none", borderRadius:12,
          padding: narrow ? "14px 16px" : "16px 20px",
          cursor: nextSong ? "pointer" : "default",
          fontFamily:"inherit",
          minHeight: clickSize
        }}
      >
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", opacity:.75 }}>
          {current ? (nextSong ? "Next" : "Letzter Song") : "Start"}
        </div>
        <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:800, fontSize: narrow ? 22 : 28, letterSpacing:"-0.02em", lineHeight:1.12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginTop:2 }}>
          {nextSong ? nextSong.title : "\u2014"}
        </div>
        {nextSong && (bpmNext || bpmNow) ? (
          <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize: narrow ? 18 : 22, letterSpacing:"0.02em", marginTop:6, lineHeight:1 }}>
            {bpmNow && bpmDelta ? (bpmNow + "  \u2192  " + bpmNext + (bpmDelta > 0 ? "  \u2191" : "  \u2193")) : ((bpmNext || bpmNow) + " BPM")}
          </div>
        ) : null}
        {nextSong && nextChartText ? (
          <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:600, fontSize:12, marginTop:4, opacity:.7, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {nextChartText}
          </div>
        ) : null}
      </button>
    </div>
  );
}
