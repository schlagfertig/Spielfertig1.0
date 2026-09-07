import { SETS } from "./core";

function fold(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´]/g, "'")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSet(line) {
  const t = fold(line).replace(/_/g, " ");
  if (/^zugaben?\b/.test(t) || /^encores?\b/.test(t)) return "Zugaben";
  const m = t.match(/^set\s*([123])\b/);
  if (m) return "Set " + m[1];
  return null;
}

function stripSongLine(line) {
  let s = line.replace(/^\s*\d+[.)\-:]\s*/, "").trim();
  s = s.replace(/\s+[–—-]\s+/, " – ");
  let title = s, artist = "";
  const dash = s.split(/\s+[–—-]\s+/);
  if (dash.length >= 2) {
    title = dash[0].trim();
    artist = dash.slice(1).join(" – ").trim();
  }
  title = title.replace(/\s+\([^)]*\)\s*$/, "").trim();
  return { title, artist, raw: line.trim() };
}

export function parseSetlistText(text) {
  const rows = [];
  let set = "Set 1";
  const lines = String(text || "").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^hardy/i.test(line) && /setlist/i.test(line)) continue;
    if (/^setlist\b/i.test(line) && !detectSet(line)) continue;
    const header = detectSet(line);
    if (header) {
      set = header;
      continue;
    }
    if (line.length < 2) continue;
    if (/^[-=_*#]{3,}$/.test(line)) continue;
    const parsed = stripSongLine(line);
    if (!parsed.title || fold(parsed.title).length < 2) continue;
    rows.push({ set, ...parsed });
  }
  return rows;
}

function scoreMatch(want, song) {
  const wt = fold(want.title);
  const st = fold(song.title);
  if (!wt || !st) return 0;
  if (wt === st) return 100;
  if (st.startsWith(wt) || wt.startsWith(st)) return 88;
  if (st.includes(wt) || wt.includes(st)) return 76;
  const wWords = wt.split(" ").filter(Boolean);
  const sWords = new Set(st.split(" ").filter(Boolean));
  const hit = wWords.filter(w => sWords.has(w)).length;
  if (!hit) return 0;
  const ratio = hit / Math.max(wWords.length, st.split(" ").filter(Boolean).length);
  let sc = Math.round(ratio * 70);
  if (want.artist && fold(song.artist || "").includes(fold(want.artist))) sc += 8;
  return sc;
}

export function matchParsedSongs(rows, catalog) {
  const used = new Set();
  return rows.map(row => {
    let best = null, bestScore = 0;
    for (const song of catalog) {
      if (used.has(song.id)) continue;
      const sc = scoreMatch(row, song);
      if (sc > bestScore) {
        bestScore = sc;
        best = song;
      }
    }
    const ok = best && bestScore >= 55;
    if (ok) used.add(best.id);
    return {
      set: SETS.includes(row.set) ? row.set : "Set 1",
      raw: row.raw,
      title: row.title,
      artist: row.artist,
      song: ok ? best : null,
      score: bestScore,
    };
  });
}
