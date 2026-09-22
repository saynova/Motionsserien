CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.cron_secrets (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cron_secrets TO service_role;
ALTER TABLE public.cron_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cron secrets no client access" ON public.cron_secrets FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "cron secrets no client insert" ON public.cron_secrets FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "cron secrets no client update" ON public.cron_secrets FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "cron secrets no client delete" ON public.cron_secrets FOR DELETE TO anon, authenticated USING (false);

INSERT INTO public.cron_secrets (name, token)
VALUES ('score-reminders', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

SELECT cron.schedule(
  'auto-score-reminders',
  '0 10 * * 2',
  $$
  SELECT net.http_post(
    url := 'https://project--739e6fd2-41ae-471b-b65f-18c814ffb768.lovable.app/api/public/cron/score-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT token FROM public.cron_secrets WHERE name = 'score-reminders')
    ),
    body := '{}'::jsonb
  );
  $$
);