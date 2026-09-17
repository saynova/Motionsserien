ALTER TABLE public.site_support_settings
ADD COLUMN sponsor_label text NOT NULL DEFAULT 'This session is sponsored by:';

UPDATE public.site_support_settings
SET sponsor_label = 'This session is sponsored by:'
WHERE sponsor_label = '';