ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS swish_ref text NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS late_cancel_ack boolean NOT NULL DEFAULT false;