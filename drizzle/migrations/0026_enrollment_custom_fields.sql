-- Campos personalizados da ficha de pré-matrícula
CREATE TABLE IF NOT EXISTS public.enrollment_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  placeholder text,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.enrollment_custom_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_custom_fields TO authenticated;
GRANT ALL ON public.enrollment_custom_fields TO service_role;

ALTER TABLE public.enrollment_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campos ativos sao publicos" ON public.enrollment_custom_fields;
CREATE POLICY "campos ativos sao publicos"
ON public.enrollment_custom_fields
FOR SELECT
TO anon, authenticated
USING (active = true OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff gerencia campos" ON public.enrollment_custom_fields;
CREATE POLICY "staff gerencia campos"
ON public.enrollment_custom_fields
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_ecf_updated_at ON public.enrollment_custom_fields;
CREATE TRIGGER trg_ecf_updated_at
BEFORE UPDATE ON public.enrollment_custom_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guarda as respostas dos campos personalizados na ficha
ALTER TABLE public.enrollment_applications
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;