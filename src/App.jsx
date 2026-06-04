import { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ── Supabase Client (inline, no npm needed via CDN) ────────────────────────
const SUPABASE_URL = "https://hstwhmqwxmvlobvygsty.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdHdobXF3eG12bG9idnlnc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDE3NjAsImV4cCI6MjA5NTE3Nzc2MH0" +
  ".DZK81qIrUo3gLldLO344T_wY_Al1MSzg3oCASPkaVqo";

// Global metronome tracker - only one at a time
let activeMetronomeStop = null;

// Fetch with timeout
const fetchWithTimeout = async (url, options, ms=8000) => {
  return fetch(url, options);
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
  },
};

// ── Brand ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#000", bgCard: "#0d0d0d",
  teal: "#5cc8b8", tealDim: "rgba(92,200,184,0.12)", tealBorder: "rgba(92,200,184,0.32)",
  white: "#fff", gray: "#888", grayDim: "#444",
  red: "#e05555", redDim: "rgba(224,85,85,0.12)", redBorder: "rgba(224,85,85,0.32)",
};

const SETS = ["Set 1", "Set 2", "Set 3", "Zugaben"];
const dStyle = d => {
  if (d === "Ron") return { bg: C.redDim,  border: C.redBorder,  badge: C.red  };
  if (d === "Tom") return { bg: C.tealDim, border: C.tealBorder, badge: C.teal };
  return { bg: "#111", border: "#333", badge: C.gray };
};

// ── Primitive UI ───────────────────────────────────────────────────────────
const SealLine = ({ color = C.teal }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
    <div style={{ flex:1, height:1, background:color, opacity:.4 }} />
    <div style={{ width:5, height:5, borderRadius:"50%", background:color, opacity:.6 }} />
    <div style={{ flex:1, height:1, background:color, opacity:.4 }} />
  </div>
);

function Btn({ children, onClick, variant="primary", size="md", disabled, full, style:s={} }) {
  const sz = { sm:{padding:"5px 11px",fontSize:11}, md:{padding:"8px 18px",fontSize:12}, lg:{padding:"12px 28px",fontSize:13} };
  const vr = {
    primary: { background:C.teal, color:"#000", border:"none" },
    outline: { background:"transparent", color:C.teal, border:`1px solid ${C.tealBorder}` },
    danger:  { background:C.redDim, color:C.red, border:`1px solid ${C.redBorder}` },
    ghost:   { background:"transparent", color:C.gray, border:"none" },
  };
  return <button onClick={disabled?undefined:onClick} style={{ ...sz[size],...vr[variant], borderRadius:4, fontWeight:700, fontFamily:"inherit", letterSpacing:"0.06em", textTransform:"uppercase", cursor:disabled?"not-allowed":"pointer", opacity:disabled?.4:1, display:"inline-flex", alignItems:"center", gap:6, transition:"opacity .15s", width:full?"100%":undefined, justifyContent:full?"center":undefined, ...s }}>{children}</button>;
}

function Field({ value, onChange, placeholder, type="text", rows, style:s={} }) {
  const base = { background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box", ...s };
  if (rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={e=>e.target.style.borderColor=C.tealBorder} onBlur={e=>e.target.style.borderColor="#222"} style={{...base,resize:"vertical",lineHeight:1.6}}/>;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={e=>e.target.style.borderColor=C.tealBorder} onBlur={e=>e.target.style.borderColor="#222"} style={base}/>;
}

function Sel({ value, onChange, options, style:s={} }) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit", width:"100%", ...s }}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
}

function Badge({ children, color }) {
  return <span style={{ color, border:`1px solid ${color}`, fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:2, letterSpacing:"0.08em", textTransform:"uppercase" }}>{children}</span>;
}

function Toast({ msg, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[]);
  return <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:type==="error"?"#1a0000":"#001a16", border:`1px solid ${type==="error"?C.red:C.teal}`, color:type==="error"?C.red:C.teal, padding:"10px 18px", borderRadius:4, fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", animation:"fadeUp .2s ease" }}>{msg}</div>;
}

function Confirm({ msg, onOk, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.bgCard, border:"1px solid #222", borderRadius:8, padding:28, maxWidth:340, width:"90%" }}>
        <p style={{ color:C.white, fontSize:14, fontWeight:600, marginBottom:6 }}>Löschen bestätigen</p>
        <p style={{ color:C.gray, fontSize:13, marginBottom:20 }}>{msg}</p>
        <SealLine/><div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
          <Btn variant="ghost" onClick={onCancel}>Abbrechen</Btn>
          <Btn variant="danger" onClick={onOk}>Löschen</Btn>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.bgCard, border:"1px solid #222", borderRadius:8, padding:26, maxWidth:440, width:"90%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:C.teal, fontWeight:700, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" }}>{title}</span>
          <Btn variant="ghost" size="sm" onClick={onClose}>✕</Btn>
        </div>
        <SealLine/><div style={{ marginTop:14 }}>{children}</div>
      </div>
    </div>
  );
}

