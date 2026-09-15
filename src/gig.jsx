import { useEffect, useRef } from "react";
import { C } from "./core";
import { useMetronome } from "./audio";

function GigMetronome({ bpm, autoStart, size=44 }) {
  const { active, beat, toggle, start, stop } = useMetronome(bpm);
  const userMuted = useRef(false);
  useEffect(() => {
    if (autoStart) {
      if (!userMuted.current) start();
    } else {
      userMuted.current = false;
      stop();
    }
  }, [autoStart]);
  const onToggle = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (autoStart && active) userMuted.current = true;
    if (autoStart && !active) userMuted.current = false;
    toggle(e);
  };
  const large = size >= 72;
  const on = active || beat;
  const fill = beat ? "rgba(92,200,184,0.32)" : active ? "rgba(92,200,184,0.12)" : "transparent";
  const ring = beat ? "#fff" : active ? C.teal : "#2a2a2a";
  const num = beat ? "#fff" : active ? C.teal : C.grayDim;
  const bpmSize = Math.max(12, Math.round(size * (large ? 0.36 : 0.34)));
  const labelSize = Math.max(8, Math.round(size * 0.11));
  return (
    <button onClick={onToggle} title={(active?"Click aus":"Click an")+" ("+bpm+" BPM)"}
      style={{
        background: fill,
        border: (large ? 3 : 2) + "px solid " + ring,
        borderRadius: "50%",
        width: size,
        height: size,
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: beat
          ? "0 0 24px 7px " + C.tealBorder
          : active
            ? "0 0 12px 3px " + C.tealBorder
            : "none",
        transform: beat ? "scale(1.07)" : "scale(1)",
        transition: "transform .05s linear, background .05s linear, box-shadow .05s linear, border-color .05s linear",
        flexShrink: 0,
      }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
        <div style={{
          color: num,
          fontSize: bpmSize,
          fontFamily: "'Space Mono',monospace",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}>{bpm}</div>
        {large && (
          <div style={{
            color: on ? C.teal : C.grayDim,
            fontSize: labelSize,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginTop: 4,
            opacity: beat ? 1 : 0.8,
          }}>BPM</div>
        )}
      </div>
    </button>
  );
}

export { GigMetronome };
