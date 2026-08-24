ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS orgao_emissor text,
  ADD COLUMN IF NOT EXISTS rg_emissao date,
  ADD COLUMN IF NOT EXISTS naturalidade text,
  ADD COLUMN IF NOT EXISTS pai text,
  ADD COLUMN IF NOT EXISTS mae text,
  ADD COLUMN IF NOT EXISTS escolaridade text,
  ADD COLUMN IF NOT EXISTS ano_formacao text,
  ADD COLUMN IF NOT EXISTS instituicao_formacao text,
  ADD COLUMN IF NOT EXISTS curso_escolhido text;