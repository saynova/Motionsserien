CREATE POLICY "donation assets no direct client access"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'donation-assets' AND false);