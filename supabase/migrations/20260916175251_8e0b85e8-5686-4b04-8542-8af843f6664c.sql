-- season settings
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS payment_details text;

-- registrations
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_season text NOT NULL DEFAULT '',
  team_name text NOT NULL,
  player1_name text NOT NULL,
  player1_email text NOT NULL,
  player2_name text NOT NULL,
  player2_email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  previous_division smallint,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX registrations_season_team_key
  ON public.registrations (target_season, lower(team_name));

GRANT INSERT ON public.registrations TO anon, authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registrations public submit"
  ON public.registrations FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- registration settings (single row)
CREATE TABLE public.registration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_open boolean NOT NULL DEFAULT false,
  target_season text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.registration_settings TO anon, authenticated;
GRANT ALL ON public.registration_settings TO service_role;
ALTER TABLE public.registration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registration settings public read"
  ON public.registration_settings FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_registration_settings_updated_at
  BEFORE UPDATE ON public.registration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.registration_settings (is_open, target_season) VALUES (false, '');

-- draft seeding board
CREATE TABLE public.season_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_season text NOT NULL DEFAULT '',
  team_name text NOT NULL,
  division smallint NOT NULL,
  position smallint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX season_seeds_slot_key ON public.season_seeds (target_season, division, position);
CREATE UNIQUE INDEX season_seeds_team_key ON public.season_seeds (target_season, lower(team_name));
GRANT ALL ON public.season_seeds TO service_role;
ALTER TABLE public.season_seeds ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_season_seeds_updated_at
  BEFORE UPDATE ON public.season_seeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- team contacts
CREATE TABLE public.team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_no smallint NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (team_id, player_no)
);
GRANT ALL ON public.team_players TO service_role;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_team_players_updated_at
  BEFORE UPDATE ON public.team_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- public list: accepted team names + division only
CREATE VIEW public.registered_teams AS
SELECT r.team_name,
       COALESCE(s.division, r.previous_division) AS division,
       r.created_at
FROM public.registrations r
LEFT JOIN public.season_seeds s
  ON s.target_season = r.target_season AND lower(s.team_name) = lower(r.team_name)
WHERE r.status = 'accepted';

GRANT SELECT ON public.registered_teams TO anon, authenticated;
GRANT SELECT ON public.registered_teams TO service_role;