DROP POLICY IF EXISTS "campos visiveis para logados" ON public.enrollment_custom_fields;
CREATE POLICY "campos ativos visiveis para logados" ON public.enrollment_custom_fields FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Course images public read" ON storage.objects;
CREATE POLICY "Editors read course images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'course-images' AND public.has_permission(auth.uid(), 'manage_courses'::public.app_permission));