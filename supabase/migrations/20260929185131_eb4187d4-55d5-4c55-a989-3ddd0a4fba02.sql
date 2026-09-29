CREATE TABLE public.admin_notification_dismissals (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_notification_dismissals TO service_role;
ALTER TABLE public.admin_notification_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.admin_notification_dismissals FOR SELECT TO authenticated USING (false);