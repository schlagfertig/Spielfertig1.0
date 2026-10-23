import { useState } from "react";
import { C, applyTheme, pageWash, dStyle } from "./core";
import { Btn, Field, SealLine, Badge, Modal, Toast, useIsNarrow } from "./ui";

// Klickbare Vorschau. Alles liegt nur im Speicher dieser Seite.
// Kein Aufruf der echten Datenbank, kein lokaler Speicher der App.

applyTheme("dark");

const VIEWERS = [
  { id: "besitzer", name: "Tom", short: "Besitzer" },
  { id: "lesen", name: "Mia", short: "Nur lesen" },
  { id: "bearbeiten", name: "Leo", short: "Bearbeiten" },
  { id: "verwalten", name: "Sam", short: "Verwalten" },
];

const ROLE_LABEL = {
  lesen: "Nur lesen",
  bearbeiten: "Bearbeiten",
  verwalten: "Verwalten",
};

const ROLE_HINT = {
  lesen: "Sieht Songs und Setlists, ändert nichts.",
  bearbeiten: "Ändert Songs und die Reihenfolge, löscht nichts.",
  verwalten: "Legt zusätzlich Gigs und Setlists an, löscht sie und lädt Leute ein.",
};

const STATUS = {
  besitzer: "Du bist Tom. Alles erlaubt, auch die Band löschen.",
  lesen: "Du bist Mia. Keine Knöpfe zum Ändern oder Löschen.",
  bearbeiten: "Du bist Leo. Ändern und sortieren ja, löschen nein.",
  verwalten: "Du bist Sam. Gigs, Löschen und Einladen sind frei.",
};

function capsOf(viewer) {
  const manage = viewer === "besitzer" || viewer === "verwalten";
  const edit = manage || viewer === "bearbeiten";
  return {
    edit,
    deleteSongs: manage,
    removeFromSet: manage,
    gigs: manage,
    team: manage,
  };
}

function seed() {
  return {
    nextId: 20,
    songs: [
      { id: 1, title: "Hafenlicht", artist: "Lina Beispiel", bpm: 118, duration: "3:42", drummer: "Tom" },
      { id: 2, title: "Nachtzug", artist: "Kai Probe", bpm: 96, duration: "4:10", drummer: "Tom" },
      { id: 3, title: "Sommerwind", artist: "Max Muster", bpm: 128, duration: "3:20", drummer: "Ron" },
      { id: 4, title: "Strandbar", artist: "Nico Probe", bpm: 110, duration: "3:55", drummer: "Tom" },
    ],
    gigs: [
      { id: 1, name: "Hafenfest (Beispiel)", date: "2026-11-14", songIds: [1, 2, 3] },
    ],
    members: [
      { id: "mia", name: "Mia", email: "mia@beispiel.test", role: "lesen" },
      { id: "leo", name: "Leo", email: "leo@beispiel.test", role: "bearbeiten" },
      { id: "sam", name: "Sam", email: "sam@beispiel.test", role: "verwalten" },
    ],
    invites: [
      { id: 1, email: "nina@beispiel.test", role: "lesen" },
    ],
  };
}

function readChoice(name, allowed, fallback) {
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    if (v && allowed.includes(v)) return v;
  } catch (_) {}
  return fallback;
}

function deDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

function roleColor(role) {
  if (role === "verwalten") return C.teal;
  if (role === "bearbeiten") return "#d4a843";
  return C.gray;
}

const iconBtn = {
  background: "transparent",
  border: "none",
  color: C.grayDim,
  cursor: "pointer",
  padding: "4px 6px",
  fontSize: 17,
  flexShrink: 0,
  fontFamily: "inherit",
};