function SealIcon({ size=40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" stroke={C.teal} strokeWidth="1.5" opacity=".6"/>
      <circle cx="40" cy="40" r="29" stroke={C.teal} strokeWidth=".8" opacity=".4"/>
      <circle cx="40" cy="40" r="22" stroke={C.teal} strokeWidth=".5" opacity=".3"/>
      <path d="M26 40 L35 50 L54 30" stroke={C.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Spinner() {
  return <div style={{ width:20, height:20, border:`2px solid #222`, borderTop:`2px solid ${C.teal}`, borderRadius:"50%", animation:"spin .7s linear infinite" }}/>;
}

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async () => {
    if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 300)); // Safari iOS fix
    try {
      const res = mode === "login" ? await sb.auth.signIn(email, password) : await sb.auth.signUp(email, password);
      if (res.error || res.error_description || res.msg) { setError(JSON.stringify(res).substring(0, 200)); }
      else if (res.access_token) {
        sb._token = res.access_token;
        localStorage.setItem("sf_token", res.access_token);
        localStorage.setItem("sf_user", JSON.stringify({ email: res.user?.email, id: res.user?.id }));
        onAuth({ email: res.user?.email, id: res.user?.id });
      } else if (mode === "register") {
        setError("Bestätigungs-E-Mail gesendet! Bitte bestätigen, dann einloggen.");
      }
    } catch(e) { setError("Fehler: " + e.message + " | URL: " + SUPABASE_URL.substring(0,30)); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ marginBottom:32, textAlign:"center" }}>
        <SealIcon size={56}/>
        <div style={{ color:C.white, fontWeight:900, fontSize:24, fontFamily:"'Space Mono',monospace", marginTop:12 }}>SPIELFERTIG<span style={{ color:C.teal }}>‽</span></div>
        <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.2em", marginTop:4 }}>ZEIT FÜR GUTEN SOUND</div>
      </div>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:10, padding:28, width:"100%", maxWidth:380 }}>
        <SealLine/>
        <div style={{ display:"flex", gap:6, margin:"16px 0" }}>
          {[{k:"login",l:"Anmelden"},{k:"register",l:"Registrieren"}].map(({k,l})=>(
            <button key={k} onClick={()=>{ setMode(k); setError(""); }} style={{ flex:1, background:mode===k?C.teal:"transparent", color:mode===k?"#000":C.gray, border:`1px solid ${mode===k?C.teal:"#333"}`, borderRadius:4, padding:"7px 0", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Field value={email} onChange={setEmail} placeholder="E-Mail" type="email"/>
          <Field value={password} onChange={setPass} placeholder="Passwort" type="password"/>
          {error && <div style={{ color:mode==="register"&&error.includes("Bestätigung")?C.teal:C.red, fontSize:12, padding:"8px 10px", background:mode==="register"&&error.includes("Bestätigung")?C.tealDim:C.redDim, borderRadius:4 }}>{error}</div>}
          <Btn full onClick={handle} disabled={loading}>
            {loading ? "⏳ Lädt..." : mode==="login" ? "Anmelden" : "Konto erstellen"}
          </Btn>
        </div>
      </div>
      <div style={{ color:"#1e1e1e", fontSize:10, letterSpacing:"0.15em", marginTop:24 }}>THOMAS SCHUSTER · <span style={{ color:C.teal }}>SCHLAGFERTIG‽</span></div>
    </div>
  );
}

// ── Metronome ──────────────────────────────────────────────────────────────
function useMetronome(bpm) {
  const [active, setActive] = useState(false);
  const [beat,   setBeat]   = useState(false);
  const iRef = useRef(null), ctxRef = useRef(null);
  const tick = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    } catch {}
    setBeat(true); setTimeout(()=>setBeat(false), 80);
  }, []);
  const stop = useCallback(() => {
    clearInterval(iRef.current);
    setActive(false); setBeat(false);
    activeMetronomeStop = null;
  }, []);
  const start = useCallback(() => {
    if (!bpm || bpm <= 0) return;
    if (activeMetronomeStop) activeMetronomeStop();
    setActive(true); tick();
    iRef.current = setInterval(tick, (60/bpm)*1000);
    activeMetronomeStop = () => { clearInterval(iRef.current); setActive(false); setBeat(false); };
  }, [bpm, tick]);
  const toggle = useCallback((e) => {
    e.stopPropagation();
    if (active) stop(); else start();
  }, [active, start, stop]);
  useEffect(()=>()=>clearInterval(iRef.current), []);
  return { active, beat, toggle, start, stop };
}

