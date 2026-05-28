-- ── Spielfertig‽ Supabase Schema ──────────────────────────────────────────

-- Bands
create table bands (
  id bigint generated always as identity primary key,
  name text not null,
  emoji text default '🎸',
  color text default '#5cc8b8',
  drummers text[] default array['Tom'],
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Songs
create table songs (
  id bigint generated always as identity primary key,
  band_id bigint references bands(id) on delete cascade,
  title text not null,
  artist text default '',
  bpm integer default 0,
  drummer text default '',
  specialties text default '',
  created_at timestamptz default now()
);

-- Gigs
create table gigs (
  id bigint generated always as identity primary key,
  band_id bigint references bands(id) on delete cascade,
  name text not null,
  date date,
  created_at timestamptz default now()
);

-- Playlists
create table playlists (
  id bigint generated always as identity primary key,
  gig_id bigint references gigs(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Playlist Songs
create table playlist_songs (
  id bigint generated always as identity primary key,
  playlist_id bigint references playlists(id) on delete cascade,
  song_id bigint references songs(id) on delete cascade,
  set_name text not null default 'Set 1',
  position integer not null default 1,
  created_at timestamptz default now()
);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table bands          enable row level security;
alter table songs          enable row level security;
alter table gigs           enable row level security;
alter table playlists      enable row level security;
alter table playlist_songs enable row level security;

-- Bands: only owner
create policy "bands_owner" on bands for all using (auth.uid() = user_id);

-- Songs: via band ownership
create policy "songs_owner" on songs for all using (
  exists (select 1 from bands where bands.id = songs.band_id and bands.user_id = auth.uid())
);

-- Gigs: via band ownership
create policy "gigs_owner" on gigs for all using (
  exists (select 1 from bands where bands.id = gigs.band_id and bands.user_id = auth.uid())
);

-- Playlists: via gig → band
create policy "playlists_owner" on playlists for all using (
  exists (
    select 1 from gigs
    join bands on bands.id = gigs.band_id
    where gigs.id = playlists.gig_id and bands.user_id = auth.uid()
  )
);

-- Playlist songs: via playlist → gig → band
create policy "playlist_songs_owner" on playlist_songs for all using (
  exists (
    select 1 from playlists
    join gigs on gigs.id = playlists.gig_id
    join bands on bands.id = gigs.band_id
    where playlists.id = playlist_songs.playlist_id and bands.user_id = auth.uid()
  )
);
