import { useState, useEffect, useCallback } from "react";
import { C, sb } from "./core";
import { Btn, Field, SealLine, Spinner } from "./ui";

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

export { MemberManager };
