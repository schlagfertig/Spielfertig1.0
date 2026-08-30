import { useState, useEffect, useCallback } from "react";
import { C, sb, applyTheme, getLogo } from "./core";
import { SealIcon, Spinner, Toast } from "./ui";
import { AuthScreen } from "./auth";
import { BandDetail, Landing } from "./bands";
import { SharedView } from "./shared";

function readCache() {
  try { const raw = localStorage.getItem("sf_cache"); return raw ? JSON.parse(raw) : null; }
  catch(_) { return null; }
}

export default function App() {
  const _cache = readCache();
  const [user,          setUser]   = useState(null);
  const [bands,         setBands]  = useState(_cache?.bands || []);
  const [songs,         setSongs]  = useState(_cache?.songs || []);
  const [gigs,          setGigs]   = useState(_cache?.gigs || []);
  const [playlists,     setPls]    = useState(_cache?.pls || []);
  const [playlistSongs, setPS]     = useState(_cache?.ps || []);
  const [selBand,       setSelBand]= useState(null);
  const [loading,       setLoading]= useState(!_cache);
  const [toast,         setToast]  = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("sf_theme") || "dark");
  applyTheme(theme);
  const toggleTheme = () => { const t = theme==="dark"?"light":"dark"; localStorage.setItem("sf_theme",t); setTheme(t); };
  const show = (msg, type="success") => setToast({msg,type});

  const shareId = typeof window!=="undefined" ? new URLSearchParams(window.location.search).get("share") : null;

  useEffect(()=>{
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
  }, []);

  useEffect(()=>{
    const token = localStorage.getItem("sf_token");
    const u     = localStorage.getItem("sf_user");
    if (token && u) { sb._token = token; setUser(JSON.parse(u)); }
    else setLoading(false);
  },[]);

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
      const _b=Array.isArray(b)?b:[], _s=Array.isArray(s)?s:[], _g=Array.isArray(g)?g:[], _pl=Array.isArray(pl)?pl:[], _ps=Array.isArray(ps)?ps:[];
      setBands(_b); setSongs(_s); setGigs(_g); setPls(_pl); setPS(_ps);
      try {
        localStorage.setItem("sf_cache", JSON.stringify({ bands:_b, songs:_s, gigs:_g, pls:_pl, ps:_ps, ts:Date.now() }));
      } catch(_) {}
    } catch(e) { show("Ladefehler: "+e.message,"error"); }
    setLoading(false);
  },[]);

  const joinPendingInvites = useCallback(async () => {
    if (!user?.email) return;
    try {
      const inv = await sb.query("invites", { select:"*", filter:"email=eq."+encodeURIComponent(user.email.toLowerCase()) });
      const list = Array.isArray(inv) ? inv : [];
      for (const i of list) {
        try {
          await sb.insert("band_members", { band_id: i.band_id, user_id: user.id, role: "member" });
          await sb.delete("invites", "id=eq."+i.id);
        } catch(_) {}
      }
    } catch(_) {}
  },[user]);

  useEffect(()=>{ if(user) { joinPendingInvites().then(loadAll); } },[user,loadAll,joinPendingInvites]);

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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Raleway',sans-serif;background:${C.bg};color:${C.white};-webkit-font-smoothing:antialiased;}
        input::placeholder,textarea::placeholder{color:${C.grayDim};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3)}
      `}</style>

      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <img src={getLogo()} alt="" style={{ width:340, opacity:theme==="dark"?0.07:0.12, userSelect:"none" }}/>
      </div>
      <div style={{ position:"fixed", bottom:12, right:12, zIndex:5, pointerEvents:"none" }}>
        <img src={getLogo()} alt="" style={{ width:56, height:56, objectFit:"cover", borderRadius:"50%", opacity:0.85, userSelect:"none", border:"1px solid "+C.tealBorder }}/>
      </div>
      <button onClick={toggleTheme} title="Hell/Dunkel umschalten"
        style={{ position:"fixed", top:12, right:12, zIndex:10, width:40, height:40, borderRadius:"50%", background:C.bgCard, border:"1px solid "+C.tealBorder, color:C.teal, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {theme==="dark" ? "☀️" : "🌙"}
      </button>

      {selBand ? (
        <BandDetail band={selBand} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} allBands={bands} user={user}
          onBack={()=>setSelBand(null)} onRefresh={loadAll} show={show} theme={theme} toggleTheme={toggleTheme}/>
      ) : (
        <Landing bands={bands} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} user={user} onSelect={setSelBand} onLogout={handleLogout} onRefresh={loadAll} show={show}/>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
