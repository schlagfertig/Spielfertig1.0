-- Schlagfertig Live · Rollen
-- ENTWURF. Nicht ausführen, bevor 00_nur_anschauen.sql gelesen ist
-- und die offenen Punkte in PLAN.md geklärt sind.
--
-- Nicht zeilenweise klicken. Den ganzen Text auf einmal ins SQL-Fenster.
-- Alles läuft in einer Transaktion: bei einem Fehler wird nichts gespeichert,
-- sofern das Fenster die Transaktion nicht zwischendurch selbst festschreibt.
--
-- Dieser Entwurf legt KEINE neue Tabelle an.
-- Ab 30.10.2026 blendet Supabase neue Tabellen in public nicht mehr
-- automatisch für die Schnittstelle frei. Weil hier keine neue Tabelle
-- entsteht, braucht es dafür auch keine neuen Freigaben.
-- Ganz unten steht als Kommentar, welche Freigaben nötig wären,
-- falls später doch eine Tabelle dazukommt.
--
-- PRÜFEN vor dem Lauf (Schritt 0 zeigt es):
--   * Tabellen bands, songs, gigs, playlists, playlist_songs, invites, band_members
--   * bands.user_id und band_members.user_id sind uuid oder text, und beide gleich
--   * die id-Spalten und die *_id-Spalten passen zueinander (Zahl zu Zahl, oder uuid zu uuid)
--   * band_members.role ist Text oder fehlt noch. Die App schreibt heute das Wort member.
--   * invites.email gibt es
--   * playlists.is_shared ist ja/nein oder fehlt. Fehlt sie, können anonyme Teilen-Links
--     über die Schnittstelle nichts mehr lesen. Der Link mit den Daten im Anhang
--     (der Teil hinter # in der Adresse) geht weiter, der braucht die Datenbank nicht.
--   * es gibt noch keine fremden Zeilenregeln, oder ihr habt sie vorher entfernt.
--     Der Entwurf bricht ab, wenn fremde Regeln existieren, und löscht sie nicht.

begin;

-- Fremde Regeln? Dann sofort stoppen, bevor irgendwas geändert wird.
do $fremd$
declare
  extra text;
begin
  select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
    into extra
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'bands', 'songs', 'gigs', 'playlists', 'playlist_songs', 'invites', 'band_members'
    )
    and policyname not like 'sf_%';

  if extra is not null then
    raise exception
      'Stopp, nichts geändert. Es gibt schon andere Zeilenregeln: %. Erst 00_nur_anschauen.sql ansehen. Diese Regeln nicht blind löschen.',
      extra;
  end if;
end
$fremd$;

-- Unsere eigenen Regeln weg, damit man den Entwurf erneut laufen lassen kann.
drop policy if exists sf_bands_select on public.bands;
drop policy if exists sf_bands_select_member on public.bands;
drop policy if exists sf_bands_select_shared on public.bands;
drop policy if exists sf_bands_insert on public.bands;
drop policy if exists sf_bands_update on public.bands;
drop policy if exists sf_bands_delete on public.bands;
drop policy if exists sf_songs_select on public.songs;
drop policy if exists sf_songs_select_member on public.songs;
drop policy if exists sf_songs_select_shared on public.songs;
drop policy if exists sf_songs_insert on public.songs;
drop policy if exists sf_songs_update on public.songs;
drop policy if exists sf_songs_delete on public.songs;
drop policy if exists sf_gigs_select on public.gigs;
drop policy if exists sf_gigs_select_member on public.gigs;
drop policy if exists sf_gigs_select_shared on public.gigs;
drop policy if exists sf_gigs_insert on public.gigs;
drop policy if exists sf_gigs_update on public.gigs;
drop policy if exists sf_gigs_delete on public.gigs;
drop policy if exists sf_playlists_select on public.playlists;
drop policy if exists sf_playlists_select_member on public.playlists;
drop policy if exists sf_playlists_select_shared on public.playlists;
drop policy if exists sf_playlists_insert on public.playlists;
drop policy if exists sf_playlists_update on public.playlists;
drop policy if exists sf_playlists_delete on public.playlists;
drop policy if exists sf_playlist_songs_select on public.playlist_songs;
drop policy if exists sf_playlist_songs_select_member on public.playlist_songs;
drop policy if exists sf_playlist_songs_select_shared on public.playlist_songs;
drop policy if exists sf_playlist_songs_insert on public.playlist_songs;
drop policy if exists sf_playlist_songs_update on public.playlist_songs;
drop policy if exists sf_playlist_songs_delete on public.playlist_songs;
drop policy if exists sf_invites_select on public.invites;
drop policy if exists sf_invites_insert on public.invites;
drop policy if exists sf_invites_update on public.invites;
drop policy if exists sf_invites_delete on public.invites;
drop policy if exists sf_members_select on public.band_members;
drop policy if exists sf_members_insert on public.band_members;
drop policy if exists sf_members_update on public.band_members;
drop policy if exists sf_members_delete on public.band_members;

