import { LOGO_HARDYS_DATA } from "./logoHardys";
import { LOGO_SPIELFERTIG } from "./logoSpielfertig";

const SUPABASE_URL = "https://hstwhmqwxmvlobvygsty.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdHdobXF3eG12bG9idnlnc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDE3NjAsImV4cCI6MjA5NTE3Nzc2MH0" +
  ".DZK81qIrUo3gLldLO344T_wY_Al1MSzg3oCASPkaVqo";

const LOGO_DARK  = "/Logo-dark.png";
const LOGO_LIGHT = "/Logo-light.png";
const LOGO_FULL  = LOGO_SPIELFERTIG;
function getLogo(kind) {
  if (kind === "light") return LOGO_LIGHT;
  if (kind === "full") return LOGO_FULL;
  return LOGO_DARK;
}

const LOGO_HARDYS = LOGO_HARDYS_DATA || "/logo-hardys.png";
const LOGO_GESCHWISTERLIED = "/logo-geschwisterlied.svg";
function getBandLogo(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("hardy")) return LOGO_HARDYS;
  if (n.includes("geschwister")) return LOGO_GESCHWISTERLIED;
  return null;
}
function bandLogoImgStyle(extra = {}) {
  const dark = C.white === "#fff";
  return {
    width: extra.width || "auto",
    height: extra.height || "auto",
    maxWidth: extra.maxWidth || "88%",
    maxHeight: extra.maxHeight || 72,
    objectFit: "contain",
    objectPosition: "center",
    display: "block",
    background: "transparent",
    filter: dark ? "invert(1)" : "none",
    opacity: extra.opacity ?? 1,
    ...extra,
    width: extra.width || "auto",
    height: extra.height || "auto",
    maxWidth: extra.maxWidth || "88%",
    maxHeight: extra.maxHeight || 72,
  };
}

const fetchWithTimeout = async (url, options = {}, ms = 20000) => {
  const once = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    return await once();
  } catch (e) {
    const retryable = e && (e.name === "AbortError" || e.name === "TimeoutError" || e.name === "TypeError");
    if (!retryable) throw e;
    return await once();
  }
};

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch (_) { return { error: "parse_error", msg: text.substring(0, 180) }; }
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
  };
}


