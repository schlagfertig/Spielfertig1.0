import { useRef, useState } from "react";
import { C, glassStyle } from "./core";
import { GigMetronome } from "./gig";
import { songNotes } from "./chart";

const METERS = ["4/4", "3/4", "6/8", "2/4", "5/4"];

function TapTempo({ onBpm }) {
  const taps = useRef([]);
  const [flash, setFlash] = useState(false);
  const [shown, setShown] = useState(null);
  const tap = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const now = performance.now();
    taps.current = taps.current.filter(t => now - t < 2400);
    taps.current.push(now);
    setFlash(true);
    setTimeout(() => setFlash(false), 90);
    if (taps.current.length < 2) return;
    const gaps = [];
    for (let i = 1; i < taps.current.length; i++) gaps.push(taps.current[i] - taps.current[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const bpm = Math.round(60000 / avg);
    if (bpm >= 40 && bpm <= 240) {
      setShown(bpm);
      if (onBpm) onBpm(bpm);
    }
  };
  return (
    <button type="button" onPointerDown={tap} title="Tempo klopfen"
      style={{
        ...glassStyle({ borderRadius: 999, background: flash ? "rgba(92,200,184,0.45)" : "rgba(22,30,34,0.55)" }),
        color: C.teal,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontSize: 13,
        padding: "8px 16px",
        cursor: "pointer",
        fontFamily: "inherit",
        minWidth: 88,
      }}>
      {shown ? shown : "Tap"}
    </button>
  );
}

function rowId(song) {
  if (!song) return "";
  return song.ps_id || (String(song.id) + ":" + String(song.position || ""));
}

export function GigDock({ current, nextSong, bpmNow, bpmNext, bpmDelta, nextChartText, narrow, onNext, showClick, stack, onTapBpm, onCycleMeter }) {
  const disabled = !nextSong || (current && rowId(nextSong) === rowId(current));
  const clickSize = stack ? 124 : (narrow ? 112 : 148);
  const noteLines = nextSong
    ? songNotes(nextSong).split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, stack ? 1 : 3)
    : [];
  const nextInner = (
    <>
      <div style={{ flex: stack ? 1 : "0 1 46%", minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:C.teal }}>
          {current ? (nextSong ? "Next" : "Letzter Song") : "Start"}
        </div>
        <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:800, fontSize: stack ? 18 : (narrow ? 22 : 28), letterSpacing:"-0.02em", lineHeight:1.12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginTop:2, color:C.white }}>
          {nextSong ? nextSong.title : "\u2014"}
        </div>
        {nextSong && (bpmNext || bpmNow) ? (
          <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize: stack ? 15 : (narrow ? 16 : 20), letterSpacing:"0.02em", marginTop:4, lineHeight:1, color:C.teal }}>
            {bpmNow && bpmDelta ? (bpmNow + "  \u2192  " + bpmNext + (bpmDelta > 0 ? "  \u2191" : "  \u2193")) : ((bpmNext || bpmNow) + " BPM")}
          </div>
        ) : null}
        {!stack && nextSong && nextChartText ? (
          <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:600, fontSize:12, marginTop:4, color:C.gray }}>
            {nextChartText}
          </div>
        ) : null}
      </div>
      <div style={{
        flex: stack ? "0 1 42%" : 1, minWidth:0, alignSelf:"stretch",
        borderLeft: nextSong ? "1px solid "+C.tealBorder : "none",
        paddingLeft: stack ? 10 : (narrow ? 14 : 22),
        display:"flex", flexDirection:"column", justifyContent:"center"
      }}>
        {noteLines.length ? noteLines.map((line, i) => (
          <div key={i} style={{
            fontFamily:"'Raleway',sans-serif",
            fontWeight: i === 0 ? 700 : 600,
            fontStyle:"italic",
            fontSize: stack ? 13 : (narrow ? 15 : 18),
            lineHeight:1.3,
            color: C.white,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
          }}>{line}</div>
        )) : (
          <div style={{ fontFamily:"'Raleway',sans-serif", fontWeight:600, fontSize:13, color:C.grayDim }}>
            {nextSong ? "Keine Notiz" : ""}
          </div>
        )}
      </div>
    </>
  );
  return (
    <div style={{
      ...glassStyle({ background: "rgba(22,30,34,0.55)", borderRadius: 0, border: "none", borderTop: "1px solid rgba(255,255,255,0.16)" }),
      flexShrink:0,
      padding: stack ? "10px 12px 12px" : (narrow ? "10px 12px" : "12px 16px"),
      display:"flex", flexDirection: stack ? "column" : "row", alignItems:"center", gap: stack ? 10 : 14, zIndex:5
    }}>
      {showClick && current && (
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <div style={{
            position:"absolute",
            bottom:"calc(100% + 10px)",
            left:"50%",
            transform:"translateX(-50%)",
            zIndex:12,
            display:"flex",
            alignItems:"center",
            gap:8,
          }}>
            <TapTempo onBpm={onTapBpm}/>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); if (onCycleMeter) onCycleMeter(); }} title="Taktart"
              style={{
                ...glassStyle({ borderRadius: 999, background: "rgba(22,30,34,0.55)" }),
                color: C.white,
                fontWeight: 800,
                fontSize: 13,
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "'Space Mono',monospace",
                letterSpacing: "0.04em",
              }}>
              {current.meter || "4/4"}
            </button>
          </div>
          <GigMetronome bpm={current.bpm} meter={current.meter || "4/4"} autoStart size={clickSize} now accent={C.teal}/>
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onNext}
        style={{
          flex:1, minWidth:0, width: stack ? "100%" : undefined, textAlign:"left",
          ...(nextSong ? glassStyle({ background: "rgba(92,200,184,0.16)", borderRadius: 16 }) : glassStyle({ borderRadius: 16 })),
          color: nextSong ? C.white : C.grayDim,
          border: "1px solid " + (nextSong ? "rgba(92,200,184,0.45)" : "rgba(255,255,255,0.16)"),
          padding: stack ? "10px 12px" : (narrow ? "12px 16px" : "14px 20px"),
          cursor: nextSong ? "pointer" : "default",
          fontFamily:"inherit",
          minHeight: stack ? 64 : clickSize,
          display:"flex", alignItems:"center", gap: stack ? 10 : (narrow ? 16 : 28)
        }}
      >
        {nextInner}
      </button>
    </div>
  );
}
