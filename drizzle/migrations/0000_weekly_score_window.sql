ALTER TABLE public.seasons
  ADD COLUMN weekly_window_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN weekly_unlock_day smallint NOT NULL DEFAULT 1,
  ADD COLUMN weekly_unlock_time text NOT NULL DEFAULT '19:00',
  ADD COLUMN weekly_lock_day smallint NOT NULL DEFAULT 3,
  ADD COLUMN weekly_lock_time text NOT NULL DEFAULT '10:00';
GRANT SELECT (weekly_window_enabled, weekly_unlock_day, weekly_unlock_time, weekly_lock_day, weekly_lock_time) ON public.seasons TO anon, authenticated;