const LOCAL_KEY = "sf_local";
function emptyLocal() {
  return { bands: [], songs: [], gigs: [], playlists: [], playlist_songs: [], invites: [], band_members: [] };
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      const base = emptyLocal();
      Object.keys(base).forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
      return db;
    }
  } catch (_) {}
  return null;
}
function saveLocal(db) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); } catch (_) {}
}
function localId() {
  return "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function matchFilter(row, filter) {
  if (!filter) return true;
  return String(filter).split("&").filter(Boolean).every(part => {
    const inn = part.match(/^([A-Za-z0-9_]+)=in\.\((.*)\)$/);
    if (inn) {
      const vals = inn[2].split(",").map(s => decodeURIComponent(s.trim()));
      return vals.includes(String(row[inn[1]]));
    }
    const eq = part.match(/^([A-Za-z0-9_]+)=eq\.(.*)$/);
    if (eq) return String(row[eq[1]] ?? "") === decodeURIComponent(eq[2]);
    return true;
  });
}
function applyOrder(rows, order) {
  if (!order) return rows;
  const keys = String(order).split(",").map(k => {
    const [field, dir] = k.split(".");
    return { field, desc: dir === "desc" };
  });
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const av = a[k.field] == null ? "" : a[k.field];
      const bv = b[k.field] == null ? "" : b[k.field];
      if (av < bv) return k.desc ? 1 : -1;
      if (av > bv) return k.desc ? -1 : 1;
    }
    return 0;
  });
}
function encodeShare(obj) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  catch (_) { return ""; }
}
function decodeShare(b64) {
  try { return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(b64))))); }
  catch (_) { return null; }
}
function decodeShareFromLocation() {
  try {
    const hash = (typeof window !== "undefined" && window.location.hash) || "";
    const m = hash.match(/(?:^#|&)d=([^&]+)/);
    if (!m) return null;
    return decodeShare(m[1]);
  } catch (_) { return null; }
}

const sb = {
  headers: () => {
    const t = sb._token || SUPABASE_KEY;
    return {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + t
    };
  },
  anonHeaders: () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
  }),
  _token: null,
  enableLocal() {
    sb._local = true;
    if (!loadLocal()) {
      let seed = emptyLocal();
      try {
        const raw = localStorage.getItem("sf_cache");
        if (raw) {
          const c = JSON.parse(raw);
          seed = {
            bands: c.bands || [],
            songs: c.songs || [],
            gigs: c.gigs || [],
            playlists: c.pls || [],
            playlist_songs: c.ps || [],
            invites: [],
            band_members: [],
          };
        }
      } catch (_) {}
      saveLocal(seed);
    }
  },
  async query(table, options = {}) {
    if (sb._local) {
      const db = loadLocal() || emptyLocal();
      const rows = applyOrder((db[table] || []).filter(r => matchFilter(r, options.filter)), options.order);
      return rows;
    }
    let url = SUPABASE_URL + "/rest/v1/" + table + "?";
    if (options.select)  url += "select=" + encodeURIComponent(options.select) + "&";
    if (options.filter)  url += options.filter + "&";
    if (options.order)   url += "order=" + options.order + "&";
    const headers = {
      ...(options.anon ? sb.anonHeaders() : sb.headers()),
      Prefer: "return=representation",
    };
    const res = await fetchWithTimeout(url, { headers }, 20000);
    return parseJsonSafe(res);
  },
  async insert(table, data) {
    if (sb._local) {
      const db = loadLocal() || emptyLocal();
      if (!Array.isArray(db[table])) db[table] = [];
      const row = { ...data, id: data.id || localId(), created_at: data.created_at || new Date().toISOString() };
      db[table].push(row);
      saveLocal(db);
      return row;
    }
    const res = await fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: { ...sb.headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    }, 20000);
    const json = await parseJsonSafe(res);
    return Array.isArray(json) ? json[0] : json;
  },
  async update(table, data, filter) {
    if (sb._local) {
      const db = loadLocal() || emptyLocal();
      const list = db[table] || [];
      const updated = [];
      db[table] = list.map(row => {
        if (!matchFilter(row, filter)) return row;
        const next = { ...row, ...data };
        updated.push(next);
        return next;
      });
      saveLocal(db);
      return updated;
    }
    const res = await fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "PATCH",
      headers: { ...sb.headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    }, 20000);
    return parseJsonSafe(res);
  },
  importBackup(payload) {
    if (!sb._local) throw new Error("Import nur im lokalen Modus.");
    const packs = Array.isArray(payload && payload.bands) ? payload.bands : null;
    const next = emptyLocal();
    if (packs) {
      packs.forEach(p => {
        if (p.band) next.bands.push(p.band);
        (p.songs || []).forEach(s => next.songs.push(s));
        (p.gigs || []).forEach(g => next.gigs.push(g));
        (p.playlists || []).forEach(pl => next.playlists.push(pl));
        (p.playlist_songs || []).forEach(ps => next.playlist_songs.push(ps));
      });
    } else if (payload && (payload.bands || payload.songs)) {
      next.bands = payload.bands || [];
      next.songs = payload.songs || [];
      next.gigs = payload.gigs || [];
      next.playlists = payload.playlists || payload.pls || [];
      next.playlist_songs = payload.playlist_songs || payload.ps || [];
    } else {
      throw new Error("Kein gültiges Backup.");
    }
    saveLocal(next);
    return { bands: next.bands.length, songs: next.songs.length };
  },
  async delete(table, filter) {
    if (sb._local) {
      const db = loadLocal() || emptyLocal();
      db[table] = (db[table] || []).filter(row => !matchFilter(row, filter));
      saveLocal(db);
      return;
    }
    await fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "DELETE",
      headers: sb.headers(),
    }, 20000);
  },
  async deleteStrict(table, filter) {
    if (sb._local) {
      await sb.delete(table, filter);
      return;
    }
    const res = await fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "DELETE",
      headers: sb.headers(),
    }, 20000);
    if (!res.ok) {
      const json = await parseJsonSafe(res);
      throw new Error(json.message || json.msg || json.error_description || "löschen fehlgeschlagen");
    }
  },
  auth: {
    async signUp(email, password) {
      const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/signup", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email, password }),
      }, 25000);
      return parseJsonSafe(res);
    },
    async signIn(email, password) {
      const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email, password }),
      }, 25000);
      return parseJsonSafe(res);
    },
    async signOut() {
      try {
        await fetchWithTimeout(SUPABASE_URL + "/auth/v1/logout", {
          method: "POST",
          headers: sb.headers(),
        }, 8000);
      } catch (_) {}
      sb._token = null;
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
    },
    async updateUser(data) {
      if (sb._local) throw new Error("Kein Konto im lokalen Modus.");
      const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/user", {
        method: "PUT",
        headers: sb.headers(),
        body: JSON.stringify(data),
      }, 20000);
      const json = await parseJsonSafe(res);
      if (!res.ok) throw new Error(json.msg || json.error_description || "Update fehlgeschlagen");
      return json;
    },
    async deleteAccount() {
      if (sb._local || !sb._token) throw new Error("nicht angemeldet");
      const res = await fetchWithTimeout(SUPABASE_URL + "/rest/v1/rpc/delete_own_account", {
        method: "POST",
        headers: sb.headers(),
        body: "{}",
      }, 20000);
      const json = await parseJsonSafe(res);
      if (!res.ok) {
        const raw = json && (json.message || json.msg || json.error_description || json.hint || "");
        throw new Error(raw || "löschen fehlgeschlagen");
      }
      await sb.auth.signOut();
    },
  },
};


