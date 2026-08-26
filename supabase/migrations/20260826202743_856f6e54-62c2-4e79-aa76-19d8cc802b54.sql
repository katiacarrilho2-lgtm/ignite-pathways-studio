ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS comprovante_path text,
  ADD COLUMN IF NOT EXISTS comprovante_nome text;