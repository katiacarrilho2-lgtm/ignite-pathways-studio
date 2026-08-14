
CREATE POLICY "student docs own or staff select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-docs' AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "student docs own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-docs' AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "student docs own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-docs' AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "student docs own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-docs' AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));

CREATE POLICY "comprovantes staff write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comprovantes' AND public.is_staff(auth.uid()));
CREATE POLICY "comprovantes staff update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'comprovantes' AND public.is_staff(auth.uid()));
CREATE POLICY "comprovantes staff delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'comprovantes' AND public.is_staff(auth.uid()));
CREATE POLICY "comprovantes read staff or affiliate" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'comprovantes' AND (public.is_staff(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.affiliates a WHERE a.user_id = auth.uid()
    AND (storage.foldername(name))[1] = a.id::text)));
