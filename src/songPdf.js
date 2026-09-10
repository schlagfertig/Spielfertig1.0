import { getBandLogo, getLogo } from "./core";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}
function nl(s) {
  return esc(s).replace(/\n/g, "<br>");
}

function exportPDF(playlist, allSongs, playlistSongs, bandName) {
  const ps = playlistSongs.filter(p => p.playlist_id === playlist.id);
  const regularSets = ["Set 1", "Set 2", "Set 3"].filter(s => ps.some(p => p.set_name === s));
  const zugaben = ps.filter(p => p.set_name === "Zugaben").sort((a, b) => a.position - b.position);
  const teal = "#5cc8b8";
  const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const logo = getLogo();
  const bandLogo = getBandLogo(bandName);

  function songRow(p, i) {
    const s = allSongs.find(x => x.id === p.song_id);
    if (!s) return "";
    return "<div class='row'>"
      + "<div class='num'>" + (i + 1) + "</div>"
      + "<div class='main'><div class='stitle'>" + esc(s.title) + "</div>"
      + "<div class='sartist'>" + esc(s.artist || "") + "</div></div>"
      + "<div class='click'>" + (s.bpm ? s.bpm : "") + "</div>"
      + "<div class='notes'>" + (s.specialties ? nl(s.specialties) : "") + "</div>"
      + "<div class='lyrics'>" + (s.lyrics ? nl(s.lyrics) : "") + "</div>"
      + "<div class='drummer'>" + esc(s.drummer || "") + "</div>"
      + "</div>";
  }

  let pages = "";
  regularSets.forEach((set, si) => {
    const items = ps.filter(p => p.set_name === set).sort((a, b) => a.position - b.position);
    const isLast = si === regularSets.length - 1;
    const extra = (isLast && zugaben.length)
      ? "<div class='zusep'>● ZUGABEN ●</div>" + zugaben.map((p, i) => songRow(p, i)).join("")
      : "";
    const n = items.length + (isLast ? zugaben.length : 0);
    pages += "<section class='page" + (isLast ? "" : " brk") + "' data-count='" + n + "'>"
      + "<img class='wm' src='" + logo + "' alt=''/>"
      + "<header class='hdr'>"
      +   "<img class='hlogo' src='" + logo + "' alt=''/>"
      +   "<div class='hbrand'>SPIELFERTIG<span style='color:" + teal + "'>‽</span></div>"
      +   "<div class='hright'>"
      +   (bandLogo
        ? "<img src='" + bandLogo + "' alt='' style='height:42px;max-width:200px;object-fit:contain;display:block;margin-left:auto'>"
        : "<div class='hband'>" + esc(bandName) + "</div>")
      +   "<div class='hinfo'>" + esc(playlist.name) + " · " + date + "</div></div>"
      + "</header>"
      + "<div class='seal'></div>"
      + "<div class='settitle'>" + set + " <span class='setcount'>" + items.length + " Songs</span></div>"
      + "<div class='songs'>"
      + items.map((p, i) => songRow(p, i)).join("")
      + extra
      + "</div>"
      + "<footer class='footer'>SCHLAGFERTIG‽ · Thomas Schuster · ZEIT FÜR GUTEN SOUND</footer>"
      + "</section>";
  });

  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'>"
    + "<title>" + esc(playlist.name) + "</title>"
    + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    + "<link href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;600;700;800;900&display=swap' rel='stylesheet'>"
    + "<style>"
    + "@page{size:A4;margin:8mm 12mm}"
    + "*{box-sizing:border-box;margin:0;padding:0}"
    + "html,body{background:#fff;color:#111;font-family:'Raleway',sans-serif}"
    + "body{-webkit-print-color-adjust:exact;print-color-adjust:exact}"
    + ".toolbar{position:sticky;top:0;z-index:50;background:#111;color:#eee;padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}"
    + ".toolbar .lab{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#888;margin-right:4px}"
    + ".chip{border:1px solid #444;background:transparent;color:#aaa;border-radius:4px;padding:6px 10px;font:700 11px Raleway,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}"
    + ".chip.on{background:#1a3d38;color:#5cc8b8;border-color:#5cc8b8}"
    + ".act{margin-left:auto;display:flex;gap:8px}"
    + ".act button{background:#5cc8b8;color:#000;border:0;border-radius:4px;padding:8px 14px;font:800 12px Raleway,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}"
    + ".act .ghost{background:transparent;color:#5cc8b8;border:1px solid #5cc8b8}"
    + ".page{position:relative;height:277mm;display:flex;flex-direction:column;padding:2mm 0}"
    + ".brk{page-break-after:always}"
    + ".wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:240px;opacity:.05;pointer-events:none}"
    + ".hdr{display:flex;align-items:center;gap:10px;position:relative;z-index:1;flex-shrink:0}"
    + ".hlogo{height:40px;width:auto;object-fit:contain}"
    + ".hbrand{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.06em}"
    + ".hright{flex:1;text-align:right}"
    + ".hband{font-family:'Bebas Neue',cursive;font-size:16px;color:#444}"
    + ".hinfo{font-size:10px;color:#999;margin-top:2px}"
    + ".seal{height:2px;background:linear-gradient(90deg,transparent,#5cc8b8,#5cc8b8,transparent);margin:4px 0 6px;flex-shrink:0}"
    + ".settitle{font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:.12em;color:#5cc8b8;margin-bottom:4px;flex-shrink:0}"
    + ".setcount{font-size:13px;color:#bbb;letter-spacing:0}"
    + ".songs{flex:1;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1}"
    + ".row{flex:1 1 0;display:flex;align-items:center;gap:8px;min-height:0;border-bottom:1px solid #ddd;padding:0 2px}"
    + ".num{width:28px;flex-shrink:0;text-align:right;font-weight:800;color:#888;font-size:var(--num,20px)}"
    + ".main{flex:1;min-width:0}"
    + ".stitle{font-weight:800;font-size:var(--title,24px);line-height:1.12;letter-spacing:.01em}"
    + ".sartist{color:#555;font-size:var(--artist,13px);margin-top:1px}"
    + ".click,.notes,.lyrics,.drummer{display:none}"
    + "body.on-click .click{display:block;width:48px;flex-shrink:0;text-align:right;font-weight:700;color:#555;font-size:var(--artist,13px)}"
    + "body.on-notes .notes{display:block;flex:0 1 32%;max-width:34%;font-size:11px;color:#444;font-style:italic;line-height:1.3;overflow:hidden}"
    + "body.on-lyrics .lyrics{display:block;flex:0 1 30%;max-width:32%;font-size:11px;color:#333;line-height:1.3;overflow:hidden}"
    + "body.on-drummer .drummer{display:block;width:56px;flex-shrink:0;text-align:right;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#444}"
    + "body.busy .stitle{font-size:var(--title,16px)}"
    + ".zusep{flex:0 0 auto;padding:8px 4px 4px;font-family:'Bebas Neue',cursive;font-size:16px;letter-spacing:.14em;color:#888;border-bottom:1px solid #ccc}"
    + ".footer{flex-shrink:0;padding-top:4px;font-size:8px;color:#ccc;text-align:center;letter-spacing:.1em;text-transform:uppercase}"
    + "@media print{.toolbar{display:none!important}.page{height:277mm}}"
    + "</style></head><body>"
    + "<div class='toolbar'>"
    +   "<span class='lab'>Ansicht</span>"
    +   "<button class='chip' data-k='notes'>Notizen</button>"
    +   "<button class='chip' data-k='lyrics'>Lyrics</button>"
    +   "<button class='chip' data-k='click'>Click / BPM</button>"
    +   "<button class='chip' data-k='drummer'>Drummer</button>"
    +   "<div class='act'><button onclick='window.print()'>Drucken</button>"
    +   "<button class='ghost' onclick='window.close()'>Schließen</button></div>"
    + "</div>"
    + pages
    + "<script>"
    + "(function(){"
    + "var KEY='sf_print_prefs';"
    + "var state={notes:false,lyrics:false,click:false,drummer:false};"
    + "try{var raw=localStorage.getItem(KEY);if(raw) Object.assign(state,JSON.parse(raw));}catch(e){}"
    + "function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}"
    + "function extras(){return (state.notes?1:0)+(state.lyrics?1:0)+(state.drummer?1:0);}"
    + "function layout(){"
    + "  document.body.classList.toggle('on-notes', !!state.notes);"
    + "  document.body.classList.toggle('on-lyrics', !!state.lyrics);"
    + "  document.body.classList.toggle('on-click', !!state.click);"
    + "  document.body.classList.toggle('on-drummer', !!state.drummer);"
    + "  document.body.classList.toggle('busy', extras()>0);"
    + "  document.querySelectorAll('.chip').forEach(function(b){b.classList.toggle('on', !!state[b.getAttribute('data-k')]);});"
    + "  document.querySelectorAll('.page').forEach(function(p){"
    + "    var n=parseInt(p.getAttribute('data-count'),10)||12;"
    + "    var base=n<=11?28:n<=13?25:n<=15?22:n<=17?19:17;"
    + "    var t=Math.max(15, base-extras()*3);"
    + "    p.style.setProperty('--title', t+'px');"
    + "    p.style.setProperty('--artist', Math.max(11,t-11)+'px');"
    + "    p.style.setProperty('--num', Math.max(14,t-4)+'px');"
    + "  });"
    + "}"
    + "document.querySelectorAll('.chip').forEach(function(b){"
    + "  b.addEventListener('click', function(){ var k=b.getAttribute('data-k'); state[k]=!state[k]; save(); layout(); });"
    + "});"
    + "layout();"
    + "})();"
    + "</script></body></html>";

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export { exportPDF };
