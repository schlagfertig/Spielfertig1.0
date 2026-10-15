import { useState } from "react";
import { C, sb, getBandLogo, bandLogoImgStyle, getLogo, glassStyle, pageWash } from "./core";
import { Btn, Field, Badge, Modal, SealLine, Spinner, BrandWordmark, LiveMark } from "./ui";
import { LegalLinks } from "./legal";

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
        name: name.trim(), color, emoji,
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
                  boxShadow: color===c.val ? "0 0 8px 2px "+c.val : "none" }}/>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Emoji</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {BAND_EMOJIS.map(e=>(
              <button key={e} onClick={(ev)=>{ev.stopPropagation();setEmoji(e);}}
                style={{ width:38, height:38, borderRadius:6, fontSize:20, cursor:"pointer", background: emoji===e ? C.tealDim : "#161a1d",
                  border: emoji===e ? "1px solid "+C.tealBorder : "1px solid #222" }}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Drummer</div>
          <Field value={drummers} onChange={setDrummers} placeholder="z.B. Tom, Tobi"/>
        </div>
        <Btn full disabled={!name.trim()||saving} onClick={handleSave}>{saving ? <Spinner/> : "Band erstellen"}</Btn>
      </div>
    </Modal>
  );
}

function downloadJSON(filename, dataObj) {
  try {
    const json = typeof dataObj === "string" ? dataObj : JSON.stringify(dataObj, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : filename + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch(e) { return false; }
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

function bandCardLogoStyle(name) {
  const hardys = /hardy/i.test(name || "");
  return bandLogoImgStyle({
    width: "auto",
    height: "auto",
    maxWidth: hardys ? "80%" : "88%",
    maxHeight: hardys ? 86 : 64,
  });
}

function Landing({ bands, songs, gigs, playlists, playlistSongs, user, onSelect, onLogout, onRefresh, show }) {
  const [showAddBand, setShowAddBand] = useState(false);
  const [delBand, setDelBand] = useState(null);
  const [delSaving, setDelSaving] = useState(false);
  const [backupText, setBackupText] = useState(null);
  const [showBackupPick, setShowBackupPick] = useState(false);
  const [backupIds, setBackupIds] = useState([]);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const openBackup = () => {
    setBackupIds((bands||[]).map(b => b.id));
    setShowAccount(false);
    setShowBackupPick(true);
  };
  const toggleBackupId = (id) => {
    setBackupIds(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };
  const runBackup = () => {
    try {
      const chosen = (bands||[]).filter(b => backupIds.includes(b.id));
      if (!chosen.length) { show("Keine Band ausgewählt.", "error"); return; }
      const payload = {
        exported_at: new Date().toISOString(),
        version: 1,
        bands: chosen.map(b=>buildBandExport(b, songs, gigs, playlists, playlistSongs))
      };
      const json = JSON.stringify(payload, null, 2);
      setBackupText(json);
      setShowBackupPick(false);
      const ok = downloadJSON("schlagfertig-live-" + todayStamp() + ".json", json);
      show(ok ? "Backup-Datei gespeichert (" + chosen.length + ")." : "Datei konnte nicht gespeichert werden.");
    } catch(err) {
      show("Export-Fehler: " + (err&&err.message ? err.message : "unbekannt"));
    }
  };

  const runImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const payload = JSON.parse(importText);
      const res = sb.importBackup(payload);
      await onRefresh();
      show("Import fertig: " + res.bands + " Bands, " + res.songs + " Songs.");
      setShowImport(false);
      setImportText("");
      setShowAccount(false);
    } catch(err) {
      show("Import-Fehler: " + (err&&err.message ? err.message : "ungültiges Backup"), "error");
    }
    setImporting(false);
  };

  const handleDeleteBand = async () => {
    setDelSaving(true);
    await sb.delete("bands", "id=eq." + delBand.id);
    await onRefresh();
    show("Band gelöscht.");
    setDelBand(null); setDelSaving(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:pageWash, backgroundAttachment:"fixed", display:"flex", flexDirection:"column" }}>
      <header style={{ ...glassStyle({ background: "rgba(22,30,34,0.55)", borderRadius: 0, border: "none", borderBottom: "1px solid rgba(255,255,255,0.16)" }), padding:"14px 56px 14px 16px" }}>
        <div style={{ maxWidth:760, margin:"0 auto", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <img src={getLogo()} alt="" style={{ height:44, width:"auto", objectFit:"contain", flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:160 }}>
            <BrandWordmark size={22}/>
            <div style={{ marginTop:2 }}><LiveMark size={22}/></div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
            <Btn variant="outline" size="sm" onClick={(e)=>{if(e){e.stopPropagation();e.preventDefault();}setShowAddBand(true);}}
              style={{ padding:"6px 12px" }}>
              + Band
            </Btn>
            <Btn variant="outline" size="sm" onClick={()=>{setShowAccount(true);setNewPw("");setNewPw2("");}}>Konto</Btn>
          </div>
        </div>
      </header>
      {showAccount&&<Modal title="Konto" onClose={()=>setShowAccount(false)}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ color:C.grayDim, fontSize:12 }}>Angemeldet als</div>
          <div style={{ color:C.white, fontSize:14, fontWeight:600, wordBreak:"break-all" }}>{user.email}</div>
          <SealLine/>
          <Btn full variant="outline" onClick={openBackup}>Backup sichern</Btn>
          <Btn full variant="outline" onClick={()=>{ setShowAccount(false); setShowImport(true); setImportText(""); }}>Backup importieren</Btn>
          <SealLine/>
          {user && user.id === "local" ? (
            <div style={{ color:C.grayDim, fontSize:12, lineHeight:1.5 }}>Lokalmodus — Songs und Setlists bleiben auf diesem Gerät. Sichere sie über Backup.</div>
          ) : (<>
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
          }}>{pwSaving?"Speichere…":"Passwort speichern"}</Btn>
          {newPw&&newPw.length<6&&<div style={{ color:C.grayDim, fontSize:11 }}>Mindestens 6 Zeichen.</div>}
          {newPw&&newPw2&&newPw!==newPw2&&<div style={{ color:C.red, fontSize:11 }}>Passwörter stimmen nicht überein.</div>}
          </>)}
          <SealLine/>
          <Btn full variant="ghost" onClick={onLogout}>{user && user.id === "local" ? "Lokal" : "Abmelden"}</Btn>
        </div>
      </Modal>}
      <main style={{ flex:1, maxWidth:760, margin:"0 auto", padding:"28px 20px", width:"100%", boxSizing:"border-box" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:6 }}>Bands</div>
          <h2 style={{ color:C.white, fontSize:22, fontWeight:800, margin:0, fontFamily:"'Raleway',sans-serif" }}>Welche Band spielst du?</h2>
        </div>
        {bands.length===0?(
          <div style={{ textAlign:"center", color:C.grayDim, padding:"48px 16px", fontSize:14, border:"1px dashed #3a454b", borderRadius:12, background:"#1c2226" }}>
            Noch keine Band — oben rechts anlegen.
          </div>
        ):(
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
            {bands.map(band=>{
              const count = songs.filter(s=>s.band_id===band.id).length;
              const logo = getBandLogo(band.name);
              return (
                <div key={band.id} onClick={()=>onSelect(band)}
                  style={{
                    ...glassStyle({ borderRadius: 22 }),
                    cursor:"pointer",
                    position:"relative",
                    overflow:"hidden",
                    display:"flex",
                    flexDirection:"column",
                    boxShadow:"0 0 0 0 transparent",
                    transition:"border-color .15s, transform .15s",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#1c1c1c";e.currentTarget.style.transform="none";}}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:band.color || C.teal }}/>
                  <div style={{ minHeight:132, display:"flex", alignItems:"center", justifyContent:"center", padding:"28px 20px 16px" }}>
                    {logo
                      ? <img src={logo} alt={band.name} style={bandCardLogoStyle(band.name)}/>
                      : <div style={{ fontSize:48 }}>{band.emoji}</div>}
                  </div>
                  <div style={{ borderTop:"1px solid #2f383d", padding:"12px 16px 14px", background:"#161a1d" }}>
                    <div style={{ color:C.white, fontFamily:"'Raleway',sans-serif", fontWeight:800, fontSize:16, letterSpacing:"-0.02em", marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {band.name}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ color:C.grayDim, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase" }}>Songs & Setlist</span>
                      <Badge color={band.color || C.teal}>{count} Songs</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <footer style={{ padding:"12px 24px 20px", textAlign:"center" }}>
        <div style={{ color:"#1e1e1e", fontSize:10, letterSpacing:"0.15em", marginBottom:8 }}>THOMAS SCHUSTER · <span style={{ color:C.teal }}>SCHLAGFERTIG‽ Live</span></div>
        <LegalLinks dim/>
      </footer>
      {showAddBand && <AddBandModal user={user} onClose={()=>setShowAddBand(false)} onRefresh={onRefresh} show={show}/>}
      {showBackupPick && (
        <Modal title="Backup – Bands wählen" onClose={()=>setShowBackupPick(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ color:C.grayDim, fontSize:12, lineHeight:1.5 }}>
              Wähle die Bands, die in die Datei sollen.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn size="sm" variant="outline" onClick={()=>setBackupIds((bands||[]).map(b=>b.id))}>Alle</Btn>
              <Btn size="sm" variant="ghost" onClick={()=>setBackupIds([])}>Keine</Btn>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:280, overflowY:"auto" }}>
              {(bands||[]).length===0 && <div style={{ color:C.grayDim, fontSize:13 }}>Noch keine Band.</div>}
              {(bands||[]).map(band => {
                const on = backupIds.includes(band.id);
                const count = (songs||[]).filter(s=>s.band_id===band.id).length;
                return (
                  <button key={band.id} onClick={()=>toggleBackupId(band.id)}
                    style={{ display:"flex", alignItems:"center", gap:10, textAlign:"left", background:on?C.tealDim:"#161a1d", border:"1px solid "+(on?C.tealBorder:"#222"), borderRadius:6, padding:"10px 12px", color:C.white, cursor:"pointer", fontFamily:"inherit" }}>
                    <span style={{ width:18, height:18, borderRadius:4, border:"1px solid "+(on?C.teal:"#444"), background:on?C.teal:"transparent", color:"#000", fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{on?"✓":""}</span>
                    <span style={{ flex:1, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{band.emoji ? band.emoji + " " : ""}{band.name}</span>
                    <span style={{ color:C.grayDim, fontSize:11, flexShrink:0 }}>{count} Songs</span>
                  </button>
                );
              })}
            </div>
            <Btn full disabled={!backupIds.length} onClick={runBackup}>Datei speichern ({backupIds.length})</Btn>
          </div>
        </Modal>
      )}
      {backupText!==null && (
        <Modal title="Backup – Daten sichern" onClose={()=>setBackupText(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ color:C.grayDim, fontSize:12, lineHeight:1.5 }}>
              Die Datei sollte gerade heruntergeladen worden sein. Sonst hier nochmal speichern oder den Text kopieren.
            </div>
            <Btn full onClick={()=>{
              const ok = downloadJSON("schlagfertig-live-" + todayStamp() + ".json", backupText);
              show(ok ? "Datei gespeichert." : "Bitte manuell kopieren");
            }}>Datei speichern</Btn>
            <textarea readOnly value={backupText} onFocus={e=>e.target.select()}
              style={{ width:"100%", height:180, background:"#161a1d", border:"1px solid #222", borderRadius:4, color:"#cfcfcf", fontFamily:"monospace", fontSize:11, padding:10, whiteSpace:"pre", boxSizing:"border-box" }}/>
            <Btn full variant="outline" onClick={()=>{
              if (navigator.clipboard&&navigator.clipboard.writeText) {
                navigator.clipboard.writeText(backupText).then(()=>show("Backup kopiert!")).catch(()=>show("Bitte manuell kopieren"));
              } else { show("Bitte manuell kopieren"); }
            }}>Kopieren</Btn>
          </div>
        </Modal>
      )}
      {showImport && (
        <Modal title="Backup importieren" onClose={()=>setShowImport(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ color:C.grayDim, fontSize:12, lineHeight:1.5 }}>
              Füge das gesicherte JSON ein oder wähle die Datei. Vorhandene Daten auf diesem Gerät werden ersetzt.
            </div>
            <input type="file" accept="application/json,.json,.txt" onChange={(e)=>{
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setImportText(String(reader.result || ""));
              reader.readAsText(file);
            }} style={{ color:C.gray, fontSize:12 }}/>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="JSON hier einfügen…"
              style={{ width:"100%", height:180, background:"#161a1d", border:"1px solid #222", borderRadius:4, color:"#cfcfcf", fontFamily:"monospace", fontSize:11, padding:10, boxSizing:"border-box" }}/>
            <Btn full disabled={!importText.trim()||importing} onClick={runImport}>{importing ? "Importiere…" : "Importieren"}</Btn>
          </div>
        </Modal>
      )}
      {delBand && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.bgCard, border:"1px solid "+C.redBorder, borderRadius:8, padding:28, maxWidth:360, width:"90%" }}>
            <p style={{ color:C.red, fontSize:14, fontWeight:700, marginBottom:8 }}>Band wirklich löschen?</p>
            <p style={{ color:C.gray, fontSize:13, marginBottom:18 }}>Alle Songs, Gigs und Setlists werden gelöscht.</p>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={()=>setDelBand(null)}>Abbrechen</Btn>
              <Btn variant="danger" disabled={delSaving} onClick={handleDeleteBand}>{delSaving?<Spinner/>:"Endgültig löschen"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { Landing, AddBandModal, BAND_COLORS, BAND_EMOJIS, downloadJSON, buildBandExport, todayStamp };