// ── Song Row ───────────────────────────────────────────────────────────────
function SongRow({ song, onDelete, onEdit, pos, draggable, onDragStart, onDrop, isDragging }) {
  const st = dStyle(song.drummer);
  const { active, beat, toggle } = useMetronome(song.bpm);
  const pulseColor  = beat?"#fff":active?C.teal:C.grayDim;
  const pulseGlow   = beat?`0 0 10px 4px ${C.teal}`:active?`0 0 4px 1px ${C.tealBorder}`:"none";
  const pulseBorder = active?`1px solid ${beat?"#fff":C.teal}`:"1px solid #2a2a2a";
  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragOver={e=>e.preventDefault()} onDrop={onDrop}
      style={{ background:isDragging?"#0a0a0a":st.bg, border:`1px solid ${isDragging?C.teal:st.border}`, borderRadius:4, padding:"9px 13px", display:"flex", alignItems:"center", gap:9, opacity:isDragging?.4:1, transition:"background .1s", cursor:draggable?"grab":"default" }}>
      {pos!==undefined&&<div style={{ color:C.grayDim, fontSize:11, width:18, textAlign:"right", flexShrink:0, fontFamily:"'Space Mono',monospace" }}>{pos}</div>}
      {draggable&&<div style={{ color:C.grayDim, fontSize:13, flexShrink:0 }}>⠿</div>}
      {song.bpm>0&&(
        <button onClick={toggle} title={`${active?"Stop":"Start"} (${song.bpm} BPM)`}
          style={{ background:"transparent", border:pulseBorder, borderRadius:"50%", width:32, height:32, flexShrink:0, cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:pulseGlow, transition:"border-color .05s,box-shadow .05s" }}>
          <div style={{ width:14, height:14, borderRadius:"50%", background:pulseColor, transition:"background .05s", boxShadow:beat?`0 0 6px 3px ${C.teal}`:"none" }}/>
        </button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, color:C.white, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{song.title}</div>
        <div style={{ color:C.gray, fontSize:12 }}>
          {song.artist}
          {song.bpm>0&&<span style={{ color:active?C.teal:C.grayDim, fontFamily:"'Space Mono',monospace", fontSize:11, marginLeft:6, transition:"color .2s" }}>{song.bpm} BPM</span>}
        </div>
        {song.specialties&&<div style={{ color:C.grayDim, fontSize:11, fontStyle:"italic", whiteSpace:"pre-wrap" }}>{song.specialties}</div>}
      </div>
      {song.drummer&&<Badge color={st.badge}>{song.drummer}</Badge>}
      {onEdit&&<button onClick={e=>{e.stopPropagation();onEdit(song);}} style={{ background:"transparent", border:"none", color:C.grayDim, cursor:"pointer", padding:"6px 10px", fontSize:18 }} onMouseEnter={e=>e.currentTarget.style.color=C.teal} onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>✎</button>}
      {onDelete&&<button onClick={e=>{e.stopPropagation();onDelete(song);}} style={{ background:"transparent", border:"none", color:C.grayDim, cursor:"pointer", padding:"6px 10px", fontSize:18 }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>✕</button>}
    </div>
  );
}

// ── PDF Export ─────────────────────────────────────────────────────────────
function exportPDF(playlist, allSongs, playlistSongs, bandName) {
  const ps = playlistSongs.filter(p=>p.playlist_id===playlist.id);
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${playlist.name}</title>
  <style>body{font-family:'Courier New',monospace;background:#fff;color:#000;padding:32px;max-width:800px;margin:0 auto}
  h1{font-size:20px;margin:0 0 2px}h2{font-size:12px;font-weight:normal;color:#555;margin:0 0 16px}
  .seal{border-top:2px solid #5cc8b8;border-bottom:2px solid #5cc8b8;padding:5px 0;margin:14px 0}
  .set{font-size:13px;font-weight:bold;margin:18px 0 5px;text-transform:uppercase;letter-spacing:.1em}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  td{padding:5px 6px;font-size:12px;border-bottom:1px solid #eee}td:first-child{width:24px;color:#999}
  .tom{background:#e0f7f5}.ron{background:#fde8e8}
  .footer{margin-top:28px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:10px}
  @media print{body{padding:16px}}</style></head><body>
  <h1>SPIELFERTIG‽ — ${bandName}</h1>
  <h2>${playlist.name} · ${new Date().toLocaleDateString("de-DE")}</h2><div class="seal"></div>`;
  SETS.forEach(set => {
    const items = ps.filter(p=>p.set_name===set).sort((a,b)=>a.position-b.position);
    if (!items.length) return;
    html += `<div class="set">▶ ${set} <small style="font-weight:normal;color:#888">(${items.length})</small></div><table>`;
    items.forEach((p,i)=>{
      const s = allSongs.find(x=>x.id===p.song_id);
      if (!s) return;
      html += `<tr class="${s.drummer==="Ron"?"ron":s.drummer==="Tom"?"tom":""}"><td>${i+1}.</td><td><strong>${s.title}</strong></td><td>${s.artist||""}</td><td style="color:#666;font-size:11px">${s.bpm||""} BPM</td><td><strong>${s.drummer||""}</strong></td><td style="color:#888;font-style:italic;font-size:11px">${s.specialties||""}</td></tr>`;
    });
    html += `</table>`;
  });
  html += `<div class="footer">SCHLAGFERTIG‽ · Thomas Schuster · ZEIT FÜR GUTEN SOUND</div></body></html>`;
  const w = window.open("","_blank");
  w.document.write(html); w.document.close();
  setTimeout(()=>w.print(), 400);
}

// ── KI-Analyse (Platzhalter) ─────────────────────────────────────────────────
function AISetNotes({ setName, songs }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={()=>setOpen(!open)} style={{ background:"transparent", border:"1px solid #1e1e1e", color:open?C.teal:C.grayDim, borderRadius:4, padding:"5px 13px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>✦ KI-Analyse {open?"▲":"▼"}</button>
      {open&&(
        <div style={{ marginTop:8, background:"#080808", border:"1px solid #1e1e1e", borderRadius:4, padding:14 }}>
          <p style={{ color:"#888", fontSize:13, lineHeight:1.6, margin:0 }}>
            Die KI-Analyse ist derzeit deaktiviert. Sobald sie aktiv ist, bekommst du hier eine Set-Auswertung: Energie-Kurve, BPM-Übergänge, Drummer-Wechsel und Tipps.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Import (Platzhalter) ──────────────────────────────────────────────────────
function ImportWizard({ band, existingSongs, gigs, onImportDone, show }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Songs importieren</div>
      <SealLine/>
      <div style={{ background:"#0a1f1a", border:"1px solid "+C.tealBorder, borderRadius:8, padding:22, textAlign:"center" }}>
        <div style={{ fontSize:38, marginBottom:8 }}>🤖</div>
        <div style={{ color:C.teal, fontWeight:600, marginBottom:6 }}>KI-Import kommt bald</div>
        <p style={{ color:C.gray, fontSize:13, lineHeight:1.5, margin:0 }}>
          Songs trägst du am besten direkt im Tab „🎵 Songs“ ein. Der automatische Import von PDFs oder Fotos folgt später.
        </p>
      </div>
    </div>
  );
}


// ── Song Database ──────────────────────────────────────────────────────────
function SongDatabase({ band, songs, onRefresh, show }) {
  const [search, setSearch]   = useState("");
  const [form, setForm]       = useState({ title:"", artist:"", bpm:"", drummer:band.drummers[0]||"Tom", specialties:"" });
  const [editSong, setEdit]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving]   = useState(false);

  const [sortBy, setSortBy] = useState("none");
  const bandSongs = songs.filter(s=>s.band_id===band.id);
  const filtered = bandSongs
    .filter(s=>s.title.toLowerCase().includes(search.toLowerCase())||(s.artist?.toLowerCase()??"").includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sortBy==="title") return a.title.localeCompare(b.title);
      if(sortBy==="artist") return (a.artist||"").localeCompare(b.artist||"");
      return 0;
    });

  const handleAdd = async () => {
    if (!form.title||!form.artist||!form.bpm) return;
    setSaving(true);
    await sb.insert("songs", { band_id:band.id, title:form.title, artist:form.artist, bpm:parseInt(form.bpm), drummer:form.drummer, specialties:form.specialties });
    setForm({ title:"", artist:"", bpm:"", drummer:band.drummers[0]||"Tom", specialties:"" });
    await onRefresh(); show("Song hinzugefügt!"); setSaving(false);
  };

  const handleDelete = async (song) => {
    await sb.delete("songs", "id=eq."+song.id);
    await onRefresh(); show("Song gelöscht."); setConfirm(null);
  };

  const handleUpdate = async () => {
    await sb.update("songs", { title:editSong.title, artist:editSong.artist, bpm:parseInt(editSong.bpm), drummer:editSong.drummer, specialties:editSong.specialties }, "id=eq."+editSong.id);
    await onRefresh(); show("Song gespeichert!"); setEdit(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
      <div style={{ display:"flex", gap:8 }}>
        {band.drummers.map(d=>(
          <div key={d} style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:4, padding:"8px 12px", textAlign:"center" }}>
            <div style={{ color:d==="Ron"?C.red:C.teal, fontSize:20, fontWeight:800, fontFamily:"'Space Mono',monospace" }}>{bandSongs.filter(s=>s.drummer===d).length}</div>
            <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase" }}>{d}</div>
          </div>
        ))}
        <div style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:4, padding:"8px 12px", textAlign:"center" }}>
          <div style={{ color:C.gray, fontSize:20, fontWeight:800, fontFamily:"'Space Mono',monospace" }}>{bandSongs.length}</div>
          <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase" }}>Songs</div>
        </div>
      </div>
      <Field value={search} onChange={setSearch} placeholder="Suchen…"/>
      <div style={{display:"flex",gap:6}}>
        {[{k:"none",l:"Standard"},{k:"title",l:"A–Z Titel"},{k:"artist",l:"A–Z Interpret"}].map(({k,l})=>(
          <button key={k} onClick={()=>setSortBy(k)} style={{
            flex:1, background:sortBy===k?C.teal:"transparent",
            color:sortBy===k?"#000":C.gray,
            border:"1px solid "+(sortBy===k?C.teal:"#222"),
            borderRadius:4, padding:"5px 0", fontSize:11, fontWeight:700,
            letterSpacing:"0.06em", textTransform:"uppercase",
            cursor:"pointer", fontFamily:"inherit"
          }}>{l}</button>
        ))}
      </div>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:15 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neuer Song</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          <Field value={form.title}  onChange={v=>setForm(f=>({...f,title:v}))}  placeholder="Titel *"/>
          <Field value={form.artist} onChange={v=>setForm(f=>({...f,artist:v}))} placeholder="Artist *"/>
          <Field value={form.bpm}    onChange={v=>setForm(f=>({...f,bpm:v}))}    placeholder="BPM *" type="number"/>
          <Sel   value={form.drummer} onChange={v=>setForm(f=>({...f,drummer:v}))} options={band.drummers}/>
        </div>
        <Field value={form.specialties} onChange={v=>setForm(f=>({...f,specialties:v}))} placeholder="Besonderheiten (optional)" style={{ marginBottom:8 }}/>
        <Btn full disabled={!form.title||!form.artist||!form.bpm||saving} onClick={handleAdd}>{saving?<Spinner/>:"Song hinzufügen"}</Btn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {filtered.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:32, fontSize:13 }}>Keine Songs</div>
        :filtered.map(song=><SongRow key={song.id} song={song} onDelete={s=>setConfirm(s)} onEdit={s=>setEdit({...s,bpm:String(s.bpm)})}/>)}
      </div>
      {editSong&&<Modal title="Song bearbeiten" onClose={()=>setEdit(null)}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Field value={editSong.title}       onChange={v=>setEdit(s=>({...s,title:v}))}       placeholder="Titel"/>
          <Field value={editSong.artist}      onChange={v=>setEdit(s=>({...s,artist:v}))}      placeholder="Artist"/>
          <Field value={editSong.bpm}         onChange={v=>setEdit(s=>({...s,bpm:v}))}         placeholder="BPM" type="number"/>
          <Sel   value={editSong.drummer}     onChange={v=>setEdit(s=>({...s,drummer:v}))}     options={band.drummers}/>
          <Field value={editSong.specialties||""} onChange={v=>setEdit(s=>({...s,specialties:v}))} placeholder="Besonderheiten"/>
          <Btn full onClick={handleUpdate}>Speichern</Btn>
        </div>
      </Modal>}
      {confirm&&<Confirm msg={`„${confirm.title}" wirklich löschen?`} onOk={()=>handleDelete(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── Gig Metronome (compact, for Gig Mode) ─────────────────────────────────────
function GigMetronome({ bpm, autoStart }) {
  const { active, beat, toggle, start, stop } = useMetronome(bpm);
  // Auto-start/stop when parent activates this song
  useEffect(()=>{
    if (autoStart && !active) start();
    else if (!autoStart && active) stop();
  }, [autoStart]);
  const pulseColor = beat ? "#fff" : active ? C.teal : C.grayDim;
  const glow = beat ? "0 0 14px 5px " + C.teal : active ? "0 0 5px 2px " + C.tealBorder : "none";
  return (
    <button onClick={toggle} title={(active?"Stop":"Start")+" ("+bpm+" BPM)"}
      style={{ background:"transparent", border:"1px solid "+(active?C.teal:"#333"), borderRadius:"50%", width:44, height:44, cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:glow, transition:"all .1s" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
        <div style={{ width:16, height:16, borderRadius:"50%", background:pulseColor, transition:"background .05s" }}/>
        <div style={{ color:active?C.teal:C.grayDim, fontSize:10, fontFamily:"'Space Mono',monospace", lineHeight:1 }}>{bpm}</div>
      </div>
    </button>
  );
}

// ── Song Row with Move popup ─────────────────────────────────────────────────
function SongRowMove({ song, mySongs, playlist, onDelete, onRefresh, setSaving, saving }) {
  const [open, setOpen] = useState(false);
  const [newSet, setNewSet] = useState(song.set_name);
  const [newPos, setNewPos] = useState(String(song.position));
  const [notes, setNotes] = useState(song.specialties||"");

  const apply = async () => {
    setOpen(false);
    setSaving(true);
    const targetSet = newSet;
    const targetPos = parseInt(newPos) || 1;
    const psId = song.ps_id;
    const setItems = mySongs.filter(ps=>ps.set_name===song.set_name && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    const targetItems = mySongs.filter(ps=>ps.set_name===targetSet && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);

    if (targetSet === song.set_name) {
      const others = setItems.filter(ps=>ps.id!==psId);
      const clamped = Math.max(1, Math.min(targetPos, setItems.length));
      others.splice(clamped-1, 0, setItems.find(ps=>ps.id===psId));
      for (let i=0;i<others.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+others[i].id);
    } else {
      const oldOthers = setItems.filter(ps=>ps.id!==psId);
      for (let i=0;i<oldOthers.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+oldOthers[i].id);
      const newOthers = [...targetItems];
      const clamped = Math.max(1, Math.min(targetPos, targetItems.length+1));
      newOthers.splice(clamped-1, 0, { id: psId });
      for (let i=0;i<newOthers.length;i++) await sb.update("playlist_songs",{set_name:targetSet,position:i+1},"id=eq."+newOthers[i].id);
    }
    // Save notes if changed
    if (notes !== (song.specialties||"")) {
      await sb.update("songs", { specialties: notes }, "id=eq."+song.id);
    }
    await onRefresh(); setSaving(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <SongRow song={song} pos={song.position} onDelete={onDelete}
        onEdit={()=>{ setNewSet(song.set_name); setNewPos(String(song.position)); setNotes(song.specialties||""); setOpen(!open); }}/>
      {open&&(
        <div style={{ position:"absolute", right:0, top:"100%", zIndex:100, background:"#1a1a1a", border:"1px solid "+C.tealBorder, borderRadius:8, padding:14, minWidth:220, boxShadow:"0 8px 32px rgba(0,0,0,.8)" }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Verschieben nach</div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>SET</div>
              <select value={newSet} onChange={e=>setNewSet(e.target.value)}
                style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:12, fontFamily:"inherit", width:"100%" }}>
                {SETS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ width:64 }}>
              <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>PLATZ</div>
              <input type="number" min="1" value={newPos} onChange={e=>setNewPos(e.target.value)}
                style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:13, fontFamily:"'Space Mono',monospace", width:"100%", textAlign:"center" }}/>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>NOTIZEN</div>
            <textarea
              value={notes}
              onChange={e=>setNotes(e.target.value)}
              placeholder="z.B. Drums beginnt, Count-In…"
              rows={2}
              style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:12, fontFamily:"inherit", width:"100%", resize:"none", lineHeight:1.5 }}
            />
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <Btn variant="ghost" size="sm" onClick={()=>setOpen(false)}>Abbrechen</Btn>
            <Btn size="sm" onClick={apply} disabled={saving}>OK ✓</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Playlist Editor ────────────────────────────────────────────────────────
function PlaylistEditor({ playlist, allSongs, playlistSongs, onBack, onRefresh, bandName, show }) {
  const [activeSet, setActiveSet] = useState("Set 1");
  const [search, setSearch]       = useState("");
  const [dragId, setDragId]       = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [gigMode, setGigMode]     = useState(false);
  const [currentSongId, setCurrentSongId] = useState(null);

  const mySongs  = playlistSongs.filter(ps=>ps.playlist_id===playlist.id);
  const bandId   = useMemo(()=>allSongs.find(s=>mySongs.some(ps=>ps.song_id===s.id))?.band_id??null,[mySongs,allSongs]);
  const bandSongs= allSongs.filter(s=>s.band_id===bandId);

  const songsInSet = useMemo(()=>
    mySongs.filter(ps=>ps.set_name===activeSet)
      .map(ps=>({...ps,...(allSongs.find(s=>s.id===ps.song_id)||{}), ps_id:ps.id, set_name:ps.set_name, position:ps.position}))
      .filter(s=>s.title?.toLowerCase().includes(search.toLowerCase())||(s.artist?.toLowerCase()??"").includes(search.toLowerCase()))
      .sort((a,b)=>a.position-b.position),
    [mySongs,activeSet,search,allSongs]);

  const setCounts = SETS.reduce((a,s)=>{a[s]=mySongs.filter(ps=>ps.set_name===s).length;return a;},{});
  const inSetIds  = mySongs.filter(ps=>ps.set_name===activeSet).map(ps=>ps.song_id);
  const available = bandSongs.filter(s=>!inSetIds.includes(s.id));

  const addToSet = async (song) => {
    setSaving(true);
    const pos = mySongs.filter(ps=>ps.set_name===activeSet&&ps.playlist_id===playlist.id).length+1;
    await sb.insert("playlist_songs", { playlist_id:playlist.id, song_id:song.id, set_name:activeSet, position:pos });
    await onRefresh(); setSaving(false);
  };

  const removeFromSet = async (song) => {
    setSaving(true);
    const psId = song.ps_id;
    await sb.delete("playlist_songs", "id=eq."+psId);
    // reindex
    const remaining = mySongs.filter(x=>x.set_name===song.set_name&&x.playlist_id===playlist.id&&x.id!==psId).sort((a,b)=>a.position-b.position);
    for (let i=0;i<remaining.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+remaining[i].id);
    await onRefresh(); setSaving(false);
  };

  const handleDrop = async (targetId) => {
    if (!dragId||dragId===targetId) return;
    const fi=songsInSet.findIndex(s=>s.id===dragId), ti=songsInSet.findIndex(s=>s.id===targetId);
    if (fi===-1||ti===-1) return;
    setSaving(true);
    const items=[...songsInSet]; const [mv]=items.splice(fi,1); items.splice(ti,0,mv);
    for (let i=0;i<items.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+items[i].id);
    setDragId(null); await onRefresh(); setSaving(false);
  };

  // ── GIG MODE ────────────────────────────────────────────────
  if (gigMode) {
    const drummerColor = (d) => d==="Ron" ? C.red : d==="Tom" ? C.teal : C.gray;
    return (
      <div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Gig header */}
        <div style={{background:"#0a0a0a",borderBottom:"1px solid #1a1a1a",padding:"12px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setGigMode(false)} style={{background:"transparent",border:"none",color:C.teal,cursor:"pointer",fontSize:20,padding:"4px 8px"}}>✕</button>
          <div style={{flex:1,color:C.white,fontWeight:800,fontSize:18,fontFamily:"'Space Mono',monospace"}}>{playlist.name}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {SETS.map(set=>(
              <button key={set} onClick={()=>{setActiveSet(set); setCurrentSongId(null);}} style={{
                background:activeSet===set?C.teal:"transparent",
                color:activeSet===set?"#000":C.gray,
                border:"1px solid "+(activeSet===set?C.teal:"#333"),
                borderRadius:4,padding:"6px 14px",fontSize:12,fontWeight:700,
                letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"
              }}>{set} ({setCounts[set]})</button>
            ))}
          </div>
        </div>
        {/* Song list */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:8}}>
          {songsInSet.map((song,i)=>{
            const st = dStyle(song.drummer);
            const isCurrent = currentSongId === song.ps_id;
            const currentIdx = songsInSet.findIndex(s=>s.ps_id===currentSongId);
            const isNext = currentSongId && !isCurrent && i === currentIdx + 1;
            const opacity = !currentSongId ? 1 : isCurrent ? 1 : isNext ? 0.75 : 0.35;
            return (
              <div key={song.id}
                onClick={()=>setCurrentSongId(isCurrent ? null : song.ps_id)}
                style={{
                  background: isCurrent ? (song.drummer==="Ron"?C.redDim:C.tealDim) : isNext ? "#161616" : st.bg,
                  border: "2px solid " + (isCurrent ? (song.drummer==="Ron"?C.red:C.teal) : isNext ? "#444" : st.border),
                  borderRadius:8, padding:"14px 18px", display:"flex", alignItems:"center", gap:14,
                  cursor:"pointer", opacity,
                  transition:"all .2s",
                  boxShadow: isCurrent ? "0 0 18px 2px " + (song.drummer==="Ron"?C.redBorder:C.tealBorder) : "none"
                }}>
                {/* Play indicator */}
                <div style={{width:24,textAlign:"center",flexShrink:0}}>
                  {isCurrent
                    ? <div style={{color:song.drummer==="Ron"?C.red:C.teal,fontSize:18,lineHeight:1}}>▶</div>
                    : isNext
                      ? <div style={{color:"#666",fontSize:12,lineHeight:1}}>NEXT</div>
                      : <div style={{color:C.grayDim,fontSize:15,fontFamily:"'Space Mono',monospace"}}>{song.position}</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:isCurrent?C.white:isNext?"#bbb":"#ccc",fontWeight:800,fontSize:isCurrent?24:isNext?19:21,lineHeight:1.2,transition:"font-size .2s"}}>{song.title}</div>
                  <div style={{color:isCurrent?C.gray:"#666",fontSize:isNext?13:15,marginTop:2}}>{song.artist}</div>
                  {song.specialties&&<div style={{color:"#bbb",fontSize:13,fontStyle:"italic",marginTop:2,whiteSpace:"pre-wrap"}}>{song.specialties}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                  {song.bpm>0&&<GigMetronome bpm={song.bpm} autoStart={isCurrent}/>}
                  {song.drummer&&<div style={{color:drummerColor(song.drummer),border:"1px solid "+drummerColor(song.drummer),borderRadius:3,padding:"3px 10px",fontSize:13,fontWeight:700,letterSpacing:"0.08em"}}>{song.drummer}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Zurück</Btn>
        <div style={{ flex:1 }}>
          <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{playlist.name}</div>
          <div style={{ color:C.grayDim, fontSize:11 }}>{mySongs.length} Songs gesamt</div>
        </div>
        <Btn variant="outline" size="sm" onClick={()=>exportPDF(playlist,allSongs,playlistSongs,bandName)}>🖨 PDF</Btn>
        <Btn variant="outline" size="sm" onClick={()=>{
          const url = window.location.origin + "/?share=" + playlist.id;
          if (navigator.clipboard&&navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(()=>show("Link kopiert! An Bandkollegen senden 🐟")).catch(()=>show(url,"success"));
          } else { show(url,"success"); }
        }}>🔗 Teilen</Btn>
        <Btn variant="primary" size="sm" onClick={()=>setGigMode(true)}>🎸 Gig</Btn>
        {saving&&<Spinner/>}
      </div>
      <SealLine/>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {SETS.map(set=>(
          <button key={set} onClick={()=>{setActiveSet(set);setSearch("");}} style={{ background:activeSet===set?C.teal:"transparent", color:activeSet===set?"#000":C.gray, border:"1px solid "+(activeSet===set?C.teal:"#222"), borderRadius:3, padding:"5px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>
            {set} <span style={{ opacity:.7 }}>({setCounts[set]})</span>
          </button>
        ))}
      </div>
      <Field value={search} onChange={setSearch} placeholder="Im Set suchen…"/>
      <AISetNotes setName={activeSet} songs={songsInSet}/>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>{activeSet} · {songsInSet.length} Songs</div>
          <Btn variant="outline" size="sm" onClick={()=>setShowAdd(!showAdd)}>{showAdd?"✕ Schließen":"+ Hinzufügen"}</Btn>
        </div>
        {showAdd&&<div style={{ marginBottom:12, background:"#080808", border:"1px solid #1a1a1a", borderRadius:4, padding:10 }}>
          {available.length===0?<div style={{ color:C.grayDim, fontSize:12 }}>Alle Songs bereits in diesem Set.</div>
          :<div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:180, overflowY:"auto" }}>
            {available.map(song=>(
              <div key={song.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", background:"#0d0d0d", borderRadius:3 }}>
                <div><span style={{ color:C.white, fontSize:13 }}>{song.title}</span><span style={{ color:C.grayDim, fontSize:12 }}> · {song.artist}</span></div>
                <Btn size="sm" onClick={()=>addToSet(song)} disabled={saving}>+</Btn>
              </div>
            ))}
          </div>}
        </div>}
        {songsInSet.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:24, fontSize:13 }}>Keine Songs in diesem Set</div>
        :<div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {songsInSet.map(song=>(
            <SongRowMove key={song.id} song={song} mySongs={mySongs} playlist={playlist}
              onDelete={()=>removeFromSet(song)} onRefresh={onRefresh} setSaving={setSaving} saving={saving}/>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ── Setlist Manager ────────────────────────────────────────────────────────
function SetlistManager({ band, allSongs, gigs, playlists, playlistSongs, onRefresh, show }) {
  const [view, setView]         = useState("gigs");
  const [selGig, setSelGig]     = useState(null);
  const [selPl, setSelPl]       = useState(null);
  const [gigName, setGigName]   = useState(""); const [gigDate, setGigDate] = useState("");
  const [plName, setPlName]     = useState("");
  const [confirm, setConfirm]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const bandGigs   = gigs.filter(g=>g.band_id===band.id);
  const gigPls     = playlists.filter(p=>p.gig_id===selGig?.id);

  if (view==="editor"&&selPl) return <PlaylistEditor playlist={selPl} allSongs={allSongs} playlistSongs={playlistSongs} onBack={()=>setView("playlists")} onRefresh={onRefresh} bandName={band.name} show={show}/>;

  if (view==="playlists"&&selGig) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Btn variant="ghost" size="sm" onClick={()=>setView("gigs")}>← Gigs</Btn>
        <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{selGig.name}</div>
      </div>
      <SealLine/>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:14 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neue Playlist</div>
        <div style={{ display:"flex", gap:8 }}>
          <Field value={plName} onChange={setPlName} placeholder="Playlist-Name…"/>
          <Btn onClick={async()=>{ if(plName){ setSaving(true); await sb.insert("playlists",{gig_id:selGig.id,name:plName}); setPlName(""); await onRefresh(); show("Playlist erstellt!"); setSaving(false); }}} disabled={!plName||saving}>Erstellen</Btn>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {gigPls.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, fontSize:13 }}>Noch keine Playlists</div>
        :gigPls.map(p=>(
          <div key={p.id} style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:C.white, fontWeight:600, fontSize:14 }}>{p.name}</div>
              <div style={{ color:C.grayDim, fontSize:11 }}>{playlistSongs.filter(ps=>ps.playlist_id===p.id).length} Songs</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn size="sm" onClick={()=>{setSelPl(p);setView("editor");}}>Öffnen →</Btn>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({type:"pl",item:p})}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
      {confirm&&<Confirm msg={`„${confirm.item.name}" löschen?`} onOk={async()=>{ await sb.delete("playlists","id=eq."+confirm.item.id); await onRefresh(); show("Playlist gelöscht."); setConfirm(null); }} onCancel={()=>setConfirm(null)}/>}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Gig-Verwaltung</div>
      <SealLine/>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:14 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neuer Gig</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Field value={gigName} onChange={setGigName} placeholder="Gig-Name"/>
          <Field value={gigDate} onChange={setGigDate} type="date" placeholder="Datum"/>
          <Btn full disabled={!gigName||saving} onClick={async()=>{ setSaving(true); await sb.insert("gigs",{band_id:band.id,name:gigName,date:gigDate||null}); setGigName(""); setGigDate(""); await onRefresh(); show("Gig erstellt!"); setSaving(false); }}>Gig erstellen</Btn>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {bandGigs.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, fontSize:13 }}>Noch keine Gigs</div>
        :bandGigs.map(gig=>(
          <div key={gig.id} onClick={()=>{setSelGig(gig);setView("playlists");}}
            style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1a"}>
            <div>
              <div style={{ color:C.white, fontWeight:600, fontSize:14 }}>{gig.name}</div>
              {gig.date&&<div style={{ color:C.grayDim, fontSize:11 }}>{new Date(gig.date+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}</div>}
              <div style={{ color:C.grayDim, fontSize:11 }}>{playlists.filter(p=>p.gig_id===gig.id).length} Playlists</div>
            </div>
            <div onClick={e=>e.stopPropagation()}>
              <Btn variant="danger" size="sm" onClick={()=>setConfirm({item:gig})}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
      {confirm&&<Confirm msg={`Gig „${confirm.item.name}" löschen?`} onOk={async()=>{ await sb.delete("gigs","id=eq."+confirm.item.id); await onRefresh(); show("Gig gelöscht."); setConfirm(null); }} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── Band Detail ────────────────────────────────────────────────────────────
function BandDetail({ band, songs, gigs, playlists, playlistSongs, onBack, onRefresh, show }) {
  const [tab, setTab] = useState("songs");
  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <header style={{ borderBottom:"1px solid #111", background:"rgba(0,0,0,.95)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px", height:50, display:"flex", alignItems:"center", gap:10 }}>
          <Btn variant="ghost" size="sm" onClick={onBack}>←</Btn>
          <div style={{ color:C.white, fontWeight:800, fontSize:16, fontFamily:"'Space Mono',monospace", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{band.name}</div>
        </div>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 10px", display:"flex", gap:6 }}>
          {[{key:"songs",label:"🎵 Songs"},{key:"setlist",label:"📋 Setlist"}].map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{ flex:1, background:tab===key?C.teal:"transparent", color:tab===key?"#000":C.gray, border:`1px solid ${tab===key?C.teal:"#222"}`, borderRadius:4, padding:"8px 0", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
          ))}
          <button onClick={()=>setTab("import")} style={{ flex:1, background:tab==="import"?C.teal:"rgba(92,200,184,0.08)", color:tab==="import"?"#000":C.teal, border:`1px solid ${tab==="import"?C.teal:C.tealBorder}`, borderRadius:4, padding:"8px 0", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>↑ Import</button>
        </div>
        <SealLine color={band.color}/>
      </header>
      <main style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px" }}>
        {tab==="songs"   &&<SongDatabase band={band} songs={songs} onRefresh={onRefresh} show={show}/>}
        {tab==="setlist" &&<SetlistManager band={band} allSongs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} onRefresh={onRefresh} show={show}/>}
        {tab==="import"  &&<ImportWizard band={band} existingSongs={songs} gigs={gigs} onImportDone={onRefresh} show={show}/>}
      </main>
    </div>
  );
}

// ── Landing ────────────────────────────────────────────────────────────────
function Landing({ bands, songs, user, onSelect, onLogout }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <header style={{ borderBottom:"1px solid #111", padding:"16px 24px" }}>
        <div style={{ maxWidth:720, margin:"0 auto", display:"flex", alignItems:"center", gap:14 }}>
          <SealIcon size={40}/>
          <div style={{ flex:1 }}>
            <div style={{ color:C.white, fontWeight:900, fontSize:20, fontFamily:"'Space Mono',monospace" }}>SPIELFERTIG<span style={{ color:C.teal }}>‽</span></div>
            <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.2em" }}>ZEIT FÜR GUTEN SOUND</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:C.gray, fontSize:11, marginBottom:4 }}>{user.email}</div>
            <Btn variant="ghost" size="sm" onClick={onLogout}>Abmelden</Btn>
          </div>
        </div>
      </header>
      <SealLine/>
      <main style={{ flex:1, maxWidth:720, margin:"0 auto", padding:"40px 24px", width:"100%", boxSizing:"border-box" }}>
        <div style={{ marginBottom:28 }}>
          <h2 style={{ color:C.white, fontSize:24, fontWeight:900, marginBottom:6, fontFamily:"'Space Mono',monospace" }}>Deine Bands</h2>
          <p style={{ color:C.grayDim, fontSize:13 }}>Songdatenbank & Setlist-Manager</p>
        </div>
        {bands.length===0?(
          <div style={{ textAlign:"center", color:C.grayDim, padding:48, fontSize:14 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🎸</div>
            Noch keine Bands. Lege deine erste Band an!
          </div>
        ):(
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
            {bands.map(band=>{
              const count = songs.filter(s=>s.band_id===band.id).length;
              return (
                <div key={band.id} onClick={()=>onSelect(band)}
                  style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:8, padding:22, cursor:"pointer", position:"relative", overflow:"hidden", transition:"border-color .2s,transform .2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=band.color+"55";e.currentTarget.style.transform="translateY(-1px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.transform="none";}}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${band.color},transparent)` }}/>
                  <div style={{ fontSize:26, marginBottom:8 }}>{band.emoji}</div>
                  <div style={{ color:C.white, fontWeight:800, fontSize:17, marginBottom:4, fontFamily:"'Space Mono',monospace" }}>{band.name}</div>
                  <SealLine color={band.color}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                    <span style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.08em" }}>SONGS & SETLIST</span>
                    <Badge color={band.color}>{count} Songs</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SealLine/>
      <footer style={{ padding:"12px 24px", textAlign:"center" }}>
        <div style={{ color:"#1e1e1e", fontSize:10, letterSpacing:"0.15em" }}>THOMAS SCHUSTER · <span style={{ color:C.teal }}>SCHLAGFERTIG‽</span></div>
      </footer>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
// ── Shared Read-Only View (für Bandkollegen) ─────────────────────────────────
function SharedView({ playlistId }) {
  const [data, setData]         = useState(null);
  const [activeSet, setActiveSet] = useState("Set 1");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(()=>{
    (async()=>{
      try {
        const pls = await sb.query("playlists", { select:"*", filter:"id=eq."+playlistId });
        const playlist = Array.isArray(pls)&&pls[0] ? pls[0] : null;
        if (!playlist) { setError("Setlist nicht gefunden oder nicht freigegeben."); setLoading(false); return; }
        const ps = await sb.query("playlist_songs", { select:"*", filter:"playlist_id=eq."+playlistId, order:"position.asc" });
        const psArr = Array.isArray(ps) ? ps : [];
        const ids = [...new Set(psArr.map(p=>p.song_id))];
        let songs = [];
        if (ids.length) {
          const sres = await sb.query("songs", { select:"*", filter:"id=in.("+ids.join(",")+")" });
          songs = Array.isArray(sres) ? sres : [];
        }
        let bandName = "";
        const gres = await sb.query("gigs", { select:"*", filter:"id=eq."+playlist.gig_id });
        const gig = Array.isArray(gres)&&gres[0] ? gres[0] : null;
        if (gig) {
          const bres = await sb.query("bands", { select:"*", filter:"id=eq."+gig.band_id });
          if (Array.isArray(bres)&&bres[0]) bandName = bres[0].name;
        }
        // first non-empty set as default
        const firstSet = SETS.find(s=>psArr.some(p=>p.set_name===s)) || "Set 1";
        setActiveSet(firstSet);
        setData({ playlist, ps:psArr, songs, bandName });
      } catch(e) { setError("Fehler beim Laden."); }
      setLoading(false);
    })();
  },[playlistId]);

  const drummerColor = (d) => d==="Ron" ? C.red : d==="Tom" ? C.teal : C.gray;
  const setCounts = SETS.reduce((a,s)=>{ a[s]=(data?.ps||[]).filter(p=>p.set_name===s).length; return a; },{});
  const songsInSet = (data?.ps||[])
    .filter(p=>p.set_name===activeSet)
    .map(p=>({ ...(data.songs.find(s=>s.id===p.song_id)||{}), position:p.position }))
    .sort((a,b)=>a.position-b.position);

  const fontStyle = { fontFamily:"'Inter',sans-serif" };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, ...fontStyle }}>
      <SealIcon size={52}/><Spinner/>
      <div style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.15em" }}>SETLIST LÄDT…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:24, textAlign:"center", ...fontStyle }}>
      <SealIcon size={48}/>
      <div style={{ color:C.red, fontSize:14 }}>{error}</div>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", display:"flex", flexDirection:"column", overflow:"hidden", ...fontStyle }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#000}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}"}</style>
      {/* Header */}
      <div style={{ background:"#0a0a0a", borderBottom:"1px solid #1a1a1a", padding:"12px 18px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <SealIcon size={28}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:C.white, fontWeight:800, fontSize:16, fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{data.playlist.name}</div>
            <div style={{ color:C.grayDim, fontSize:11 }}>{data.bandName} · nur Ansicht</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {SETS.map(set=>(
            <button key={set} onClick={()=>setActiveSet(set)} style={{
              background:activeSet===set?C.teal:"transparent",
              color:activeSet===set?"#000":C.gray,
              border:"1px solid "+(activeSet===set?C.teal:"#333"),
              borderRadius:4, padding:"6px 14px", fontSize:12, fontWeight:700,
              letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit"
            }}>{set} ({setCounts[set]})</button>
          ))}
        </div>
      </div>
      {/* Songs */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:8 }}>
        {songsInSet.length===0
          ? <div style={{ textAlign:"center", color:C.grayDim, padding:32, fontSize:14 }}>Keine Songs in diesem Set</div>
          : songsInSet.map((song,i)=>{
              const st = dStyle(song.drummer);
              return (
                <div key={i} style={{ background:st.bg, border:"1px solid "+st.border, borderRadius:8, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ color:C.grayDim, fontSize:16, fontFamily:"'Space Mono',monospace", width:28, textAlign:"right", flexShrink:0 }}>{song.position}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:C.white, fontWeight:800, fontSize:21, lineHeight:1.2 }}>{song.title}</div>
                    <div style={{ color:C.gray, fontSize:15, marginTop:2 }}>{song.artist}</div>
                    {song.specialties&&<div style={{ color:"#bbb", fontSize:13, fontStyle:"italic", marginTop:2, whiteSpace:"pre-wrap" }}>{song.specialties}</div>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                    {song.bpm>0&&<GigMetronome bpm={song.bpm}/>}
                    {song.drummer&&<div style={{ color:drummerColor(song.drummer), border:"1px solid "+drummerColor(song.drummer), borderRadius:3, padding:"3px 10px", fontSize:13, fontWeight:700, letterSpacing:"0.08em" }}>{song.drummer}</div>}
                  </div>
                </div>
              );
            })}
      </div>
      {/* Footer */}
      <div style={{ padding:"10px 18px", textAlign:"center", borderTop:"1px solid #111", flexShrink:0 }}>
        <div style={{ color:"#1e1e1e", fontSize:10, letterSpacing:"0.15em" }}>SPIELFERTIG<span style={{ color:C.teal }}>‽</span> · GETEILTE SETLIST</div>
      </div>
    </div>
  );
}

export default function App() {
  const [user,          setUser]   = useState(null);
  const [bands,         setBands]  = useState([]);
  const [songs,         setSongs]  = useState([]);
  const [gigs,          setGigs]   = useState([]);
  const [playlists,     setPls]    = useState([]);
  const [playlistSongs, setPS]     = useState([]);
  const [selBand,       setSelBand]= useState(null);
  const [loading,       setLoading]= useState(true);
  const [toast,         setToast]  = useState(null);

  const show = (msg, type="success") => setToast({msg,type});

  // Shared read-only view via ?share=<playlistId>
  const shareId = typeof window!=="undefined" ? new URLSearchParams(window.location.search).get("share") : null;

  // Restore session
  useEffect(()=>{
    const token = localStorage.getItem("sf_token");
    const u     = localStorage.getItem("sf_user");
    if (token && u) { sb._token = token; setUser(JSON.parse(u)); }
    else setLoading(false);
  },[]);

  // Load all data when user is set
  const loadAll = useCallback(async () => {
    if (!sb._token) return;
    setLoading(true);
    try {
      const [b,s,g,pl,ps] = await Promise.all([
        sb.query("bands",         { select:"*", order:"created_at.asc" }),
        sb.query("songs",         { select:"*", order:"created_at.asc" }),
        sb.query("gigs",          { select:"*", order:"date.desc,created_at.desc" }),
        sb.query("playlists",     { select:"*", order:"created_at.asc" }),
        sb.query("playlist_songs",{ select:"*", order:"position.asc" }),
      ]);
      setBands(Array.isArray(b)?b:[]); setSongs(Array.isArray(s)?s:[]);
      setGigs(Array.isArray(g)?g:[]); setPls(Array.isArray(pl)?pl:[]);
      setPS(Array.isArray(ps)?ps:[]);
    } catch(e) { show("Ladefehler: "+e.message,"error"); }
    setLoading(false);
  },[]);

  useEffect(()=>{ if(user) loadAll(); },[user,loadAll]);

  const handleAuth = (u) => { setUser(u); };
  const handleLogout = async () => { await sb.auth.signOut(); setUser(null); setBands([]); setSongs([]); setGigs([]); setPls([]); setPS([]); };

  if (shareId) return <SharedView playlistId={shareId}/>;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
      <SealIcon size={52}/><Spinner/>
      <div style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.15em" }}>LADEN…</div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={handleAuth}/>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;background:#000;color:#e2e8f0;-webkit-font-smoothing:antialiased;}
        input::placeholder,textarea::placeholder{color:#333;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3)}
      `}</style>

      {selBand ? (
        <BandDetail band={selBand} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs}
          onBack={()=>setSelBand(null)} onRefresh={loadAll} show={show}/>
      ) : (
        <Landing bands={bands} songs={songs} user={user} onSelect={setSelBand} onLogout={handleLogout}/>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
