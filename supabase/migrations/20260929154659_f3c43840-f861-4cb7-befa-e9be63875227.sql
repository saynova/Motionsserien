-- Backup schedule settings on the active season
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS backup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS backup_offset_days smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS backup_time text NOT NULL DEFAULT '22:30',
  ADD COLUMN IF NOT EXISTS backup_email text NOT NULL DEFAULT 'mdrabiul.aiub@gmail.com';

-- Log of sent backups so the scheduler never sends the same week twice
CREATE TABLE IF NOT EXISTS public.weekly_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  week_no integer NOT NULL,
  file_path text NOT NULL,
  sent_to text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (season_id, week_no)
);

GRANT ALL ON public.weekly_backups TO service_role;

ALTER TABLE public.weekly_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to weekly backups"
  ON public.weekly_backups FOR SELECT TO anon, authenticated USING (false);

-- Token for the backup cron endpoint
INSERT INTO public.cron_secrets (name, token)
VALUES ('weekly-backup', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (name) DO NOTHING;
