import { useState, useMemo, useEffect, useCallback, useRef } from "react";
// ── Supabase Client (inline, no npm needed via CDN) ────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
// Fetch with timeout
const fetchWithTimeout = async (url, options, ms=8000) => {
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), ms);
try {
const res = await fetch(url, { ...options, signal: controller.signal });
clearTimeout(id);
return res;
} catch(e) {
clearTimeout(id);
if (e.name === "AbortError") throw new Error("Timeout – Supabase antwortet nicht");
throw e;
}
};
// Minimal Supabase REST helper
const sb = {
headers: () => { const t = sb._token || SUPABASE_KEY; return { "Content-Type": "application
_token: null,
async query(table, options = {}) {
let url = SUPABASE_URL + "/rest/v1/" + table + "?";
if (options.select) url += "select=" + encodeURIComponent(options.select) + "&";
if (options.filter) url += options.filter + "&";
if (options.order) url += "order=" + options.order + "&";
const res = await fetch(url, { headers: { ...sb.headers(), "Prefer": "return=representati
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
const res = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/token?grant_type=password",
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
if (d === "Ron") return { bg: C.redDim, border: C.redBorder, badge: C.red };
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
function Btn({ children, onClick, variant="primary", size="md", disabled, full, style:s={} })
const sz = { sm:{padding:"5px 11px",fontSize:11}, md:{padding:"8px 18px",fontSize:12}, lg:{
const vr = {
primary: { background:C.teal, color:"#000", border:"none" },
outline: { background:"transparent", color:C.teal, border:`1px solid ${C.tealBorder}` },
danger: { background:C.redDim, color:C.red, border:`1px solid ${C.redBorder}` },
ghost: { background:"transparent", color:C.gray, border:"none" },
};
return <button onClick={disabled?undefined:onClick} style={{ ...sz[size],...vr[variant], bo
}
function Field({ value, onChange, placeholder, type="text", rows, style:s={} }) {
const base = { background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4
if (rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder
return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder=
}
function Sel({ value, onChange, options, style:s={} }) {
return <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:"#0
}
function Badge({ children, color }) {
return <span style={{ color, border:`1px solid ${color}`, fontSize:10, fontWeight:700, padd
}
function Toast({ msg, type, onClose }) {
useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[]);
return <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:type===
}
function Confirm({ msg, onOk, onCancel }) {
return (
<div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, displ
<div style={{ background:C.bgCard, border:"1px solid #222", borderRadius:8, padding:28,
<p style={{ color:C.white, fontSize:14, fontWeight:600, marginBottom:6 }}>Löschen bes
<p style={{ color:C.gray, fontSize:13, marginBottom:20 }}>{msg}</p>
<SealLine/><div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:
<Btn variant="ghost" onClick={onCancel}>Abbrechen</Btn>
<Btn variant="danger" onClick={onOk}>Löschen</Btn>
</div>
</div>
</div>
);
}
function Modal({ title, onClose, children }) {
return (
<div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, displ
<div style={{ background:C.bgCard, border:"1px solid #222", borderRadius:8, padding:26,
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", ma
<span style={{ color:C.teal, fontWeight:700, fontSize:11, letterSpacing:"0.1em", te
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
<path d="M26 40 L35 50 L54 30" stroke={C.white} strokeWidth="3.5" strokeLinecap="round"
</svg>
);
}
function Spinner() {
return <div style={{ width:20, height:20, border:`2px solid #222`, borderTop:`2px solid ${C
}
// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
const [mode, setMode] = useState("login");
const [email, setEmail] = useState("");
const [password, setPass] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const handle = async () => {
if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
setLoading(true); setError("");
try {
// Test connection first
setError("Verbinde mit Supabase...");
const testRes = await fetchWithTimeout(SUPABASE_URL + "/auth/v1/settings", { headers: {
const testData = await testRes.json();
setError("Verbunden! Registriere...");
const res = mode === "login" ? await sb.auth.signIn(email, password) : await sb.auth.si
if (res.error || res.error_description || res.msg) { setError(JSON.stringify(res).subst
else if (res.access_token) {
sb._token = res.access_token;
localStorage.setItem("sf_token", res.access_token);
localStorage.setItem("sf_user", JSON.stringify({ email: res.user?.email, id: res.user
onAuth({ email: res.user?.email, id: res.user?.id });
} else if (mode === "register") {
setError("Bestätigungs-E-Mail gesendet! Bitte bestätigen, dann einloggen.");
}
} catch(e) { setError("Fehler: " + e.message + " | URL: " + SUPABASE_URL.substring(0,30))
setLoading(false);
};
return (
<div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column",
<div style={{ marginBottom:32, textAlign:"center" }}>
<SealIcon size={56}/>
<div style={{ color:C.white, fontWeight:900, fontSize:24, fontFamily:"'Space Mono',mo
<div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.2em", marginTop:4 }}>ZEI
</div>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:10, padding
<SealLine/>
<div style={{ display:"flex", gap:6, margin:"16px 0" }}>
{[{k:"login",l:"Anmelden"},{k:"register",l:"Registrieren"}].map(({k,l})=>(
<button key={k} onClick={()=>{ setMode(k); setError(""); }} style={{ flex:1, back
))}
</div>
<div style={{ display:"flex", flexDirection:"column", gap:10 }}>
<Field value={email} onChange={setEmail} placeholder="E-Mail" type="email"/>
<Field value={password} onChange={setPass} placeholder="Passwort" type="password"/>
{error && <div style={{ color:mode==="register"&&error.includes("Bestätigung")?C.te
<Btn full onClick={handle} disabled={loading}>
{loading ? <Spinner/> : mode==="login" ? "Anmelden" : "Konto erstellen"}
</Btn>
</div>
</div>
<div style={{ color:"#1e1e1e", fontSize:10, letterSpacing:"0.15em", marginTop:24 </div>
}}>THO
);
}
// ── Metronome ──────────────────────────────────────────────────────────────
function useMetronome(bpm) {
const [active, setActive] = useState(false);
const [beat, setBeat] = useState(false);
const iRef = useRef(null), ctxRef = useRef(null);
const tick = useCallback(() => {
try {
if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioCon
const ctx = ctxRef.current, osc = ctx.createOscillator(), gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.value = 1000;
gain.gain.setValueAtTime(0.35, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
osc.start(); osc.stop(ctx.currentTime + 0.05);
} catch {}
setBeat(true); setTimeout(()=>setBeat(false), 80);
}, []);
const toggle = useCallback((e) => {
e.stopPropagation();
if (!bpm || bpm <= 0) return;
if (active) { clearInterval(iRef.current); setActive(false); setBeat(false); }
else { setActive(true); tick(); iRef.current = setInterval(tick, (60/bpm)*1000); }
}, [active, bpm, tick]);
useEffect(()=>()=>clearInterval(iRef.current), []);
return { active, beat, toggle };
}
// ── Song Row ───────────────────────────────────────────────────────────────
function SongRow({ song, onDelete, onEdit, pos, draggable, onDragStart, onDrop, isDragging })
const st = dStyle(song.drummer);
const { active, beat, toggle } = useMetronome(song.bpm);
const pulseColor = beat?"#fff":active?C.teal:C.grayDim;
const pulseGlow = beat?`0 0 10px 4px ${C.teal}`:active?`0 0 4px 1px ${C.tealBorder}`:"non
const pulseBorder = active?`1px solid ${beat?"#fff":C.teal}`:"1px solid #2a2a2a";
return (
<div draggable={draggable} onDragStart={onDragStart} onDragOver={e=>e.preventDefault()} o
style={{ background:isDragging?"#0a0a0a":st.bg, border:`1px solid ${isDragging?C.teal:s
{pos!==undefined&&<div style={{ color:C.grayDim, fontSize:11, width:18, textAlign:"righ
{draggable&&<div style={{ color:C.grayDim, fontSize:13, flexShrink:0 }}>⠿</div>}
{song.bpm>0&&(
<button onClick={toggle} title={`${active?"Stop":"Start"} (${song.bpm} BPM)`}
style={{ background:"transparent", border:pulseBorder, borderRadius:"50%", width:32
<div style={{ width:14, height:14, borderRadius:"50%", background:pulseColor, trans
</button>
)}
overfl
<div style={{ flex:1, minWidth:0 }}>
<div style={{ fontWeight:600, color:C.white, fontSize:14, whiteSpace:"nowrap", <div style={{ color:C.gray, fontSize:12 }}>
{song.artist}
{song.bpm>0&&<span style={{ color:active?C.teal:C.grayDim, fontFamily:"'Space Mono'
</div>
{song.specialties&&<div style={{ color:C.grayDim, fontSize:11, fontStyle:"italic" }}>
</div>
{song.drummer&&<Badge color={st.badge}>{song.drummer}</Badge>}
{onEdit&&<button onClick={e=>{e.stopPropagation();onEdit(song);}} style={{ background:"
{onDelete&&<button onClick={e=>{e.stopPropagation();onDelete(song);}} style={{ backgrou
</div>
);
}
// ── PDF Export ─────────────────────────────────────────────────────────────
function exportPDF(playlist, allSongs, playlistSongs, bandName) {
const ps = playlistSongs.filter(p=>p.playlist_id===playlist.id);
let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${playlist.name}</title
<style>body{font-family:'Courier New',monospace;background:#fff;color:#000;padding:32px;max
h1{font-size:20px;margin:0 0 2px}h2{font-size:12px;font-weight:normal;color:#555;margin:0 0
.seal{border-top:2px solid #5cc8b8;border-bottom:2px solid #5cc8b8;padding:5px 0;margin:14p
.set{font-size:13px;font-weight:bold;margin:18px 0 5px;text-transform:uppercase;letter-spac
table{width:100%;border-collapse:collapse;margin-bottom:6px}
td{padding:5px 6px;font-size:12px;border-bottom:1px solid #eee}td:first-child{width:24px;co
.tom{background:#e0f7f5}.ron{background:#fde8e8}
.footer{margin-top:28px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #e
@media print{body{padding:16px}}</style></head><body>
<h1>SPIELFERTIG‽ — ${bandName}</h1>
<h2>${playlist.name} · ${new Date().toLocaleDateString("de-DE")}</h2><div class="seal"></di
SETS.forEach(set => {
const items = ps.filter(p=>p.set_name===set).sort((a,b)=>a.position-b.position);
if (!items.length) return;
html += `<div class="set">▶ ${set} <small style="font-weight:normal;color:#888">(${items.
items.forEach((p,i)=>{
const s = allSongs.find(x=>x.id===p.song_id);
if (!s) return;
html += `<tr class="${s.drummer==="Ron"?"ron":s.drummer==="Tom"?"tom":""}"><td>${i+1}.<
});
html += `</table>`;
});
html += `<div class="footer">SCHLAGFERTIG‽ · Thomas Schuster · ZEIT FÜR GUTEN SOUND</div></
const w = window.open("","_blank");
w.document.write(html); w.document.close();
setTimeout(()=>w.print(), 400);
}
// ── AI Set Notes ───────────────────────────────────────────────────────────
function AISetNotes({ setName, songs }) {
const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(false); cons
const generate = async () => {
setLoading(true);
const list = songs.map((s,i)=>`${i+1}. ${s.title} – ${s.artist} (${s.bpm} BPM, Drummer: $
try {
const res = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
messages:[{role:"user",content:`Analysiere diese Setlist für "${setName}" (max 150
const d = await res.json();
setNotes(d.content?.[0]?.text || "Keine Analyse.");
} catch { setNotes("Verbindungsfehler."); }
setLoading(false);
header
};
return (
<div>
</div>}
</div>
<button onClick={()=>setOpen(!open)} style={{ background:"transparent", border:`1px sol
{open&&<div style={{ marginTop:8, background:"#080808", border:"1px solid #1e1e1e", bor
<Btn size="sm" onClick={generate} disabled={loading||!songs.length}>{loading?"Analysi
{notes&&<p style={{ marginTop:10, color:"#aaa", fontSize:13, lineHeight:1.7, whiteSpa
);
}
// ── AI Import Wizard ───────────────────────────────────────────────────────
function ImportWizard({ band, existingSongs, gigs, onImportDone, show }) {
const [step, setStep] = useState("upload");
const [loading, setLoading] = useState(false);
const [fileType, setFileType] = useState(null);
const [rawText, setRawText] = useState("");
const [fileB64, setFileB64] = useState(null);
const [fileMime, setFileMime] = useState(null);
const [parsed, setParsed] = useState(null);
const [importMode, setMode] = useState("both");
const [gigId, setGigId] = useState("");
const [newGigName, setNewGig] = useState("");
const [plName, setPlName] = useState("Importierte Playlist");
const [error, setError] = useState("");
const [saving, setSaving] = useState(false);
const bandGigs = gigs.filter(g=>g.band_id===band.id);
const handleFile = async (file) => {
setError("");
const mime = file.type;
if (mime.startsWith("image/")||mime==="application/pdf") {
const reader = new FileReader();
reader.onload = e => { setFileB64(e.target.result.split(",")[1]); setFileMime(mime); se
reader.readAsDataURL(file);
} else {
try { const t = await file.text(); setRawText(t); setFileType("text"); }
catch { setError("Format nicht unterstützt."); }
}
};
header
const runAnalysis = async () => {
if (!fileType&&!rawText) { setError("Bitte Datei hochladen oder Text einfügen."); return;
setLoading(true); setError("");
const system = `Extrahiere Songs. Nur JSON, kein Markdown.\n{"songs":[{"title":"","artist
try {
let messages;
if (fileType==="image") messages=[{role:"user",content:[{type:"image",source:{type:"bas
else if (fileType==="pdf") messages=[{role:"user",content:[{type:"document",source:{typ
else messages=[{role:"user",content:`Extrahiere Songs:\n\n${rawText}`}];
const res = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, system, mess
const data = await res.json();
const text = data.content?.map(c=>c.text||"").join("").trim().replace(/```json|```/g,""
const result = JSON.parse(text);
setParsed(result);
if (result.playlistName) setPlName(result.playlistName);
setStep("preview");
} catch { setError("Analyse fehlgeschlagen. Nochmal versuchen."); }
setLoading(false);
};
const toggle = idx => setParsed(p=>({...p,songs:p.songs.map((s,i)=>i===idx?{...s,_skip:!s
const editSong = (idx,field,val) => setParsed(p=>({...p,songs:p.songs.map((s,i)=>i===idx?{.
const handleImport = async () => {
setSaving(true);
const toImport = parsed.songs.filter(s=>!s._skip);
try {
// 1. Insert new songs
const newSongRecs = [];
for (const s of toImport) {
const exists = existingSongs.find(e=>e.band_id===band.id&&e.title.toLowerCase()===s.t
if (!exists) {
const inserted = await sb.insert("songs", { band_id:band.id, title:s.title, artist:
newSongRecs.push({ ...s, dbId: inserted.id });
} else {
newSongRecs.push({ ...s, dbId: exists.id });
}
}
// 2. Create playlist if needed
if (importMode !== "songs") {
let tGigId = gigId ? parseInt(gigId) : null;
if (!tGigId && newGigName) {
const g = await sb.insert("gigs", { band_id:band.id, name:newGigName, date:null });
tGigId = g.id;
}
if (tGigId) {
const pl = await sb.insert("playlists", { gig_id:tGigId, name:plName });
for (const s of toImport) {
const rec = newSongRecs.find(r=>r.title===s.title);
if (!rec) continue;
const setName = (s.set&&SETS.includes(s.set))?s.set:"Set 1";
const pos = toImport.filter(x=>x.set===setName).indexOf(s)+1;
await sb.insert("playlist_songs", { playlist_id:pl.id, song_id:rec.dbId, set_name
}
}
}
show(`${toImport.length} Songs importiert!`);
onImportDone();
setStep("done");
} catch(e) { setError("Fehler beim Speichern: "+e.message); }
setSaving(false);
};
const reset = () => { setStep("upload"); setFileType(null); setRawText(""); setFileB64(null
paddin
if (step==="done") return (
<div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:18, <div style={{ fontSize:44 }}> </div>
<div style={{ color:C.white, fontWeight:800, fontSize:18, fontFamily:"'Space Mono',mono
<SealLine/><Btn onClick={reset}>Weiteren Import</Btn>
</div>
);
if (step==="preview"&&parsed) {
const active = parsed.songs.filter(s=>!s._skip);
const newCnt = active.filter(s=>!existingSongs.find(e=>e.band_id===band.id&&e.title.toLow
return (
<div style={{ display:"flex", flexDirection:"column", gap:14 }}>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<Btn variant="ghost" size="sm" onClick={reset}>← Neu</Btn>
<span style={{ color:C.white, fontWeight:700, fontSize:15 }}>Vorschau & Bestätigung
</div>
<SealLine/>
<div style={{ display:"flex", gap:8 }}>
{[{l:"Erkannt",v:parsed.songs.length,c:C.teal},{l:"Neu",v:newCnt,c:C.teal},{l:"Vorh
<div key={l} style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", bo
<div style={{ color:c, fontSize:18, fontWeight:800, fontFamily:"'Space Mono',mo
<div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.08em", textTransfo
</div>
))}
</div>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, paddin
<div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", tex
<div style={{ display:"flex", gap:6, marginBottom:12 }}>
{[{k:"both",l:"Songs + Playlist"},{k:"songs",l:"Nur Songs"},{k:"playlist",l:"Nur
<button key={k} onClick={()=>setMode(k)} style={{ background:importMode===k?C.t
))}
</div>
{importMode!=="songs"&&(
<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
<Field value={plName} onChange={setPlName} placeholder="Playlist-Name"/>
{bandGigs.length>0&&<select value={gigId} onChange={e=>setGigId(e.target.value)
{!gigId&&<Field value={newGigName} onChange={setNewGig} placeholder="Neuer Gig-
</div>
)}
</div>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, paddin
<div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", tex
<div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:320, overflo
{parsed.songs.map((song,idx)=>{
const exists = existingSongs.find(e=>e.band_id===band.id&&e.title.toLowerCase()
return (
<div key={idx} style={{ display:"flex", alignItems:"center", gap:8, backgroun
<input type="checkbox" checked={!song._skip} onChange={()=>toggle(idx)} sty
<div style={{ flex:1, minWidth:0 }}>
<input value={song.title} onChange={e=>editSong(idx,"title",e.target.valu
<input value={song.artist||""} onChange={e=>editSong(idx,"artist",e.targe
</div>
<input value={song.bpm||""} onChange={e=>editSong(idx,"bpm",e.target.value)
<select value={song.drummer||""} onChange={e=>editSong(idx,"drummer",e.targ
<option value="">–</option>{band.drummers.map(d=><option key={d} value={d
</select>
{exists&&<span style={{ color:C.teal, fontSize:9, textTransform:"uppercase"
</div>
);
})}
</div>
</div>
{error&&<div style={{ color:C.red, fontSize:12, padding:"8px 12px", background:C.redD
<Btn full onClick={handleImport} disabled={!active.length||saving}>{saving?<Spinner/>
</div>
);
}
import
return (
<div style={{ display:"flex", flexDirection:"column", gap:16 }}>
<div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Playlist / Songliste <SealLine/>
<div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTr
style={{ border:`2px dashed ${fileType?C.teal:"#2a2a2a"}`, borderRadius:8, padding:"3
<input id="imp-inp" type="file" accept="image/*,.pdf,.csv,.txt" style={{ display:"non
{fileType?<div><div style={{ fontSize:30, marginBottom:6 }}>{fileType==="image"?" :<div><div style={{ fontSize:30, marginBottom:6 }}> </div><div style={{ color:C.gray
</div>
<div style={{ position:"relative", textAlign:"center", margin:"4px 0" }}><SealLine/><sp
<Field value={rawText} onChange={v=>{setRawText(v);setFileType(v?"text":null);}} rows={
{error&&<div style={{ color:C.red, fontSize:12, padding:"8px 12px", background:C.redDim
<Btn full disabled={loading||(!fileType&&!rawText)} onClick={runAnalysis}>{loading?"
</div>
":
);
}
// ── Song Database ──────────────────────────────────────────────────────────
function SongDatabase({ band, songs, onRefresh, show }) {
const [search, setSearch] = useState("");
const [form, setForm] = useState({ title:"", artist:"", bpm:"", drummer:band.drummers
const [editSong, setEdit] = useState(null);
const [confirm, setConfirm] = useState(null);
const [saving, setSaving] = useState(false);
const bandSongs = songs.filter(s=>s.band_id===band.id);
const filtered = bandSongs.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())|
const handleAdd = async () => {
if (!form.title||!form.artist||!form.bpm) return;
setSaving(true);
await sb.insert("songs", { band_id:band.id, title:form.title, artist:form.artist, bpm:par
setForm({ title:"", artist:"", bpm:"", drummer:band.drummers[0]||"Tom", specialties:"" })
await onRefresh(); show("Song hinzugefügt!"); setSaving(false);
};
const handleDelete = async (song) => {
await sb.delete("songs", `id=eq.${song.id}`);
await onRefresh(); show("Song gelöscht."); setConfirm(null);
};
const handleUpdate = async () => {
await sb.update("songs", { title:editSong.title, artist:editSong.artist, bpm:parseInt(edi
await onRefresh(); show("Song gespeichert!"); setEdit(null);
};
return (
<div style={{ display:"flex", flexDirection:"column", gap:13 }}>
<div style={{ display:"flex", gap:8 }}>
{band.drummers.map(d=>(
<div key={d} style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", bord
<div style={{ color:d==="Ron"?C.red:C.teal, fontSize:20, fontWeight:800, fontFami
<div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:
</div>
))}
<div style={{ flex:1, background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:4
<div style={{ color:C.gray, fontSize:20, fontWeight:800, fontFamily:"'Space Mono',m
<div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:"u
</div>
</div>
<Field value={search} onChange={setSearch} placeholder="Suchen…"/>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:
<div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textT
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}
<Field value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder=
<Field value={form.artist} onChange={v=>setForm(f=>({...f,artist:v}))} placeholder=
<Field value={form.bpm} onChange={v=>setForm(f=>({...f,bpm:v}))} placeholder=
<Sel value={form.drummer} onChange={v=>setForm(f=>({...f,drummer:v}))} options={b
</div>
<Field value={form.specialties} onChange={v=>setForm(f=>({...f,specialties:v}))} plac
<Btn full disabled={!form.title||!form.artist||!form.bpm||saving} onClick={handleAdd}
</div>
<div style={{ display:"flex", flexDirection:"column", gap:5 }}>
{filtered.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:32, f
:filtered.map(song=><SongRow key={song.id} song={song} onDelete={s=>setConfirm(s)} on
</div>
{editSong&&<Modal title="Song bearbeiten" onClose={()=>setEdit(null)}>
<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
<Field value={editSong.title} onChange={v=>setEdit(s=>({...s,title:v}))}
<Field value={editSong.artist} onChange={v=>setEdit(s=>({...s,artist:v}))}
<Field value={editSong.bpm} onChange={v=>setEdit(s=>({...s,bpm:v}))}
<Sel value={editSong.drummer} onChange={v=>setEdit(s=>({...s,drummer:v}))}
<Field value={editSong.specialties||""} onChange={v=>setEdit(s=>({...s,specialties:
<Btn full onClick={handleUpdate}>Speichern</Btn>
</div>
</Modal>}
{confirm&&<Confirm msg={`„${confirm.title}" wirklich löschen?`} onOk={()=>handleDelete(
</div>
);
}
// ── Playlist Editor ────────────────────────────────────────────────────────
function PlaylistEditor({ playlist, allSongs, playlistSongs, onBack, onRefresh, bandName, sho
const [activeSet, setActiveSet] = useState("Set 1");
const [search, setSearch] = useState("");
const [dragId, setDragId] = useState(null);
const [showAdd, setShowAdd] = useState(false);
const [saving, setSaving] = useState(false);
const mySongs = playlistSongs.filter(ps=>ps.playlist_id===playlist.id);
const bandId = useMemo(()=>allSongs.find(s=>mySongs.some(ps=>ps.song_id===s.id))?.band_id
const bandSongs= allSongs.filter(s=>s.band_id===bandId);
const songsInSet = useMemo(()=>
mySongs.filter(ps=>ps.set_name===activeSet)
.map(ps=>({...ps,...(allSongs.find(s=>s.id===ps.song_id)||{})}))
.filter(s=>s.title?.toLowerCase().includes(search.toLowerCase())||(s.artist?.toLowerCas
.sort((a,b)=>a.position-b.position),
[mySongs,activeSet,search,allSongs]);
const setCounts = SETS.reduce((a,s)=>{a[s]=mySongs.filter(ps=>ps.set_name===s).length;retur
const inSetIds = mySongs.filter(ps=>ps.set_name===activeSet).map(ps=>ps.song_id);
const available = bandSongs.filter(s=>!inSetIds.includes(s.id));
const addToSet = async (song) => {
setSaving(true);
const pos = mySongs.filter(ps=>ps.set_name===activeSet&&ps.playlist_id===playlist.id).len
await sb.insert("playlist_songs", { playlist_id:playlist.id, song_id:song.id, set_name:ac
await onRefresh(); setSaving(false);
};
const removeFromSet = async (ps) => {
setSaving(true);
await sb.delete("playlist_songs", `id=eq.${ps.id}`);
// reindex
const remaining = mySongs.filter(x=>x.set_name===activeSet&&x.playlist_id===playlist.id&&
for (let i=0;i<remaining.length;i++) await sb.update("playlist_songs",{position:i+1},`id=
await onRefresh(); setSaving(false);
};
const handleDrop = async (targetId) => {
if (!dragId||dragId===targetId) return;
const fi=songsInSet.findIndex(s=>s.id===dragId), ti=songsInSet.findIndex(s=>s.id===target
if (fi===-1||ti===-1) return;
setSaving(true);
const items=[...songsInSet]; const [mv]=items.splice(fi,1); items.splice(ti,0,mv);
for (let i=0;i<items.length;i++) await sb.update("playlist_songs",{position:i+1},`id=eq.$
setDragId(null); await onRefresh(); setSaving(false);
};
return (
<div style={{ display:"flex", flexDirection:"column", gap:14 }}>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<Btn variant="ghost" size="sm" onClick={onBack}>← Zurück</Btn>
<div style={{ flex:1 }}>
<div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{playlist.name}</div>
<div style={{ color:C.grayDim, fontSize:11 }}>{mySongs.length} Songs gesamt</div>
</div>
<Btn variant="outline" size="sm" onClick={()=>exportPDF(playlist,allSongs,playlistSon
{saving&&<Spinner/>}
</div>
<SealLine/>
<div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
{SETS.map(set=>(
<button key={set} onClick={()=>{setActiveSet(set);setSearch("");}} style={{ backgro
{set} <span style={{ opacity:.7 }}>({setCounts[set]})</span>
</button>
))}
</div>
<Field value={search} onChange={setSearch} placeholder="Im Set suchen…"/>
<AISetNotes setName={activeSet} songs={songsInSet}/>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", ma
<div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", tex
<Btn variant="outline" size="sm" onClick={()=>setShowAdd(!showAdd)}>{showAdd?"✕ Sch
</div>
{showAdd&&<div style={{ marginBottom:12, background:"#080808", border:"1px solid #1a1
{available.length===0?<div style={{ color:C.grayDim, fontSize:12 }}>Alle Songs bere
:<div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:180, overfl
{available.map(song=>(
<div key={song.id} style={{ display:"flex", justifyContent:"space-between", ali
<div><span style={{ color:C.white, fontSize:13 }}>{song.title}</span><span st
<Btn size="sm" onClick={()=>addToSet(song)} disabled={saving}>+</Btn>
</div>
))}
</div>}
</div>}
{songsInSet.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:24,
:<div style={{ display:"flex", flexDirection:"column", gap:5 }}>
{songsInSet.map(song=>(
<SongRow key={song.id} song={song} pos={song.position} draggable isDragging={drag
onDragStart={()=>setDragId(song.id)} onDrop={()=>handleDrop(song.id)}
onDelete={()=>removeFromSet(song)}/>
))}
</div>}
</div>
</div>
);
}
// ── Setlist Manager ────────────────────────────────────────────────────────
function SetlistManager({ band, allSongs, gigs, playlists, playlistSongs, onRefresh, show })
const [view, setView] = useState("gigs");
const [selGig, setSelGig] = useState(null);
const [selPl, setSelPl] = useState(null);
const [gigName, setGigName] = useState(""); const [gigDate, setGigDate] = useState("");
const [plName, setPlName] = useState("");
const [confirm, setConfirm] = useState(null);
const [saving, setSaving] = useState(false);
const bandGigs = gigs.filter(g=>g.band_id===band.id);
const gigPls = playlists.filter(p=>p.gig_id===selGig?.id);
if (view==="editor"&&selPl) return <PlaylistEditor playlist={selPl} allSongs={allSongs} pla
if (view==="playlists"&&selGig) return (
<div style={{ display:"flex", flexDirection:"column", gap:14 }}>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<Btn variant="ghost" size="sm" onClick={()=>setView("gigs")}>← Gigs</Btn>
<div style={{ color:C.white, fontWeight:700, fontSize:15 }}>{selGig.name}</div>
</div>
<SealLine/>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:
<div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textT
<div style={{ display:"flex", gap:8 }}>
<Field value={plName} onChange={setPlName} placeholder="Playlist-Name…"/>
<Btn onClick={async()=>{ if(plName){ setSaving(true); await sb.insert("playlists",{
</div>
</div>
<div style={{ display:"flex", flexDirection:"column", gap:6 }}>
{gigPls.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, fon
:gigPls.map(p=>(
<div key={p.id} style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRad
<div>
<div style={{ color:C.white, fontWeight:600, fontSize:14 }}>{p.name}</div>
<div style={{ color:C.grayDim, fontSize:11 }}>{playlistSongs.filter(ps=>ps.play
</div>
<div style={{ display:"flex", gap:8 }}>
<Btn size="sm" onClick={()=>{setSelPl(p);setView("editor");}}>Öffnen →</Btn>
<Btn variant="danger" size="sm" onClick={()=>setConfirm({type:"pl",item:p})}>✕<
</div>
</div>
))}
</div>
</div>
{confirm&&<Confirm msg={`„${confirm.item.name}" löschen?`} onOk={async()=>{ await sb.de
);
return (
<div style={{ display:"flex", flexDirection:"column", gap:14 }}>
<div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Gig-Verwaltung</div>
<SealLine/>
<div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:
<div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textT
<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
<Field value={gigName} onChange={setGigName} placeholder="Gig-Name"/>
<Field value={gigDate} onChange={setGigDate} type="date" placeholder="Datum"/>
<Btn full disabled={!gigName||saving} onClick={async()=>{ setSaving(true); await sb
</div>
</div>
<div style={{ display:"flex", flexDirection:"column", gap:6 }}>
{bandGigs.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, f
:bandGigs.map(gig=>(
<div key={gig.id} onClick={()=>{setSelGig(gig);setView("playlists");}}
style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:5, padding
onMouseEnter={e=>e.currentTarget.style.borderColor="#2a2a2a"} onMouseLeave={e=>e.
<div>
<div style={{ color:C.white, fontWeight:600, fontSize:14 }}>{gig.name}</div>
{gig.date&&<div style={{ color:C.grayDim, fontSize:11 }}>{new Date(gig.date+"T1
<div style={{ color:C.grayDim, fontSize:11 }}>{playlists.filter(p=>p.gig_id===g
</div>
<div onClick={e=>e.stopPropagation()}>
<Btn variant="danger" size="sm" onClick={()=>setConfirm({item:gig})}>✕</Btn>
</div>
</div>
))}
</div>
</div>
{confirm&&<Confirm msg={`Gig „${confirm.item.name}" löschen?`} onOk={async()=>{ await s
);
}
Mono',
// ── Band Detail ────────────────────────────────────────────────────────────
function BandDetail({ band, songs, gigs, playlists, playlistSongs, onBack, onRefresh, show })
const [tab, setTab] = useState("songs");
return (
<div style={{ minHeight:"100vh", background:C.bg }}>
<header style={{ borderBottom:"1px solid #111", background:"rgba(0,0,0,.95)", backdropF
<div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px", height:50, display:"fl
<Btn variant="ghost" size="sm" onClick={onBack}>←</Btn>
<div style={{ color:C.white, fontWeight:800, fontSize:16, fontFamily:"'Space </div>
<div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 10px", display:"flex", g
{[{key:"songs",label:" Songs"},{key:"setlist",label:" Setlist"}].map(({key,labe
<button key={key} onClick={()=>setTab(key)} style={{ flex:1, background:tab===key
))}
<button onClick={()=>setTab("import")} style={{ flex:1, background:tab==="import"?C
</div>
<SealLine color={band.color}/>
</header>
<main style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px" }}>
{tab==="songs" &&<SongDatabase band={band} songs={songs} onRefresh={onRefresh} show
{tab==="setlist" &&<SetlistManager band={band} allSongs={songs} gigs={gigs} playlists
{tab==="import" &&<ImportWizard band={band} existingSongs={songs} gigs={gigs} onImpo
</main>
</div>
);
}
// ── Landing ────────────────────────────────────────────────────────────────
function Landing({ bands, songs, user, onSelect, onLogout }) {
return (
<div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column"
<header style={{ borderBottom:"1px solid #111", padding:"16px 24px" }}>
<div style={{ maxWidth:720, margin:"0 auto", display:"flex", alignItems:"center", gap
<SealIcon size={40}/>
<div style={{ flex:1 }}>
<div style={{ color:C.white, fontWeight:900, fontSize:20, fontFamily:"'Space Mono
<div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.2em" }}>ZEIT FÜR GUT
</div>
<div style={{ textAlign:"right" }}>
<div style={{ color:C.gray, fontSize:11, marginBottom:4 }}>{user.email}</div>
<Btn variant="ghost" size="sm" onClick={onLogout}>Abmelden</Btn>
</div>
</div>
</header>
<SealLine/>
<main style={{ flex:1, maxWidth:720, margin:"0 auto", padding:"40px 24px", width:"100%"
<div style={{ marginBottom:28 }}>
<h2 style={{ color:C.white, fontSize:24, fontWeight:900, marginBottom:6, fontFamily
<p style={{ color:C.grayDim, fontSize:13 }}>Songdatenbank & Setlist-Manager</p>
</div>
{bands.length===0?(
<div style={{ textAlign:"center", color:C.grayDim, padding:48, fontSize:14 }}>
<div style={{ fontSize:32, marginBottom:12 }}> </div>
Noch keine Bands. Lege deine erste Band an!
</div>
):(
<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1f
{bands.map(band=>{
const count = songs.filter(s=>s.band_id===band.id).length;
return (
<div key={band.id} onClick={()=>onSelect(band)}
style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:8, p
onMouseEnter={e=>{e.currentTarget.style.borderColor=band.color+"55";e.curre
onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarg
<div style={{ position:"absolute", top:0, left:0, right:0, height:2, <div style={{ fontSize:26, marginBottom:8 }}>{band.emoji}</div>
backgr
<div style={{ color:C.white, fontWeight:800, fontSize:17, marginBottom:4, f
<SealLine color={band.color}/>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"c
<span style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.08em" }}>SO
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
<div style={{ color:"#1e1e1e", fontSize:10, letterSpacing:"0.15em" }}>THOMAS SCHUSTER
</footer>
</div>
);
}
// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
const [user, setUser] = useState(null);
const [bands, setBands] = useState([]);
const [songs, setSongs] = useState([]);
const [gigs, setGigs] = useState([]);
const [playlists, setPls] = useState([]);
const [playlistSongs, setPS] = useState([]);
const [selBand, setSelBand]= useState(null);
const [loading, setLoading]= useState(true);
const [toast, setToast] = useState(null);
const show = (msg, type="success") => setToast({msg,type});
// Restore session
useEffect(()=>{
const token = localStorage.getItem("sf_token");
const u = localStorage.getItem("sf_user");
if (token && u) { sb._token = token; setUser(JSON.parse(u)); }
else setLoading(false);
},[]);
// Load all data when user is set
const loadAll = useCallback(async () => {
if (!sb._token) return;
setLoading(true);
try {
const [b,s,g,pl,ps] = await Promise.all([
sb.query("bands", { select:"*", order:"created_at.asc" }),
sb.query("songs", { select:"*", order:"created_at.asc" }),
sb.query("gigs", { select:"*", order:"date.desc,created_at.desc" }),
sb.query("playlists", { select:"*", order:"created_at.asc" }),
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
const handleLogout = async () => { await sb.auth.signOut(); setUser(null); setBands([]); se
if (loading) return (
<div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column",
<SealIcon size={52}/><Spinner/>
<div style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.15em" }}>LADEN…</div>
</div>
);
if (!user) return <AuthScreen onAuth={handleAuth}/>;
return (
<>
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:#000;color:#e2e8f0;-webkit-font-smooth
input::placeholder,textarea::placeholder{color:#333;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:non
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3)}
`}</style>
{selBand ? (
<BandDetail band={selBand} songs={songs} gigs={gigs} playlists={playlists} playlistSo
onBack={()=>setSelBand(null)} onRefresh={loadAll} show={show}/>
) : (
<Landing bands={bands} songs={songs} user={user} onSelect={setSelBand} onLogout={hand
)}
{toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
</>
);
}
