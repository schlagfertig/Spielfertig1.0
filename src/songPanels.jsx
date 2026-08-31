import { C } from "./core";

function SongFold({ notes, lyrics, notesOpen, lyricsOpen, border, compact }) {
  const showN = !!(notesOpen && notes);
  const showL = !!(lyricsOpen && lyrics);
  if (!showN && !showL) return null;
  const pad = compact ? "12px 14px" : "14px 16px";
  const fs = compact ? 14 : 18;
  const sideBySide = showN && showL;
  return (
    <div
      onClick={e=>e.stopPropagation()}
      style={{
        display:"flex",
        flexWrap:"wrap",
        background:C.lyricsBg,
        border:"2px solid "+border,
        borderTop:"none",
        borderRadius:"0 0 7px 7px",
        overflow:"hidden",
      }}
    >
      {showN && (
        <div style={{
          flex: sideBySide ? "0 1 340px" : "1 1 100%",
          minWidth: sideBySide ? 220 : 0,
          maxWidth: sideBySide ? "42%" : "100%",
          padding:pad,
          borderRight: sideBySide ? "1px solid "+border : "none",
          boxSizing:"border-box",
        }}>
          <div style={{ color:C.teal, fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Notizen</div>
          <div style={{ color:C.lyricsText, fontSize:fs, lineHeight:1.6, whiteSpace:"pre-wrap", fontStyle:"italic" }}>{notes}</div>
        </div>
      )}
      {showL && (
        <div style={{ flex:"1 1 380px", minWidth:0, padding:pad, boxSizing:"border-box" }}>
          <div style={{ color:C.teal, fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Lyrics</div>
          <div style={{ color:C.lyricsText, fontSize:fs, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{lyrics}</div>
        </div>
      )}
    </div>
  );
}

function FoldBtn({ on, title, icon, onClick }) {
  return (
    <button
      onClick={e=>{ e.stopPropagation(); onClick(); }}
      title={title}
      style={{ background:"transparent", border:"none", color:on?C.teal:C.grayDim, cursor:"pointer", fontSize:22, padding:"2px 4px", flexShrink:0 }}
    >{icon}</button>
  );
}

export { SongFold, FoldBtn };
