CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text NOT NULL DEFAULT 'question'::text,
  email text NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  team_name text NOT NULL DEFAULT ''::text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.messages TO anon;
GRANT INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_public_submit" ON public.messages
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();