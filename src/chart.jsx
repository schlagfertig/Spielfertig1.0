import { C } from "./core";

const MARK_OPEN = "@@SFCHART@@";
const MARK_CLOSE = "@@/SFCHART@@";

export const CHART_METERS = ["4/4", "3/4", "6/8", "12/8", "5/4"];
export const CHART_FEELS = [
  { k: "straight", l: "Straight" },
  { k: "shuffle",  l: "Shuffle" },
  { k: "swing",    l: "Swing" },
  { k: "halftime", l: "Halftime" },
  { k: "double",   l: "Double" },
];
export const CHART_OPENS = ["HH", "Ride", "Sidestick", "Toms", "Crash"];
export const CHART_SECTIONS = [
  { id: "I", label: "Intro",  bars: 8 },
  { id: "V", label: "Verse",  bars: 16 },
  { id: "C", label: "Chorus", bars: 8 },
  { id: "B", label: "Bridge", bars: 8 },
  { id: "S", label: "Solo",   bars: 16 },
  { id: "O", label: "Out",    bars: 4 },
  { id: "X", label: "Extra",  bars: 8 },
];

export function emptyChart() {
  return { meter: "", feel: "", countIn: "", open: "", form: [], ending: "" };
}

function feelLabel(k) {
  return (CHART_FEELS.find(f => f.k === k) || {}).l || k || "";
}

function sectionLabel(id) {
  return (CHART_SECTIONS.find(s => s.id === id) || {}).label || id;
}

export function normalizeChart(raw) {
  const base = emptyChart();
  if (!raw || typeof raw !== "object") return base;
  const form = Array.isArray(raw.form) ? raw.form : [];
  return {
    meter:   String(raw.meter || ""),
    feel:    String(raw.feel || ""),
    countIn: String(raw.countIn || ""),
    open:    String(raw.open || ""),
    ending:  String(raw.ending || ""),
    form: form
      .filter(b => b && b.id)
      .map(b => ({
        id: String(b.id),
        bars: Math.max(0, parseInt(b.bars, 10) || 0),
        cue: String(b.cue || ""),
      })),
  };
}

export function hasChart(chart) {
  const c = normalizeChart(chart);
  return !!(c.meter || c.feel || c.countIn || c.open || c.ending || c.form.length);
}

export function formLine(chart) {
  const c = normalizeChart(chart);
  return c.form.map(b => b.id + (b.bars || "")).join(" ");
}

export function chartSummary(chart) {
  const c = normalizeChart(chart);
  const bits = [];
  if (c.meter) bits.push(c.meter);
  if (c.feel) bits.push(feelLabel(c.feel));
  const form = formLine(c);
  if (form) bits.push(form);
  return bits.join(" · ");
}

export function unpackSpecialties(raw) {
  const text = String(raw || "");
  const start = text.indexOf(MARK_OPEN);
  if (start === -1) return { notes: text, chart: emptyChart() };
  const afterOpen = start + MARK_OPEN.length;
  const end = text.indexOf(MARK_CLOSE, afterOpen);
  let json = "";
  let rest = "";
  if (end === -1) {
    const nl = text.indexOf("\n", afterOpen);
    json = (nl === -1 ? text.slice(afterOpen) : text.slice(afterOpen, nl)).trim();
    rest = nl === -1 ? "" : text.slice(nl + 1);
  } else {
    json = text.slice(afterOpen, end).trim();
    rest = text.slice(end + MARK_CLOSE.length);
  }
  let chart = emptyChart();
  try { chart = normalizeChart(JSON.parse(json)); } catch (_) {}
  return { notes: rest.replace(/^\n+/, ""), chart };
}

export function packSpecialties(notes, chart) {
  const n = String(notes || "").replace(/^\n+/, "");
  const c = normalizeChart(chart);
  if (!hasChart(c)) return n;
  const block = MARK_OPEN + JSON.stringify(c) + MARK_CLOSE;
  return n ? block + "\n" + n : block;
}

export function songNotes(song) {
  return unpackSpecialties(song && song.specialties).notes;
}

export function songChart(song) {
  if (song && song.chart && typeof song.chart === "object") return normalizeChart(song.chart);
  return unpackSpecialties(song && song.specialties).chart;
}

function Chip({ on, label, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title || label} style={{
      background: on ? C.tealDim : "transparent",
      color: on ? C.teal : C.gray,
      border: "1px solid " + (on ? C.tealBorder : "#2a2a2a"),
      borderRadius: 4,
      padding: "5px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
    }}>{label}</button>
  );
}

export function ChartLine({ chart, style }) {
  const c = normalizeChart(chart);
  if (!hasChart(c)) return null;
  const form = formLine(c);
  return (
    <div style={{
      color: C.gray,
      fontSize: 11,
      fontFamily: "'Space Mono',monospace",
      letterSpacing: "0.02em",
      marginTop: 3,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      ...style,
    }}>
      {c.meter && <span style={{ color: C.teal }}>{c.meter}</span>}
      {c.meter && (c.feel || form) ? " · " : ""}
      {c.feel ? feelLabel(c.feel) : ""}
      {c.feel && form ? " · " : ""}
      {form}
      {c.open ? <span style={{ color: C.grayDim }}> · {c.open}</span> : null}
    </div>
  );
}