-- Auslöser zuerst weg, sonst lässt sich die Hilfe darunter nicht ersetzen.
drop trigger if exists sf_band_member_before_write on public.band_members;

-- Alte Hilfen mit möglicherweise falscher Typ-Signatur entfernen.
-- Die Regeln, die daran hingen, sind oben schon weg.
do $dropfn$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'sf_band_rank', 'sf_gig_rank', 'sf_playlist_rank', 'sf_is_me',
        'sf_playlist_is_shared', 'sf_song_is_shared', 'sf_gig_is_shared', 'sf_band_is_shared',
        'sf_song_matches_playlist', 'sf_band_member_before_write'
      )
  loop
    execute format('drop function if exists public.%I(%s)', r.proname, r.args);
  end loop;
end
$dropfn$;

-- Spalten: Rolle an Mitgliedern und Einladungen, E-Mail am Mitglied
-- damit die Teamliste später eine Adresse zeigen kann.
-- PRÜFEN: falls role schon existiert und kein Text ist, bricht es unten ab.
alter table public.band_members add column if not exists role text;
alter table public.band_members add column if not exists email text;
alter table public.invites add column if not exists role text;

-- Bestehende Mitglieder auf "Nur lesen".
-- PRÜFEN: das ist die bewusste Vorgabe aus dem Plan, nicht aus dem echten Leben geraten.
-- member ist das Wort, das die App heute beim Beitritt schreibt.
update public.band_members
set role = 'lesen'
where role is null
   or btrim(role) = ''
   or lower(btrim(role)) in ('member', 'mitglied', 'read', 'viewer', 'lesen');

update public.invites
set role = 'lesen'
where role is null
   or btrim(role) = ''
   or lower(btrim(role)) in ('member', 'mitglied', 'read', 'viewer', 'lesen');

do $rollenwerte$
declare
  fremd text;
  role_typ text;
begin
  select udt_name into role_typ
  from information_schema.columns
  where table_schema = 'public' and table_name = 'band_members' and column_name = 'role';

  if role_typ is null or role_typ not in ('text', 'varchar', 'bpchar') then
    raise exception 'band_members.role ist %, erwartet ist Text. Entwurf anpassen, nichts weiter ändern.', coalesce(role_typ, 'nicht da');
  end if;

  select udt_name into role_typ
  from information_schema.columns
  where table_schema = 'public' and table_name = 'invites' and column_name = 'role';

  if role_typ is null or role_typ not in ('text', 'varchar', 'bpchar') then
    raise exception 'invites.role ist %, erwartet ist Text.', coalesce(role_typ, 'nicht da');
  end if;

  select string_agg(distinct role, ', ') into fremd
  from public.band_members
  where role is null or lower(btrim(role)) not in ('lesen', 'bearbeiten', 'verwalten');

  if fremd is not null then
    raise exception 'Unbekannte Rollen bei Mitgliedern: %. Nicht still auf Nur lesen gesetzt. Entwurf stoppt.', fremd;
  end if;

  select string_agg(distinct coalesce(role, '(leer)'), ', ') into fremd
  from public.invites
  where role is null or lower(btrim(role)) not in ('lesen', 'bearbeiten', 'verwalten');

  if fremd is not null then
    raise exception 'Unbekannte Rollen bei Einladungen: %. Entwurf stoppt.', fremd;
  end if;

  if exists (
    select 1 from public.band_members
    group by band_id, user_id
    having count(*) > 1
  ) then
    raise exception 'Doppelte Mitgliedszeilen (gleiche Band und gleiche Person). Erst bereinigen.';
  end if;
