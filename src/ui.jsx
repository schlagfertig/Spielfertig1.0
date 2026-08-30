import { useEffect } from "react";
import { C } from "./core";

const SealLine = ({ color = C.teal }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
    <div style={{ flex:1, height:1, background:color, opacity:.4 }} />
    <div style={{ width:5, height:5, borderRadius:"50%", background:color, opacity:.6 }} />
    <div style={{ flex:1, height:1, background:color, opacity:.4 }} />
  </div>
);

function Btn({ children, onClick, variant="primary", size="md", disabled, full, style:s={} }) {
  const sz = { sm:{padding:"5px 11px",fontSize:11}, md:{padding:"8px 18px",fontSize:12}, lg:{padding:"12px 28px",fontSize:13} };
  const vr = {
    primary: { background:C.teal, color:"#000", border:"none" },
    outline: { background:"transparent", color:C.teal, border:"1px solid "+C.tealBorder },
    danger:  { background:C.redDim, color:C.red, border:"1px solid "+C.redBorder },
    ghost:   { background:"transparent", color:C.gray, border:"none" },
  };
  return <button onClick={disabled?undefined:onClick} style={{ ...sz[size],...vr[variant], borderRadius:4, fontWeight:700, fontFamily:"inherit", letterSpacing:"0.06em", textTransform:"uppercase", cursor:disabled?"not-allowed":"pointer", opacity:disabled?.4:1, display:"inline-flex", alignItems:"center", gap:6, transition:"opacity .15s", width:full?"100%":undefined, justifyContent:full?"center":undefined, ...s }}>{children}</button>;
}

function Field({ value, onChange, placeholder, type="text", rows, style:s={} }) {
  const base = { background:C.bgCard, border:"1px solid "+C.grayDim, color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box", ...s };
  if (rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={e=>e.target.style.borderColor=C.tealBorder} onBlur={e=>e.target.style.borderColor=C.grayDim} style={{...base,resize:"vertical",lineHeight:1.6}}/>;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={e=>e.target.style.borderColor=C.tealBorder} onBlur={e=>e.target.style.borderColor=C.grayDim} style={base}/>;
}

function Sel({ value, onChange, options, style:s={} }) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit", width:"100%", ...s }}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
}

function Badge({ children, color }) {
  return <span style={{ color, border:`1px solid ${color}`, fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:2, letterSpacing:"0.08em", textTransform:"uppercase" }}>{children}</span>;
}

function Toast({ msg, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[]);
  return <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:type==="error"?"#1a0000":"#001a16", border:`1px solid ${type==="error"?C.red:C.teal}`, color:type==="error"?C.red:C.teal, padding:"10px 18px", borderRadius:4, fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", animation:"fadeUp .2s ease" }}>{msg}</div>;
}

function Confirm({ msg, onOk, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.bgCard, border:"1px solid #222", borderRadius:8, padding:28, maxWidth:340, width:"90%" }}>
        <p style={{ color:C.white, fontSize:14, fontWeight:600, marginBottom:6 }}>Löschen bestätigen</p>
        <p style={{ color:C.gray, fontSize:13, marginBottom:20 }}>{msg}</p>
        <SealLine/><div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
          <Btn variant="ghost" onClick={onCancel}>Abbrechen</Btn>
          <Btn variant="danger" onClick={onOk}>Löschen</Btn>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.bgCard, border:"1px solid "+C.grayDim, borderRadius:8, padding:26, maxWidth:440, width:"90%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:C.teal, fontWeight:700, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" }}>{title}</span>
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
      <path d="M26 40 L35 50 L54 30" stroke={C.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Spinner() {
  return <div style={{ width:20, height:20, border:`2px solid #222`, borderTop:`2px solid ${C.teal}`, borderRadius:"50%", animation:"spin .7s linear infinite" }}/>;
}

export { SealLine, Btn, Field, Sel, Badge, Toast, Confirm, Modal, SealIcon, Spinner };
