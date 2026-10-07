ALTER TABLE public.registrations ADD COLUMN requires_player_confirmation boolean NOT NULL DEFAULT false, ADD COLUMN player1_confirmed_at timestamptz, ADD COLUMN player2_confirmed_at timestamptz, ADD COLUMN player1_confirmation_hash text, ADD COLUMN player2_confirmation_hash text, ADD COLUMN confirmation_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_matched_team_approval() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status = 'accepted' AND NEW.requires_player_confirmation AND (NEW.player1_confirmed_at IS NULL OR NEW.player2_confirmed_at IS NULL) THEN
  RAISE EXCEPTION 'Both players must confirm the team before it can be accepted.';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_matched_team_approval BEFORE INSERT OR UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.guard_matched_team_approval();

CREATE OR REPLACE FUNCTION public.create_matched_team(_first_id uuid, _second_id uuid, _team_name text, _hash1 text, _hash2 text) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE a public.partner_requests; b public.partner_requests; rid uuid; division_value smallint;
BEGIN
 IF _first_id = _second_id OR length(trim(_team_name)) NOT BETWEEN 2 AND 60 OR _hash1 !~ '^[a-f0-9]{64}$' OR _hash2 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid team request.'; END IF;
 PERFORM id FROM public.partner_requests WHERE id IN (_first_id, _second_id) ORDER BY id FOR UPDATE;
 SELECT * INTO a FROM public.partner_requests WHERE id = _first_id;
 SELECT * INTO b FROM public.partner_requests WHERE id = _second_id;
 IF a.id IS NULL OR b.id IS NULL THEN RAISE EXCEPTION 'Player not found.'; END IF;
 IF a.status NOT IN ('pending', 'approved') OR b.status NOT IN ('pending', 'approved') THEN RAISE EXCEPTION 'Pick two players who are still looking for a partner.'; END IF;
 IF a.season_key <> b.season_key OR lower(a.email) = lower(b.email) THEN RAISE EXCEPTION 'Players need different emails and must belong to the same tournament.'; END IF;
 IF EXISTS (SELECT 1 FROM public.registrations WHERE target_season = a.season_key AND lower(team_name) = lower(trim(_team_name))) THEN RAISE EXCEPTION 'That team name is already used in this tournament.'; END IF;
 IF EXISTS (SELECT 1 FROM public.account_links WHERE season_key = a.season_key AND user_id IN (a.user_id, b.user_id)) THEN RAISE EXCEPTION 'One of these players is already on a team.'; END IF;
 division_value := LEAST(a.previous_division, b.previous_division);
 INSERT INTO public.registrations (target_season, team_name, player1_name, player1_email, player2_name, player2_email, phone, previous_division, status, user_id, requires_player_confirmation, player1_confirmation_hash, player2_confirmation_hash, confirmation_expires_at)
 VALUES (a.season_key, trim(_team_name), a.name, a.email, b.name, b.email, '', division_value, 'pending', a.user_id, true, _hash1, _hash2, now() + interval '14 days') RETURNING id INTO rid;
 IF a.user_id IS NOT NULL THEN INSERT INTO public.account_links(season_key, registration_id, user_id, player_no) VALUES (a.season_key, rid, a.user_id, 1); END IF;
 IF b.user_id IS NOT NULL THEN INSERT INTO public.account_links(season_key, registration_id, user_id, player_no) VALUES (b.season_key, rid, b.user_id, 2); END IF;
 UPDATE public.partner_requests SET status = 'paired', registration_id = rid WHERE id IN (a.id, b.id);
 RETURN rid;
END; $$;
REVOKE ALL ON FUNCTION public.create_matched_team(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_matched_team(uuid, uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_matched_player(_hash text) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.registrations; player_no integer;
BEGIN
 IF _hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid confirmation link.'; END IF;
 SELECT * INTO r FROM public.registrations WHERE requires_player_confirmation AND (player1_confirmation_hash = _hash OR player2_confirmation_hash = _hash) FOR UPDATE;
 IF r.id IS NULL OR r.status = 'rejected' THEN RAISE EXCEPTION 'This confirmation link is no longer available.'; END IF;
 IF r.confirmation_expires_at < now() THEN RAISE EXCEPTION 'This link has expired. Please contact the General for a new invitation.'; END IF;
 player_no := CASE WHEN r.player1_confirmation_hash = _hash THEN 1 ELSE 2 END;
 IF player_no = 1 THEN UPDATE public.registrations SET player1_confirmed_at = COALESCE(player1_confirmed_at, now()) WHERE id = r.id;
 ELSE UPDATE public.registrations SET player2_confirmed_at = COALESCE(player2_confirmed_at, now()) WHERE id = r.id; END IF;
 SELECT * INTO r FROM public.registrations WHERE id = r.id;
 RETURN jsonb_build_object('confirmed', true, 'bothConfirmed', r.player1_confirmed_at IS NOT NULL AND r.player2_confirmed_at IS NOT NULL);
END; $$;
REVOKE ALL ON FUNCTION public.confirm_matched_player(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_matched_player(text) TO service_role;

CREATE OR REPLACE FUNCTION public.rename_registered_team(_id uuid, _name text) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.registrations;
BEGIN
 IF length(trim(_name)) NOT BETWEEN 2 AND 60 THEN RAISE EXCEPTION 'Team name must be 2–60 characters.'; END IF;
 SELECT * INTO r FROM public.registrations WHERE id = _id FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Team not found.'; END IF;
 IF EXISTS (SELECT 1 FROM public.registrations WHERE target_season = r.target_season AND id <> r.id AND lower(team_name) = lower(trim(_name))) THEN RAISE EXCEPTION 'That team name is already used.'; END IF;
 UPDATE public.season_seeds SET team_name = trim(_name) WHERE target_season = r.target_season AND lower(team_name) = lower(r.team_name);
 UPDATE public.teams t SET team_name = trim(_name) FROM public.seasons s WHERE t.season_id = s.id AND s.registration_key = r.target_season AND lower(t.team_name) = lower(r.team_name);
 UPDATE public.registrations SET team_name = trim(_name) WHERE id = _id;
END; $$;
REVOKE ALL ON FUNCTION public.rename_registered_team(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_registered_team(uuid, text) TO service_role;