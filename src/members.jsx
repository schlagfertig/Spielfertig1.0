import { useState, useEffect, useCallback } from "react";
import { C, sb } from "./core";
import { Btn, Field, SealLine, Spinner } from "./ui";
import { ROLE_OPTIONS, roleLabel } from "./roles";

function MemberManager({ band, user, members, canManage, canLeave, show, onRefresh }) {
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inv = await sb.query("invites", { select:"*", filter:"band_id=eq."+band.id, order:"created_at.asc" });
      setInvites(Array.isArray(inv) ? inv : []);
    } catch (e) { show("ladefehler: " + e.message, "error"); }
    setLoading(false);
  }, [band.id]);

  useEffect(() => { load(); }, [load]);

  const team = (members || []).filter(m => String(m.band_id) === String(band.id));
  const isOwner = user && String(band.user_id) === String(user.id);

  const sendInvite = async () => {
    const addr = email.trim().toLowerCase();
    if (!addr) return;
    setSaving(true);
    try {
      let row = await sb.insert("invites", { band_id: band.id, email: addr, role });
      if (row && row.code === "PGRST204") row = await sb.insert("invites", { band_id: band.id, email: addr });
      if (!row || row.id == null) throw new Error((row && (row.message || row.msg)) || "hat nicht geklappt");
      setEmail("");
      show("einladung ist raus.");
      await load();
    } catch (e) { show(e.message || "hat nicht geklappt", "error"); }
    setSaving(false);
  };

  const changeInviteRole = async (inv, next) => {
    setSaving(true);
    try {
      await sb.update("invites", { role: next }, "id=eq." + inv.id);
      await load();
    } catch (e) { show(e.message || "hat nicht geklappt", "error"); }
    setSaving(false);
  };

  const revokeInvite = async (inv) => {
    setSaving(true);
    try {
      await sb.delete("invites", "id=eq." + inv.id);
      show("einladung ist weg.");
      await load();
    } catch (e) { show(e.message || "hat nicht geklappt", "error"); }
    setSaving(false);
  };

  const changeMemberRole = async (member, next) => {
    setSaving(true);
    try {
      await sb.update("band_members", { role: next }, "id=eq." + member.id);
      if (onRefresh) await onRefresh();
    } catch (e) { show(e.message || "hat nicht geklappt", "error"); }
    setSaving(false);
  };

  const removeMember = async (member) => {
    setSaving(true);
    try {
      await sb.delete("band_members", "id=eq." + member.id);
      show("ist raus.");
      if (onRefresh) await onRefresh();
    } catch (e) { show(e.message || "hat nicht geklappt", "error"); }
    setSaving(false);
  };

  const leave = async () => {
    const mine = team.find(m => user && String(m.user_id) === String(user.id));
    if (!mine) return;
    setSaving(true);
    try {
      await sb.delete("band_members", "id=eq." + mine.id);
      show("du bist raus.");
      if (onRefresh) await onRefresh();
    } catch (e) { show(e.message || "hat nicht geklappt", "error"); }
    setSaving(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Team</div>
      <SealLine/>
      {canManage && (
        <div style={{ background:C.bgCard, border:"1px solid #2f383d", borderRadius:6, padding:14 }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>+ einladen</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px" }}>
              <Field value={email} onChange={setEmail} placeholder="e-mail"/>
            </div>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ background:"#161a1d", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit" }}>
              {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <Btn onClick={sendInvite} disabled={!email.trim() || saving} style={{ textTransform:"none" }}>einladen</Btn>
          </div>
          <div style={{ color:C.grayDim, fontSize:12, marginTop:8, lineHeight:1.45 }}>
            die person meldet sich mit dieser e-mail an und ist dann dabei. die rolle kannst du später noch ändern.
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ background:C.bgCard, border:"1px solid #2f383d", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ color:C.white, fontSize:14, overflow:"hidden", textOverflow:"ellipsis" }}>{isOwner ? (user.email || "du") : "besitzer"}</div>
            <div style={{ color:C.grayDim, fontSize:11 }}>besitzer</div>
          </div>
        </div>
        {loading ? <div style={{ textAlign:"center", padding:20 }}><Spinner/></div> : team.map(m => (
          <div key={m.id} style={{ background:C.bgCard, border:"1px solid #2f383d", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <div style={{ minWidth:0 }}>
              <div style={{ color:C.white, fontSize:14, overflow:"hidden", textOverflow:"ellipsis" }}>{m.email || "mitglied"}</div>
              {!canManage && <div style={{ color:C.grayDim, fontSize:11 }}>{roleLabel(m.role)}</div>}
            </div>
            {canManage && (
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <select value={ROLE_OPTIONS.some(r => r.id === m.role) ? m.role : "editor"} onChange={e => changeMemberRole(m, e.target.value)} disabled={saving} style={{ background:"#161a1d", border:"1px solid #222", color:C.white, borderRadius:4, padding:"6px 8px", fontSize:13, fontFamily:"inherit" }}>
                  {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <Btn variant="danger" size="sm" onClick={() => removeMember(m)} disabled={saving}>✕</Btn>
              </div>
            )}
          </div>
        ))}
        {canManage && invites.map(inv => (
          <div key={inv.id} style={{ background:C.bgCard, border:"1px dashed #3a454b", borderRadius:5, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <div style={{ minWidth:0 }}>
              <div style={{ color:C.white, fontSize:14 }}>{inv.email}</div>
              <div style={{ color:C.grayDim, fontSize:11 }}>noch nicht dabei</div>
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <select value={ROLE_OPTIONS.some(r => r.id === inv.role) ? inv.role : "editor"} onChange={e => changeInviteRole(inv, e.target.value)} disabled={saving} style={{ background:"#161a1d", border:"1px solid #222", color:C.white, borderRadius:4, padding:"6px 8px", fontSize:13, fontFamily:"inherit" }}>
                {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <Btn variant="danger" size="sm" onClick={() => revokeInvite(inv)} disabled={saving}>✕</Btn>
            </div>
          </div>
        ))}
        {!loading && team.length === 0 && invites.length === 0 && (
          <div style={{ textAlign:"center", color:C.grayDim, padding:20, fontSize:13 }}>noch niemand sonst im team.</div>
        )}
      </div>
      {canLeave && (
        <Btn variant="ghost" onClick={leave} disabled={saving} style={{ textTransform:"none" }}>aus der band gehen</Btn>
      )}
    </div>
  );
}

export { MemberManager };
