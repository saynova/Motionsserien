ALTER TABLE public.registration_settings ADD COLUMN IF NOT EXISTS registration_deadline text;
ALTER TABLE public.oneday_settings ADD COLUMN IF NOT EXISTS registration_deadline text;