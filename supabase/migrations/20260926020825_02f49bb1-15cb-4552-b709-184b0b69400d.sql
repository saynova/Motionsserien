CREATE POLICY "shuttle orders public read approved"
  ON public.shuttle_orders FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "shuttle orders public submit"
  ON public.shuttle_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "shuttle orders no client update"
  ON public.shuttle_orders FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "shuttle orders no client delete"
  ON public.shuttle_orders FOR DELETE
  TO anon, authenticated
  USING (false);

GRANT SELECT, INSERT ON public.shuttle_orders TO anon, authenticated;
GRANT ALL ON public.shuttle_orders TO service_role;