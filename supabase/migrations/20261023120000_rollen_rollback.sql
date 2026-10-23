-- Rückbau von 20261023120000_rollen.sql. Nur ausführen, wenn die Rollen wieder weg sollen.
-- shared_* und own_* bleiben, die waren schon vorher da.

DROP TRIGGER IF EXISTS sf_member_role_from_invite ON public.band_members;
DROP FUNCTION IF EXISTS public.sf_member_role_from_invite();

DROP POLICY IF EXISTS sf_songs_insert ON public.songs;
DROP POLICY IF EXISTS sf_songs_update ON public.songs;
DROP POLICY IF EXISTS sf_songs_delete ON public.songs;
DROP POLICY IF EXISTS sf_gigs_insert ON public.gigs;
DROP POLICY IF EXISTS sf_gigs_update ON public.gigs;
DROP POLICY IF EXISTS sf_gigs_delete ON public.gigs;
DROP POLICY IF EXISTS sf_playlists_insert ON public.playlists;
DROP POLICY IF EXISTS sf_playlists_update ON public.playlists;
DROP POLICY IF EXISTS sf_playlists_delete ON public.playlists;
DROP POLICY IF EXISTS sf_playlist_songs_insert ON public.playlist_songs;
DROP POLICY IF EXISTS sf_playlist_songs_update ON public.playlist_songs;
DROP POLICY IF EXISTS sf_playlist_songs_delete ON public.playlist_songs;
DROP POLICY IF EXISTS sf_invites_select ON public.invites;
DROP POLICY IF EXISTS sf_invites_insert ON public.invites;
DROP POLICY IF EXISTS sf_invites_update ON public.invites;
DROP POLICY IF EXISTS sf_invites_delete ON public.invites;
DROP POLICY IF EXISTS sf_members_select ON public.band_members;
DROP POLICY IF EXISTS sf_members_update ON public.band_members;
DROP POLICY IF EXISTS sf_members_delete ON public.band_members;
DROP POLICY IF EXISTS self_join_via_invite ON public.band_members;

DROP FUNCTION IF EXISTS public.playlist_band(bigint);
DROP FUNCTION IF EXISTS public.gig_band(bigint);
DROP FUNCTION IF EXISTS public.band_rank(bigint);
DROP FUNCTION IF EXISTS public.band_role(bigint);

ALTER TABLE public.band_members DROP CONSTRAINT IF EXISTS band_members_role_check;
ALTER TABLE public.band_members ALTER COLUMN role SET DEFAULT 'viewer';
ALTER TABLE public.band_members DROP COLUMN IF EXISTS email;

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_role_check;
ALTER TABLE public.invites DROP COLUMN IF EXISTS role;

CREATE POLICY bands_owner ON public.bands
  FOR ALL
  USING ((auth.uid() = user_id));

CREATE POLICY songs_owner ON public.songs
  FOR ALL
  USING ((EXISTS (
    SELECT 1 FROM bands
    WHERE bands.id = songs.band_id AND bands.user_id = auth.uid()
  )));

CREATE POLICY gigs_owner ON public.gigs
  FOR ALL
  USING ((EXISTS (
    SELECT 1 FROM bands
    WHERE bands.id = gigs.band_id AND bands.user_id = auth.uid()
  )));

CREATE POLICY playlists_owner ON public.playlists
  FOR ALL
  USING ((EXISTS (
    SELECT 1 FROM gigs
    JOIN bands ON bands.id = gigs.band_id
    WHERE gigs.id = playlists.gig_id AND bands.user_id = auth.uid()
  )));

CREATE POLICY playlist_songs_owner ON public.playlist_songs
  FOR ALL
  USING ((EXISTS (
    SELECT 1 FROM playlists
    JOIN gigs ON gigs.id = playlists.gig_id
    JOIN bands ON bands.id = gigs.band_id
    WHERE playlists.id = playlist_songs.playlist_id AND bands.user_id = auth.uid()
  )));

CREATE POLICY self_join_via_invite ON public.band_members
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid())
    AND (EXISTS (
      SELECT 1 FROM invites i
      WHERE i.band_id = band_members.band_id
        AND i.email = (SELECT (auth.jwt() ->> 'email'::text))
    ))
  );