function RolePick({ value, onChange, testPrefix }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Object.entries(ROLE_LABEL).map(([key, label]) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            data-testid={(testPrefix || "role") + "-" + key}
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              background: on ? C.teal : "transparent",
              color: on ? "#000" : C.gray,
              border: "1px solid " + (on ? C.teal : "#222"),
              borderRadius: 4,
              padding: "8px 4px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
              lineHeight: 1.25,
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}

function MockSong({ song, pos, showEdit, showDelete, extra, onEdit, onDelete }) {
  const st = dStyle(song.drummer);
  const [on, setOn] = useState(false);
  return (
    <div style={{ background: st.bg, border: "1px solid " + (on ? C.teal : st.border), borderRadius: 6, padding: "9px 10px", display: "flex", alignItems: "center", gap: 8 }}>
      {pos != null && <div style={{ color: C.grayDim, fontSize: 11, width: 16, textAlign: "right", flexShrink: 0, fontFamily: "'Space Mono',monospace" }}>{pos}</div>}
      <button type="button" onClick={() => setOn(v => !v)} title={song.bpm + " BPM"}
        style={{ background: "transparent", border: on ? "1px solid " + C.teal : "1px solid #3a454b", borderRadius: "50%", width: 32, height: 32, flexShrink: 0, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: on ? C.teal : C.grayDim }} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: C.white, fontSize: 15, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
        <div style={{ color: C.gray, fontSize: 12 }}>
          {song.artist}
          <span style={{ color: C.grayDim, fontFamily: "'Space Mono',monospace", fontSize: 11, marginLeft: 6 }}>{song.bpm} BPM</span>
          <span style={{ color: C.grayDim, fontFamily: "'Space Mono',monospace", fontSize: 11, marginLeft: 6 }}>{song.duration}</span>
        </div>
      </div>
      <Badge color={st.badge}>{song.drummer}</Badge>
      {extra}
      {showEdit && <button type="button" data-testid={"song-edit-" + song.id} onClick={() => onEdit(song)} style={iconBtn}>✎</button>}
      {showDelete && <button type="button" data-testid={"song-delete-" + song.id} onClick={() => onDelete(song)} style={{ ...iconBtn, color: C.grayDim }}>✕</button>}
    </div>
  );
}

function Ask({ msg, ok, onOk, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 12, padding: 22, maxWidth: 360, width: "100%" }}>
        <p style={{ color: C.white, fontSize: 14, fontWeight: 600, lineHeight: 1.45, marginBottom: 16 }}>{msg}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onCancel}>Abbrechen</Btn>
          <Btn variant="danger" onClick={onOk}>{ok}</Btn>
        </div>
      </div>
    </div>
  );
}

