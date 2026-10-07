ALTER TABLE public.partner_requests ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX partner_requests_guest_email_season_idx ON public.partner_requests (season_key, lower(email)) WHERE user_id IS NULL;
COMMENT ON COLUMN public.partner_requests.user_id IS 'Account owner for signed-in requests; NULL for public partner requests. Guest contact details remain private.';