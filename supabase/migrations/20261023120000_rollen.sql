-- Rollen im Team. Noch nicht auf dem echten Projekt ausführen.
-- Tom sagt erst ja, dann diese Datei einmal im Ganzen.
-- Getestet nur an einer leeren lokalen Kopie des gelesenen Schemas.
--
-- viewer = nur lesen, editor = bearbeiten, manager = verwalten.
-- Bestehende Mitglieder werden bearbeiten (editor). Es liegen aktuell 0 Zeilen.
-- Keine neue Tabelle, deshalb keine neuen Tabellen-Freigaben.
-- Ab 30.10.2026 bräuchte eine neue public-Tabelle:
--   GRANT SELECT ON TABLE ... TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ... TO authenticated, service_role;

-- Doppelte Besitzer-Regeln weg. Die own_* Regeln und alle shared_* bleiben.
DROP POLICY IF EXISTS bands_owner ON public.bands;
DROP POLICY IF EXISTS songs_owner ON public.songs;
DROP POLICY IF EXISTS gigs_owner ON public.gigs;
DROP POLICY IF EXISTS playlists_owner ON public.playlists;
DROP POLICY IF EXISTS playlist_songs_owner ON public.playlist_songs;

ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS email text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'band_members_role_check'
  ) THEN
    UPDATE public.band_members SET role = 'editor';
  END IF;
END $$;

ALTER TABLE public.band_members ALTER COLUMN role SET DEFAULT 'editor';
ALTER TABLE public.band_members DROP CONSTRAINT IF EXISTS band_members_role_check;
ALTER TABLE public.band_members
  ADD CONSTRAINT band_members_role_check
  CHECK (role IN ('viewer', 'editor', 'manager'));

ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'editor';
ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_role_check;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_role_check
  CHECK (role IN ('viewer', 'editor', 'manager'));

