CREATE TABLE public.team_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  note text NOT NULL DEFAULT '',
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);

GRANT ALL ON public.team_payments TO service_role;
ALTER TABLE public.team_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team payments no client access" ON public.team_payments FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "team payments no client insert" ON public.team_payments FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "team payments no client update" ON public.team_payments FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "team payments no client delete" ON public.team_payments FOR DELETE TO anon, authenticated USING (false);
CREATE TRIGGER update_team_payments_updated_at BEFORE UPDATE ON public.team_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.champions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_title text NOT NULL DEFAULT '',
  year integer NOT NULL DEFAULT 2026,
  team_name text NOT NULL DEFAULT '',
  players text NOT NULL DEFAULT '',
  image_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.champions TO anon, authenticated;
GRANT ALL ON public.champions TO service_role;
ALTER TABLE public.champions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "champions public read" ON public.champions FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER update_champions_updated_at BEFORE UPDATE ON public.champions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_photos TO anon, authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery photos public read" ON public.gallery_photos FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER update_gallery_photos_updated_at BEFORE UPDATE ON public.gallery_photos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_support_settings ADD COLUMN IF NOT EXISTS season_finished boolean NOT NULL DEFAULT false;