end
$rollenwerte$;

-- Alte Prüfregeln, die nur die Rolle betreffen, entfernen.
-- PRÜFEN: eine Regel wird nur gelöscht, wenn ihr Text "role" enthält
-- und nicht band_id, user_id oder email. Sonst bleibt sie stehen
-- und kann mit der neuen Regel zusammenstoßen. Dann steht das in der Fehlermeldung.
do $altechecks$
declare
  r record;
  def text;
begin
  for r in
    select t.relname as table_name, c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname in ('band_members', 'invites')
      and c.contype = 'c'
      and c.conname <> 'sf_band_members_role_chk'
      and c.conname <> 'sf_invites_role_chk'
  loop
    def := lower(r.def);
    if def like '%role%' and def not like '%band_id%' and def not like '%user_id%' and def not like '%email%' then
      execute format('alter table public.%I drop constraint %I', r.table_name, r.conname);
    end if;
  end loop;
end
$altechecks$;

alter table public.band_members alter column role set default 'lesen';
alter table public.band_members alter column role set not null;
alter table public.band_members drop constraint if exists sf_band_members_role_chk;
alter table public.band_members
  add constraint sf_band_members_role_chk
  check (role in ('lesen', 'bearbeiten', 'verwalten'));

alter table public.invites alter column role set default 'lesen';
alter table public.invites alter column role set not null;
alter table public.invites drop constraint if exists sf_invites_role_chk;
alter table public.invites
  add constraint sf_invites_role_chk
  check (role in ('lesen', 'bearbeiten', 'verwalten'));

create unique index if not exists sf_band_members_band_user_uidx
  on public.band_members (band_id, user_id);

