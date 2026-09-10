import { useEffect } from "react";
import { C } from "./core";

const SealLine = ({ color = C.teal }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
    <div style={{ flex:1, height:1, background:color, opacity:.4 }} />
    <div style={{ width:5, height:5, borderRadius:"50%", background:color, opacity:.6 }} />
    <div style={{ flex:1, height:1, background:color, opacity:.4 }} />
  </div>
);

function Bang({ size=28, color }) {
  const fill = color || C.teal;
  return (
    <svg width={Math.round(size*0.42)} height={size} viewBox="0 0 18 40" aria-hidden="true"
      style={{ display:"inline-block", verticalAlign:"-0.08em", marginLeft:1 }}>
      <path d="M4.2 9.2C4.2 4.6 7.6 2.2 11.4 2.2c3.6 0 6.2 2.2 6.2 5.6 0 2.6-1.4 4.2-4.2 6.2L12.2 16.2"
        fill="none" stroke={fill} strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.6 2.8 L8.6 24.2" fill="none" stroke={fill} strokeWidth="3.1" strokeLinecap="round"/>
      <circle cx="9.4" cy="35.4" r="3.05" fill={fill}/>
    </svg>
  );
}

function BrandWordmark({ size=34 }) {
  return (
    <div style={{ color:C.white, fontWeight:400, fontSize:size, fontFamily:"'Bebas Neue',cursive", letterSpacing:"0.06em", lineHeight:1, display:"inline-flex", alignItems:"baseline" }}>
      SPIELFERTIG<Bang size={Math.round(size*0.88)}/>
    </div>
  );
}

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
  const base = { background:"#0a0a0a", border:"1px solid #2a2a2a", color:C.white, borderRadius:6, padding:"12px 14px", fontSize:15, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box", ...s };
  if (rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={e=>e.target.style.borderColor=C.tealBorder} onBlur={e=>e.target.style.borderColor="#2a2a2a"} style={{...base,resize:"vertical",lineHeight:1.6}}/>;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} autoCapitalize="none" autoCorrect="off" onFocus={e=>e.target.style.borderColor=C.tealBorder} onBlur={e=>e.target.style.borderColor="#2a2a2a"} style={base}/>;
}

function Sel({ value, onChange, options, style:s={} }) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:"#0a0a0a", border:"1px solid #222", color:C.white, borderRadius:4, padding:"9px 12px", fontSize:13, fontFamily:"inherit", width:"100%", ...s }}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
}

function Badge({ children, color }) {
  return <span style={{ color, border:"1px solid "+color, fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:2, letterSpacing:"0.08em", textTransform:"uppercase" }}>{children}</span>;
}

function Toast({ msg, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[]);
  return <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:type==="error"?"#1a0000":"#001a16", border:"1px solid "+(type==="error"?C.red:C.teal), color:type==="error"?C.red:C.teal, padding:"10px 18px", borderRadius:4, fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", animation:"fadeUp .2s ease" }}>{msg}</div>;
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
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px 12px", boxSizing:"border-box" }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{ background:C.bgCard, border:"1px solid "+C.grayDim, borderRadius:8, width:"100%", maxWidth:440, maxHeight:"92dvh", display:"flex", flexDirection:"column", overflow:"hidden" }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 18px 10px", flexShrink:0 }}>
          <span style={{ color:C.teal, fontWeight:700, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" }}>{title}</span>
          <Btn variant="ghost" size="sm" onClick={onClose}>✕</Btn>
        </div>
        <div style={{ padding:"0 18px", flexShrink:0 }}><SealLine/></div>
        <div style={{ marginTop:10, padding:"0 18px 20px", overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", flex:"1 1 auto", minHeight:0 }}>
          {children}
        </div>
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
  return <div style={{ width:20, height:20, border:"2px solid #222", borderTop:"2px solid "+C.teal, borderRadius:"50%", animation:"spin .7s linear infinite" }}/>;
}

export { SealLine, Bang, BrandWordmark, Btn, Field, Sel, Badge, Toast, Confirm, Modal, SealIcon, Spinner };
