-- User watch progress (separate from last_known_episode, which tracks aired episode for notifications)
alter table public.tracked_shows
  add column if not exists episodes_watched int not null default 0;

comment on column public.tracked_shows.episodes_watched is
  'How many episodes the user has marked as watched (MAL-style progress).';
