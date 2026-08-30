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
  const pulseColor = beat ? "#fff" : active ? C.teal : C.grayDim;
  const glow = beat ? "0 0 14px 5px " + C.teal : active ? "0 0 5px 2px " + C.tealBorder : "none";
  const dot = Math.round(size * 0.33);
  const bpmSize = Math.round(size * 0.22);
  return (
    <button onClick={onToggle} title={(active?"Click aus":"Click an")+" ("+bpm+" BPM)"}
      style={{ background:"transparent", border:"1px solid "+(active?C.teal:"#333"), borderRadius:"50%", width:size, height:size, cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:glow, transition:"all .1s", flexShrink:0 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
        <div style={{ width:dot, height:dot, borderRadius:"50%", background:pulseColor, transition:"background .05s" }}/>
        <div style={{ color:active?C.teal:C.grayDim, fontSize:bpmSize, fontFamily:"'Space Mono',monospace", lineHeight:1 }}>{bpm}</div>
      </div>
    </button>
  );
}

export { GigMetronome };
