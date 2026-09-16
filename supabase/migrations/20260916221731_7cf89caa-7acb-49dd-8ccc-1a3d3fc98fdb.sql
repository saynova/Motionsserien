CREATE TABLE public.score_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_to integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.score_reminders TO service_role;
ALTER TABLE public.score_reminders ENABLE ROW LEVEL SECURITY;
CREATE INDEX score_reminders_match_idx ON public.score_reminders(match_id);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_body text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;