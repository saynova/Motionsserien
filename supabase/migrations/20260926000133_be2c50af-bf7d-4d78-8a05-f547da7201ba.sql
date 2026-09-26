ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.registrations ALTER COLUMN player2_name SET DEFAULT '';
ALTER TABLE public.registrations ALTER COLUMN player2_email SET DEFAULT '';
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS require_login_for_scores boolean NOT NULL DEFAULT false;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS invoices_open boolean NOT NULL DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS submitted_user_id uuid;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS submitted_team_id uuid;

CREATE TABLE public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_key text NOT NULL,
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  player_no smallint NOT NULL CHECK (player_no IN (1,2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_key, user_id),
  UNIQUE (registration_id, player_no)
);
GRANT SELECT ON public.account_links TO authenticated;
GRANT ALL ON public.account_links TO service_role;
ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own account links" ON public.account_links FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_key text NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  previous_division smallint,
  availability text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_key, user_id)
);
GRANT SELECT ON public.partner_requests TO authenticated;
GRANT ALL ON public.partner_requests TO service_role;
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own partner request" ON public.partner_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_partner_requests_updated_at BEFORE UPDATE ON public.partner_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS public.invoice_no_seq START 1001;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_key text NOT NULL,
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE RESTRICT,
  team_name text NOT NULL,
  user_id uuid NOT NULL,
  player_name text NOT NULL,
  email text NOT NULL,
  amount integer NOT NULL CHECK (amount IN (400, 800)),
  invoice_no bigint NOT NULL DEFAULT nextval('public.invoice_no_seq'),
  status text NOT NULL DEFAULT 'issued',
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invoices_one_active_per_user ON public.invoices (season_key, user_id) WHERE status = 'issued';
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT USAGE ON SEQUENCE public.invoice_no_seq TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_invoice(_registration_id uuid, _user_id uuid, _amount integer, _player_name text, _email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reg record; used integer; new_id uuid;
BEGIN
  IF _amount NOT IN (400, 800) THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT * INTO reg FROM registrations WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM account_links WHERE registration_id = _registration_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'You are not on this team';
  END IF;
  IF EXISTS (SELECT 1 FROM invoices WHERE season_key = reg.target_season AND user_id = _user_id AND status = 'issued') THEN
    RAISE EXCEPTION 'You already have a receipt for this tournament';
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO used FROM invoices WHERE registration_id = _registration_id AND status = 'issued';
  IF used + _amount > 800 THEN RAISE EXCEPTION 'Only % kr is left for your team', 800 - used; END IF;
  INSERT INTO invoices (season_key, registration_id, team_name, user_id, player_name, email, amount)
  VALUES (reg.target_season, _registration_id, reg.team_name, _user_id, _player_name, _email, _amount)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.claim_invoice(uuid, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invoice(uuid, uuid, integer, text, text) TO service_role;