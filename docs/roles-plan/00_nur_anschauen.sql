-- Schlagfertig Live · Rollen
-- SCHRITT 0, nur anschauen.
-- Das hier ändert nichts. Kein insert, kein update, kein drop.
-- Im Supabase-Fenster „SQL“ den ganzen Text auf einmal ausführen
-- und das Ergebnis behalten. Damit prüfen wir den Entwurf in 01_rollen.sql,
-- bevor irgendwer ihn laufen lässt.

-- Welche Tabellen gibt es überhaupt?
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'bands', 'songs', 'gigs', 'playlists', 'playlist_songs', 'invites', 'band_members'
  )
order by table_name;

-- Spalten und Typen. Darauf muss 01_rollen.sql passen.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'bands', 'songs', 'gigs', 'playlists', 'playlist_songs', 'invites', 'band_members'
  )
order by table_name, ordinal_position;

-- Regeln, die schon da sind. Wenn hier Zeilen stehen, 01_rollen.sql bricht
-- absichtlich ab, bis jemand diese Namen gelesen hat.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'bands', 'songs', 'gigs', 'playlists', 'playlist_songs', 'invites', 'band_members'
  )
order by tablename, policyname;

-- Ist der Zeilenschutz schon an?
select c.relname as table_name, c.relrowsecurity as regeln_an, c.relforcerowsecurity as auch_fuer_besitzer
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'bands', 'songs', 'gigs', 'playlists', 'playlist_songs', 'invites', 'band_members'
  )
order by c.relname;

-- Alte Prüfregeln (Checks), vor allem an der Spalte role.
select t.relname as table_name, c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname in ('band_members', 'invites')
  and c.contype = 'c'
order by t.relname, c.conname;

-- Gibt es die Spalte role schon? 1 = ja, 0 = nein.
-- Wenn ja, die auskommentierte Zählung ganz unten einmal extra laufen lassen.
-- Die zeigt nur das Rollen-Wort und die Anzahl, keine Namen und keine Mails.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'band_members' and column_name = 'role'
  ) as mitglieder_haben_role;

-- Gibt es die Rollen-Spalte bei Einladungen schon?
-- Wenn nein, ist das in Ordnung. Die Werte selbst zählen wir dann nicht,
-- damit diese Datei nicht mitten drin abbricht.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'role'
  ) as invites_haben_role,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'playlists' and column_name = 'is_shared'
  ) as playlists_haben_is_shared;

-- Doppelte Mitgliedszeilen würden den Entwurf stoppen.
select band_id, user_id, count(*) as anzahl
from public.band_members
group by band_id, user_id
having count(*) > 1;

-- Wer darf die Tabellen schon lesen und schreiben?
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'bands', 'songs', 'gigs', 'playlists', 'playlist_songs', 'invites', 'band_members'
  )
  and grantee in ('anon', 'authenticated', 'service_role', 'public')
order by table_name, grantee, privilege_type;

-- Nur wenn mitglieder_haben_role oben 1 ist. Sonst weglassen.
-- select coalesce(role, '(leer)') as role, count(*) as anzahl
-- from public.band_members
-- group by role
-- order by anzahl desc;
