import { useState, useEffect, useCallback } from "react";
import { C, sb, applyTheme, getLogo, pageWash } from "./core";
import { SealIcon, Spinner, Toast, Btn } from "./ui";
import { AuthScreen } from "./auth";
import { BandDetail, Landing } from "./bands";
import { SharedView } from "./shared";
import { LegalView } from "./legal";
import { readDevicePack, fingerprint, alreadyTaken, markTaken, dismissedLater, dismissLater, packCounts, importPackIntoAccount } from "./takeover";

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
  const [members,       setMembers]= useState([]);
  const [selBand,       setSelBand]= useState(null);
  const [gigIntent, setGigIntent] = useState(null);
  const [loading,       setLoading]= useState(!_cache);
  const [toast,         setToast]  = useState(null);
  const [offer,         setOffer]  = useState(null);
  const [taking,        setTaking] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("sf_theme") || "dark");
  const [authNotice, setAuthNotice] = useState("");
  applyTheme(theme);
  const toggleTheme = () => { const t = theme==="dark"?"light":"dark"; localStorage.setItem("sf_theme",t); setTheme(t); };
  const show = (msg, type="success") => setToast({msg,type});

  const params = typeof window!=="undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const shareId = params.get("share");
  const legalPage = params.get("legal");

  useEffect(()=>{
    const native = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
    if (native) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
  }, []);

  const startLocal = () => {
    try { sessionStorage.setItem("sf_lokal", "1"); } catch (_) {}
    sb.enableLocal();
    setUser({ id: "local", email: "Lokal" });
  };

  useEffect(()=>{
    if (shareId || legalPage) { setLoading(false); return; }
    const lokal = params.get("lokal") === "1" || (() => { try { return sessionStorage.getItem("sf_lokal") === "1"; } catch (_) { return false; } })();
    if (lokal) { startLocal(); return; }
    try {
      const token = localStorage.getItem("sf_token");
      const raw = localStorage.getItem("sf_user");
      const saved = raw ? JSON.parse(raw) : null;
      if (token && saved && saved.id) {
        sb._token = token;
        sb._local = false;
        setUser({ id: saved.id, email: saved.email || "" });
        return;
      }
    } catch (_) {}
    setLoading(false);
  },[shareId, legalPage]);

  const loadAll = useCallback(async () => {
    if (!sb._local && !sb._token) return;
    try {
      const [b,s,g,pl,ps,mem] = await Promise.all([
        sb.query("bands",         { select:"*", order:"created_at.asc" }),
        sb.query("songs",         { select:"*", order:"created_at.asc" }),
        sb.query("gigs",          { select:"*", order:"date.desc,created_at.desc" }),
        sb.query("playlists",     { select:"*", order:"created_at.asc" }),
        sb.query("playlist_songs",{ select:"*", order:"position.asc" }),
        sb.query("band_members",  { select:"*", order:"created_at.asc" }),
      ]);
      const _b=Array.isArray(b)?b:[], _s=Array.isArray(s)?s:[], _g=Array.isArray(g)?g:[], _pl=Array.isArray(pl)?pl:[], _ps=Array.isArray(ps)?ps:[];
      setBands(_b); setSongs(_s); setGigs(_g); setPls(_pl); setPS(_ps); setMembers(Array.isArray(mem)?mem:[]);
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
          const role = ["viewer", "editor", "manager"].includes(i.role) ? i.role : "editor";
          const mail = (user.email || "").toLowerCase();
          let row = await sb.insert("band_members", { band_id: i.band_id, user_id: user.id, role, email: mail });
          if (row && row.code === "PGRST204") row = await sb.insert("band_members", { band_id: i.band_id, user_id: user.id, role });
          if (row && row.id != null) await sb.delete("invites", "id=eq."+i.id);
        } catch(_) {}
      }
    } catch(_) {}
  },[user]);

  useEffect(()=>{ if(user && !shareId && !legalPage) { joinPendingInvites().then(loadAll); } },[user,loadAll,joinPendingInvites,shareId,legalPage]);

  useEffect(() => {
    if (!user || user.id === "local" || shareId || legalPage) { setOffer(null); return; }
    const pack = readDevicePack();
    if (!pack) { setOffer(null); return; }
    const hash = fingerprint(pack);
    if (alreadyTaken(user.id, hash) || dismissedLater(user.id, hash)) { setOffer(null); return; }
    setOffer({ pack, hash });
  }, [user, shareId, legalPage]);

  const handleAuth = (u) => { setAuthNotice(""); setUser(u); };
  const handleLogout = async () => {
    if (!user || user.id === "local") {
      show("daten bleiben auf diesem gerät.");
      return;
    }
    await sb.auth.signOut();
    setUser(null);
    setBands([]); setSongs([]); setGigs([]); setPls([]); setPS([]);
    setSelBand(null);
    setOffer(null);
  };
  const handleDeleteAccount = async () => {
    await sb.auth.deleteAccount();
    setBands([]); setSongs([]); setGigs([]); setPls([]); setPS([]); setMembers([]);
    setSelBand(null);
    setOffer(null);
    setUser(null);
    setAuthNotice("dein konto ist gelöscht.");
  };
  const leaveLocal = () => {
    try { sessionStorage.removeItem("sf_lokal"); } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.delete("lokal");
    window.location.href = url.toString();
  };
  const runTakeover = async () => {
    if (!offer || !user || taking) return;
    setTaking(true);
    const result = await importPackIntoAccount(sb, offer.pack, user.id);
    if (result.ok) {
      markTaken(user.id, offer.hash);
      setOffer(null);
      show("liegt jetzt in deinem konto. auf dem gerät bleibt eine kopie.");
      await loadAll();
    } else if (result.leftover && result.leftover.length) {
      show("hat nicht geklappt. ein teil liegt vielleicht noch im konto.", "error");
    } else {
      show("hat nicht geklappt. es wurde nichts halb gespeichert.", "error");
    }
    setTaking(false);
  };
  const offerLater = () => {
    if (offer && user) dismissLater(user.id, offer.hash);
    setOffer(null);
  };

  if (legalPage === "impressum" || legalPage === "datenschutz") return <LegalView page={legalPage}/>;
  if (shareId) return <SharedView playlistId={shareId}/>;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <SealIcon size={52}/><Spinner/>
      <div style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.15em" }}>LADEN…</div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={handleAuth} onLocal={startLocal} notice={authNotice}/>;

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
        <BandDetail band={selBand} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} allBands={bands} members={members} user={user}
          onBack={()=>{setSelBand(null);setGigIntent(null);}} onRefresh={loadAll} show={show} theme={theme} toggleTheme={toggleTheme} startGig={gigIntent} onGigConsumed={()=>setGigIntent(null)}/>
      ) : (
        <Landing bands={bands} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} user={user} onSelect={setSelBand} onOpenNext={(band,gig)=>{setGigIntent(gig);setSelBand(band);}} onLogout={handleLogout} onLeaveLocal={leaveLocal} onDeleteAccount={handleDeleteAccount} onRefresh={loadAll} show={show} theme={theme} toggleTheme={toggleTheme}/>
      )}

      {offer && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.bgCard, border:"1px solid "+C.tealBorder, borderRadius:14, padding:22, maxWidth:420, width:"100%" }}>
            <p style={{ color:C.white, fontSize:16, fontWeight:700, lineHeight:1.45, marginBottom:10 }}>
              daten von diesem gerät in dein konto übernehmen?
            </p>
            <p style={{ color:C.gray, fontSize:14, lineHeight:1.5, marginBottom:8 }}>
              {(() => {
                const n = packCounts(offer.pack);
                const bits = [];
                if (n.bands) bits.push(n.bands + (n.bands === 1 ? " band" : " bands"));
                if (n.songs) bits.push(n.songs + (n.songs === 1 ? " song" : " songs"));
                if (n.gigs) bits.push(n.gigs + (n.gigs === 1 ? " gig" : " gigs"));
                if (n.playlists) bits.push(n.playlists + (n.playlists === 1 ? " setlist" : " setlists"));
                return "hier liegen " + (bits.join(", ") || "ein paar sachen") + ".";
              })()}
            </p>
            <p style={{ color:C.grayDim, fontSize:13, lineHeight:1.5, marginBottom:16 }}>
              alles wird neu in deinem konto angelegt. auf dem gerät bleibt eine kopie.
            </p>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
              <Btn variant="ghost" onClick={offerLater} disabled={taking} style={{ textTransform:"none", letterSpacing:"0.01em" }}>später</Btn>
              <Btn onClick={runTakeover} disabled={taking} style={{ textTransform:"none", letterSpacing:"0.01em" }}>{taking ? "übernehme…" : "übernehmen"}</Btn>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
