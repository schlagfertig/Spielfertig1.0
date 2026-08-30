// ── Supabase Client (inline, no npm needed via CDN) ────────────────────────
const SUPABASE_URL = "https://hstwhmqwxmvlobvygsty.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdHdobXF3eG12bG9idnlnc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDE3NjAsImV4cCI6MjA5NTE3Nzc2MH0" +
  ".DZK81qIrUo3gLldLO344T_wY_Al1MSzg3oCASPkaVqo";

// Logo (public files)
const LOGO_DARK  = "/Logo-dark.png";
const LOGO_LIGHT = "/Logo-light.png";
function getLogo() { return C.white === "#fff" ? LOGO_DARK : LOGO_LIGHT; }

// Band logos
const LOGO_HARDYS = "/logo-hardys.jpg";
const LOGO_GESCHWISTERLIED = "/logo-geschwisterlied.jpg";
function getBandLogo(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("hardy")) return LOGO_HARDYS;
  if (n.includes("geschwister")) return LOGO_GESCHWISTERLIED;
  return null;
}
// Fetch with timeout
const fetchWithTimeout = async (url, options, ms=8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};
// Minimal Supabase REST helper

const sb = {
  headers: () => {
    const t = sb._token || SUPABASE_KEY;
    return {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + t
    };
  },
  _token: null,

  async query(table, options = {}) {
    let url = SUPABASE_URL + "/rest/v1/" + table + "?";
    if (options.select)  url += "select=" + encodeURIComponent(options.select) + "&";
    if (options.filter)  url += options.filter + "&";
    if (options.order)   url += "order=" + options.order + "&";
    const res = await fetch(url, { headers: { ...sb.headers(), "Prefer": "return=representation" } });
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: { ...sb.headers(), "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
  },

  async update(table, data, filter) {
    const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "PATCH",
      headers: { ...sb.headers(), "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async delete(table, filter) {
    await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + filter, {
      method: "DELETE",
      headers: sb.headers(),
    });
  },

  auth: {
    async signUp(email, password) {
      const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    },
    async signIn(email, password) {
      const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    },
    async signOut() {
      await fetchWithTimeout(SUPABASE_URL + "/auth/v1/logout", {
        method: "POST",
        headers: sb.headers(),
      });
      sb._token = null;
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
    },
    async updateUser(data) {
      const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/user", {
        method: "PUT",
        headers: sb.headers(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.msg || json.error_description || "Update fehlgeschlagen");
      return json;
    },
  },
};

// ── Brand ──────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#000", bgCard: "#0d0d0d",
    teal: "#5cc8b8", tealDim: "rgba(92,200,184,0.12)", tealBorder: "rgba(92,200,184,0.32)",
    white: "#fff", gray: "#888", grayDim: "#444",
    red: "#e05555", redDim: "rgba(224,85,85,0.12)", redBorder: "rgba(224,85,85,0.32)",
    bgNext: "#0d0d0d", borderSong: "#1a1a1a", borderNext: "#2a2a2a",
    textDim: "#bbb", textMute: "#555", lyricsBg: "#070707", lyricsText: "#d8d8d8",
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

function applyTheme(t) {
  Object.assign(C, THEMES[t]);
}

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

export {
  SUPABASE_URL, SUPABASE_KEY, LOGO_DARK, LOGO_LIGHT, getLogo, getBandLogo,
  fetchWithTimeout, sb, THEMES, C, applyTheme, SETS, DRUMMER_COLORS,
  EXTRA_DRUMMER_PALETTE, dStyle
};
