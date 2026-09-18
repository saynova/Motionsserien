CREATE TABLE public.visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  os text NOT NULL DEFAULT '',
  browser text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.visit_logs TO service_role;

ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit logs no client access" ON public.visit_logs FOR SELECT TO anon, authenticated USING (false);

CREATE INDEX visit_logs_created_at_idx ON public.visit_logs (created_at DESC);

ALTER TABLE public.matches
  ADD COLUMN submitted_ip text,
  ADD COLUMN submitted_user_agent text,
  ADD COLUMN submitted_device text,
  ADD COLUMN submitted_location text;