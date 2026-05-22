-- Run in Supabase SQL Editor
ALTER TABLE public.tracked_shows ADD COLUMN IF NOT EXISTS genres text;
