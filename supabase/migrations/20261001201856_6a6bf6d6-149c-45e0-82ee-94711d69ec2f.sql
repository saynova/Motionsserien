ALTER TABLE public.registration_settings
ADD COLUMN tournament_starts_at timestamp with time zone;

COMMENT ON COLUMN public.registration_settings.tournament_starts_at IS 'Scheduled tournament start instant used by the public registration countdown.';