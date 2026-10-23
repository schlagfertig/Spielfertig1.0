# Rollen im Team

Das hier ist ein Plan und eine klickbare Vorschau. Es ist noch nicht scharf. Es wird nichts hochgeladen und nichts an deinen echten Songs geändert.

## Was du dir anschauen kannst

Die Vorschau öffnest du lokal so: `npm run dev`, dann im Browser

`http://127.0.0.1:5173/?vorschau=rollen`

Oben der goldene Balken ist nur die Vorschau. Damit schaltest du um, wen du gerade spielst:

- Besitzer, das bist du
- Nur lesen, Mia
- Bearbeiten, Leo
- Verwalten, Sam

Die Band heißt Probenbande. Die Leute und Songs sind erfunden. Die Seite merkt sich nichts und ruft deine Datenbank nicht an. Zurücksetzen holt das Beispiel wieder.

Direkt zu einer Ansicht:

- Team, du lädst ein: `/?vorschau=rollen&als=besitzer&tab=team`
- Mia, nur schauen: `/?vorschau=rollen&als=lesen&tab=songs`
- Leo, ändern aber nicht löschen: `/?vorschau=rollen&als=bearbeiten&tab=songs`
- Leo in der Setlist, Reihenfolge: `/?vorschau=rollen&als=bearbeiten&tab=setlist&folge=1`

## Was sich für dich und die Band ändert

Heute gibt es praktisch nur dich. Wer die Band angelegt hat, sieht die Knöpfe. Alle anderen sehen den Satz „Nur der Band-Owner kann Mitglieder verwalten“ und können am Team nichts machen. Songs und Setlists hängen an demselben Schalter: entweder alles, oder gar keine Änderknöpfe.

Danach hat jede eingeladene Person eine von drei Rollen. Du wählst die Rolle schon beim Einladen und kannst sie später umstellen oder die Person rausnehmen.

Nur lesen sieht Songs und Setlists, auch den Gig-Modus, Drucken und Teilen. Kein Stift, kein Löschen, kein Umsortieren, kein Einladen.

Bearbeiten darf Songs anlegen und ändern, Songs in eine vorhandene Setlist legen und die Reihenfolge ändern. Wegwerfen geht nicht: kein Song löschen, kein Gig löschen, keine Setlist löschen, niemanden einladen.

Verwalten darf dasselbe wie Bearbeiten und zusätzlich Gigs und Setlists anlegen und löschen, Songs löschen, Leute einladen und Rollen ändern. Die Band selbst löschen darfst weiter nur du.

Du bleibst Besitzer. Dich kann niemand herabstufen oder rauswerfen.

## Was die App heute wirklich tut

Die Anmeldung ist im Code noch da, aber die laufende App benutzt sie nicht. Beim Öffnen schaltet sie auf „nur dieses Gerät“. Songs liegen dann im Browser, nicht in der gemeinsamen Datenbank. Einladen schreibt deshalb heute auch nur auf dieses Gerät, und niemand sonst tritt der Band bei.

Im Code ist der Weg trotzdem schon skizziert, für den Fall dass die Anmeldung wieder an ist:

1. Du trägst im Tab Team eine E-Mail ein. Die App speichert eine Zeile in `invites` mit Band und E-Mail. Eine Rolle gibt es dabei nicht.
2. Die Person meldet sich mit genau dieser E-Mail an.
3. Die App sucht Einladungen für diese E-Mail, schreibt eine Zeile in `band_members` mit der Rolle `member` und löscht die Einladung.
4. Ob jemand etwas ändern darf, schaut die App nur lokal an: ist die Band von dieser Person angelegt (`bands.user_id` gleich die eigene Nummer), dann ja. Die Zeile in `band_members` liest die Oberfläche heute nirgends.

Die Regeln in der Datenbank, die das serverseitig erzwingen würden, liegen nicht in diesem Projekt. Die kann man von hier aus nicht sehen. Ohne die Regeln könnte jemand die App austricksen und trotzdem löschen, sobald die Anmeldung wieder an ist. Deshalb gehört die Datenbank mit in den Bau, nicht nur die Knöpfe.

Welche Spalten der Code heute anfasst:

- `bands`: Name, Farbe, Emoji, Drummer, `user_id`
- `songs`: Band, Titel, Artist, Tempo, Dauer, Takt, Drummer, Notizen, Text
- `gigs`: Band, Name, Datum
- `playlists`: Gig, Name, und ein Schalter `is_shared` beim Teilen
- `playlist_songs`: Playlist, Song, Set, Position
- `invites`: Band, E-Mail
- `band_members`: Band, Person, Rolle (heute immer das Wort `member`)

