CREATE TABLE public.email_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_en text NOT NULL DEFAULT 'If you have any further questions, please feel free to contact me through the website’s contact form.',
  closing_sv text NOT NULL DEFAULT 'Om du har några ytterligare frågor är du välkommen att kontakta mig via kontaktformuläret på webbplatsen.',
  signature text NOT NULL DEFAULT E'Best Regards\nThe General\nMd Rabiul Islam',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON public.email_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();