import { useState } from "react";
import { C, sb } from "./core";
import { SealLine, Btn, Field, LiveMark } from "./ui";
import { LegalLinks } from "./legal";

function pickErr(res) {
  if (!res || typeof res !== "object") return "";
  const raw = res.msg || res.error_description || res.message || (typeof res.error === "string" ? res.error : "");
  if (!raw) return "";
  if (raw === "Invalid login credentials") return "E-Mail oder Passwort stimmt nicht.";
  if (raw === "Email not confirmed") return "Bitte zuerst die Bestätigungs-E-Mail öffnen.";
  if (String(raw).toLowerCase().includes("invalid api key")) return "Supabase-API-Key wird abgelehnt.";
  return String(raw).substring(0, 220);
}

function AuthScreen({ onAuth, onLocal, notice }) {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async () => {
    if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await sb.auth.signIn(email.trim(), password)
        : await sb.auth.signUp(email.trim(), password);
      const pretty = pickErr(res);
      const saved = sb.auth.persist(res, email.trim());
      if (pretty && !saved) {
        setError(pretty);
      } else if (saved) {
        onAuth({ email: saved.email || email.trim(), id: saved.id });
      } else if (mode === "register") {
        setError("Bestätigungs-E-Mail gesendet! Bitte bestätigen, dann einloggen.");
      } else {
        setError("Unerwartete Antwort vom Server. " + (res ? JSON.stringify(res).substring(0, 160) : "leer"));
      }
    } catch(e) {
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        setError("Dauert zu lang — einmal neu laden und nochmal anmelden.");
      } else {
        setError("Fehler: " + (e.message || e.name));
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#161a1d", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@500;600;700&family=Raleway:wght@400;500;600;700;800;900&display=swap');`}</style>
      <img src="/logo-schlagfertig.png" alt="" aria-hidden="true"
        style={{
          position:"absolute", left:"50%", top:"38%",
          width:"min(140vw,820px)", height:"auto",
          transform:"translate(-50%,-50%)",
          opacity:0.05, pointerEvents:"none", userSelect:"none"
        }}/>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"28px 20px 12px", position:"relative", zIndex:1 }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <img src="/logo-schlagfertig.png" alt="Schlagfertig"
              style={{ width:200, height:"auto", objectFit:"contain", display:"block", margin:"0 auto" }}/>
            <div style={{ display:"flex", justifyContent:"center", marginTop:6 }}>
              <LiveMark size={52} hero/>
            </div>
          </div>

          {notice && (
            <div style={{ color:C.teal, fontSize:14, lineHeight:1.45, textAlign:"center", marginBottom:14 }}>{notice}</div>
          )}
          <div style={{ background:"rgba(13,13,13,0.88)", border:"1px solid #1c1c1c", borderRadius:14, padding:"22px 20px 20px", backdropFilter:"blur(8px)" }}>
            <SealLine/>
            <div style={{ display:"flex", gap:6, margin:"16px 0 14px" }}>
              {[{k:"login",l:"Anmelden"},{k:"register",l:"Registrieren"}].map(({k,l})=>(
                <button key={k} onClick={()=>{ setMode(k); setError(""); }} style={{
                  flex:1, background:mode===k?C.teal:"transparent", color:mode===k?"#000":"#888",
                  border:"1px solid "+(mode===k?C.teal:"#3a454b"), borderRadius:6, padding:"9px 0",
                  fontSize:12, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase",
                  cursor:"pointer", fontFamily:"inherit"
                }}>{l}</button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Field value={email} onChange={setEmail} placeholder="E-Mail" type="email"/>
              <Field value={password} onChange={setPass} placeholder="Passwort" type="password"/>
              {error && <div style={{ color:mode==="register"&&error.includes("Bestätigung")?C.teal:C.red, fontSize:12, padding:"8px 10px", background:mode==="register"&&error.includes("Bestätigung")?C.tealDim:C.redDim, borderRadius:6, lineHeight:1.4 }}>{error}</div>}
              <Btn full onClick={handle} disabled={loading} style={{ padding:"13px 18px", borderRadius:6, marginTop:4 }}>
                {loading ? "Lädt…" : mode==="login" ? "Anmelden" : "Konto erstellen"}
              </Btn>
              {onLocal && (
                <button type="button" onClick={onLocal} style={{ background:"none", border:"none", color:"#5a666c", fontSize:13, marginTop:4, cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>
                  nur auf diesem gerät weiter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ position:"relative", zIndex:1, padding:"8px 16px 18px", textAlign:"center" }}>
        <LegalLinks/>
      </div>
    </div>
  );
}

export { AuthScreen };
