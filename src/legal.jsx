import { C, getLogo } from "./core";
import { BrandWordmark, SealLine } from "./ui";

export const LEGAL = {
  name: "Thomas Schuster",
  street: "Mittleres Höfle 10",
  zip: "86916",
  city: "Kaufering",
  country: "Deutschland",
  email: "thomas-schuster83@gmx.de",
  brand: "SPIELFERTIG‽",
  studio: "SCHLAGFERTIG‽",
  site: "https://spielfertig7.vercel.app",
};

function addressLines() {
  const lines = [LEGAL.name];
  if (LEGAL.street) lines.push(LEGAL.street);
  const city = [LEGAL.zip, LEGAL.city].filter(Boolean).join(" ");
  if (city) lines.push(city);
  if (LEGAL.country) lines.push(LEGAL.country);
  if (!LEGAL.street || !LEGAL.city) {
    lines.push("Anschrift wird noch ergänzt (Pflichtangabe nach § 5 DDG).");
  }
  return lines;
}

export function LegalLinks({ dim }) {
  const color = dim ? "#3a3a3a" : C.grayDim;
  const link = (page, label) => (
    <a href={"?legal=" + page} style={{ color, textDecoration:"none", letterSpacing:"0.08em" }}>{label}</a>
  );
  return (
    <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", fontSize:10, textTransform:"uppercase" }}>
      {link("impressum", "Impressum")}
      <span style={{ color }}>·</span>
      {link("datenschutz", "Datenschutz")}
    </div>
  );
}