function RolesPreview() {
  const narrow = useIsNarrow();
  const [viewer, setViewer] = useState(() => readChoice("als", VIEWERS.map(v => v.id), "besitzer"));
  const [tab, setTab] = useState(() => readChoice("tab", ["songs", "setlist", "team"], "team"));
  const [data, setData] = useState(seed);
  const [openGig, setOpenGig] = useState(() => readChoice("folge", ["1"], "") === "1" ? 1 : null);
  const [orderOn, setOrderOn] = useState(() => readChoice("folge", ["1"], "") === "1");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("bearbeiten");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "", bpm: "" });
  const [edit, setEdit] = useState(null);
  const [ask, setAsk] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [gigName, setGigName] = useState("");
  const [gigDate, setGigDate] = useState("");
  const caps = capsOf(viewer);
  const me = VIEWERS.find(v => v.id === viewer);

  const ping = (msg) => setToast({ msg, type: "success" });
  const songsById = Object.fromEntries(data.songs.map(s => [s.id, s]));
  const gig = data.gigs.find(g => g.id === openGig) || null;

  const patch = (fn) => setData(prev => fn({ ...prev, songs: prev.songs.map(s => ({ ...s })), gigs: prev.gigs.map(g => ({ ...g, songIds: [...g.songIds] })), members: prev.members.map(m => ({ ...m })), invites: prev.invites.map(i => ({ ...i })) }));

  const sendInvite = () => {
    const addr = email.trim().toLowerCase();
    if (!addr || !addr.includes("@")) { setToast({ msg: "Das sieht nicht nach einer E-Mail aus.", type: "error" }); return; }
    if (data.invites.some(i => i.email === addr) || data.members.some(m => m.email === addr)) {
      setToast({ msg: "Die Adresse ist schon im Team oder eingeladen.", type: "error" });
      return;
    }
    patch(d => {
      d.invites.push({ id: d.nextId++, email: addr, role: inviteRole });
      return d;
    });
    setEmail("");
    ping("Einladung für " + addr + " als " + ROLE_LABEL[inviteRole] + ". Nur in der Vorschau.");
  };

  const bandSongs = [...data.songs].filter(s => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title, "de");
    if (sortBy === "artist") return a.artist.localeCompare(b.artist, "de");
    return a.id - b.id;
  });

  return (
    <div style={{ minHeight: "100vh", background: pageWash, color: C.white }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        button,input,select{font-family:inherit;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 60 }}>
      <div style={{ background: "#2a2416", borderBottom: "1px solid #d4a843" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: narrow ? "6px 12px 8px" : "8px 16px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: "#f4e7c3", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>Vorschau · noch nicht echt</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" data-testid="preview-reset" onClick={() => { setData(seed()); setOpenGig(null); setOrderOn(false); setEmail(""); setAddOpen(false); setEdit(null); ping("Beispiel ist wieder wie am Anfang."); }}
                style={{ background: "transparent", color: "#f4e7c3", border: "1px solid rgba(212,168,67,.5)", borderRadius: 4, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Zurücksetzen</button>
            </div>
          </div>
          <div style={{ color: "#e6d7b0", fontSize: 12, lineHeight: 1.35, margin: "4px 0 6px" }}>{STATUS[viewer]}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VIEWERS.map(v => {
              const on = viewer === v.id;
              return (
                <button key={v.id} type="button" data-testid={"viewer-" + v.id} onClick={() => setViewer(v.id)}
                  style={{
                    flex: "1 1 70px",
                    background: on ? "#d4a843" : "transparent",
                    color: on ? "#1a1408" : "#f4e7c3",
                    border: "1px solid " + (on ? "#d4a843" : "rgba(212,168,67,.45)"),
                    borderRadius: 4,
                    padding: "7px 4px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}>{v.short}</button>
              );
            })}
          </div>
        </div>
      </div>

      <header style={{ borderBottom: "1px solid #111", background: "rgba(0,0,0,.97)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: narrow ? "8px 12px 0" : "8px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Btn variant="outline" size="md" onClick={() => ping("In der echten App wärst du hier wieder bei den Bands.")} style={{ fontSize: narrow ? 18 : 20, padding: narrow ? "6px 10px" : "6px 18px", flexShrink: 0 }}>{narrow ? "←" : "← Zurück"}</Btn>
          {narrow && (
            <div style={{ flex: 1, minWidth: 0, color: C.white, fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Probenbande
            </div>
          )}
          <div style={{ marginLeft: narrow ? 0 : "auto", color: C.grayDim, fontSize: 11, flexShrink: 0 }}>{me.name}</div>
        </div>
        {!narrow && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px", textAlign: "center", color: C.white, fontFamily: "'Bebas Neue',cursive", fontSize: 26, letterSpacing: "0.06em", lineHeight: 1 }}>Probenbande</div>
        )}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 12px 10px", display: "flex", gap: 6 }}>
          {[{ key: "songs", label: "Songs" }, { key: "setlist", label: "Setlist" }, { key: "team", label: "Team" }].map(({ key, label }) => (
            <button key={key} type="button" data-testid={"tab-" + key} onClick={() => { setTab(key); setOpenGig(null); }}
              style={{ flex: 1, background: tab === key ? C.teal : "transparent", color: tab === key ? "#000" : C.gray, border: "1px solid " + (tab === key ? C.teal : "#222"), borderRadius: 4, padding: "8px 0", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>{label}</button>
          ))}
        </div>
        <SealLine color="#5cc8b8" />
      </header>
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: narrow ? "14px 12px 40px" : "20px 16px 48px" }}>
        {tab === "songs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["Tom", "Ron"].map(d => (
                <div key={d} style={{ flex: 1, background: C.bgCard, border: "1px solid #2f383d", borderRadius: 4, padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ color: d === "Ron" ? C.red : C.teal, fontSize: 20, fontWeight: 800, fontFamily: "'Space Mono',monospace" }}>{data.songs.filter(s => s.drummer === d).length}</div>
                  <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{d}</div>
                </div>
              ))}
              <div style={{ flex: 1, background: C.bgCard, border: "1px solid #2f383d", borderRadius: 4, padding: "8px 12px", textAlign: "center" }}>
                <div style={{ color: C.gray, fontSize: 20, fontWeight: 800, fontFamily: "'Space Mono',monospace" }}>{data.songs.length}</div>
                <div style={{ color: C.grayDim, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Songs</div>
              </div>
            </div>
            <Field value={search} onChange={setSearch} placeholder="Suchen…" />
            <div style={{ display: "flex", gap: 6 }}>
              {[{ k: "none", l: "Standard" }, { k: "title", l: "A–Z Titel" }, { k: "artist", l: "A–Z Interpret" }].map(({ k, l }) => (
                <button key={k} type="button" onClick={() => setSortBy(k)} style={{ flex: 1, background: sortBy === k ? C.teal : "transparent", color: sortBy === k ? "#000" : C.gray, border: "1px solid " + (sortBy === k ? C.teal : "#222"), borderRadius: 4, padding: "5px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            {caps.edit && (
              <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 6, padding: addOpen ? 15 : "10px 15px" }}>
                <button type="button" data-testid="add-song" onClick={() => setAddOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                  <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>+ Neuer Song</div>
                  <div style={{ color: C.teal, fontSize: 11, fontWeight: 700 }}>{addOpen ? "Einklappen ▲" : "Aufklappen ▼"}</div>
                </button>
                {addOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    <Field value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Titel *" />
                    <Field value={form.artist} onChange={v => setForm(f => ({ ...f, artist: v }))} placeholder="Artist *" />
                    <Field value={form.bpm} onChange={v => setForm(f => ({ ...f, bpm: v }))} placeholder="BPM *" type="number" />
                    <Btn full disabled={!form.title || !form.artist || !form.bpm} onClick={() => {
                      const bpm = parseInt(form.bpm, 10);
                      if (!bpm) return;
                      patch(d => {
                        d.songs.push({ id: d.nextId++, title: form.title.trim(), artist: form.artist.trim(), bpm, duration: "3:30", drummer: "Tom" });
                        return d;
                      });
                      setForm({ title: "", artist: "", bpm: "" });
                      setAddOpen(false);
                      ping("Song liegt in der Beispielband. Nur in der Vorschau.");
                    }}>Song hinzufügen</Btn>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {bandSongs.length === 0 && <div style={{ textAlign: "center", color: C.grayDim, padding: 32, fontSize: 13 }}>Keine Songs</div>}
              {bandSongs.map(song => (
                <MockSong key={song.id} song={song} showEdit={caps.edit} showDelete={caps.deleteSongs}
                  onEdit={s => setEdit({ ...s, bpm: String(s.bpm) })}
                  onDelete={s => setAsk({
                    msg: "„" + s.title + "“ wirklich löschen? Mit Nur-Ändern ginge das nicht.",
                    ok: "Löschen",
                    run: () => {
                      patch(d => {
                        d.songs = d.songs.filter(x => x.id !== s.id);
                        d.gigs.forEach(g => { g.songIds = g.songIds.filter(id => id !== s.id); });
                        return d;
                      });
                      ping("Song weg, nur in der Vorschau.");
                    },
                  })} />
              ))}
            </div>
          </div>
        )}

        {tab === "setlist" && !gig && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Setlists</div>
            <SealLine />
            {caps.gigs && (
              <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 6, padding: 14 }}>
                <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>+ Neue Setlist</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Field value={gigName} onChange={setGigName} placeholder="Gig-Name (Venue / Anlass)" />
                  <Field value={gigDate} onChange={setGigDate} type="date" />
                  <Btn full disabled={!gigName.trim()} onClick={() => {
                    const id = data.nextId;
                    const name = gigName.trim();
                    patch(d => {
                      d.nextId += 1;
                      d.gigs.unshift({ id, name, date: gigDate || "", songIds: [] });
                      return d;
                    });
                    setGigName("");
                    setGigDate("");
                    setOpenGig(id);
                    ping("Setlist angelegt. Nur in der Vorschau.");
                  }}>Setlist anlegen</Btn>
                </div>
              </div>
            )}
            {!caps.gigs && viewer === "bearbeiten" && (
              <div style={{ color: C.grayDim, fontSize: 12, lineHeight: 1.45 }}>Neue Gigs legt jemand mit Verwalten an. Du kannst eine vorhandene Setlist öffnen und die Reihenfolge ändern.</div>
            )}
            {!caps.gigs && viewer === "lesen" && (
              <div style={{ color: C.grayDim, fontSize: 12, lineHeight: 1.45 }}>Du kannst die Setlists öffnen und mitlesen.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.gigs.length === 0 && <div style={{ textAlign: "center", color: C.grayDim, padding: 28, fontSize: 13 }}>Noch keine Gigs.</div>}
              {data.gigs.map(g => (
                <div key={g.id} data-testid={"gig-" + g.id} onClick={() => { setOpenGig(g.id); setOrderOn(false); }}
                  style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 5, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: C.white, fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                    {g.date && <div style={{ color: C.grayDim, fontSize: 11 }}>{deDate(g.date)}</div>}
                    <div style={{ color: C.grayDim, fontSize: 11 }}>{g.songIds.length} Songs</div>
                  </div>
                  {caps.gigs && (
                    <div onClick={e => e.stopPropagation()}>
                      <Btn variant="danger" size="sm" data-testid={"gig-delete-" + g.id} onClick={() => setAsk({
                        msg: "Gig „" + g.name + "“ löschen? Das darf Verwalten, nicht Bearbeiten.",
                        ok: "Löschen",
                        run: () => {
                          patch(d => { d.gigs = d.gigs.filter(x => x.id !== g.id); return d; });
                          ping("Gig weg, nur in der Vorschau.");
                        },
                      })}>✕</Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "setlist" && gig && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => setOpenGig(null)}>← Gigs</Btn>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.white, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{gig.name}</div>
                <div style={{ color: C.grayDim, fontSize: 11 }}>{gig.songIds.length} Songs{orderOn ? " · Reihenfolge an" : ""}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {caps.edit && (
                <button type="button" data-testid="folge-toggle" onClick={() => setOrderOn(v => !v)}
                  style={{ flex: 1, background: orderOn ? C.teal : "rgba(92,200,184,0.12)", color: orderOn ? "#06120f" : C.teal, border: "1px solid " + (orderOn ? C.teal : "rgba(255,255,255,0.22)"), borderRadius: 12, padding: "8px 4px", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>
                  {orderOn ? "Fertig" : "Folge"}
                </button>
              )}
              <button type="button" onClick={() => ping("Drucken bleibt für alle. In der Vorschau kommt kein PDF.")}
                style={{ flex: 1, background: "rgba(92,200,184,0.12)", color: C.teal, border: "1px solid rgba(255,255,255,0.22)", borderRadius: 12, padding: "8px 4px", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>PDF</button>
              <button type="button" onClick={() => ping("Teilen bleibt erstmal für alle. In der Vorschau wird kein Link kopiert.")}
                style={{ flex: 1, background: "rgba(92,200,184,0.12)", color: C.teal, border: "1px solid rgba(255,255,255,0.22)", borderRadius: 12, padding: "8px 4px", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>Teilen</button>
            </div>
            <SealLine />
            {caps.edit && (
              <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 6, padding: 12 }}>
                <div style={{ color: C.teal, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Noch nicht im Set</div>
                {data.songs.filter(s => !gig.songIds.includes(s.id)).length === 0 && <div style={{ color: C.grayDim, fontSize: 12 }}>Alle Songs sind schon drin.</div>}
                {data.songs.filter(s => !gig.songIds.includes(s.id)).map(s => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 0" }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: C.white, fontSize: 13 }}>{s.title}</span>
                      <span style={{ color: C.grayDim, fontSize: 12 }}> · {s.artist}</span>
                    </div>
                    <Btn size="sm" data-testid={"add-to-set-" + s.id} onClick={() => {
                      patch(d => {
                        const g = d.gigs.find(x => x.id === gig.id);
                        if (g && !g.songIds.includes(s.id)) g.songIds.push(s.id);
                        return d;
                      });
                      ping(s.title + " ist im Set. Nur in der Vorschau.");
                    }}>+ dazu</Btn>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 6, padding: 12 }}>
              <div style={{ color: C.teal, fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Set 1</div>
              {gig.songIds.length === 0 && <div style={{ textAlign: "center", color: C.grayDim, padding: 18, fontSize: 13 }}>Noch leer.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {gig.songIds.map((id, index) => {
                  const song = songsById[id];
                  if (!song) return null;
                  return (
                    <MockSong key={id} song={song} pos={index + 1} showEdit={caps.edit} showDelete={caps.removeFromSet}
                      extra={orderOn && caps.edit ? (
                        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                          <button type="button" data-testid={"move-up-" + id} disabled={index === 0} onClick={() => patch(d => {
                            const g = d.gigs.find(x => x.id === gig.id);
                            if (!g || index === 0) return d;
                            const tmp = g.songIds[index - 1];
                            g.songIds[index - 1] = g.songIds[index];
                            g.songIds[index] = tmp;
                            return d;
                          })} style={{ ...iconBtn, fontSize: 12, padding: "0 4px", opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                          <button type="button" data-testid={"move-down-" + id} disabled={index === gig.songIds.length - 1} onClick={() => patch(d => {
                            const g = d.gigs.find(x => x.id === gig.id);
                            if (!g || index >= g.songIds.length - 1) return d;
                            const tmp = g.songIds[index + 1];
                            g.songIds[index + 1] = g.songIds[index];
                            g.songIds[index] = tmp;
                            return d;
                          })} style={{ ...iconBtn, fontSize: 12, padding: "0 4px", opacity: index === gig.songIds.length - 1 ? 0.3 : 1 }}>▼</button>
                        </div>
                      ) : null}
                      onEdit={s => setEdit({ ...s, bpm: String(s.bpm) })}
                      onDelete={() => setAsk({
                        msg: "„" + song.title + "“ aus dem Set nehmen? Der Song bleibt in der Liste. Bearbeiten darf das nicht.",
                        ok: "Raus",
                        run: () => {
                          patch(d => {
                            const g = d.gigs.find(x => x.id === gig.id);
                            if (g) g.songIds = g.songIds.filter(x => x !== id);
                            return d;
                          });
                          ping("Aus dem Set genommen. Nur in der Vorschau.");
                        },
                      })} />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Team</div>
            <SealLine />
            {caps.team ? (
              <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 6, padding: 12 }}>
                <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>+ Neue Einladung</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Field value={email} onChange={setEmail} placeholder="E-Mail-Adresse…" type="email" style={{ padding: "8px 12px" }} />
                  <RolePick value={inviteRole} onChange={setInviteRole} testPrefix="invite-role" />
                  <div style={{ color: C.grayDim, fontSize: 12, lineHeight: 1.35 }}>{ROLE_HINT[inviteRole]}</div>
                  <Btn disabled={!email.trim()} onClick={sendInvite}>Einladen</Btn>
                </div>
              </div>
            ) : (
              <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 6, padding: 14, color: C.gray, fontSize: 13, lineHeight: 1.5 }}>
                Einladen und Rollen ändern darf nur der Besitzer oder jemand mit Verwalten. Du siehst hier, wer dabei ist.
              </div>
            )}

            <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Dabei</div>
            <div style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 5, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <div style={{ color: C.white, fontSize: 14, fontWeight: 700 }}>Tom</div>
                <div style={{ color: C.grayDim, fontSize: 12 }}>tom@beispiel.test{viewer === "besitzer" ? " · das bist du" : ""}</div>
              </div>
              <Badge color={C.teal}>Besitzer</Badge>
            </div>
            {data.members.map(m => {
              const mine = (viewer === "lesen" && m.id === "mia") || (viewer === "bearbeiten" && m.id === "leo") || (viewer === "verwalten" && m.id === "sam");
              return (
                <div key={m.id} style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 5, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.white, fontSize: 14, fontWeight: 700 }}>{m.name}{mine ? " · das bist du" : ""}</div>
                      <div style={{ color: C.grayDim, fontSize: 12 }}>{m.email}</div>
                    </div>
                    {!caps.team && <Badge color={roleColor(m.role)}>{ROLE_LABEL[m.role]}</Badge>}
                  </div>
                  {caps.team && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                      <select data-testid={"member-role-" + m.id} value={m.role} onChange={e => {
                        const role = e.target.value;
                        patch(d => {
                          const row = d.members.find(x => x.id === m.id);
                          if (row) row.role = role;
                          return d;
                        });
                        ping(m.name + " ist jetzt " + ROLE_LABEL[role] + ". Nur in der Vorschau.");
                      }} style={{ flex: 1, background: "#161a1d", border: "1px solid #3a454b", color: C.white, borderRadius: 6, padding: "10px 12px", fontSize: 14 }}>
                        <option value="lesen">Nur lesen</option>
                        <option value="bearbeiten">Bearbeiten</option>
                        <option value="verwalten">Verwalten</option>
                      </select>
                      {!mine && (
                        <Btn variant="danger" size="sm" data-testid={"member-remove-" + m.id} onClick={() => setAsk({
                          msg: m.name + " aus dem Team nehmen? Die Songs bleiben.",
                          ok: "Raus",
                          run: () => {
                            patch(d => { d.members = d.members.filter(x => x.id !== m.id); return d; });
                            ping(m.name + " ist raus. Nur in der Vorschau.");
                          },
                        })}>Raus</Btn>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Wartet auf Anmeldung</div>
            {data.invites.length === 0 && <div style={{ textAlign: "center", color: C.grayDim, padding: 18, fontSize: 13 }}>Keine offenen Einladungen</div>}
            {data.invites.map(inv => (
              <div key={inv.id} style={{ background: C.bgCard, border: "1px solid #2f383d", borderRadius: 5, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ color: C.white, fontSize: 14, wordBreak: "break-all" }}>{inv.email}</div>
                  {caps.team ? (
                    <Btn variant="danger" size="sm" data-testid={"invite-revoke-" + inv.id} onClick={() => {
                      patch(d => { d.invites = d.invites.filter(x => x.id !== inv.id); return d; });
                      ping("Einladung zurückgezogen. Nur in der Vorschau.");
                    }}>✕</Btn>
                  ) : <Badge color={roleColor(inv.role)}>{ROLE_LABEL[inv.role]}</Badge>}
                </div>
                {caps.team && (
                  <div style={{ marginTop: 10 }}>
                    <select data-testid={"invite-change-" + inv.id} value={inv.role} onChange={e => {
                      const role = e.target.value;
                      patch(d => {
                        const row = d.invites.find(x => x.id === inv.id);
                        if (row) row.role = role;
                        return d;
                      });
                      ping("Einladung ist jetzt " + ROLE_LABEL[role] + ". Nur in der Vorschau.");
                    }} style={{ width: "100%", background: "#161a1d", border: "1px solid #3a454b", color: C.white, borderRadius: 6, padding: "10px 12px", fontSize: 14 }}>
                      <option value="lesen">Nur lesen</option>
                      <option value="bearbeiten">Bearbeiten</option>
                      <option value="verwalten">Verwalten</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
            <div style={{ color: C.grayDim, fontSize: 11, lineHeight: 1.45 }}>
              Namen sind erfunden. In echt sehen wir vorerst die E-Mail, weil die App keinen Anzeigenamen speichert.
            </div>
          </div>
        )}
      </main>

      {edit && (
        <Modal title="Song bearbeiten" onClose={() => setEdit(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Field value={edit.title} onChange={v => setEdit(s => ({ ...s, title: v }))} placeholder="Titel" />
            <Field value={edit.artist} onChange={v => setEdit(s => ({ ...s, artist: v }))} placeholder="Artist" />
            <Field value={edit.bpm} onChange={v => setEdit(s => ({ ...s, bpm: v }))} placeholder="BPM" type="number" />
            <Btn full onClick={() => {
              const bpm = parseInt(edit.bpm, 10);
              if (!edit.title.trim() || !bpm) return;
              patch(d => {
                const row = d.songs.find(s => s.id === edit.id);
                if (row) { row.title = edit.title.trim(); row.artist = edit.artist.trim(); row.bpm = bpm; }
                return d;
              });
              setEdit(null);
              ping("Song gespeichert. Nur in der Vorschau.");
            }}>Speichern</Btn>
          </div>
        </Modal>
      )}
      {ask && <Ask msg={ask.msg} ok={ask.ok} onOk={() => { ask.run(); setAsk(null); }} onCancel={() => setAsk(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export { RolesPreview };
