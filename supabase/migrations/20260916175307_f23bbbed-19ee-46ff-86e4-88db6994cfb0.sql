DROP VIEW public.registered_teams;

CREATE POLICY "registrations accepted public read"
  ON public.registrations FOR SELECT TO anon, authenticated
  USING (status = 'accepted');

GRANT SELECT (id, target_season, team_name, previous_division, status, created_at)
  ON public.registrations TO anon, authenticated;

CREATE POLICY "season seeds public read"
  ON public.season_seeds FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT (id, target_season, team_name, division, position) ON public.season_seeds TO anon, authenticated;

CREATE VIEW public.registered_teams WITH (security_invoker = on) AS
SELECT r.team_name,
       COALESCE(s.division, r.previous_division) AS division,
       r.created_at
FROM public.registrations r
LEFT JOIN public.season_seeds s
  ON s.target_season = r.target_season AND lower(s.team_name) = lower(r.team_name)
WHERE r.status = 'accepted';

GRANT SELECT ON public.registered_teams TO anon, authenticated, service_role;