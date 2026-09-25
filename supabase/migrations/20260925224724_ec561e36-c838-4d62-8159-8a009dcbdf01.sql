CREATE TABLE public.site_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  header_title text NOT NULL DEFAULT 'Motionsserien',
  header_subtitle text NOT NULL DEFAULT 'HT-26',
  tournament_name text NOT NULL DEFAULT 'Motionsserien HT-26',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_branding TO anon, authenticated;
GRANT ALL ON public.site_branding TO service_role;
ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site branding public read" ON public.site_branding FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER update_site_branding_updated_at BEFORE UPDATE ON public.site_branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.site_branding DEFAULT VALUES;