export function ChartStrip({ chart }) {
  const c = normalizeChart(chart);
  if (!hasChart(c)) return null;
  const meta = [
    c.meter,
    c.feel ? feelLabel(c.feel) : "",
    c.countIn,
    c.open,
  ].filter(Boolean);
  return (
    <div style={{
      marginTop: 6,
      padding: "7px 8px",
      background: "rgba(92,200,184,0.08)",
      border: "1px solid " + C.tealBorder,
      borderRadius: 5,
    }}>
      {meta.length > 0 && (
        <div style={{
          color: C.teal,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: c.form.length || c.ending ? 5 : 0,
        }}>{meta.join("  ·  ")}</div>
      )}
      {c.form.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {c.form.map((b, i) => (
            <div key={i} title={(sectionLabel(b.id)) + (b.cue ? " — " + b.cue : "")} style={{
              border: "1px solid " + C.tealBorder,
              color: C.white,
              borderRadius: 4,
              padding: "3px 7px",
              fontSize: 12,
              fontFamily: "'Space Mono',monospace",
            }}>
              <span style={{ color: C.teal, fontWeight: 700 }}>{b.id}{b.bars || ""}</span>
              {b.cue ? <span style={{ color: C.gray, marginLeft: 6, fontFamily: "Raleway,sans-serif", fontSize: 11 }}>{b.cue}</span> : null}
            </div>
          ))}
        </div>
      )}
      {c.ending ? (
        <div style={{ color: C.gray, fontSize: 12, marginTop: 5, fontStyle: "italic" }}>Ende: {c.ending}</div>
      ) : null}
    </div>
  );
}

export function ChartEditor({ value, onChange }) {
  const chart = normalizeChart(value);
  const set = (patch) => onChange({ ...chart, ...patch });
  const addBlock = (sec) => set({ form: [...chart.form, { id: sec.id, bars: sec.bars, cue: "" }] });
  const updateBlock = (i, patch) => set({
    form: chart.form.map((b, idx) => idx === i ? { ...b, ...patch } : b),
  });
  const removeBlock = (i) => set({ form: chart.form.filter((_, idx) => idx !== i) });

  const fieldStyle = {
    background: "#0a0a0a",
    border: "1px solid #222",
    color: C.white,
    borderRadius: 4,
    padding: "7px 8px",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Chart</div>

      <div>
        <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Metrum</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHART_METERS.map(m => (
            <Chip key={m} label={m} on={chart.meter === m} onClick={() => set({ meter: chart.meter === m ? "" : m })} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Feel</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHART_FEELS.map(f => (
            <Chip key={f.k} label={f.l} on={chart.feel === f.k} onClick={() => set({ feel: chart.feel === f.k ? "" : f.k })} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Count-In</div>
          <input value={chart.countIn} onChange={e => set({ countIn: e.target.value })} placeholder="2T Click, Sticks…" style={fieldStyle} />
        </div>
        <div>
          <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Opening</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {CHART_OPENS.map(o => (
              <Chip key={o} label={o} on={chart.open === o} onClick={() => set({ open: chart.open === o ? "" : o })} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Form</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {CHART_SECTIONS.map(s => (
            <Chip key={s.id} label={"+ " + s.id + s.bars} title={s.label} on={false} onClick={() => addBlock(s)} />
          ))}
        </div>
        {chart.form.length === 0
          ? <div style={{ color: C.grayDim, fontSize: 12 }}>Blöcke antippen — z.B. I8 V16 C8 Out4</div>
          : chart.form.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <div style={{
                width: 28, textAlign: "center", color: C.teal, fontWeight: 800,
                fontFamily: "'Space Mono',monospace", fontSize: 14, flexShrink: 0,
              }}>{b.id}</div>
              <input type="number" min="0" value={b.bars || ""} onChange={e => updateBlock(i, { bars: parseInt(e.target.value, 10) || 0 })}
                style={{ ...fieldStyle, width: 56, textAlign: "center", fontFamily: "'Space Mono',monospace" }} />
              <input value={b.cue} onChange={e => updateBlock(i, { cue: e.target.value })} placeholder="Cue…"
                style={{ ...fieldStyle, flex: 1 }} />
              <button type="button" onClick={() => removeBlock(i)}
                style={{ background: "transparent", border: "none", color: C.grayDim, cursor: "pointer", fontSize: 16, padding: "4px 6px" }}>✕</button>
            </div>
          ))
        }
      </div>

      <div>
        <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Ende</div>
        <input value={chart.ending} onChange={e => set({ ending: e.target.value })} placeholder="Hit auf 1, Rit., Fermate…" style={fieldStyle} />
      </div>
    </div>
  );
}

export function chartPrintText(chart) {
  const c = normalizeChart(chart);
  if (!hasChart(c)) return "";
  const bits = [];
  if (c.meter) bits.push(c.meter);
  if (c.feel) bits.push(feelLabel(c.feel));
  if (c.countIn) bits.push(c.countIn);
  if (c.open) bits.push(c.open);
  const form = formLine(c);
  if (form) bits.push(form);
  const cues = c.form.filter(b => b.cue).map(b => b.id + ": " + b.cue);
  if (cues.length) bits.push(cues.join(" · "));
  if (c.ending) bits.push("Ende: " + c.ending);
  return bits.join(" · ");
}
