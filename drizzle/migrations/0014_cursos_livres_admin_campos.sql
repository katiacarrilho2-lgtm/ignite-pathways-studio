-- Etapa 2 — campos administrativos de curso livre (aditivo)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS preco_promocional_cents integer,
  ADD COLUMN IF NOT EXISTS promocao_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promocao_inicio date,
  ADD COLUMN IF NOT EXISTS promocao_fim date,
  ADD COLUMN IF NOT EXISTS certificado_texto_modo text NOT NULL DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS certificado_texto_custom text;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_certificado_texto_modo_chk
  CHECK (certificado_texto_modo IN ('padrao','personalizado')) NOT VALID;

ALTER TABLE public.exam_configs
  ADD COLUMN IF NOT EXISTS mostrar_respostas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervalo_nova_tentativa_horas integer;