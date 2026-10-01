CREATE TABLE public.oneday_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visible boolean NOT NULL DEFAULT false,
  is_open boolean NOT NULL DEFAULT false,
  name text NOT NULL DEFAULT 'One-day badminton tournament',
  event_date text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  payment_details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oneday_settings TO service_role;
ALTER TABLE public.oneday_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_oneday_settings_updated_at BEFORE UPDATE ON public.oneday_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.oneday_settings DEFAULT VALUES;

CREATE TABLE public.oneday_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  player1_name text NOT NULL,
  player2_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  seen_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX oneday_registrations_team_name_key ON public.oneday_registrations (lower(team_name));
GRANT ALL ON public.oneday_registrations TO service_role;
ALTER TABLE public.oneday_registrations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_oneday_registrations_updated_at BEFORE UPDATE ON public.oneday_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();