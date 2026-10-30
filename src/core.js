import { LOGO_HARDYS_DATA } from "./logoHardys";
import { LOGO_SPIELFERTIG } from "./logoSpielfertig";

const SUPABASE_URL = "https://hstwhmqwxmvlobvygsty.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdHdobXF3eG12bG9idnlnc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDE3NjAsImV4cCI6MjA5NTE3Nzc2MH0" +
  ".DZK81qIrUo3gLldLO344T_wY_Al1MSzg3oCASPkaVqo";

const LOGO_DARK  = "/logo-schlagfertig.png";
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

const fetchWithTimeout = async (url, options = {}, ms = 20000, retry = true) => {
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
    const retryable = retry && e && (e.name === "AbortError" || e.name === "TimeoutError" || e.name === "TypeError");
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

const AUTH_EXPIRED_HINT = "deine anmeldung ist abgelaufen \u2013 bitte neu anmelden.";
const REFRESH_SKEW_MS = 60 * 1000;
const SESSION_KEY = "sf_session";

function jwtExpMs(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const part = token.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = JSON.parse(new TextDecoder().decode(bytes));
    const exp = Number(json && json.exp);
    if (!Number.isFinite(exp)) return null;
    return exp * 1000;
  } catch (_) {
    return null;
  }
}

function expiresAtMs(token, session) {
  const times = [];
  if (session && session.expires_at != null && session.expires_at !== "") {
    const n = Number(session.expires_at);
    if (Number.isFinite(n) && n > 0) times.push(n > 1e12 ? n : n * 1000);
    else {
      const parsed = Date.parse(String(session.expires_at));
      if (!Number.isNaN(parsed)) times.push(parsed);
    }
  }
  const fromJwt = jwtExpMs(token);
  if (fromJwt != null) times.push(fromJwt);
  if (!times.length) return null;
  return Math.min.apply(null, times);
}

function tokenExpiresSoon(token, session, skewMs = REFRESH_SKEW_MS) {
  const exp = expiresAtMs(token, session);
  if (exp == null) return false;
  return exp - Date.now() <= skewMs;
}

function isExpiredJwt(res, json) {
  if (!res || res.status !== 401) return false;
  const code = json && (json.code || json.error_code || "");
  if (code === "PGRST301" || code === "PGRST303") return true;
  const parts = json && typeof json === "object"
    ? [json.message, json.msg, json.error_description, json.hint, typeof json.error === "string" ? json.error : ""]
    : [];
  return parts.filter(Boolean).join(" ").toLowerCase().includes("jwt expired");
}

function queryListError(rows) {
  if (!Array.isArray(rows)) return "laden fehlgeschlagen";
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (Array.isArray(row)) continue;
    let msg = "";
    if (row && typeof row === "object") {
      msg = row.message || row.msg || row.error_description || row.hint || (typeof row.error === "string" ? row.error : "") || row.code || "";
    } else if (row != null && row !== "") {
      msg = String(row);
    }
    return String(msg || "laden fehlgeschlagen");
  }
  return null;
}