const glass = {
  background: "rgba(22, 30, 34, 0.42)",
  backgroundImage: "linear-gradient(165deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 36%, transparent 62%)",
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.12), 0 12px 36px rgba(0,0,0,0.22)",
  backdropFilter: "blur(42px) saturate(200%) brightness(1.08)",
  WebkitBackdropFilter: "blur(42px) saturate(200%) brightness(1.08)",
};
function glassStyle(extra = {}) { return { ...glass, ...extra }; }
const pageWash = "radial-gradient(1200px 700px at 12% -10%, rgba(92,200,184,0.22), transparent 55%), radial-gradient(900px 600px at 110% 8%, rgba(232,184,75,0.08), transparent 50%), #161a1d";

const THEMES = {
  dark: {
    bg: "#161a1d", bgCard: "#1c2226",
    teal: "#5cc8b8", tealDim: "rgba(92,200,184,0.14)", tealBorder: "rgba(92,200,184,0.36)",
    white: "#f4f7f6", gray: "#8a969c", grayDim: "#5a666c",
    red: "#e05555", redDim: "rgba(224,85,85,0.12)", redBorder: "rgba(224,85,85,0.32)",
    bgNext: "#22282c", borderSong: "#2f383d", borderNext: "#3a454b",
    textDim: "#c9d3d6", textMute: "#5a666c", lyricsBg: "#121618", lyricsText: "#e7eeef",
  },
  light: {
    bg: "#f4f4f2", bgCard: "#fff",
    teal: "#2a9d8c", tealDim: "rgba(42,157,140,0.12)", tealBorder: "rgba(42,157,140,0.4)",
    white: "#111", gray: "#666", grayDim: "#aaa",
    red: "#c0392b", redDim: "rgba(192,57,43,0.1)", redBorder: "rgba(192,57,43,0.4)",
    bgNext: "#eceae6", borderSong: "#ddd", borderNext: "#c8c8c8",
    textDim: "#555", textMute: "#999", lyricsBg: "#eceae6", lyricsText: "#222",
  },
};

const C = { ...THEMES.dark };
function applyTheme(t) { Object.assign(C, THEMES[t]); }
const SETS = ["Set 1", "Set 2", "Set 3", "Zugaben"];
const DRUMMER_COLORS = {
  Tom: { bg: C.tealDim, border: C.tealBorder, badge: C.teal },
  Ron: { bg: C.redDim,  border: C.redBorder,  badge: C.red  },
};
const EXTRA_DRUMMER_PALETTE = [
  { bg:"rgba(212,168,67,0.12)",  border:"rgba(212,168,67,0.32)",  badge:"#d4a843" },
  { bg:"rgba(155,126,222,0.12)", border:"rgba(155,126,222,0.32)", badge:"#9b7ede" },
  { bg:"rgba(91,155,213,0.12)",  border:"rgba(91,155,213,0.32)",  badge:"#5b9bd5" },
  { bg:"rgba(107,191,107,0.12)", border:"rgba(107,191,107,0.32)", badge:"#6bbf6b" },
];
const dStyle = d => {
  if (!d) return { bg:"#111", border:"#333", badge:C.gray };
  if (DRUMMER_COLORS[d]) return DRUMMER_COLORS[d];
  let h = 0;
  for (let i=0; i<d.length; i++) h = (h*31 + d.charCodeAt(i)) >>> 0;
  return EXTRA_DRUMMER_PALETTE[h % EXTRA_DRUMMER_PALETTE.length];
};


function parseDuration(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const m = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (m) return parseInt(m[1], 10) * 60 + Math.min(59, parseInt(m[2], 10));
  const n = parseFloat(s.replace(",", "."));
  if (!isNaN(n) && n > 0) return Math.round(n * 60);
  return null;
}
function fmtDuration(sec) {
  const n = parseInt(sec, 10);
  if (!n || n <= 0) return "";
  const m = Math.floor(n / 60);
  const s = n % 60;
  return m + ":" + String(s).padStart(2, "0");
}
function sumDuration(songs) {
  return (songs || []).reduce((a, s) => a + (parseInt(s && s.duration, 10) || 0), 0);
}

export {
  SUPABASE_URL, SUPABASE_KEY, LOGO_DARK, LOGO_LIGHT, LOGO_FULL, getLogo, getBandLogo, bandLogoImgStyle,
  encodeShare, decodeShare, decodeShareFromLocation,
  glass, glassStyle, pageWash,
  LOGO_HARDYS_DATA, fetchWithTimeout, sb, THEMES, C, applyTheme, SETS, DRUMMER_COLORS,
  EXTRA_DRUMMER_PALETTE, dStyle,
  parseDuration, fmtDuration, sumDuration
};