function H({ children }) {
  return (
    <h2 style={{ color:C.teal, fontSize:12, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", margin:"22px 0 8px" }}>{children}</h2>
  );
}
function P({ children }) {
  return <p style={{ color:C.gray, fontSize:14, lineHeight:1.65, margin:"0 0 10px" }}>{children}</p>;
}

function Impressum() {
  return (
    <>
      <H>Angaben gemäß § 5 DDG</H>
      <P>
        {addressLines().map((l,i)=><span key={i}>{l}<br/></span>)}
      </P>
      <H>Kontakt</H>
      <P>
        E-Mail: <a href={"mailto:"+LEGAL.email} style={{ color:C.teal }}>{LEGAL.email}</a>
      </P>
      <H>Verantwortlich für den Inhalt</H>
      <P>{LEGAL.name}, {LEGAL.studio}</P>
      <H>Angebot</H>
      <P>
        {LEGAL.brand} ist eine Web-App zur Verwaltung von Songs, Notizen, Charts und Setlists für Bands.
        Betreiber ist {LEGAL.name} unter der Marke {LEGAL.studio}.
      </P>
      <H>EU-Streitschlichtung</H>
      <P>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
        {" "}<a href="https://ec.europa.eu/consumers/odr" style={{ color:C.teal }} target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>.
        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </P>
      <H>Haftung für Inhalte und Links</H>
      <P>
        Die Inhalte dieser App wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir keine Gewähr übernehmen.
        Externe Links werden zum Zeitpunkt der Verknüpfung geprüft; für spätere Änderungen sind die jeweiligen Betreiber verantwortlich.
      </P>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <P>Stand: September 2026</P>
      <H>1. Verantwortlicher</H>
      <P>
        {addressLines().map((l,i)=><span key={i}>{l}<br/></span>)}
        E-Mail: <a href={"mailto:"+LEGAL.email} style={{ color:C.teal }}>{LEGAL.email}</a>
      </P>
      <H>2. Welche Daten wir verarbeiten</H>
      <P>Konto: E-Mail-Adresse und Passwort-Hash (kein Klartext-Passwort bei uns gespeichert). Das Login läuft über Supabase Auth.</P>
      <P>App-Inhalte: Bands, Songs, BPM, Drummer, Notizen, Lyrics, Charts, Gigs, Playlists und geteilte Setlists, soweit du sie anlegst.</P>
      <P>Technik: Beim Aufruf speichern Hosting-Anbieter üblich Server-Logs (IP, Zeitpunkt, User-Agent) für kurze Zeit zur Betriebssicherheit.</P>
      <P>Lokal auf deinem Gerät: Login-Token, Anzeige-Einstellungen und ein optionaler Offline-Cache in localStorage bzw. im Service Worker. Das sind keine Tracking-Cookies.</P>
      <H>3. Zwecke und Rechtsgrundlagen</H>
      <P>Vertrag bzw. vorvertragliche Nutzung der App (Art. 6 Abs. 1 lit. b DSGVO): Konto, Songs, Setlists.</P>
      <P>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO): sicherer Betrieb, Missbrauchsabwehr, Anzeige deiner eigenen Inhalte.</P>
      <P>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO): nur soweit du Inhalte über einen Share-Link bewusst öffentlich machst.</P>
      <H>4. Teilen von Setlists</H>
      <P>
        Wenn du eine Playlist freigibst, kann jede Person mit dem Link Titel, Artist, BPM, Notizen, Chart und Lyrics dieser Setlist sehen — ohne Login.
        Den Link solltest du nur an Menschen geben, die diese Daten sehen dürfen. Das Freigeben kannst du in der App wieder beenden.
      </P>
      <H>5. Empfänger / Auftragsverarbeitung</H>
      <P>Hosting der Web-App: Vercel Inc., USA. Abruf über {LEGAL.site}.</P>
      <P>Datenbank, Dateien und Login: Supabase (Postgres / Auth). Server können in der EU oder einem Drittland stehen; Übermittlungen erfolgen auf Grundlage von Standardvertragsklauseln, soweit erforderlich.</P>
      <P>Wir verkaufen keine Daten und schalten keine Werbung.</P>
      <H>6. Speicherdauer</H>
      <P>Kontodaten und App-Inhalte bleiben gespeichert, solange das Konto besteht bzw. die Band die Daten behält. Nach Löschung eines Songs, einer Band oder des Kontos entfernen wir die zugehörigen Datensätze, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Server-Logs werden vom Hoster üblich nach wenigen Tagen bis Wochen gelöscht.</P>
      <H>7. Deine Rechte</H>
      <P>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch gegen Verarbeitungen auf Basis berechtigten Interesses. Dafür reicht eine E-Mail an {LEGAL.email}.</P>
      <P>Außerdem hast du das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren. Zuständig ist in der Regel die Behörde deines Wohnsitzes in Deutschland.</P>
      <H>8. Pflichtangaben</H>
      <P>Ohne E-Mail und Passwort ist kein Konto möglich. Song- und Setlist-Inhalte sind freiwillig, ohne sie bleibt die App aber leer.</P>
      <H>9. Keine Tracking-Cookies</H>
      <P>Wir setzen kein Google Analytics, kein Meta-Pixel und keine Werbecookies. Ein Cookie-Banner ist deshalb derzeit nicht nötig. Ändert sich das, aktualisieren wir diese Erklärung.</P>
    </>
  );
}

export function LegalView({ page }) {
  const isPrivacy = page === "datenschutz";
  return (
    <div style={{ minHeight:"100vh", background:"#000", color:C.white, fontFamily:"'Raleway',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"28px 20px 48px" }}>
        <a href="." style={{ color:C.grayDim, fontSize:12, textDecoration:"none", letterSpacing:"0.08em", textTransform:"uppercase" }}>← Zurück</a>
        <div style={{ textAlign:"center", margin:"22px 0 8px" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><BrandWordmark size={34}/></div>
          <img src={getLogo()} alt="" style={{ width:72, height:"auto", opacity:0.9 }}/>
        </div>
        <div style={{ color:C.white, fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:"0.06em", textAlign:"center", marginBottom:6 }}>
          {isPrivacy ? "Datenschutz" : "Impressum"}
        </div>
        <SealLine/>
        {isPrivacy ? <Datenschutz/> : <Impressum/>}
        <div style={{ marginTop:28 }}><LegalLinks/></div>
      </div>
    </div>
  );
}
