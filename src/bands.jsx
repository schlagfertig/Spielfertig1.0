import { useState, useEffect, useCallback } from "react";
import { C, sb, SETS, getBandLogo } from "./core";
import { Btn, Field, Sel, Badge, Toast, Confirm, Modal, SealLine, SealIcon, Spinner } from "./ui";
import { SongDatabase } from "./songs";
import { SetlistManager } from "./setlist";

function MemberManager({ band, canEdit, show }) {
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inv = await sb.query("invites", { select:"*", filter:"band_id=eq."+band.id, order:"created_at.asc" });
      setInvites(Array.isArray(inv)?inv:[]);
    } catch(e) { show("Ladefehler: "+e.message,"error"); }
    setLoading(false);
  },[band.id]);

  useEffect(()=>{ load(); },[load]);

  const sendInvite = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      await sb.insert("invites", { band_id: band.id, email: email.trim().toLowerCase() });
      setEmail("");
      show("Einladung erstellt!");
      await load();
    } catch(e) { show("Fehler: "+e.message,"error"); }
    setSaving(false);
  };

  const revokeInvite = async (inv) => {
    setSaving(true);
    try {
      await sb.delete("invites", "id=eq."+inv.id);
      show("Einladung zurückgezogen.");
      await load();
    } catch(e) { show("Fehler: "+e.message,"error"); }
    setSaving(false);
  };

  if (!canEdit) return (
    <div style={{ textAlign:"center", color:C.grayDim, padding:28, fontSize:13 }}>
      Nur der Band-Owner kann Mitglieder verwalten.
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Team einladen</div>
      <SealLine/>
      <div style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:6, padding:14 }}>
        <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ Neue Einladung</div>
        <div style={{ display:"flex", gap:8 }}>
          <Field value={email} onChange={setEmail} placeholder="E-Mail-Adresse…"/>
          <Btn onClick={sendInvite} disabled={!email.trim()||saving}>Einladen</Btn>
        </div>
        <div style={{ color:C.grayDim, fontSize:11, marginTop:8 }}>
          Die Person muss sich mit dieser E-Mail registrieren oder einloggen — dann tritt sie automatisch bei.
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {loading?<div style={{ textAlign:"center", padding:20 }}><Spinner/></div>
        :invites.length===0?<div style={{ textAlign:"center", color:C.grayDim, padding:28, fontSize:13 }}>Keine offenen Einladungen</div>
        :invites.map(inv=>(
          <div key={inv.id} style={{ background:C.bgCard, border:"1px solid #1a1a1a", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:C.white, fontSize:14 }}>{inv.email}</div>
            <Btn variant="danger" size="sm" onClick={()=>revokeInvite(inv)} disabled={saving}>✕</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function BandDetail({ band, songs, gigs, playlists, playlistSongs, allBands, user, onBack, onRefresh, show, theme, toggleTheme }) {
  const [tab, setTab] = useState("songs");
  const canEdit = band.user_id === user.id;
  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <header style={{ borderBottom:"1px solid #111", background:"rgba(0,0,0,.97)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"8px 16px 0", display:"flex", alignItems:"center" }}>
          <Btn variant="outline" size="md" onClick={onBack} style={{fontSize:20,padding:"6px 18px"}}>← Zurück</Btn>
        </div>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"6px 16px 10px", textAlign:"center" }}>
          {getBandLogo(band.name)
            ? <img src={getBandLogo(band.name)} alt={band.name}
                style={{ height:90, maxWidth:"80%", objectFit:"contain", filter:"invert(1)", opacity:.9 }}/>
            : <div style={{ color:C.white, fontWeight:400, fontSize:26, fontFamily:"'Bebas Neue',cursive", letterSpacing:"0.06em" }}>{band.name}</div>}
        </div>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 10px", display:"flex", gap:6 }}>
            {[{key:"songs",label:"🎵 Songs"},{key:"setlist",label:"📋 Setlist"},{key:"members",label:"👥 Team"}].map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{ flex:1, background:tab===key?C.teal:"transparent", color:tab===key?"#000":C.gray, border:`1px solid ${tab===key?C.teal:"#222"}`, borderRadius:4, padding:"8px 0", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
            ))}
        </div>
        <SealLine color={band.color}/>
      </header>
      <main style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px" }}>
        {tab==="songs"   &&<SongDatabase band={band} songs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} allBands={allBands} canEdit={canEdit} onRefresh={onRefresh} show={show}/>}
        {tab==="setlist" &&<SetlistManager band={band} allSongs={songs} gigs={gigs} playlists={playlists} playlistSongs={playlistSongs} canEdit={canEdit} onRefresh={onRefresh} show={show} theme={theme} toggleTheme={toggleTheme}/>}
        {tab==="members" &&<MemberManager band={band} canEdit={canEdit} show={show}/>}
      </main>
    </div>
  );
}