Ob die Nummern Zahlen oder lange Kennungen sind, steht nur in der echten Datenbank. Der Entwurf prüft das und bricht ab, wenn es nicht zusammenpasst.

## Schritte, wenn wir es echt bauen

1. Du lässt `docs/roles-plan/00_nur_anschauen.sql` in Supabase laufen. Das ändert nichts. Das Ergebnis schickst du rüber, oder jemand mit Zugang schaut es sich an.
2. Wir gleichen den Entwurf `01_rollen.sql` mit diesem Ergebnis ab. Vor allem: gibt es schon Regeln, und welches Wort steht in der Rolle.
3. Erst wenn du ja sagst, läuft `01_rollen.sql` einmal im Ganzen. Nicht zeilenweise. Vorher ein Backup in Supabase.
4. Danach erst die Oberfläche: Rollenwahl beim Einladen, Liste mit Rolle ändern und Raus, Knöpfe je nach Rolle ausblenden. Dieselbe Aufteilung wie in der Vorschau.
5. Die Anmeldung muss dafür wieder an sein. Sonst gibt es keine echten Mitglieder, nur das eine Gerät. Das ist ein eigener Schritt und sollte mit den Rollen zusammen kommen, nicht irgendwann später still.
6. Mit einem zweiten Konto gegenprüfen: Nur lesen kann nichts ändern, Bearbeiten kann ändern aber nicht löschen, Verwalten kann einladen. Teilen-Link einer Setlist geht weiter für Leute ohne Konto.

## Was der Datenbank-Entwurf macht

Den Text habe ich an einer leeren Übungs-Datenbank auf diesem Rechner durchgespielt, nicht an deiner. Dort waren die Nummern normale Zahlen, die Besitzer-Nummer eine lange Kennung, und die Teilen-Spalte war ja/nein. Hat sich so verhalten wie hier beschrieben: Nur lesen kommt nicht an die Daten, Bearbeiten ändert und sortiert, löscht aber nicht, Verwalten legt Gigs an, die Band löschen bleibt bei dir, ein Teilen-Link zeigt nur die geteilte Setlist. Deine echte Datenbank kann anders aussehen. Deshalb bleibt Schritt 0 Pflicht, und der Entwurf bricht ab, wenn etwas nicht passt.

Keine neue Tabelle. Die Rolle kommt als Spalte an die Mitglieder und an die Einladungen. Drei Wörter: `lesen`, `bearbeiten`, `verwalten`. Du als Besitzer stehst nicht in dieser Liste, du stehst an der Band.

Leute, die schon drin sind und noch `member` oder gar nichts stehen haben, werden auf Nur lesen gesetzt. Unbekannte Wörter stoppen den Entwurf, damit nichts versehentlich umgebogen wird.

Beim Annehmen einer Einladung setzt die Datenbank die Rolle aus der Einladung. Auch wenn die alte App noch `member` schickt. Die Person kann sich nicht selbst höher stufen.

Die Zeilenregeln sagen ungefähr:

- ab Nur lesen: Songs, Gigs, Setlists und das Team der eigenen Band sehen
- ab Bearbeiten: Songs ändern und anlegen, Songs in die Setlist legen und umsortieren
- ab Verwalten: löschen, Gigs und Setlists anlegen und löschen, einladen, Rollen ändern
- nur du: Band ändern oder die Band löschen
- jemand ohne Konto: nur eine Setlist, die du auf Teilen gestellt hast

Ab dem 30.10.2026 zeigt Supabase neue Tabellen nicht mehr von selbst über die Schnittstelle. Hier kommt keine neue Tabelle dazu, deshalb gibt es auch keine neue Freigabe. Unten in `01_rollen.sql` steht auskommentiert, welche drei Freigaben nötig wären, falls später doch eine Tabelle dazukommt: lesen für Gäste, lesen und schreiben für angemeldete Leute und für den Service-Zugang. Gäste bekommen nie das Recht zu schreiben. Was sie lesen dürfen, begrenzen die Zeilenregeln.

## Risiken

Bestehende Mitglieder landen auf Nur lesen. Wenn jemand schon mitmachen und ändern können soll, musst du die Rolle danach einmal hochsetzen. Solange die Anmeldung aus ist, merkt das in der laufenden App niemand.

