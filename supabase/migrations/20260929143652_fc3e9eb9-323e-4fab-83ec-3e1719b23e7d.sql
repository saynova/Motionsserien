ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS auto_finalize_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_finalize_offset_days smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS auto_finalize_time text NOT NULL DEFAULT '11:00';