-- registrations: no public reads of applicant personal data
DROP POLICY IF EXISTS "registrations accepted public read" ON public.registrations;
REVOKE SELECT, UPDATE, DELETE ON public.registrations FROM anon, authenticated;
GRANT INSERT ON public.registrations TO anon, authenticated;
GRANT ALL ON public.registrations TO service_role;

-- messages: submit only, never readable or editable by visitors
REVOKE SELECT, UPDATE, DELETE ON public.messages FROM anon, authenticated;
GRANT INSERT ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;

-- seasons: keep public schedule fields readable, hide payment_details
REVOKE SELECT ON public.seasons FROM anon, authenticated;
GRANT SELECT (id, name, start_monday, total_weeks, current_week, is_active, created_at)
  ON public.seasons TO anon, authenticated;
GRANT ALL ON public.seasons TO service_role;

-- shuttle_orders: no public reads at all; the public list is served server-side
DROP POLICY IF EXISTS "shuttle orders approved public read" ON public.shuttle_orders;
REVOKE SELECT, UPDATE, DELETE ON public.shuttle_orders FROM anon, authenticated;
GRANT ALL ON public.shuttle_orders TO service_role;