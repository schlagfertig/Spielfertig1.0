import { useState, useEffect, useCallback } from "react";
import { C, sb, applyTheme, getLogo, pageWash } from "./core";
import { SealIcon, Spinner, Toast } from "./ui";
import { AuthScreen } from "./auth";
import { BandDetail, Landing } from "./bands";
import { SharedView } from "./shared";
import { LegalView } from "./legal";
import { RolesPreview } from "./rolesPreview";

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
  const [gigIntent, setGigIntent] = useState(null);
  const [loading,       setLoading]= useState(!_cache);
  const [toast,         setToast]  = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("sf_theme") || "dark");
  applyTheme(theme);
  const toggleTheme = () => { const t = theme==="dark"?"light":"dark"; localStorage.setItem("sf_theme",t); setTheme(t); };
  const show = (msg, type="success") => setToast({msg,type});

  const params = typeof window!=="undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const shareId = params.get("share");
  const legalPage = params.get("legal");
  const previewRoles = params.get("vorschau") === "rollen";

  useEffect(()=>{
    if (previewRoles) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
  }, [previewRoles]);

  useEffect(()=>{
    if (shareId || legalPage || previewRoles) { setLoading(false); return; }
    sb.enableLocal();
    setUser({ id: "local", email: "Lokal" });
  },[shareId, legalPage, previewRoles]);

  const loadAll = useCallback(async () => {
    if (!sb._local && !sb._token) return;
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

  useEffect(()=>{ if(user && !shareId && !legalPage && !previewRoles) { joinPendingInvites().then(loadAll); } },[user,loadAll,joinPendingInvites,shareId,legalPage,previewRoles]);

  const handleAuth = (u) => { setUser(u); };
  const handleLogout = async () => { show("Lokalmodus — Daten bleiben auf diesem Gerät. Nichts abzumelden."); };

  if (previewRoles) return <RolesPreview/>;
  if (legalPage === "impressum" || legalPage === "datenschutz") return <LegalView page={legalPage}/>;
  if (shareId) return <SharedView playlistId={shareId}/>;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
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
        body{font-family:'Raleway',sans-serif;background:${pageWash};background-attachment:fixed;color:${C.white};-webkit-font-smoothing:antialiased;}
        input::placeholder,textarea::placeholder{color:${C.grayDim};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#161a1d}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.3)}
      `}</style>

      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <img src={getLogo()} alt="" style={{ width:340, height:"auto", objectFit:"contain", opacity:theme==="dark"?0.07:0.12, userSelect:"none" }}/>
      </div>
      <div style={{ position:"fixed", bottom:12, right:12, zIndex:5, pointerEvents:"none" }}>
        <img src={getLogo()} alt="" style={{ width:56, height:56, objectFit:"contain", opacity:0.85, userSelect:"none" }}/>
      </div>
      {selBand ? (
        <BandDetail band={selBand} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} allBands={bands} user={user}
          onBack={()=>{setSelBand(null);setGigIntent(null);}} onRefresh={loadAll} show={show} theme={theme} toggleTheme={toggleTheme} startGig={gigIntent} onGigConsumed={()=>setGigIntent(null)}/>
      ) : (
        <Landing bands={bands} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} user={user} onSelect={setSelBand} onOpenNext={(band,gig)=>{setGigIntent(gig);setSelBand(band);}} onLogout={handleLogout} onRefresh={loadAll} show={show} theme={theme} toggleTheme={toggleTheme}/>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
