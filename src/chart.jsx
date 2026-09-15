import { C } from "./core";

const MARK_OPEN = "@@SFCHART@@";
const MARK_CLOSE = "@@/SFCHART@@";
const DUR_OPEN = "@@SFDUR@@";
const DUR_CLOSE = "@@/SFDUR@@";

export function parseDurationInput(v) {
  const s = String(v || "").trim().replace(",", ":");
  if (!s) return 0;
  if (/^\d+:\d{1,2}$/.test(s)) {
    const [m, sec] = s.split(":").map(n => parseInt(n, 10) || 0);
    return Math.max(0, m * 60 + Math.min(59, sec));
  }
  const n = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 30 && Number.isInteger(n)) return n;
  return Math.round(n * 60);
}

export function formatDuration(sec) {
  const n = Math.max(0, parseInt(sec, 10) || 0);
  if (!n) return "";
  const m = Math.floor(n / 60);
  const s = n % 60;
  return s ? m + ":" + String(s).padStart(2, "0") : String(m) + "′";
}

export function formatDurationField(sec) {
  const n = Math.max(0, parseInt(sec, 10) || 0);
  if (!n) return "";
  const m = Math.floor(n / 60);
  const s = n % 60;
  return m + ":" + String(s).padStart(2, "0");
}

export function sumDurations(songs) {
  let total = 0, known = 0, missing = 0;
  (songs || []).forEach(s => {
    const d = songDuration(s);
    if (d) { total += d; known += 1; }
    else missing += 1;
  });
  return { total, known, missing };
}

export function durationLabel(songs) {
  const { total, missing } = sumDurations(songs);
  if (!total) return missing ? "Dauer offen" : "";
  return formatDuration(total) + (missing ? " +" : "");
}

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

function stripDuration(raw) {
  const text = String(raw || "");
  const start = text.indexOf(DUR_OPEN);
  if (start === -1) return { duration: 0, text };
  const after = start + DUR_OPEN.length;
  const end = text.indexOf(DUR_CLOSE, after);
  let num = "0";
  let rest = text;
  if (end === -1) {
    const nl = text.indexOf("\n", after);
    num = (nl === -1 ? text.slice(after) : text.slice(after, nl)).trim();
    rest = text.slice(0, start) + (nl === -1 ? "" : text.slice(nl + 1));
  } else {
    num = text.slice(after, end).trim();
    rest = text.slice(0, start) + text.slice(end + DUR_CLOSE.length);
  }
  return { duration: Math.max(0, parseInt(num, 10) || 0), text: rest.replace(/^\n+/, "") };
}

export function unpackSpecialties(raw) {
  const stripped = stripDuration(raw);
  const text = stripped.text;
  const start = text.indexOf(MARK_OPEN);
  if (start === -1) return { notes: text, chart: emptyChart(), duration: stripped.duration };
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
  return { notes: rest.replace(/^\n+/, ""), chart, duration: stripped.duration };
}

export function packSpecialties(notes, chart, duration) {
  const n = String(notes || "").replace(/^\n+/, "");
  const c = normalizeChart(chart);
  const d = Math.max(0, parseInt(duration, 10) || 0);
  let out = "";
  if (d) out += DUR_OPEN + d + DUR_CLOSE;
  if (hasChart(c)) out += (out ? "\n" : "") + MARK_OPEN + JSON.stringify(c) + MARK_CLOSE;
  if (n) out += (out ? "\n" : "") + n;
  return out;
}

export function songNotes(song) {
  return unpackSpecialties(song && song.specialties).notes;
}

export function songChart(song) {
  if (song && song.chart && typeof song.chart === "object") return normalizeChart(song.chart);
  return unpackSpecialties(song && song.specialties).chart;
}

export function songDuration(song) {
  if (song && song.duration_sec) return Math.max(0, parseInt(song.duration_sec, 10) || 0);
  return unpackSpecialties(song && song.specialties).duration || 0;
}
