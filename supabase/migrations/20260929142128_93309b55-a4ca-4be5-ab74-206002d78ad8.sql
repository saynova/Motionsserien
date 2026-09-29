ALTER TABLE public.gallery_photos
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'photo';

ALTER TABLE public.gallery_photos
  DROP CONSTRAINT IF EXISTS gallery_photos_media_type_check;

ALTER TABLE public.gallery_photos
  ADD CONSTRAINT gallery_photos_media_type_check CHECK (media_type IN ('photo', 'video'));