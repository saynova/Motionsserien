ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS player2_phone text NOT NULL DEFAULT '';
DELETE FROM public.season_seeds WHERE target_season = '';