-- Hilfen. Die Typen werden aus der echten Datenbank gelesen.
-- Rang: 0 nichts, 1 nur lesen, 2 bearbeiten, 3 verwalten, 4 besitzer.
-- Die Hilfen laufen mit vollen Rechten, sonst beißen sich die Zeilenregeln
-- gegenseitig. Sie verraten nur die eigene Rolle oder ob ein Teilen-Link offen ist.
do $fn$
declare
  band_id text;
  song_id text;
  gig_id text;
  playlist_id text;
  user_id text;
  user_is_me text;
  user_eq_auth text;
  member_eq_auth text;
  has_shared boolean;
  invite_order text;
  self_check text;
  sql text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise exception 'Schema auth fehlt. Das scheint nicht die Supabase-Datenbank zu sein.';
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    raise exception 'Funktion auth.uid fehlt. Das scheint nicht die Supabase-Datenbank zu sein.';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'Eine der Rollen anon, authenticated oder service_role fehlt. Das scheint nicht die Supabase-Datenbank zu sein.';
  end if;

  band_id := (
    select case udt_name
      when 'int8' then 'bigint' when 'int4' then 'integer'
      when 'int2' then 'smallint' when 'uuid' then 'uuid' else null end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'bands' and column_name = 'id'
  );
  song_id := (
    select case udt_name
      when 'int8' then 'bigint' when 'int4' then 'integer'
      when 'int2' then 'smallint' when 'uuid' then 'uuid' else null end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'songs' and column_name = 'id'
  );
  gig_id := (
    select case udt_name
      when 'int8' then 'bigint' when 'int4' then 'integer'
      when 'int2' then 'smallint' when 'uuid' then 'uuid' else null end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'gigs' and column_name = 'id'
  );
  playlist_id := (
    select case udt_name
      when 'int8' then 'bigint' when 'int4' then 'integer'
      when 'int2' then 'smallint' when 'uuid' then 'uuid' else null end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'playlists' and column_name = 'id'
  );
  user_id := (
    select case udt_name
      when 'uuid' then 'uuid' when 'text' then 'text'
      when 'varchar' then 'text' else null end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'bands' and column_name = 'user_id'
  );

  if band_id is null or song_id is null or gig_id is null or playlist_id is null then
    raise exception 'Eine id-Spalte fehlt oder hat einen Typ, den der Entwurf nicht kennt (bands %, songs %, gigs %, playlists %).',
      band_id, song_id, gig_id, playlist_id;
  end if;
  if user_id is null then
    raise exception 'bands.user_id fehlt oder ist weder uuid noch text.';
  end if;

  if user_id = 'uuid' then
    user_is_me := 'p_user_id = auth.uid()';
    user_eq_auth := 'b.user_id = auth.uid()';
    member_eq_auth := 'm.user_id = auth.uid()';
  else
    user_is_me := 'p_user_id = auth.uid()::text';
    user_eq_auth := 'b.user_id = auth.uid()::text';
    member_eq_auth := 'm.user_id = auth.uid()::text';
  end if;

  if (
    select case udt_name when 'uuid' then 'uuid' when 'text' then 'text' when 'varchar' then 'text' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'band_members' and column_name = 'user_id'
  ) is distinct from user_id then
    raise exception 'band_members.user_id und bands.user_id haben nicht denselben Typ.';
  end if;

  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'songs' and column_name = 'band_id'
  ) is distinct from band_id then
    raise exception 'songs.band_id passt nicht zu bands.id.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'gigs' and column_name = 'band_id'
  ) is distinct from band_id then
    raise exception 'gigs.band_id passt nicht zu bands.id.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'gigs' and column_name = 'id'
  ) is distinct from gig_id then
    raise exception 'gigs.id unerwartet.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'playlists' and column_name = 'gig_id'
  ) is distinct from gig_id then
    raise exception 'playlists.gig_id passt nicht zu gigs.id.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'playlist_songs' and column_name = 'playlist_id'
  ) is distinct from playlist_id then
    raise exception 'playlist_songs.playlist_id passt nicht zu playlists.id.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'playlist_songs' and column_name = 'song_id'
  ) is distinct from song_id then
    raise exception 'playlist_songs.song_id passt nicht zu songs.id.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'band_id'
  ) is distinct from band_id then
    raise exception 'invites.band_id passt nicht zu bands.id.';
  end if;
  if (
    select case udt_name when 'int8' then 'bigint' when 'int4' then 'integer' when 'int2' then 'smallint' when 'uuid' then 'uuid' else 'anders' end
    from information_schema.columns
    where table_schema = 'public' and table_name = 'band_members' and column_name = 'band_id'
  ) is distinct from band_id then
    raise exception 'band_members.band_id passt nicht zu bands.id.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'email'
  ) then
    raise exception 'invites.email fehlt.';
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'playlists'
      and column_name = 'is_shared' and udt_name = 'bool'
  ) into has_shared;

  if not has_shared then
    raise notice 'PRÜFEN: playlists.is_shared fehlt oder ist kein ja/nein. Anonyme Teilen-Links über die Schnittstelle werden nicht freigegeben.';
  end if;

  sql := format($f$
    create function public.sf_is_me(p_user_id %1$s)
    returns boolean
    language sql stable security definer set search_path = public
    as $q$ select %2$s $q$
  $f$, user_id, user_is_me);
  execute sql;

  sql := format($f$
    create function public.sf_band_rank(p_band_id %1$s)
    returns integer
    language sql stable security definer set search_path = public
    as $q$
      select case
        when exists (
          select 1 from public.bands b
          where b.id = p_band_id and %2$s
        ) then 4
        else coalesce((
          select max(case m.role
            when 'verwalten' then 3
            when 'bearbeiten' then 2
            when 'lesen' then 1
            else 0 end)
          from public.band_members m
          where m.band_id = p_band_id and %3$s
        ), 0)
      end
    $q$
  $f$, band_id, user_eq_auth, member_eq_auth);
  execute sql;

  sql := format($f$
    create function public.sf_gig_rank(p_gig_id %1$s)
    returns integer
    language sql stable security definer set search_path = public
    as $q$
      select coalesce((
        select public.sf_band_rank(g.band_id) from public.gigs g where g.id = p_gig_id
      ), 0)
    $q$
  $f$, gig_id);
  execute sql;

  sql := format($f$
    create function public.sf_playlist_rank(p_playlist_id %1$s)
    returns integer
    language sql stable security definer set search_path = public
    as $q$
      select coalesce((
        select public.sf_gig_rank(p.gig_id) from public.playlists p where p.id = p_playlist_id
      ), 0)
    $q$
  $f$, playlist_id);
  execute sql;

  if has_shared then
    sql := format($f$
      create function public.sf_playlist_is_shared(p_playlist_id %1$s)
      returns boolean
      language sql stable security definer set search_path = public
      as $q$
        select coalesce((select p.is_shared from public.playlists p where p.id = p_playlist_id), false)
      $q$
    $f$, playlist_id);
    execute sql;

    sql := format($f$
      create function public.sf_song_is_shared(p_song_id %1$s)
      returns boolean
      language sql stable security definer set search_path = public
      as $q$
        select exists (
          select 1 from public.playlist_songs ps
          join public.playlists p on p.id = ps.playlist_id
          where ps.song_id = p_song_id and p.is_shared is true
        )
      $q$
    $f$, song_id);
    execute sql;

    sql := format($f$
      create function public.sf_gig_is_shared(p_gig_id %1$s)
      returns boolean
      language sql stable security definer set search_path = public
      as $q$
        select exists (
          select 1 from public.playlists p
          where p.gig_id = p_gig_id and p.is_shared is true
        )
      $q$
    $f$, gig_id);
    execute sql;

    sql := format($f$
      create function public.sf_band_is_shared(p_band_id %1$s)
      returns boolean
      language sql stable security definer set search_path = public
      as $q$
        select exists (
          select 1 from public.gigs g
          join public.playlists p on p.gig_id = g.id
          where g.band_id = p_band_id and p.is_shared is true
        )
      $q$
    $f$, band_id);
    execute sql;
  else
    execute format('create function public.sf_playlist_is_shared(p_playlist_id %s) returns boolean language sql stable security definer set search_path = public as $q$ select false $q$', playlist_id);
    execute format('create function public.sf_song_is_shared(p_song_id %s) returns boolean language sql stable security definer set search_path = public as $q$ select false $q$', song_id);
    execute format('create function public.sf_gig_is_shared(p_gig_id %s) returns boolean language sql stable security definer set search_path = public as $q$ select false $q$', gig_id);
    execute format('create function public.sf_band_is_shared(p_band_id %s) returns boolean language sql stable security definer set search_path = public as $q$ select false $q$', band_id);
  end if;

  sql := format($f$
    create function public.sf_song_matches_playlist(p_playlist_id %1$s, p_song_id %2$s)
    returns boolean
    language sql stable security definer set search_path = public
    as $q$
      select exists (
        select 1
        from public.playlists p
        join public.gigs g on g.id = p.gig_id
        join public.songs s on s.id = p_song_id
        where p.id = p_playlist_id
          and s.band_id = g.band_id
      )
    $q$
  $f$, playlist_id, song_id);
  execute sql;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'created_at'
  ) then
    invite_order := 'i.created_at desc nulls last, i.id desc';
  else
    invite_order := 'i.id desc';
  end if;

  if user_id = 'uuid' then
    self_check := 'new.user_id is distinct from auth.uid()';
  else
    self_check := 'new.user_id is distinct from auth.uid()::text';
  end if;

  sql := format($f$
    create function public.sf_band_member_before_write()
    returns trigger
    language plpgsql security definer set search_path = public
    as $q$
    declare
      v_role text;
      v_email text;
    begin
      if tg_op = 'UPDATE' then
        if new.band_id is distinct from old.band_id or new.user_id is distinct from old.user_id then
          raise exception 'Band und Person lassen sich hier nicht umbiegen.';
        end if;
        if auth.uid() is not null and public.sf_band_rank(old.band_id) < 3 then
          raise exception 'Dafür brauchst du Verwalten.';
        end if;
        if new.role not in ('lesen', 'bearbeiten', 'verwalten') then
          raise exception 'Unbekannte Rolle.';
        end if;
        return new;
      end if;

      if auth.uid() is null then
        if new.role is null or new.role not in ('lesen', 'bearbeiten', 'verwalten') then
          new.role := 'lesen';
        end if;
        return new;
      end if;

      if %2$s then
        raise exception 'Du kannst nur dich selbst eintragen. Andere werden per E-Mail eingeladen.';
      end if;

      select i.role, i.email into v_role, v_email
      from public.invites i
      where i.band_id = new.band_id
        and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      order by %1$s
      limit 1;

      if v_role is null then
        raise exception 'Keine Einladung für diese E-Mail.';
      end if;
      if v_role not in ('lesen', 'bearbeiten', 'verwalten') then
        v_role := 'lesen';
      end if;
      new.role := v_role;
      if new.email is null or btrim(new.email) = '' then
        new.email := lower(v_email);
      end if;
      return new;
    end
    $q$
  $f$, invite_order, self_check);
  execute sql;
