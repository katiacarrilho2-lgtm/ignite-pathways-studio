DROP POLICY IF EXISTS "campos ativos sao publicos" ON public.enrollment_custom_fields;

CREATE POLICY "campos ativos sao publicos"
ON public.enrollment_custom_fields
FOR SELECT
TO anon
USING (active = true);

DROP POLICY IF EXISTS "campos visiveis para logados" ON public.enrollment_custom_fields;
CREATE POLICY "campos visiveis para logados"
ON public.enrollment_custom_fields
FOR SELECT
TO authenticated
USING (true);