function acceptLists(rows) {
  const error = queryListError(rows);
  if (error) return { ok: false, error: error, rows: null };
  return { ok: true, error: null, rows: rows };
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function clearAuthStorage() {
  sb._token = null;
  try { localStorage.removeItem("sf_token"); } catch (_) {}
  try { localStorage.removeItem("sf_user"); } catch (_) {}
  try { localStorage.removeItem("sf_session"); } catch (_) {}
}

function dropSession() {
  clearAuthStorage();
  const fn = sb._onAuthLost;
  if (typeof fn === "function") {
    try { fn(AUTH_EXPIRED_HINT); } catch (_) {}
  }
}

function sessionFromAuthResponse(res) {
  if (!res || typeof res !== "object") return null;
  const nested = res.session && typeof res.session === "object" ? res.session : null;
  const access_token = res.access_token || (nested && nested.access_token) || "";
  if (!access_token) return null;
  const refresh_token = res.refresh_token || (nested && nested.refresh_token) || "";
  let expires_at = res.expires_at != null ? res.expires_at : (nested && nested.expires_at != null ? nested.expires_at : null);
  const expires_in = res.expires_in != null ? res.expires_in : (nested && nested.expires_in != null ? nested.expires_in : null);
  if ((expires_at == null || expires_at === "") && expires_in != null && Number.isFinite(Number(expires_in))) {
    expires_at = Math.floor(Date.now() / 1000) + Number(expires_in);
  }
  if (expires_at == null || expires_at === "") {
    const ms = jwtExpMs(access_token);
    if (ms != null) expires_at = Math.floor(ms / 1000);
  }
  const user = res.user || (nested && nested.user) || {};
  return {
    access_token: access_token,
    refresh_token: refresh_token || "",
    expires_at: expires_at == null || expires_at === "" ? null : Number(expires_at),
    user: user && typeof user === "object" ? user : {},
  };
}

function persistAuth(session, fallbackEmail) {
  if (!session || !session.access_token) return null;
  sb._token = session.access_token;
  sb._local = false;
  try {
    localStorage.setItem("sf_token", session.access_token);
    let prevUser = {};
    try { prevUser = JSON.parse(localStorage.getItem("sf_user") || "{}") || {}; } catch (_) {}
    const u = session.user || {};
    const email = u.email || fallbackEmail || prevUser.email || "";
    const id = u.id || prevUser.id;
    if (id || email) localStorage.setItem("sf_user", JSON.stringify({ email: email, id: id }));
    const prev = readSession() || {};
    const refresh_token = session.refresh_token || prev.refresh_token || "";
    const expires_at = session.expires_at != null ? session.expires_at : (prev.expires_at != null ? prev.expires_at : null);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ refresh_token: refresh_token, expires_at: expires_at }));
  } catch (_) {}
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("sf_user") || "{}") || {}; } catch (_) {}
  return { email: stored.email || fallbackEmail || "", id: stored.id };
}

// Refresh tokens are single-use. Overlapping callers share one request.
let refreshInFlight = null;

async function performRefresh() {
  const session = readSession();
  const refreshToken = session && session.refresh_token;
  if (!refreshToken) {
    dropSession();
    throw new Error(AUTH_EXPIRED_HINT);
  }
  const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  }, 20000, false);
  const json = await parseJsonSafe(res);
  const next = sessionFromAuthResponse(json);
  if (!res.ok || !next) {
    dropSession();
    throw new Error(AUTH_EXPIRED_HINT);
  }
  persistAuth(next);
  return next.access_token;
}

function refreshAccessToken() {
  if (sb._local) return Promise.resolve(null);
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function ensureFreshToken() {
  if (sb._local || !sb._token) return;
  const session = readSession();
  if (!tokenExpiresSoon(sb._token, session, REFRESH_SKEW_MS)) return;
  if (!session || !session.refresh_token) {
    dropSession();
    throw new Error(AUTH_EXPIRED_HINT);
  }
  await refreshAccessToken();
}

async function refreshWhenVisible() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  if (sb._local || !sb._token) return;
  const session = readSession();
  if (!session || !session.refresh_token) {
    if (tokenExpiresSoon(sb._token, session, REFRESH_SKEW_MS)) dropSession();
    return;
  }
  await refreshAccessToken();
}

async function withAuthRetry(run) {
  await ensureFreshToken();
  if (!sb._local && !sb._token) throw new Error(AUTH_EXPIRED_HINT);
  let res = await run();
  let json = await parseJsonSafe(res);
  if (isExpiredJwt(res, json)) {
    await refreshAccessToken();
    if (!sb._token) throw new Error(AUTH_EXPIRED_HINT);
    res = await run();
    json = await parseJsonSafe(res);
  }
  return { res: res, json: json };
}