end
$fn$;

revoke all on function public.sf_band_member_before_write() from public;
grant execute on function public.sf_band_member_before_write() to authenticated, service_role;
-- Die anderen Hilfen bekommen ihre Freigabe typgenau im nächsten Block.
do $grant$
declare
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'sf_band_rank', 'sf_gig_rank', 'sf_playlist_rank', 'sf_is_me',
        'sf_playlist_is_shared', 'sf_song_is_shared', 'sf_gig_is_shared', 'sf_band_is_shared',
        'sf_song_matches_playlist'
      )
  loop
    execute format('revoke all on function public.%I(%s) from public', r.proname, r.args);
    execute format(
      'grant execute on function public.%I(%s) to anon, authenticated, service_role',
      r.proname, r.args
    );
  end loop;
end
$grant$;

drop trigger if exists sf_band_member_before_write on public.band_members;
create trigger sf_band_member_before_write
  before insert or update on public.band_members
  for each row execute function public.sf_band_member_before_write();

alter table public.bands enable row level security;
alter table public.songs enable row level security;
alter table public.gigs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.invites enable row level security;
alter table public.band_members enable row level security;

-- Lesen: Mitglied ab Nur lesen, oder ein offener Teilen-Link.
-- Schreiben ist nur für angemeldete Leute, und nur ab dem genannten Rang.

