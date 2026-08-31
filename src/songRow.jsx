import { useState } from "react";
import { C, sb, SETS, dStyle } from "./core";
import { Btn, Badge } from "./ui";
import { useMetronome } from "./audio";
import { SongFold, FoldBtn } from "./songPanels";

function SongRow({ song, onDelete, onEdit, pos, draggable, onDragStart, onDrop, onDragOver, isDragging, dropActive, extra, showDrummer=true, onGripPointerDown }) {
  const st = dStyle(song.drummer);
  const { active, beat, toggle } = useMetronome(song.bpm);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const foldOpen = (showNotes && song.specialties) || (showLyrics && song.lyrics);
  const pulseColor  = beat?"#fff":active?C.teal:C.grayDim;
  const pulseGlow   = beat?`0 0 10px 4px ${C.teal}`:active?`0 0 4px 1px ${C.tealBorder}`:"none";
  const pulseBorder = active?`1px solid ${beat?"#fff":C.teal}`:"1px solid #2a2a2a";
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div draggable={!!draggable} onDragStart={onDragStart} onDragOver={e=>{ e.preventDefault(); onDragOver && onDragOver(e); }} onDrop={onDrop}
        style={{ background:isDragging?"#0a0a0a":st.bg, border:`1px solid ${isDragging?C.teal:dropActive?C.teal:st.border}`, borderRadius: foldOpen?"6px 6px 0 0":6, padding:"9px 13px", display:"flex", flexDirection:"column", gap:6, opacity:isDragging?.4:1, transition:"background .1s,border-color .1s", cursor:draggable?"grab":"default" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {pos!==undefined&&<div style={{ color:C.grayDim, fontSize:11, width:18, textAlign:"right", flexShrink:0, fontFamily:"'Space Mono',monospace" }}>{pos}</div>}
          {draggable&&<div
            onPointerDown={onGripPointerDown}
            title="Ziehen zum Verschieben"
            style={{ color:C.grayDim, fontSize:16, flexShrink:0, cursor:"grab", padding:"4px 2px", touchAction:"none", userSelect:"none" }}
          >⠿</div>}
          {song.bpm>0&&(
            <button onClick={toggle} title={`${active?"Stop":"Start"} (${song.bpm} BPM)`}
              style={{ background:"transparent", border:pulseBorder, borderRadius:"50%", width:32, height:32, flexShrink:0, cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:pulseGlow, transition:"border-color .05s,box-shadow .05s" }}>
              <div style={{ width:14, height:14, borderRadius:"50%", background:pulseColor, transition:"background .05s", boxShadow:beat?`0 0 6px 3px ${C.teal}`:"none"}}/>
            </button>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, color:C.white, fontSize:15, lineHeight:1.25, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{song.title}</div>
            <div style={{ color:C.gray, fontSize:12 }}>
              {song.artist}
              {song.bpm>0&&<span style={{ color:active?C.teal:C.grayDim, fontFamily:"'Space Mono',monospace", fontSize:11, marginLeft:6, transition:"color .2s" }}>{song.bpm} BPM</span>}
            </div>
          </div>
          {song.drummer&&showDrummer&&<Badge color={st.badge}>{song.drummer}</Badge>}
          {song.specialties&&<FoldBtn on={showNotes} title="Notizen" icon="📝" onClick={()=>setShowNotes(v=>!v)}/>}
          {song.lyrics&&<FoldBtn on={showLyrics} title="Lyrics" icon="📓" onClick={()=>setShowLyrics(v=>!v)}/>}
          {onEdit&&<button onClick={e=>{e.stopPropagation();onEdit(song);}} style={{ background:"transparent", border:"none", color:C.grayDim, cursor:"pointer", padding:"4px 6px", fontSize:17, flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color=C.teal} onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>✎</button>}
          {onDelete&&<button onClick={e=>{e.stopPropagation();onDelete(song);}} style={{ background:"transparent", border:"none", color:C.grayDim, cursor:"pointer", padding:"4px 6px", fontSize:17, flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.grayDim}>✕</button>}
          {extra&&extra}
        </div>
      </div>
      <SongFold notes={song.specialties} lyrics={song.lyrics} notesOpen={showNotes} lyricsOpen={showLyrics} border={st.border} compact/>
    </div>
  );
}

function SongRowMove({ song, mySongs, playlist, onDelete, onRefresh, setSaving, saving, showDrummer=true, canEdit=true, draggable, onDragStart, onDrop, onDragOver, isDragging, dropActive, onGripPointerDown }) {
  const [open, setOpen] = useState(false);
  const [newSet, setNewSet] = useState(song.set_name);
  const [newPos, setNewPos] = useState(String(song.position));
  const [notes, setNotes] = useState(song.specialties||"");
  const apply = async () => {
    setOpen(false);
    setSaving(true);
    const targetSet = newSet;
    const targetPos = parseInt(newPos) || 1;
    const psId = song.ps_id;
    const setItems = mySongs.filter(ps=>ps.set_name===song.set_name && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    const targetItems = mySongs.filter(ps=>ps.set_name===targetSet && ps.playlist_id===playlist.id).sort((a,b)=>a.position-b.position);
    if (targetSet === song.set_name) {
      const others = setItems.filter(ps=>ps.id!==psId);
      const clamped = Math.max(1, Math.min(targetPos, setItems.length));
      others.splice(clamped-1, 0, setItems.find(ps=>ps.id===psId));
      for (let i=0;i<others.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+others[i].id);
    } else {
      const oldOthers = setItems.filter(ps=>ps.id!==psId);
      for (let i=0;i<oldOthers.length;i++) await sb.update("playlist_songs",{position:i+1},"id=eq."+oldOthers[i].id);
      const newOthers = [...targetItems];
      const clamped = Math.max(1, Math.min(targetPos, targetItems.length+1));
      newOthers.splice(clamped-1, 0, { id: psId });
      for (let i=0;i<newOthers.length;i++) await sb.update("playlist_songs",{set_name:targetSet,position:i+1},"id=eq."+newOthers[i].id);
    }
    if (notes !== (song.specialties||"")) {
      await sb.update("songs", { specialties: notes }, "id=eq."+song.id);
    }
    await onRefresh(); setSaving(false);
  };
  return (
    <div style={{ position:"relative" }}>
      <SongRow song={song} pos={song.position} showDrummer={showDrummer} onDelete={onDelete}
        draggable={draggable} onDragStart={onDragStart} onDrop={onDrop} onDragOver={onDragOver}
        isDragging={isDragging} dropActive={dropActive} onGripPointerDown={onGripPointerDown}
        onEdit={canEdit?(()=>{ setNewSet(song.set_name); setNewPos(String(song.position)); setNotes(song.specialties||""); setOpen(!open); }):undefined}/>
      {open&&(
        <div style={{ position:"absolute", right:0, top:"100%", zIndex:100, background:"#1a1a1a", border:"1px solid "+C.tealBorder, borderRadius:8, padding:14, minWidth:220, boxShadow:"0 8px 32px rgba(0,0,0,.8)" }}>
          <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Verschieben nach</div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>SET</div>
              <select value={newSet} onChange={e=>setNewSet(e.target.value)}
                style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:12, fontFamily:"inherit", width:"100%" }}>
                {SETS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ width:64 }}>
              <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>PLATZ</div>
              <input type="number" min="1" value={newPos} onChange={e=>setNewPos(e.target.value)}
                style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:13, fontFamily:"'Space Mono',monospace", width:"100%", textAlign:"center" }}/>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ color:C.grayDim, fontSize:10, marginBottom:4 }}>NOTIZEN</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={"z.B. Count-In\nBD auf 1\nSchluss: Keys"} rows={5}
              style={{ background:"#0a0a0a", border:"1px solid #333", color:C.white, borderRadius:4, padding:"7px 8px", fontSize:12, fontFamily:"inherit", width:"100%", resize:"vertical", lineHeight:1.5 }}/>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <Btn variant="ghost" size="sm" onClick={()=>setOpen(false)}>Abbrechen</Btn>
            <Btn size="sm" onClick={apply} disabled={saving}>OK ✓</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export { SongRow, SongRowMove };
