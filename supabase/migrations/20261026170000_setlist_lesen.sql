-- Setlists im eigenen Konto wieder lesen.
-- Noch nicht auf dem echten Projekt ausführen.
-- Tom sagt erst ja, dann diese Datei einmal im Ganzen im SQL-Fenster.
-- Zweimal laufen lassen ist ungefährlich. Es ändert keine Zeile.
--
-- Die Rollen-Datei hat playlists_owner und playlist_songs_owner gelöscht.
-- Eine eigene own_-Regel für diese Tabellen gab es nicht.
-- Lesen ging danach nur noch für Team-Mitglieder (band_members)
-- und für Gäste bei bewusst geteilten Setlists.
-- Der Besitzer steht nicht in band_members. Für ihn kamen Setlists
-- und die Songs darin leer zurück, obwohl die Zeilen noch da sind.
-- Anlegen ist mit Rückgabe der neuen Zeile ebenfalls gescheitert,
-- deshalb konnte der Import die Songs in den Sets nicht speichern.
--
-- Diese zwei Regeln geben angemeldeten Besitzern und dem Team das Lesen zurück.
-- Schreiben bleibt bei den bestehenden sf_-Regeln.
-- Gäste sehen weiter nur geteilte Setlists.

DROP POLICY IF EXISTS sf_playlists_select ON public.playlists;
CREATE POLICY sf_playlists_select ON public.playlists
  FOR SELECT TO authenticated
  USING (public.band_rank(public.gig_band(gig_id)) >= 1);

DROP POLICY IF EXISTS sf_playlist_songs_select ON public.playlist_songs;
CREATE POLICY sf_playlist_songs_select ON public.playlist_songs
  FOR SELECT TO authenticated
  USING (public.band_rank(public.playlist_band(playlist_id)) >= 1);