-- Zwei getrennte Lese-Regeln: angemeldete Leute sehen nur ihre Bands,
-- Gäste ohne Konto nur eine Band, deren Setlist auf Teilen steht.
-- sf_is_me ist nötig, weil die App die neue Zeile sofort zurückhaben will
-- und die Person in dem Moment noch nicht als Mitglied zählt.
create policy sf_bands_select_member on public.bands
  for select to authenticated
  using (public.sf_is_me(user_id) or public.sf_band_rank(id) >= 1);

create policy sf_bands_select_shared on public.bands
  for select to anon
  using (public.sf_band_is_shared(id));

create policy sf_bands_insert on public.bands
  for insert to authenticated
  with check (public.sf_is_me(user_id));

create policy sf_bands_update on public.bands
  for update to authenticated
  using (public.sf_band_rank(id) >= 4)
  with check (public.sf_band_rank(id) >= 4 and public.sf_is_me(user_id));

create policy sf_bands_delete on public.bands
  for delete to authenticated
  using (public.sf_band_rank(id) >= 4);

create policy sf_songs_select_member on public.songs
  for select to authenticated
  using (public.sf_band_rank(band_id) >= 1);

create policy sf_songs_select_shared on public.songs
  for select to anon
  using (public.sf_song_is_shared(id));

create policy sf_songs_insert on public.songs
  for insert to authenticated
  with check (public.sf_band_rank(band_id) >= 2);

create policy sf_songs_update on public.songs
  for update to authenticated
  using (public.sf_band_rank(band_id) >= 2)
  with check (public.sf_band_rank(band_id) >= 2);

create policy sf_songs_delete on public.songs
  for delete to authenticated
  using (public.sf_band_rank(band_id) >= 3);

-- band_id von der Zeile selbst, nicht nochmal über die Gig-Nummer nachschlagen.
-- Sonst sieht die App die gerade angelegte Zeile nicht und das Anlegen scheitert.
create policy sf_gigs_select_member on public.gigs
  for select to authenticated
  using (public.sf_band_rank(band_id) >= 1);

create policy sf_gigs_select_shared on public.gigs
  for select to anon
  using (public.sf_gig_is_shared(id));

create policy sf_gigs_insert on public.gigs
  for insert to authenticated
  with check (public.sf_band_rank(band_id) >= 3);

create policy sf_gigs_update on public.gigs
  for update to authenticated
  using (public.sf_gig_rank(id) >= 3)
  with check (public.sf_band_rank(band_id) >= 3);

create policy sf_gigs_delete on public.gigs
  for delete to authenticated
  using (public.sf_gig_rank(id) >= 3);

create policy sf_playlists_select_member on public.playlists
  for select to authenticated
  using (public.sf_gig_rank(gig_id) >= 1);

create policy sf_playlists_select_shared on public.playlists
  for select to anon
  using (public.sf_playlist_is_shared(id));

