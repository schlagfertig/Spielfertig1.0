-- Konto in der App löschen.
-- Noch nicht auf dem echten Projekt ausführen.
-- Nach dem Merge diese Datei einmal im Ganzen im SQL-Fenster laufen lassen.
--
-- Die Anmeldung (GoTrue v2.197) hat kein Selbst-Löschen.
-- Unter /auth/v1/user gibt es nur Lesen und Ändern.
-- Löschen geht dort nur mit dem geheimen Admin-Schlüssel, und der darf nicht in die App.
-- Deshalb prüft diese Funktion die Anmeldung selbst (auth.uid()) und löscht nur dieses Konto.
-- Kein Parameter, damit niemand eine fremde Nummer schicken kann.
--
-- Die eigentliche Arbeit liegt im Schema private, nicht in der öffentlichen Schnittstelle.
-- Die öffentliche Funktion reicht den Aufruf nur weiter und hat selbst keine Extrarechte.
-- Ab 30.10.2026 brauchen neue öffentliche Funktionen eine ausdrückliche Freigabe.
-- Gäste (anon) bekommen sie nicht. Angemeldete und der Service-Zugang schon.
--
-- Geprüft am laufenden Projekt, ohne Zeilen zu ändern:
-- bands, songs, gigs, playlists, playlist_songs, band_members, invites.
-- bands.user_id und band_members.user_id sind uuid.
-- Verknüpfungen: Band → Songs, Gigs, Mitglieder, Einladungen;
-- Gig → Playlists; Playlist und Song → playlist_songs.
-- Keine weitere öffentliche Tabelle, kein Speicher-Ordner.
-- Ob die Verknüpfungen mitlöschen, ist nicht sicher. Deshalb erst die abhängigen Zeilen, dann die Band.
-- Bands von anderen bleiben. Nur die Mitgliedschaft und offene Einladungen an die eigene Mail gehen weg.
-- Alles in einem Rutsch: scheitert das Löschen der Anmeldung, bleiben die Daten stehen.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, authenticated, service_role;

create or replace function private.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mail text;
begin
  if uid is null then
    raise exception 'nicht angemeldet';
  end if;

  -- Der Besitzer dieser Funktion (normalerweise postgres) geht an den Zeilenregeln vorbei.
  -- Sonst könnte eine Regel die eigenen Bands verstecken und die Anmeldung trotzdem weg sein.
  if not exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = current_user
      and rolbypassrls
  ) then
    raise exception 'nicht freigeschaltet';
  end if;

  select lower(coalesce(u.email, auth.jwt() ->> 'email', ''))
    into mail
  from auth.users as u
  where u.id = uid;

  delete from public.playlist_songs as ps
  using public.playlists as p, public.gigs as g, public.bands as b
  where ps.playlist_id = p.id
    and p.gig_id = g.id
    and g.band_id = b.id
    and b.user_id = uid;

  delete from public.playlist_songs as ps
  using public.songs as s, public.bands as b
  where ps.song_id = s.id
    and s.band_id = b.id
    and b.user_id = uid;

  delete from public.playlists as p
  using public.gigs as g, public.bands as b
  where p.gig_id = g.id
    and g.band_id = b.id
    and b.user_id = uid;

  delete from public.gigs as g
  using public.bands as b
  where g.band_id = b.id
    and b.user_id = uid;

  delete from public.songs as s
  using public.bands as b
  where s.band_id = b.id
    and b.user_id = uid;

  delete from public.invites as i
  using public.bands as b
  where i.band_id = b.id
    and b.user_id = uid;

  delete from public.band_members as m
  using public.bands as b
  where m.band_id = b.id
    and b.user_id = uid;

  delete from public.bands
  where user_id = uid;

  delete from public.band_members
  where user_id = uid;

  if mail is not null and mail <> '' then
    delete from public.invites
    where lower(email) = mail;
  end if;

  delete from auth.users
  where id = uid;
end;
$$;

revoke all on function private.delete_own_account() from public;
revoke all on function private.delete_own_account() from anon;
grant execute on function private.delete_own_account() to authenticated, service_role;

create or replace function public.delete_own_account()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.delete_own_account();
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated, service_role;

notify pgrst, 'reload schema';
