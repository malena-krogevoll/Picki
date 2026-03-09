CREATE POLICY "Authenticated users can read product_sources"
ON public.product_sources
FOR SELECT
TO authenticated
USING (true);