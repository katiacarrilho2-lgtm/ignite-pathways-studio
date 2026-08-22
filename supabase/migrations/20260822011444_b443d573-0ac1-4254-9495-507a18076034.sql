CREATE POLICY "staff read internal-docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'internal-docs' AND public.is_staff(auth.uid()));
CREATE POLICY "staff upload internal-docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'internal-docs' AND public.is_staff(auth.uid()));
CREATE POLICY "staff update internal-docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'internal-docs' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete internal-docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'internal-docs' AND public.is_staff(auth.uid()));