Wenn in Supabase schon eigene Regeln liegen, bricht der Entwurf ab und fasst sie nicht an. Die müssen wir erst sehen. Sonst könnte eine alte Regel „jeder darf alles“ die neuen Regeln aushebeln, weil mehrere Erlauben-Regeln sich addieren.

Wenn `playlists.is_shared` fehlt, bleiben anonyme Teilen-Links über die Datenbank zu. Der Link, der die Setlist im Adress-Anhang mitschickt, geht weiter. Ob die Spalte da ist, sagt Schritt 0.

Die Bandzeile, die ein Teilen-Link mitlädt, enthält auch deine interne Nummer. Kein Passwort, aber mehr als nur der Bandname. Eine spätere Enger-Fassung kann das abschneiden. Dafür bräuchte es eine eigene Tabelle oder Sicht, und die müsste die Freigaben von oben gleich mitbekommen.

Löschen eines Songs kann an der Datenbank scheitern, wenn die Setlist den Song noch festhält und eine Verknüpfung das verbietet. Das sieht man erst an der echten Datenbank. Die App löscht heute den Song, ohne ihn vorher aus den Setlists zu nehmen.

Ein zweites Mal beitreten, während die Einladung noch da ist, kann hängen bleiben: die Person ist schon Mitglied, die Einladung bleibt liegen. Das muss die App beim echten Bau abfangen.

Die Vorschau und dieser Text ändern die echte App nicht, außer einer kaputten Zeile in der Songliste (siehe unten). Nichts wird deployed.

## Nebenbei

In `src/songRow.jsx` stand seit dem 18. Oktober ein kaputter Import. Damit startet die Songliste nicht. Die eine Zeile ist wieder die richtige. Ohne den Fix lässt sich die Vorschau in der App nicht öffnen, und die echte Songliste wäre auch weiter kaputt.

## Was ich von dir brauche

Entweder Zugang zu Supabase, nur zum Lesen für Schritt 0 und später einmal zum Einfügen des Entwurfs. Oder du lässt `00_nur_anschauen.sql` selbst laufen und schickst die Ergebnisse. Den Entwurf `01_rollen.sql` bitte nicht allein einfügen, bevor die offenen Punkte unten geklärt sind und jemand das Ergebnis von Schritt 0 daneben gelegt hat.

Ein Backup in Supabase, bevor der Entwurf wirklich läuft.

Die Entscheidung zu den offenen Punkten, vor allem: bestehende Leute wirklich auf Nur lesen, oder doch auf Bearbeiten.

## Offene Punkte

1. Bestehende Mitglieder auf Nur lesen, oder alle auf Bearbeiten, damit niemand plötzlich nichts mehr ändern kann?
2. Darf Bearbeiten einen Song aus der Setlist nehmen, obwohl der Song selbst stehen bleibt? Im Vorschlag nein, das zählt als Löschen. Umsortieren und dazu legen ja.
3. Darf Bearbeiten neue Songs anlegen, oder nur vorhandene ändern? Im Vorschlag ja, anlegen ist erlaubt.
4. Darf Verwalten Songs löschen, oder nur Gigs und Setlists? Im Vorschlag ja, Songs auch.
5. Darf Verwalten andere mit Verwalten rauswerfen, oder nur du? Im Vorschlag darf Verwalten das.
6. Darf jemand die Band selbst verlassen? Im Vorschlag ja, die eigene Zeile löschen. Dich trifft das nicht.
7. Sieht Nur lesen die Teamliste? Im Vorschlag ja, nur lesen, ohne Knöpfe.
8. Teilen, Drucken und Gig-Modus für alle, die die Setlist sehen dürfen? Im Vorschlag ja. Den Schalter „geteilt“ in der Datenbank darf im Entwurf nur Verwalten setzen, weil die Datenbank eine Zeile nicht feiner aufteilen kann. Wenn Nur lesen den Link erzeugen können soll, braucht es dafür eine kleine Extra-Tür. Heute ist der Teilen-Knopf für jeden sichtbar, der die Setlist öffnet.
9. Soll die Anmeldung zusammen mit den Rollen wieder an, oder bleiben wir erstmal auf „nur dieses Gerät“? Ohne Anmeldung gibt es keine echten Rollen.
10. Namen in der Teamliste: die App speichert keinen Anzeigenamen. Echt sehen wir erst die E-Mail. Reicht das?
