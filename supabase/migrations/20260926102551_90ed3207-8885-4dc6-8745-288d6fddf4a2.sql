CREATE POLICY "No client access to admin 2fa settings"
ON public.admin_2fa_settings FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "No client access to admin login codes"
ON public.admin_login_codes FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "No client access to admin trusted devices"
ON public.admin_trusted_devices FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);