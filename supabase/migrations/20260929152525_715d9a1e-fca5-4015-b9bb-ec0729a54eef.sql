ALTER TABLE public.registration_settings
  ADD COLUMN IF NOT EXISTS require_sign_in boolean NOT NULL DEFAULT true;