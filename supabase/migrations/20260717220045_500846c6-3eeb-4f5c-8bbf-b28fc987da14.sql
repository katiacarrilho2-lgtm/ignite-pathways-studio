ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS account_id uuid,
  ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS urgente_resolvido_at timestamptz;
ALTER TABLE public.crm_lead_events ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.crm_appointments ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.turma_alunos ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.enrollment_applications ADD COLUMN IF NOT EXISTS promo_code text;