ALTER TABLE public.oneday_registrations
  ADD COLUMN level text NOT NULL DEFAULT 'intermediate' CHECK (level IN ('intermediate','advanced')),
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid'));