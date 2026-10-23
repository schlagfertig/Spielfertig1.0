import { packSpecialties, songChart, songDuration, songMeter, songNotes } from "./chart";

const LOCAL_KEY = "sf_local";
const CACHE_KEY = "sf_cache";
const MARK_KEY = "sf_uebernommen";
const LATER_KEY = "sf_spaeter";

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function hasStuff(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

function normalizePack(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pack = {
    bands: Array.isArray(raw.bands) ? raw.bands.filter(b => b && b.id != null && !b.band) : [],
    songs: Array.isArray(raw.songs) ? raw.songs : [],
    gigs: Array.isArray(raw.gigs) ? raw.gigs : [],
    playlists: Array.isArray(raw.playlists) ? raw.playlists : (Array.isArray(raw.pls) ? raw.pls : []),
    playlist_songs: Array.isArray(raw.playlist_songs) ? raw.playlist_songs : (Array.isArray(raw.ps) ? raw.ps : []),
  };
  if (!hasStuff(pack.bands) && !hasStuff(pack.songs) && !hasStuff(pack.gigs) && !hasStuff(pack.playlists)) return null;
  return pack;
}

function preserveDeviceCopy() {
  if (normalizePack(readJson(LOCAL_KEY))) return;
  const cache = normalizePack(readJson(CACHE_KEY));
  if (!cache) return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({
      bands: cache.bands,
      songs: cache.songs,
      gigs: cache.gigs,
      playlists: cache.playlists,
      playlist_songs: cache.playlist_songs,
      invites: [],
      band_members: [],
    }));
  } catch (_) {}
}

function readDevicePack() {
  preserveDeviceCopy();
  const local = normalizePack(readJson(LOCAL_KEY));
  if (local) return local;
  return normalizePack(readJson(CACHE_KEY));
}

