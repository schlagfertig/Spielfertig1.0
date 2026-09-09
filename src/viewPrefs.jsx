import { useState } from "react";
import { C } from "./core";

const KEY = "sf_view_prefs";
const DEFAULTS = { notes: true, lyrics: true, click: true };

function readPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

function useViewPrefs() {
  const [prefs, setPrefs] = useState(readPrefs);
  const setPref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
  };
  const toggle = (key) => setPref(key, !prefs[key]);
  return [prefs, toggle];
}

function PrefChip({ on, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: on ? C.tealDim : "transparent",
      color: on ? C.teal : C.grayDim,
      border: "1px solid " + (on ? C.tealBorder : "#333"),
      borderRadius: 4,
      padding: "5px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
    }}>{label}</button>
  );
}

function ViewPrefBar({ prefs, toggle }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
      <PrefChip on={prefs.notes}  label="📝 Notizen" onClick={()=>toggle("notes")} />
      <PrefChip on={prefs.lyrics} label="📓 Lyrics"  onClick={()=>toggle("lyrics")} />
      <PrefChip on={prefs.click}  label="⏱ Click"    onClick={()=>toggle("click")} />
    </div>
  );
}

export { useViewPrefs, ViewPrefBar };
