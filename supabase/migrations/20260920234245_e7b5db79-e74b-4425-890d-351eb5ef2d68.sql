CREATE POLICY "email settings no client insert" ON public.email_settings FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "email settings no client update" ON public.email_settings FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "email settings no client delete" ON public.email_settings FOR DELETE TO anon, authenticated USING (false);