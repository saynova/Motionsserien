SELECT cron.schedule(
  'weekly-score-backup',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--739e6fd2-41ae-471b-b65f-18c814ffb768.lovable.app/api/public/cron/weekly-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT token FROM public.cron_secrets WHERE name = 'weekly-backup')
    ),
    body := '{}'::jsonb
  );
  $$
);
