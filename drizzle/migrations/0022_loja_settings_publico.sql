GRANT SELECT ON public.store_settings TO anon;
CREATE POLICY "settings publico" ON public.store_settings FOR SELECT USING (true);