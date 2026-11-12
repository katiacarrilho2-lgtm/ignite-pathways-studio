DROP POLICY IF EXISTS "settings publico" ON public.store_settings;
CREATE POLICY "settings publico" ON public.store_settings FOR SELECT TO anon, authenticated USING (id = 1);

DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (published IS NOT NULL);
CREATE POLICY "site_settings matriz read" ON public.site_settings FOR SELECT TO authenticated USING (public.is_matriz_staff(auth.uid()));
REVOKE SELECT ON public.site_settings FROM anon;
GRANT SELECT (section, published, updated_at) ON public.site_settings TO anon;

DROP POLICY IF EXISTS "bundle publico" ON public.store_bundle_items;
CREATE POLICY "bundle publico" ON public.store_bundle_items FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = bundle_id)
  AND EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id)
);