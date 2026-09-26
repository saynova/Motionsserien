CREATE TABLE public.admin_2fa_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  totp_secret TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_email TEXT NOT NULL DEFAULT 'mdrabiul.aiub@gmail.com',
  backup_code_hashes TEXT[] NOT NULL DEFAULT '{}',
  trust_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_2fa_settings TO service_role;
ALTER TABLE public.admin_2fa_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_login_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX admin_login_codes_expires_idx ON public.admin_login_codes (expires_at DESC);
GRANT ALL ON public.admin_login_codes TO service_role;
ALTER TABLE public.admin_login_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_trusted_devices TO service_role;
ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_2fa_settings_updated_at
BEFORE UPDATE ON public.admin_2fa_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.admin_2fa_settings (id) VALUES ('default');