import { getBandLogo, getLogo } from "./core";

function exportPDF(playlist, allSongs, playlistSongs, bandName, opts = {}) {
  const notes   = opts.notes === true;
  const lyrics  = opts.lyrics === true;
  const click   = opts.click === true;
  const drummer = opts.drummer === true;
  const extras  = [notes, lyrics, drummer].filter(Boolean).length;
  const floor   = extras === 0;

  const titleFs   = floor ? 26 : extras === 1 ? 20 : 15;
  const artistFs  = floor ? 15 : extras === 1 ? 12 : 11;
  const numFs     = floor ? 20 : 15;
  const rowPad    = floor ? "10px 6px" : extras === 1 ? "7px 5px" : "4px 4px";
  const notesFs   = extras ? 10 : 9;

  const ps          = playlistSongs.filter(p=>p.playlist_id===playlist.id);
  const regularSets = ["Set 1","Set 2","Set 3"].filter(s=>ps.some(p=>p.set_name===s));
  const zugaben     = ps.filter(p=>p.set_name==="Zugaben").sort((a,b)=>a.position-b.position);
  const teal        = "#5cc8b8";
  const date        = new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});
  const colCount    = 2 + (click?1:0) + (notes?1:0) + (lyrics?1:0) + (drummer?1:0);

  function songRows(items, startIdx) {
    return items.map((p,i) => {
      const s = allSongs.find(x=>x.id===p.song_id);
      if (!s) return "";
      const extraNotes = notes && s.specialties
        ? "<td class='ncol'>" + String(s.specialties).replace(/\n/g,"<br>") + "</td>"
        : notes ? "<td class='ncol'></td>" : "";
      const extraLyrics = lyrics && s.lyrics
        ? "<td class='lcol'>" + String(s.lyrics).replace(/\n/g,"<br>") + "</td>"
        : lyrics ? "<td class='lcol'></td>" : "";
      const extraClick = click
        ? "<td class='bcol'>" + (s.bpm ? s.bpm : "") + "</td>"
        : "";
      const extraDrummer = drummer
        ? "<td class='dcol'>" + (s.drummer||"") + "</td>"
        : "";
      return "<tr>"
        + "<td class='num'>" + (startIdx+i+1) + "</td>"
        + "<td class='tcol'><div class='stitle'>" + s.title + "</div>"
        +   "<div class='sartist'>" + (s.artist||"") + "</div></td>"
        + extraClick
        + extraNotes
        + extraLyrics
        + extraDrummer
        + "</tr>";
    }).join("");
  }

  let pages = "";
  regularSets.forEach((set, si) => {
    const items  = ps.filter(p=>p.set_name===set).sort((a,b)=>a.position-b.position);
    const isLast = si === regularSets.length - 1;
    let zuSection = "";
    if (isLast && zugaben.length) {
      zuSection = "<tr><td colspan='" + colCount + "' class='zusep'>&#9679; ZUGABEN &#9679;</td></tr>" + songRows(zugaben, 0);
    }
    pages += "<div class='page" + (isLast ? "" : " brk") + "'>"
      + "<img class='wm' src='" + getLogo() + "' alt=''/>"
      + "<div class='hdr'>"
      +   "<div class='hbrand'>SPIELFERTIG<span style='color:" + teal + "'>&#8253;</span></div>"
      +   "<div class='hright'>"
      +   (getBandLogo(bandName) ? "<img src='" + getBandLogo(bandName) + "' style='height:46px;max-width:220px;object-fit:contain;display:block;margin-left:auto;margin-bottom:2px'>" : "<div class='hband'>" + bandName + "</div>")
      +   "<div class='hinfo'>" + playlist.name + " &nbsp;·&nbsp; " + date + "</div></div>"
      + "</div>"
      + "<div class='seal'></div>"
      + "<div class='settitle'>" + set + " <span class='setcount'>(" + items.length + " Songs)</span></div>"
      + "<table><tbody>"
      + songRows(items, 0)
      + zuSection
      + "</tbody></table>"
      + "<div class='footer'>SCHLAGFERTIG&#8253; &nbsp;·&nbsp; Thomas Schuster &nbsp;·&nbsp; ZEIT FÜR GUTEN SOUND</div>"
      + "</div>";
  });

  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'>"
    + "<title>" + playlist.name + "</title>"
    + "<link href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;600;700;800;900&display=swap' rel='stylesheet'>"
    + "<style>"
    + "@page{size:A4;margin:8mm 14mm}"
    + "*{box-sizing:border-box;margin:0;padding:0}"
    + "body{font-family:'Raleway',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#111}"
    + ".page{position:relative;min-height:277mm;display:flex;flex-direction:column}"
    + ".brk{page-break-after:always}"
    + ".wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:240px;opacity:.04;pointer-events:none}"
    + ".hdr{display:flex;align-items:center;gap:10px;padding-bottom:4px;position:relative;z-index:1}"
    + ".hbrand{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.06em;flex-shrink:0}"
    + ".hright{flex:1;text-align:right}"
    + ".hband{font-family:'Bebas Neue',cursive;font-size:16px;letter-spacing:.05em;color:#444}"
    + ".hinfo{font-size:9px;color:#999;margin-top:1px}"
    + ".seal{height:2px;background:linear-gradient(90deg,transparent," + teal + "," + teal + ",transparent);margin:3px 0 6px;position:relative;z-index:1}"
    + ".settitle{font-family:'Bebas Neue',cursive;font-size:" + (floor?22:17) + "px;letter-spacing:.12em;color:" + teal + ";margin-bottom:4px;position:relative;z-index:1}"
    + ".setcount{font-size:13px;color:#bbb;letter-spacing:0}"
    + "table{width:100%;border-collapse:collapse;position:relative;z-index:1}"
    + "tr{border-bottom:1px solid #ddd}"
    + "td{vertical-align:middle;padding:" + rowPad + ";background:#fff}"
    + ".num{width:" + (floor?36:24) + "px;color:#888;font-size:" + numFs + "px;text-align:right;padding-right:10px;font-weight:800}"
    + ".stitle{font-size:" + titleFs + "px;letter-spacing:.01em;line-height:1.15;font-weight:800}"
    + ".sartist{font-weight:400;font-size:" + artistFs + "px;color:#555;margin-top:2px}"
    + ".bcol{width:52px;text-align:right;font-size:" + (floor?14:11) + "px;color:#666;font-weight:700;white-space:nowrap}"
    + ".ncol{width:28%;font-size:" + notesFs + "px;color:#555;font-style:italic;vertical-align:top;line-height:1.35}"
    + ".lcol{width:30%;font-size:" + notesFs + "px;color:#333;vertical-align:top;line-height:1.35}"
    + ".dcol{width:54px;text-align:right;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#444}"
    + ".zusep{padding:10px 5px 6px;font-family:'Bebas Neue',cursive;font-size:" + (floor?20:15) + "px;letter-spacing:.15em;color:#888;border-bottom:1px solid #ccc}"
    + ".footer{margin-top:auto;padding-top:4px;font-size:8px;color:#ccc;text-align:center;border-top:1px solid #f0f0f0;letter-spacing:.1em;text-transform:uppercase}"
    + "</style></head><body>"
    + pages
    + "</body></html>";

  const closeBtn = "<div class='close-btn'>"
    + "<button onclick='window.close()' style='position:fixed;top:16px;right:16px;background:#000;color:#5cc8b8;border:1px solid #5cc8b8;border-radius:4px;padding:8px 18px;font-family:Raleway,sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;z-index:999'>← SCHLIESSEN</button>"
    + "</div>";
  const htmlWithBtn = html.replace("</body>", closeBtn + "<style>@media print{.close-btn{display:none}}</style></body>");
  const w = window.open("","_blank");
  if (!w) return;
  w.document.write(htmlWithBtn);
  w.document.close();
  w.document.fonts.ready.then(()=>w.print());
}

export { exportPDF };