const BAND_COLORS = [
  { name:"Teal",   val:"#5cc8b8" },
  { name:"Rot",    val:"#e05555" },
  { name:"Gold",   val:"#d4a843" },
  { name:"Violett",val:"#9b7ede" },
  { name:"Blau",   val:"#5b9bd5" },
  { name:"Grün",   val:"#6bbf6b" },
];
const BAND_EMOJIS = ["🎸","🥁","🎤","🎹","🎺","🎻","🎷","🎵","🎶","⭐","🔥","🌊"];

function AddBandModal({ user, onClose, onRefresh, show }) {
  const [name, setName]     = useState("");
  const [color, setColor]   = useState(BAND_COLORS[0].val);
  const [emoji, setEmoji]   = useState(BAND_EMOJIS[0]);
  const [drummers, setDrummers] = useState("Tom");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const drummerList = drummers.split(",").map(d=>d.trim()).filter(Boolean);
      await sb.insert("bands", {
        name: name.trim(),
        color,
        emoji,
        drummers: drummerList.length ? drummerList : ["Tom"],
        user_id: user.id,
      });
      await onRefresh();
      show("Band erstellt!");
      onClose();
    } catch(e) {
      show("Fehler: " + e.message, "error");
      setSaving(false);
    }
  };

  return (
    <Modal title="Neue Band" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <Field value={name} onChange={setName} placeholder="Band-Name"/>
        <div>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Farbe</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {BAND_COLORS.map(c=>(
              <button key={c.val} onClick={(e)=>{e.stopPropagation();setColor(c.val);}} title={c.name}
                style={{ width:34, height:34, borderRadius:"50%", background:c.val, cursor:"pointer",
                  border: color===c.val ? "2px solid #fff" : "2px solid transparent",
                  boxShadow: color===c.val ? "0 0 8px 2px "+c.val : "none", transition:"all .15s" }}/>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Emoji</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {BAND_EMOJIS.map(e=>(
              <button key={e} onClick={(ev)=>{ev.stopPropagation();setEmoji(e);}}
                style={{ width:38, height:38, borderRadius:6, fontSize:20, cursor:"pointer", background: emoji===e ? C.tealDim : "#0a0a0a",
                  border: emoji===e ? "1px solid "+C.tealBorder : "1px solid #222", transition:"all .15s" }}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Drummer</div>
          <Field value={drummers} onChange={setDrummers} placeholder="z.B. Tom, Tobi"/>
          <div style={{ color:C.grayDim, fontSize:10, marginTop:4 }}>Mehrere mit Komma trennen</div>
        </div>
        <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:6, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:26 }}>{emoji}</div>
          <div style={{ flex:1, color:C.white, fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:"0.05em" }}>{name || "Vorschau"}</div>
          <Badge color={color}>0 Songs</Badge>
        </div>
        <Btn full disabled={!name.trim()||saving} onClick={handleSave}>{saving ? <Spinner/> : "Band erstellen"}</Btn>
      </div>
    </Modal>
  );
}

function downloadJSON(filename, dataObj) {
  try {
    const json = JSON.stringify(dataObj, null, 2);
    const w = window.open("", "_blank");
    if (!w) return false;
    w.document.open();
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<title>" + filename + "</title></head>" +
      "<body style='margin:0;background:#0a0a0a;color:#cfcfcf;font-family:monospace;'>" +
      "<div style='position:sticky;top:0;background:#111;padding:12px 16px;border-bottom:1px solid #333;color:#5cc8b8;font-family:sans-serif;'>" +
      "📋 Alles markieren und kopieren, oder über Teilen ⬆ in Dateien sichern.<br><b>" + filename + "</b></div>" +
      "<pre style='padding:16px;white-space:pre-wrap;word-break:break-word;font-size:12px;'>" +
      json.replace(/</g,"<").replace(/>/g,">") +
      "</pre></body></html>"
    );
    w.document.close();
    return true;
  } catch(e) {
    return false;
  }
}

function buildBandExport(band, songs, gigs, playlists, playlistSongs) {
  const bandGigs = (gigs||[]).filter(g=>g.band_id===band.id);
  const gigIds = bandGigs.map(g=>g.id);
  const bandPlaylists = (playlists||[]).filter(p=>gigIds.includes(p.gig_id));
  const plIds = bandPlaylists.map(p=>p.id);
  return {
    band,
    songs: (songs||[]).filter(s=>s.band_id===band.id),
    gigs: bandGigs,
    playlists: bandPlaylists,
    playlist_songs: (playlistSongs||[]).filter(ps=>plIds.includes(ps.playlist_id)),
  };
}

function todayStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2,"0");
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
}

