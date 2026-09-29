DELETE FROM public.registrations WHERE team_name LIKE 'Guest Test %';
UPDATE public.registration_settings SET require_sign_in = true;