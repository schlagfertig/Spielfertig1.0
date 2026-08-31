import { getBandLogo, getLogo } from "./core";

function exportPDF(playlist, allSongs, playlistSongs, bandName, withNotes) {
  const ps          = playlistSongs.filter(p=>p.playlist_id===playlist.id);
  const regularSets = ["Set 1","Set 2","Set 3"].filter(s=>ps.some(p=>p.set_name===s));
  const zugaben     = ps.filter(p=>p.set_name==="Zugaben").sort((a,b)=>a.position-b.position);
  const teal        = "#5cc8b8";
  const tomCol      = "#0a7a6e";
  const ronCol      = "#a83030";
  const date        = new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});

  function songRows(items, startIdx) {
    return items.map((p,i) => {
      const s = allSongs.find(x=>x.id===p.song_id);
      if (!s) return "";
      const isTom  = s.drummer==="Tom";
      const isRon  = s.drummer==="Ron";
      const dCol   = isTom ? tomCol : isRon ? ronCol : "#777";
      const rowBg  = isTom ? "#f0faf8" : isRon ? "#fdf2f2" : "#fafafa";
      const bpmStr = s.bpm ? "<div class='sbpm'>" + s.bpm + " BPM</div>" : "";
      const notesCell = withNotes
        ? "<td class='ncol'>" + (s.specialties ? s.specialties.replace(/\n/g,"<br>") : "") + "</td>"
        : "";
      return "<tr style='background:" + rowBg + "'>"
        + "<td class='num'>" + (startIdx+i+1) + "</td>"
        + "<td class='tcol'><span class='stitle'>" + s.title + "</span></td>"
        + "<td class='acol'><span class='sartist'>" + (s.artist||"") + "</span>" + bpmStr + "</td>"
        + notesCell
        + "<td class='dcol'><span style='color:" + dCol + ";border:1px solid " + dCol + "'>" + (s.drummer||"") + "</span></td>"
        + "</tr>";
    }).join("");
  }

  let pages = "";
  regularSets.forEach((set, si) => {
    const items  = ps.filter(p=>p.set_name===set).sort((a,b)=>a.position-b.position);
    const isLast = si === regularSets.length - 1;
    let zuSection = "";
    if (isLast && zugaben.length) {
      zuSection = "<tr><td colspan='4' class='zusep'>&#9679; ZUGABEN &#9679;</td></tr>" + songRows(zugaben, 0);
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

  const notesColCss = withNotes
    ? ".ncol{width:32%;padding:3px 6px;font-size:9px;color:#666;font-style:italic;vertical-align:top;line-height:1.4;white-space:pre-wrap}"
    : "";

  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'>"
    + "<title>" + playlist.name + "</title>"
    + "<link href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;600;700;800;900&display=swap' rel='stylesheet'>"
    + "<style>"
    + "@page{size:A4;margin:8mm 18mm}"
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
    + ".seal{height:2px;background:linear-gradient(90deg,transparent," + teal + "," + teal + ",transparent);margin:3px 0 5px;position:relative;z-index:1}"
    + ".settitle{font-family:'Bebas Neue',cursive;font-size:17px;letter-spacing:.12em;color:" + teal + ";margin-bottom:3px;position:relative;z-index:1}"
    + ".setcount{font-size:13px;color:#bbb;letter-spacing:0}"
    + "table{width:100%;border-collapse:collapse;position:relative;z-index:1}"
    + "tr{border-bottom:1px solid #ebebeb}"
    + "td{vertical-align:middle;padding:4px 4px}"
    + ".num{width:22px;color:#aaa;font-size:14px;text-align:right;padding-right:6px;font-family:'Raleway';font-weight:800}"
    + ".tcol{padding:3px 5px;vertical-align:middle}"
    + ".acol{padding:3px 5px;vertical-align:middle}"
    + ".stitle{font-family:'Raleway',sans-serif;font-size:14px;letter-spacing:.01em;line-height:1.2;font-weight:800}"
    + ".sartist{font-family:'Raleway',sans-serif;font-weight:400;font-size:11px;letter-spacing:.01em;color:#444}"
    + ".sbpm{font-size:9px;color:#bbb;margin-top:1px}"
    + ".bpm{font-weight:700}"
    + notesColCss
    + ".dcol{width:42px;text-align:right;padding:5px 4px}"
    + ".dcol span{font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 5px;border-radius:2px}"
    + ".zusep{padding:5px 5px 3px;font-family:'Bebas Neue',cursive;font-size:15px;letter-spacing:.15em;color:#bbb;border-bottom:1px solid #e0e0e0}"
    + ".footer{margin-top:auto;padding-top:4px;font-size:8px;color:#ccc;text-align:center;border-top:1px solid #f0f0f0;letter-spacing:.1em;text-transform:uppercase}"
    + "</style></head><body>"
    + pages
    + "</body></html>";

  const closeBtn = "<div class='close-btn'>"
    + "<button onclick='window.close()' style='position:fixed;top:16px;right:16px;background:#000;color:#5cc8b8;border:1px solid #5cc8b8;border-radius:4px;padding:8px 18px;font-family:Raleway,sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;z-index:999'>← SCHLIESSEN</button>"
    + "</div>";
  const htmlWithBtn = html.replace("</body>", closeBtn + "<style>@media print{.close-btn{display:none}}</style></body>");
  const w = window.open("","_blank");
  w.document.write(htmlWithBtn);
  w.document.close();
  w.document.fonts.ready.then(()=>w.print());
}

export { exportPDF };
