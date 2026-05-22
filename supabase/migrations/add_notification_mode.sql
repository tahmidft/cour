-- Run in Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_mode text DEFAULT 'weekly_summary';

-- Migrate existing opt-outs
UPDATE public.profiles
SET notification_mode = 'none'
WHERE weekly_reminders_all = false;

COMMENT ON COLUMN public.profiles.notification_mode IS
  'weekly_summary | new_season_only | daily_digest | none';
