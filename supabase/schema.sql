-- Run in Supabase SQL editor

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  notify_token text unique default gen_random_uuid()::text,
  theme text default 'dark',
  accent text default 'blue',
  weekly_reminders_all boolean default true,
  created_at timestamptz default now()
);

create table public.tracked_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anilist_id int not null,
  mal_id int,
  title_en text not null,
  title_jp text,
  cover_image text,
  banner_image text,
  status text default 'UNKNOWN',
  last_known_episode int default 0,
  total_episodes int,
  next_airing_at bigint,
  air_day text,
  season_number int default 1,
  season_year int,
  weekly_reminder boolean default true,
  created_at timestamptz default now(),
  unique(user_id, anilist_id)
);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  show_id uuid references public.tracked_shows(id) on delete cascade,
  type text not null,
  sent_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.tracked_shows enable row level security;
alter table public.notification_log enable row level security;

create policy "Users can manage own profile"
  on public.profiles for all using (auth.uid() = id);

create policy "Users can manage own tracked shows"
  on public.tracked_shows for all using (auth.uid() = user_id);

create policy "Users can view own notifications"
  on public.notification_log for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
