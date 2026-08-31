import { useState } from "react";
import { C, sb } from "./core";
import { SealLine, Btn, Field, SealIcon } from "./ui";

function AuthScreen({ onAuth }) {
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
      if (res.error || res.error_description || res.msg) {
        const raw = res.msg || res.error_description || res.error;
        const pretty =
          raw === "Invalid login credentials" ? "E-Mail oder Passwort stimmt nicht." :
          raw === "Email not confirmed" ? "Bitte zuerst die Bestätigungs-E-Mail öffnen." :
          String(raw).substring(0, 200);
        setError(pretty);
      } else if (res.access_token) {
        sb._token = res.access_token;
        localStorage.setItem("sf_token", res.access_token);
        localStorage.setItem("sf_user", JSON.stringify({ email: res.user?.email, id: res.user?.id }));
        onAuth({ email: res.user?.email, id: res.user?.id });
      } else if (mode === "register") {
        setError("Bestätigungs-E-Mail gesendet! Bitte bestätigen, dann einloggen.");
      } else {
        setError("Unerwartete Antwort vom Server. Bitte nochmal versuchen.");
      }
    } catch(e) {
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        setError("Zeitüberschreitung – Verbindung zu Supabase klemmt. Einmal hart neu laden (PWA vom Homescreen löschen hilft auf dem iPad). Werbeblocker / iCloud Private Relay kurz aus.");
      } else {
        setError("Fehler: " + (e.message || e.name));
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ marginBottom:32, textAlign:"center" }}>
        <SealIcon size={56}/>
        <div style={{ color:C.white, fontWeight:400, fontSize:34, fontFamily:"'Bebas Neue',cursive", letterSpacing:"0.06em", marginTop:12 }}>SPIELFERTIG<span style={{ color:C.teal }}>‽</span></div>
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

export { AuthScreen };
