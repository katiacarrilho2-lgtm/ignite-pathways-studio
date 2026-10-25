ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instituicao text NOT NULL DEFAULT 'FL'
  CHECK (instituicao IN ('U','FL','M','U/FL'));
UPDATE public.courses SET instituicao = 'M' WHERE lower(category) LIKE 'profissionaliz%' OR lower(category) LIKE 'normas%';
