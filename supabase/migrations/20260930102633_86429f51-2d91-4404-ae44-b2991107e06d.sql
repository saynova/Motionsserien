ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS auto_approve_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_approve_offset_days smallint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS auto_approve_time text NOT NULL DEFAULT '10:00';

UPDATE public.seasons
SET auto_approve_enabled = auto_finalize_enabled;