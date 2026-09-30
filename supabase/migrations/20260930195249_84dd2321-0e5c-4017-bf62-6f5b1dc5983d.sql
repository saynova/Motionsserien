ALTER TABLE public.gallery_photos ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.increment_gallery_view(_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ UPDATE public.gallery_photos SET view_count = view_count + 1 WHERE id = _id; $$;
REVOKE ALL ON FUNCTION public.increment_gallery_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_gallery_view(uuid) TO service_role;