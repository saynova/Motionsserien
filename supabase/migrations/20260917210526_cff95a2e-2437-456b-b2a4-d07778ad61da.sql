CREATE POLICY "donation assets public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'donation-assets');