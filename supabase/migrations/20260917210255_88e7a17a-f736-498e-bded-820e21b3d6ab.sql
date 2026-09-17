CREATE TABLE public.site_support_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_visible boolean NOT NULL DEFAULT false,
  sponsor_visible boolean NOT NULL DEFAULT false,
  sponsor_details text NOT NULL DEFAULT '',
  qr_image_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_support_settings TO anon, authenticated;
GRANT ALL ON public.site_support_settings TO service_role;

ALTER TABLE public.site_support_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site support settings public read"
ON public.site_support_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER update_site_support_settings_updated_at
BEFORE UPDATE ON public.site_support_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_support_settings (donation_visible, sponsor_visible, sponsor_details)
VALUES (false, false, '');