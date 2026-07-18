
-- 1) enrollment_applications: colunas usadas pela tela de Pré-matrícula
ALTER TABLE public.enrollment_applications
  ADD COLUMN IF NOT EXISTS entry_date date,
  ADD COLUMN IF NOT EXISTS payment_reminder_date date,
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_amount_cents integer,
  ADD COLUMN IF NOT EXISTS course_modality text,
  ADD COLUMN IF NOT EXISTS promo_code text;

CREATE INDEX IF NOT EXISTS idx_enrollment_apps_paid_at ON public.enrollment_applications(paid_at);
CREATE INDEX IF NOT EXISTS idx_enrollment_apps_seller ON public.enrollment_applications(seller_id);

-- 2) enrollment_exams: nome do candidato exibido no admin
ALTER TABLE public.enrollment_exams
  ADD COLUMN IF NOT EXISTS candidate_name text;

-- 3) finance_entries: contas a pagar / a receber avulsas
CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('pagar','receber')),
  name text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  notes text,
  installment_no int,
  installment_total int,
  series_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage finance entries" ON public.finance_entries;
CREATE POLICY "Staff manage finance entries"
  ON public.finance_entries
  FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'::app_permission));

DROP TRIGGER IF EXISTS finance_entries_updated_at ON public.finance_entries;
CREATE TRIGGER finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS finance_entries_kind_due_idx ON public.finance_entries(kind, due_date);
CREATE INDEX IF NOT EXISTS finance_entries_due_date_idx ON public.finance_entries (due_date);
CREATE INDEX IF NOT EXISTS finance_entries_series_idx ON public.finance_entries (series_id);