CREATE OR REPLACE FUNCTION public.band_role(bid bigint)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.bands b
      WHERE b.id = bid AND b.user_id = auth.uid()
    ) THEN 'owner'
    ELSE (
      SELECT bm.role
      FROM public.band_members bm
      WHERE bm.band_id = bid AND bm.user_id = auth.uid()
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.band_rank(bid bigint)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.band_role(bid)
    WHEN 'owner' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'editor' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.gig_band(gid bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.band_id FROM public.gigs g WHERE g.id = gid;
$$;

CREATE OR REPLACE FUNCTION public.playlist_band(pid bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.band_id
  FROM public.playlists p
  JOIN public.gigs g ON g.id = p.gig_id
  WHERE p.id = pid;
$$;

CREATE OR REPLACE FUNCTION public.sf_member_role_from_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invited text;
  mail text;
BEGIN
  mail := lower(COALESCE(auth.jwt() ->> 'email', ''));
  SELECT i.role INTO invited
  FROM public.invites i
  WHERE i.band_id = NEW.band_id
    AND lower(i.email) = mail
  ORDER BY i.created_at DESC
  LIMIT 1;
  IF invited IN ('viewer', 'editor', 'manager') THEN
    NEW.role := invited;
  ELSIF NEW.role IS NULL OR NEW.role NOT IN ('viewer', 'editor', 'manager') THEN
    NEW.role := 'editor';
  END IF;
  IF mail <> '' AND (NEW.email IS NULL OR btrim(NEW.email) = '') THEN
    NEW.email := mail;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sf_member_role_from_invite ON public.band_members;
CREATE TRIGGER sf_member_role_from_invite
  BEFORE INSERT ON public.band_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sf_member_role_from_invite();

REVOKE ALL ON FUNCTION public.band_role(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.band_rank(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gig_band(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.playlist_band(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sf_member_role_from_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.band_role(bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.band_rank(bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gig_band(bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.playlist_band(bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sf_member_role_from_invite() TO authenticated, service_role;

DROP POLICY IF EXISTS sf_songs_insert ON public.songs;
CREATE POLICY sf_songs_insert ON public.songs
  FOR INSERT TO authenticated
  WITH CHECK (public.band_rank(band_id) >= 2);

DROP POLICY IF EXISTS sf_songs_update ON public.songs;
CREATE POLICY sf_songs_update ON public.songs
  FOR UPDATE TO authenticated
  USING (public.band_rank(band_id) >= 2)
  WITH CHECK (public.band_rank(band_id) >= 2);

DROP POLICY IF EXISTS sf_songs_delete ON public.songs;
CREATE POLICY sf_songs_delete ON public.songs
  FOR DELETE TO authenticated
  USING (public.band_rank(band_id) >= 3);

DROP POLICY IF EXISTS sf_gigs_insert ON public.gigs;
CREATE POLICY sf_gigs_insert ON public.gigs
  FOR INSERT TO authenticated
  WITH CHECK (public.band_rank(band_id) >= 3);

DROP POLICY IF EXISTS sf_gigs_update ON public.gigs;
CREATE POLICY sf_gigs_update ON public.gigs
  FOR UPDATE TO authenticated
  USING (public.band_rank(band_id) >= 3)
  WITH CHECK (public.band_rank(band_id) >= 3);

DROP POLICY IF EXISTS sf_gigs_delete ON public.gigs;
CREATE POLICY sf_gigs_delete ON public.gigs
  FOR DELETE TO authenticated
  USING (public.band_rank(band_id) >= 3);

DROP POLICY IF EXISTS sf_playlists_insert ON public.playlists;
CREATE POLICY sf_playlists_insert ON public.playlists
  FOR INSERT TO authenticated
  WITH CHECK (public.band_rank(public.gig_band(gig_id)) >= 3);

DROP POLICY IF EXISTS sf_playlists_update ON public.playlists;
CREATE POLICY sf_playlists_update ON public.playlists
  FOR UPDATE TO authenticated
  USING (public.band_rank(public.gig_band(gig_id)) >= 3)
  WITH CHECK (public.band_rank(public.gig_band(gig_id)) >= 3);

DROP POLICY IF EXISTS sf_playlists_delete ON public.playlists;
CREATE POLICY sf_playlists_delete ON public.playlists
  FOR DELETE TO authenticated
  USING (public.band_rank(public.gig_band(gig_id)) >= 3);

DROP POLICY IF EXISTS sf_playlist_songs_insert ON public.playlist_songs;
CREATE POLICY sf_playlist_songs_insert ON public.playlist_songs
  FOR INSERT TO authenticated
  WITH CHECK (public.band_rank(public.playlist_band(playlist_id)) >= 2);

DROP POLICY IF EXISTS sf_playlist_songs_update ON public.playlist_songs;
CREATE POLICY sf_playlist_songs_update ON public.playlist_songs
  FOR UPDATE TO authenticated
  USING (public.band_rank(public.playlist_band(playlist_id)) >= 2)
  WITH CHECK (public.band_rank(public.playlist_band(playlist_id)) >= 2);

DROP POLICY IF EXISTS sf_playlist_songs_delete ON public.playlist_songs;
CREATE POLICY sf_playlist_songs_delete ON public.playlist_songs
  FOR DELETE TO authenticated
  USING (public.band_rank(public.playlist_band(playlist_id)) >= 3);

DROP POLICY IF EXISTS sf_invites_select ON public.invites;
CREATE POLICY sf_invites_select ON public.invites
  FOR SELECT TO authenticated
  USING (
    public.band_rank(band_id) >= 3
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS sf_invites_insert ON public.invites;
CREATE POLICY sf_invites_insert ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.band_rank(band_id) >= 3
    AND role IN ('viewer', 'editor', 'manager')
  );

DROP POLICY IF EXISTS sf_invites_update ON public.invites;
CREATE POLICY sf_invites_update ON public.invites
  FOR UPDATE TO authenticated
  USING (public.band_rank(band_id) >= 3)
  WITH CHECK (
    public.band_rank(band_id) >= 3
    AND role IN ('viewer', 'editor', 'manager')
  );

DROP POLICY IF EXISTS sf_invites_delete ON public.invites;
CREATE POLICY sf_invites_delete ON public.invites
  FOR DELETE TO authenticated
  USING (public.band_rank(band_id) >= 3);

DROP POLICY IF EXISTS sf_members_select ON public.band_members;
CREATE POLICY sf_members_select ON public.band_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.band_rank(band_id) >= 1);

DROP POLICY IF EXISTS sf_members_update ON public.band_members;
CREATE POLICY sf_members_update ON public.band_members
  FOR UPDATE TO authenticated
  USING (public.band_rank(band_id) >= 3)
  WITH CHECK (
    public.band_rank(band_id) >= 3
    AND role IN ('viewer', 'editor', 'manager')
  );

DROP POLICY IF EXISTS sf_members_delete ON public.band_members;
CREATE POLICY sf_members_delete ON public.band_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.band_rank(band_id) >= 3);

DROP POLICY IF EXISTS self_join_via_invite ON public.band_members;
CREATE POLICY self_join_via_invite ON public.band_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role IN ('viewer', 'editor', 'manager')
    AND EXISTS (
      SELECT 1 FROM public.invites i
      WHERE i.band_id = band_members.band_id
        AND lower(i.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        AND i.role = band_members.role
    )
  );
