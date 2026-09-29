ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_offset_days smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reminder_time text NOT NULL DEFAULT '12:00';