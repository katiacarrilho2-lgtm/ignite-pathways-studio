ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS urgente_marcado_em timestamptz,
  ADD COLUMN IF NOT EXISTS urgente_resolvido_em timestamptz;