create policy sf_playlists_insert on public.playlists
  for insert to authenticated
  with check (public.sf_gig_rank(gig_id) >= 3);

create policy sf_playlists_update on public.playlists
  for update to authenticated
  using (public.sf_playlist_rank(id) >= 3)
  with check (public.sf_gig_rank(gig_id) >= 3);

create policy sf_playlists_delete on public.playlists
  for delete to authenticated
  using (public.sf_playlist_rank(id) >= 3);

create policy sf_playlist_songs_select_member on public.playlist_songs
  for select to authenticated
  using (public.sf_playlist_rank(playlist_id) >= 1);

create policy sf_playlist_songs_select_shared on public.playlist_songs
  for select to anon
  using (public.sf_playlist_is_shared(playlist_id));

create policy sf_playlist_songs_insert on public.playlist_songs
  for insert to authenticated
  with check (
    public.sf_playlist_rank(playlist_id) >= 2
    and public.sf_song_matches_playlist(playlist_id, song_id)
  );

create policy sf_playlist_songs_update on public.playlist_songs
  for update to authenticated
  using (public.sf_playlist_rank(playlist_id) >= 2)
  with check (
    public.sf_playlist_rank(playlist_id) >= 2
    and public.sf_song_matches_playlist(playlist_id, song_id)
  );

create policy sf_playlist_songs_delete on public.playlist_songs
  for delete to authenticated
  using (public.sf_playlist_rank(playlist_id) >= 3);

create policy sf_invites_select on public.invites
  for select to authenticated
  using (
    public.sf_band_rank(band_id) >= 3
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy sf_invites_insert on public.invites
  for insert to authenticated
  with check (
    public.sf_band_rank(band_id) >= 3
    and role in ('lesen', 'bearbeiten', 'verwalten')
    and email is not null
    and btrim(email) <> ''
  );

create policy sf_invites_update on public.invites
  for update to authenticated
  using (public.sf_band_rank(band_id) >= 3)
  with check (
    public.sf_band_rank(band_id) >= 3
    and role in ('lesen', 'bearbeiten', 'verwalten')
  );

create policy sf_invites_delete on public.invites
  for delete to authenticated
  using (
    public.sf_band_rank(band_id) >= 3
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy sf_members_select on public.band_members
  for select to authenticated
  using (public.sf_is_me(user_id) or public.sf_band_rank(band_id) >= 1);

create policy sf_members_insert on public.band_members
  for insert to authenticated
  with check (
    public.sf_is_me(user_id)
    and role in ('lesen', 'bearbeiten', 'verwalten')
    and exists (
      select 1 from public.invites i
      where i.band_id = band_members.band_id
        and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and i.role = band_members.role
    )
  );

create policy sf_members_update on public.band_members
  for update to authenticated
  using (public.sf_band_rank(band_id) >= 3)
  with check (
    public.sf_band_rank(band_id) >= 3
    and role in ('lesen', 'bearbeiten', 'verwalten')
  );

create policy sf_members_delete on public.band_members
  for delete to authenticated
  using (public.sf_band_rank(band_id) >= 3 or public.sf_is_me(user_id));

-- Keine neue Tabelle. Deshalb hier keine grant-Befehle, die etwas freischalten.
-- Bestehende Tabellen behalten die Freigaben, die Schritt 0 anzeigt.
--
-- Falls später doch eine neue Tabelle dazukommt, müssen in DERSELBEN Änderung
-- diese Zeilen mit dem echten Namen stehen, sonst ist sie ab 30.10.2026
-- über die Supabase-Schnittstelle unsichtbar:
--
--   grant select on public.NEUE_TABELLE to anon;
--   grant select, insert, update, delete on public.NEUE_TABELLE to authenticated;
--   grant select, insert, update, delete on public.NEUE_TABELLE to service_role;
--
-- anon bekommt nur select. Was anon wirklich sieht, begrenzen die Zeilenregeln.
-- insert/update/delete für anon nicht mit freigeben.

do $fertig$
begin
  raise notice 'Entwurf durch. Keine neue Tabelle, deshalb keine neuen Tabellen-Freigaben. Bitte mit einem zweiten Konto gegenprüfen, bevor die App die Anmeldung wieder benutzt.';
end
$fertig$;

commit;