function Landing({ bands, songs, gigs, playlists, playlistSongs, user, onSelect, onLogout, onRefresh, show }) {
  const [showAddBand, setShowAddBand] = useState(false);
  const [delBand, setDelBand] = useState(null);
  const [delSaving, setDelSaving] = useState(false);
  const [backupText, setBackupText] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const handleDeleteBand = async () => {
    setDelSaving(true);
    await sb.delete("bands", "id=eq." + delBand.id);
    await onRefresh();
    show("Band „" + delBand.name + "\" gelöscht.");
    setDelBand(null); setDelSaving(false);
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <header style={{ borderBottom:"1px solid #111", padding:"16px 24px" }}>
        <div style={{ maxWidth:720, margin:"0 auto", display:"flex", alignItems:"center", gap:14 }}>
          <SealIcon size={40}/>
          <div style={{ flex:1 }}>
            <div style={{ color:C.white, fontWeight:400, fontSize:26, fontFamily:"'Bebas Neue',cursive", letterSpacing:"0.06em" }}>SPIELFERTIG<span style={{ color:C.teal }}>‽</span></div>
            <div style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.2em" }}>ZEIT FÜR GUTEN SOUND</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:C.gray, fontSize:11, marginBottom:4 }}>{user.email}</div>
            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
            <Btn variant="outline" size="sm" onClick={()=>{
              try {
                const payload = {
                  exported_at: new Date().toISOString(),
                  version: 1,
                  bands: (bands||[]).map(b=>buildBandExport(b, songs, gigs, playlists, playlistSongs))
                };
                const json = JSON.stringify(payload, null, 2);
                setBackupText(json);
              } catch(err) {
                show("Export-Fehler: " + (err&&err.message ? err.message : "unbekannt"));
              }
            }}>⬇ Backup</Btn>
              <Btn variant="outline" size="sm" onClick={(e)=>{if(e){e.stopPropagation();e.preventDefault();}setShowAddBand(true);}}>+ Band</Btn>
              <Btn variant="outline" size="sm" onClick={()=>{setShowAccount(true);setNewPw("");setNewPw2("");}}>⚙ Konto</Btn>
              <Btn variant="ghost" size="sm" onClick={onLogout}>Abmelden</Btn>
            </div>
          </div>
        </div>
      </header>
      {showAccount&&<Modal title="Konto" onClose={()=>setShowAccount(false)}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ color:C.grayDim, fontSize:12 }}>Angemeldet als</div>
          <div style={{ color:C.white, fontSize:14, fontWeight:600 }}>{user.email}</div>
          <SealLine/>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Passwort ändern</div>
          <Field value={newPw} onChange={setNewPw} type="password" placeholder="Neues Passwort…"/>
          <Field value={newPw2} onChange={setNewPw2} type="password" placeholder="Passwort bestätigen…"/>
          <Btn full disabled={!newPw||newPw.length<6||newPw!==newPw2||pwSaving} onClick={async()=>{
            setPwSaving(true);
            try {
              await sb.auth.updateUser({ password: newPw });
              show("Passwort geändert!");
              setShowAccount(false); setNewPw(""); setNewPw2("");
            } catch(err) {
              show("Fehler: " + (err&&err.message ? err.message : "unbekannt"), "error");
            }
            setPwSaving(false);
          }}>{pwSaving?"Speichere…":"Passwort speichern ✓"}</Btn>
          {newPw&&newPw.length<6&&<div style={{ color:C.grayDim, fontSize:11 }}>Mindestens 6 Zeichen.</div>}
          {newPw&&newPw2&&newPw!==newPw2&&<div style={{ color:C.red, fontSize:11 }}>Passwörter stimmen nicht überein.</div>}
        </div>
      </Modal>}
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
                  style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:8, cursor:"pointer", position:"relative", overflow:"hidden", transition:"border-color .2s,transform .2s", display:"flex", flexDirection:"column" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=band.color+"88";e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.transform="none";}}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,"+band.color+",transparent)", zIndex:2 }}/>
                  <div style={{ flex:1, minHeight:130, background:"#0d0d0d", display:"flex", alignItems:"center", justifyContent:"center", padding:"18px 16px" }}>
                    {getBandLogo(band.name)
                      ? <img src={getBandLogo(band.name)} alt={band.name}
                          style={{ width:"100%", maxHeight:110, objectFit:"contain", filter:"invert(1)", opacity:.92 }}/>
                      : <div style={{ fontSize:42 }}>{band.emoji}</div>}
                  </div>
                  <div style={{ borderTop:"1px solid #1a1a1a", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bgCard }}>
                    <span style={{ color:C.grayDim, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase" }}>Songs & Setlist</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }} onClick={e=>e.stopPropagation()}>
                      <Badge color={band.color}>{count} Songs</Badge>
                    </div>
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
      {showAddBand && <AddBandModal user={user} onClose={()=>setShowAddBand(false)} onRefresh={onRefresh} show={show}/>}
      {backupText!==null && (
        <Modal title="Backup – Daten sichern" onClose={()=>setBackupText(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ color:C.grayDim, fontSize:12, lineHeight:1.5 }}>
              Markiere den Text und kopiere ihn, oder nutze „Kopieren". Sichere ihn z.B. in einer Notiz oder Mail. So hast du ein Backup all deiner Bands, Songs und Setlists.
            </div>
            <textarea readOnly value={backupText} onFocus={e=>e.target.select()}
              style={{ width:"100%", height:240, background:"#0a0a0a", border:"1px solid #222", borderRadius:4, color:"#cfcfcf", fontFamily:"monospace", fontSize:11, padding:10, whiteSpace:"pre", boxSizing:"border-box" }}/>
            <Btn full onClick={()=>{
              if (navigator.clipboard&&navigator.clipboard.writeText) {
                navigator.clipboard.writeText(backupText).then(()=>show("Backup kopiert! 📋")).catch(()=>show("Bitte manuell markieren & kopieren"));
              } else { show("Bitte manuell markieren & kopieren"); }
            }}>📋 Kopieren</Btn>
          </div>
        </Modal>
      )}
      {delBand && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.bgCard, border:"1px solid "+C.redBorder, borderRadius:8, padding:28, maxWidth:360, width:"90%" }}>
            <p style={{ color:C.red, fontSize:14, fontWeight:700, marginBottom:8, letterSpacing:"0.04em" }}>⚠ Band wirklich löschen?</p>
            <p style={{ color:C.gray, fontSize:13, marginBottom:6, lineHeight:1.5 }}>
              „{delBand.name}" wird mit <strong style={{color:C.white}}>allen Songs, Gigs und Setlists</strong> unwiderruflich gelöscht.
            </p>
            <p style={{ color:C.grayDim, fontSize:12, marginBottom:18 }}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <SealLine color={C.red}/>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
              <Btn variant="ghost" onClick={()=>setDelBand(null)}>Abbrechen</Btn>
              <Btn variant="danger" disabled={delSaving} onClick={handleDeleteBand}>{delSaving?<Spinner/>:"Endgültig löschen"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { MemberManager, BandDetail, AddBandModal, BAND_COLORS, BAND_EMOJIS, downloadJSON, buildBandExport, todayStamp, Landing };
