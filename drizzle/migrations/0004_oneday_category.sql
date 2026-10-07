ALTER TABLE public.oneday_registrations
  ADD COLUMN category text NOT NULL DEFAULT 'men' CHECK (category IN ('men','women'));