function hashString(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function fingerprint(pack) {
  const line = (rows, fields) => (rows || []).map(r => fields.map(f => String(r && r[f] != null ? r[f] : "")).join("|")).join("\n");
  const text = [
    line(pack.bands, ["id", "name"]),
    line(pack.songs, ["id", "band_id", "title"]),
    line(pack.gigs, ["id", "band_id", "name", "date"]),
    line(pack.playlists, ["id", "gig_id", "name"]),
    line(pack.playlist_songs, ["playlist_id", "song_id", "set_name", "position"]),
  ].join("\n--\n");
  return hashString(text);
}

function readMarks() {
  const raw = readJson(MARK_KEY);
  return raw && typeof raw === "object" ? raw : {};
}

function alreadyTaken(userId, hash) {
  const marks = readMarks();
  return !!(marks[userId] && marks[userId][hash]);
}

function markTaken(userId, hash) {
  const marks = readMarks();
  if (!marks[userId]) marks[userId] = {};
  marks[userId][hash] = new Date().toISOString();
  try { localStorage.setItem(MARK_KEY, JSON.stringify(marks)); } catch (_) {}
}

function laterKey(userId, hash) {
  return String(userId) + ":" + hash;
}

function dismissedLater(userId, hash) {
  try { return sessionStorage.getItem(LATER_KEY) === laterKey(userId, hash); }
  catch (_) { return false; }
}

function dismissLater(userId, hash) {
  try { sessionStorage.setItem(LATER_KEY, laterKey(userId, hash)); } catch (_) {}
}

function packCounts(pack) {
  return {
    bands: (pack.bands || []).length,
    songs: (pack.songs || []).length,
    gigs: (pack.gigs || []).length,
    playlists: (pack.playlists || []).length,
  };
}

function packFromExport(payload) {
  if (!payload || typeof payload !== "object") throw new Error("die datei ist leer");
  if (payload.version != null && Number(payload.version) !== 1) throw new Error("diese datei kenne ich nicht");
  const nested = Array.isArray(payload.bands) && payload.bands.some(p => p && p.band);
  if (nested) {
    const pack = { bands: [], songs: [], gigs: [], playlists: [], playlist_songs: [] };
    payload.bands.forEach(p => {
      if (p.band) pack.bands.push(p.band);
      (p.songs || []).forEach(s => pack.songs.push(s));
      (p.gigs || []).forEach(g => pack.gigs.push(g));
      (p.playlists || []).forEach(pl => pack.playlists.push(pl));
      (p.playlist_songs || []).forEach(ps => pack.playlist_songs.push(ps));
    });
    if (!pack.bands.length) throw new Error("keine band in der datei");
    return pack;
  }
  const flat = normalizePack(payload);
  if (!flat || !flat.bands.length) throw new Error("keine band in der datei");
  return flat;
}

function songForAccount(song, bandId) {
  const chart = { ...songChart(song) };
  const meter = songMeter(song);
  if (meter) chart.meter = meter;
  return {
    band_id: bandId,
    title: (song && song.title) || "Song",
    artist: (song && song.artist) || "",
    bpm: parseInt(song && song.bpm, 10) || 0,
    drummer: (song && song.drummer) || "",
    specialties: packSpecialties(songNotes(song), chart, songDuration(song)) || "",
    lyrics: song && song.lyrics ? song.lyrics : null,
  };
}

function asDate(value) {
  if (value == null || value === "") return null;
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function inserted(row, label) {
  if (row && row.id != null && row.message == null && row.error == null && row.code == null) return row;
  const msg = row && (row.message || row.msg || row.error_description || row.details || row.error);
  throw new Error(label + (msg ? ": " + msg : ""));
}

async function importPackIntoAccount(client, pack, userId) {
  const created = [];
  const fail = async (err) => {
    const leftover = [];
    for (const id of created.slice().reverse()) {
      try { await client.deleteStrict("bands", "id=eq." + id); }
      catch (_) { leftover.push(id); }
    }
    return { ok: false, error: err && err.message ? err.message : "unbekannt", leftover };
  };
  try {
    if (!pack || !Array.isArray(pack.bands) || !pack.bands.length) throw new Error("keine band in den daten");
    const bandMap = new Map();
    const songMap = new Map();
    const gigMap = new Map();
    const plMap = new Map();

    for (const band of pack.bands) {
      const drummers = Array.isArray(band.drummers) && band.drummers.length ? band.drummers : ["Tom"];
      const row = inserted(await client.insert("bands", {
        name: band.name || "Band",
        emoji: band.emoji || "🎸",
        color: band.color || "#5cc8b8",
        drummers,
        user_id: userId,
      }), "band");
      created.push(row.id);
      bandMap.set(String(band.id), row.id);
    }

    for (const song of pack.songs || []) {
      const bandId = bandMap.get(String(song.band_id));
      if (bandId == null) continue;
      const row = inserted(await client.insert("songs", songForAccount(song, bandId)), "song");
      songMap.set(String(song.id), row.id);
    }

    for (const gig of pack.gigs || []) {
      const bandId = bandMap.get(String(gig.band_id));
      if (bandId == null) continue;
      const row = inserted(await client.insert("gigs", {
        band_id: bandId,
        name: gig.name || "Gig",
        date: asDate(gig.date),
      }), "gig");
      gigMap.set(String(gig.id), row.id);
    }

    for (const pl of pack.playlists || []) {
      const gigId = gigMap.get(String(pl.gig_id));
      if (gigId == null) continue;
      const row = inserted(await client.insert("playlists", {
        gig_id: gigId,
        name: pl.name || "Setlist",
        is_shared: !!pl.is_shared,
      }), "setlist");
      plMap.set(String(pl.id), row.id);
    }

    const links = (pack.playlist_songs || [])
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const pa = parseInt(a.row.position, 10) || 0;
        const pb = parseInt(b.row.position, 10) || 0;
        if (pa !== pb) return pa - pb;
        return a.index - b.index;
      });
    for (const item of links) {
      const row = item.row;
      const playlistId = plMap.get(String(row.playlist_id));
      const songId = songMap.get(String(row.song_id));
      if (playlistId == null || songId == null) continue;
      inserted(await client.insert("playlist_songs", {
        playlist_id: playlistId,
        song_id: songId,
        set_name: row.set_name || "Set 1",
        position: parseInt(row.position, 10) || 1,
      }), "reihenfolge");
    }
    return { ok: true, bands: created.length, songs: songMap.size };
  } catch (err) {
    return fail(err);
  }
}

export {
  readDevicePack, preserveDeviceCopy, fingerprint, alreadyTaken, markTaken, dismissedLater, dismissLater,
  packCounts, packFromExport, songForAccount, importPackIntoAccount,
};