function loadStoredSession() {
  let token = "";
  let saved = null;
  try {
    token = localStorage.getItem("sf_token") || "";
    const raw = localStorage.getItem("sf_user");
    saved = raw ? JSON.parse(raw) : null;
  } catch (_) {
    return { ok: false };
  }
  if (!token || !saved || !saved.id) return { ok: false };
  const session = readSession();
  const hasRefresh = !!(session && session.refresh_token);
  if (tokenExpiresSoon(token, session, REFRESH_SKEW_MS) && !hasRefresh) {
    clearAuthStorage();
    return { ok: false, expired: true, notice: AUTH_EXPIRED_HINT };
  }
  sb._token = token;
  sb._local = false;
  return { ok: true, user: { id: saved.id, email: saved.email || "" } };
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
  _onAuthLost: null,
  bootStoredAuth() {
    return loadStoredSession();
  },
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
    const run = () => {
      let url = SUPABASE_URL + "/rest/v1/" + table + "?";
      if (options.select)  url += "select=" + encodeURIComponent(options.select) + "&";
      if (options.filter)  url += options.filter + "&";
      if (options.order)   url += "order=" + options.order + "&";
      const headers = {
        ...(options.anon ? sb.anonHeaders() : sb.headers()),
        Prefer: "return=representation",
      };
      return fetchWithTimeout(url, { headers }, 20000);
    };
    if (options.anon) {
      const res = await run();
      return parseJsonSafe(res);
    }
    const out = await withAuthRetry(run);
    return out.json;
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
    const out = await withAuthRetry(() => fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: { ...sb.headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    }, 20000));
    return Array.isArray(out.json) ? out.json[0] : out.json;
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
    const out = await withAuthRetry(() => fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "PATCH",
      headers: { ...sb.headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    }, 20000));
    return out.json;
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
    await withAuthRetry(() => fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "DELETE",
      headers: sb.headers(),
    }, 20000));
  },
  async deleteStrict(table, filter) {
    if (sb._local) {
      await sb.delete(table, filter);
      return;
    }
    const out = await withAuthRetry(() => fetchWithTimeout(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "DELETE",
      headers: sb.headers(),
    }, 20000));
    if (!out.res.ok) {
      const json = out.json || {};
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
    persist(res, fallbackEmail) {
      const session = sessionFromAuthResponse(res);
      if (!session) return null;
      return persistAuth(session, fallbackEmail);
    },
    refresh() {
      return refreshAccessToken();
    },
    refreshOnForeground() {
      return refreshWhenVisible();
    },
    async signOut() {
      try {
        if (sb._token) {
          await fetchWithTimeout(SUPABASE_URL + "/auth/v1/logout", {
            method: "POST",
            headers: sb.headers(),
          }, 8000);
        }
      } catch (_) {}
      clearAuthStorage();
    },
    async updateUser(data) {
      if (sb._local) throw new Error("Kein Konto im lokalen Modus.");
      const out = await withAuthRetry(() => fetchWithTimeout(SUPABASE_URL + "/auth/v1/user", {
        method: "PUT",
        headers: sb.headers(),
        body: JSON.stringify(data),
      }, 20000));
      const json = out.json || {};
      if (!out.res.ok) throw new Error(json.msg || json.error_description || json.message || "Update fehlgeschlagen");
      return json;
    },
    async deleteAccount() {
      if (sb._local || !sb._token) throw new Error("nicht angemeldet");
      const out = await withAuthRetry(() => fetchWithTimeout(SUPABASE_URL + "/rest/v1/rpc/delete_own_account", {
        method: "POST",
        headers: sb.headers(),
        body: "{}",
      }, 20000));
      if (!out.res.ok) {
        const json = out.json || {};
        const raw = json.message || json.msg || json.error_description || json.hint || "";
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
  AUTH_EXPIRED_HINT, acceptLists, tokenExpiresSoon, jwtExpMs, isExpiredJwt,
  EXTRA_DRUMMER_PALETTE, dStyle,
  parseDuration, fmtDuration, sumDuration
};
