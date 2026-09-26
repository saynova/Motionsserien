ALTER TABLE public.site_branding
  ADD COLUMN IF NOT EXISTS show_missing_banner boolean NOT NULL DEFAULT true;