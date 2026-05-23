-- Pending new-season prompts (email + in-app banner)
create table if not exists public.season_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_show_id uuid references public.tracked_shows(id) on delete set null,
  sequel_anilist_id int not null,
  season_number int not null default 2,
  parent_title_en text,
  sequel_title_en text,
  sequel_cover text,
  sequel_synopsis text,
  sequel_score int,
  sequel_status text,
  status text not null default 'pending',
  snooze_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, sequel_anilist_id)
);

alter table public.season_prompts enable row level security;

create policy "Users manage own season prompts"
  on public.season_prompts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists season_prompts_user_status_idx
  on public.season_prompts (user_id, status);
