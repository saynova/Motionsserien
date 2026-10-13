ALTER TABLE public.oneday_settings ADD COLUMN IF NOT EXISTS partner_requests_open boolean NOT NULL DEFAULT true;
CREATE TABLE public.oneday_partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  category text NOT NULL DEFAULT 'men',
  level text NOT NULL DEFAULT 'intermediate',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  registration_id uuid REFERENCES public.oneday_registrations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oneday_partner_requests TO service_role;
ALTER TABLE public.oneday_partner_requests ENABLE ROW LEVEL SECURITY;