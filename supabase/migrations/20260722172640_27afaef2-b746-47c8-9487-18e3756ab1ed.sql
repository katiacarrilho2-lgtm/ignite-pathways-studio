ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS desconto_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_final_cents integer;