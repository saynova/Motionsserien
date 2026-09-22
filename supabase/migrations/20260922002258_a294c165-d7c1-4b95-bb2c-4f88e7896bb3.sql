DROP EXTENSION pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('auto-score-reminders');

SELECT cron.schedule(
  'auto-score-reminders',
  '0 10 * * 2',
  $$
  SELECT extensions.http_post(
    url := 'https://project--739e6fd2-41ae-471b-b65f-18c814ffb768.lovable.app/api/public/cron/score-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT token FROM public.cron_secrets WHERE name = 'score-reminders')
    ),
    body := '{}'::jsonb
  );
  $$
);