CREATE TABLE public.repasse_parceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  percentual numeric NOT NULL DEFAULT 50,
  dia_fechamento integer NOT NULL DEFAULT 27,
  dia_pagamento integer NOT NULL DEFAULT 15,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasse_parceiros TO authenticated;
GRANT ALL ON public.repasse_parceiros TO service_role;
ALTER TABLE public.repasse_parceiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro manage repasse_parceiros" ON public.repasse_parceiros
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'mod_financeiro'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'mod_financeiro'::app_permission));
CREATE TRIGGER trg_repasse_parceiros_upd BEFORE UPDATE ON public.repasse_parceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.repasse_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
  parceiro_id uuid NOT NULL REFERENCES public.repasse_parceiros(id) ON DELETE RESTRICT,
  percentual numeric NOT NULL DEFAULT 50,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasse_contratos TO authenticated;
GRANT ALL ON public.repasse_contratos TO service_role;
ALTER TABLE public.repasse_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro manage repasse_contratos" ON public.repasse_contratos
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'mod_financeiro'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'mod_financeiro'::app_permission));
CREATE TRIGGER trg_repasse_contratos_upd BEFORE UPDATE ON public.repasse_contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.repasse_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.repasse_contratos(id) ON DELETE CASCADE,
  installment_id uuid NOT NULL UNIQUE REFERENCES public.installments(id) ON DELETE CASCADE,
  numero integer NOT NULL DEFAULT 1,
  valor_aluno_cents integer NOT NULL DEFAULT 0,
  valor_repasse_cents integer NOT NULL DEFAULT 0,
  previsao date,
  status text NOT NULL DEFAULT 'a_receber',
  recebido_em date,
  valor_recebido_cents integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_repasse_parcelas_contrato ON public.repasse_parcelas(contrato_id);
CREATE INDEX idx_repasse_parcelas_previsao ON public.repasse_parcelas(previsao);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasse_parcelas TO authenticated;
GRANT ALL ON public.repasse_parcelas TO service_role;
ALTER TABLE public.repasse_parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro manage repasse_parcelas" ON public.repasse_parcelas
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'mod_financeiro'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'mod_financeiro'::app_permission));
CREATE TRIGGER trg_repasse_parcelas_upd BEFORE UPDATE ON public.repasse_parcelas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.repasse_previsao(_venc date, _fechamento integer, _pagamento integer)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE base date; pay_month date; dia integer;
BEGIN
  IF _venc IS NULL THEN RETURN NULL; END IF;
  base := date_trunc('month', _venc)::date;
  IF EXTRACT(DAY FROM _venc)::int <= COALESCE(_fechamento, 27) THEN
    pay_month := (base + INTERVAL '1 month')::date;
  ELSE
    pay_month := (base + INTERVAL '2 month')::date;
  END IF;
  dia := LEAST(GREATEST(COALESCE(_pagamento, 15), 1), 28);
  RETURN pay_month + (dia - 1);
END $$;

CREATE OR REPLACE FUNCTION public.repasse_sync_contrato(_contrato_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.repasse_contratos; p public.repasse_parceiros; i record; v_valor integer;
BEGIN
  SELECT * INTO c FROM public.repasse_contratos WHERE id = _contrato_id;
  IF c.id IS NULL THEN RETURN; END IF;
  SELECT * INTO p FROM public.repasse_parceiros WHERE id = c.parceiro_id;

  DELETE FROM public.repasse_parcelas rp
   WHERE rp.contrato_id = c.id
     AND NOT EXISTS (SELECT 1 FROM public.installments i2 WHERE i2.id = rp.installment_id AND i2.enrollment_id = c.enrollment_id);

  FOR i IN SELECT * FROM public.installments WHERE enrollment_id = c.enrollment_id ORDER BY numero LOOP
    v_valor := GREATEST(COALESCE(i.valor_final_cents, i.valor_cents, 0), 0);
    INSERT INTO public.repasse_parcelas
      (contrato_id, installment_id, numero, valor_aluno_cents, valor_repasse_cents, previsao, status)
    VALUES
      (c.id, i.id, i.numero, v_valor,
       round(v_valor * COALESCE(c.percentual,0) / 100.0)::integer,
       public.repasse_previsao(i.vencimento, p.dia_fechamento, p.dia_pagamento),
       'a_receber')
    ON CONFLICT (installment_id) DO UPDATE SET
      contrato_id = EXCLUDED.contrato_id,
      numero = EXCLUDED.numero,
      valor_aluno_cents = CASE WHEN public.repasse_parcelas.status IN ('recebido','divergencia') THEN public.repasse_parcelas.valor_aluno_cents ELSE EXCLUDED.valor_aluno_cents END,
      valor_repasse_cents = CASE WHEN public.repasse_parcelas.status IN ('recebido','divergencia') THEN public.repasse_parcelas.valor_repasse_cents ELSE EXCLUDED.valor_repasse_cents END,
      previsao = CASE WHEN public.repasse_parcelas.status IN ('recebido','divergencia') THEN public.repasse_parcelas.previsao ELSE EXCLUDED.previsao END,
      updated_at = now();
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.repasse_sync_contrato(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repasse_sync_contrato(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.repasse_contrato_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.repasse_sync_contrato(NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_repasse_contrato_sync AFTER INSERT OR UPDATE OF parceiro_id, percentual ON public.repasse_contratos
  FOR EACH ROW EXECUTE FUNCTION public.repasse_contrato_after_change();

CREATE OR REPLACE FUNCTION public.repasse_installment_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  SELECT id INTO cid FROM public.repasse_contratos WHERE enrollment_id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  IF cid IS NOT NULL THEN PERFORM public.repasse_sync_contrato(cid); END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_repasse_installment_sync AFTER INSERT OR UPDATE OF valor_cents, valor_final_cents, vencimento, numero OR DELETE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.repasse_installment_after_change();
