CREATE OR REPLACE FUNCTION public.rename_registered_team(_id uuid, _name text) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.registrations;
BEGIN
 IF length(trim(_name)) NOT BETWEEN 2 AND 60 THEN RAISE EXCEPTION 'Team name must be 2–60 characters.'; END IF;
 SELECT * INTO r FROM public.registrations WHERE id = _id FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Team not found.'; END IF;
 IF EXISTS (SELECT 1 FROM public.registrations WHERE target_season = r.target_season AND id <> r.id AND lower(team_name) = lower(trim(_name))) THEN RAISE EXCEPTION 'That team name is already used.'; END IF;
 UPDATE public.season_seeds SET team_name = trim(_name) WHERE target_season = r.target_season AND lower(team_name) = lower(r.team_name);
 UPDATE public.teams t SET name = trim(_name) WHERE lower(t.name) = lower(r.team_name) AND EXISTS (SELECT 1 FROM public.matches m JOIN public.seasons s ON s.id = m.season_id WHERE s.registration_key = r.target_season AND (m.team_a_id = t.id OR m.team_b_id = t.id));
 UPDATE public.registrations SET team_name = trim(_name) WHERE id = _id;
END; $$;
REVOKE ALL ON FUNCTION public.rename_registered_team(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_registered_team(uuid, text) TO service_role;