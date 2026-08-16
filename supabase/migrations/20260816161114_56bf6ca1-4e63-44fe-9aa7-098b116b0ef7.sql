CREATE TABLE public.corp_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  segmento text,
  cidade text,
  uf text,
  contato_nome text,
  contato_cargo text,
  contato_email text,
  contato_telefone text,
  colaboradores integer,
  estagio text NOT NULL DEFAULT 'prospeccao',
  valor_negociacao_cents integer NOT NULL DEFAULT 0,
  owner_id uuid,
  proxima_acao_em date,
  origem text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corp_empresas TO authenticated;
GRANT ALL ON public.corp_empresas TO service_role;
ALTER TABLE public.corp_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corp_empresas_staff" ON public.corp_empresas FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_corp_empresas_upd BEFORE UPDATE ON public.corp_empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.corp_reunioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.corp_empresas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'online',
  scheduled_at timestamptz NOT NULL,
  participantes text,
  resultado text NOT NULL DEFAULT 'agendada',
  notas text,
  proxima_acao text,
  proxima_acao_em date,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corp_reunioes TO authenticated;
GRANT ALL ON public.corp_reunioes TO service_role;
ALTER TABLE public.corp_reunioes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corp_reunioes_staff" ON public.corp_reunioes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_corp_reunioes_upd BEFORE UPDATE ON public.corp_reunioes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.corp_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.corp_empresas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo text,
  valor_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberta',
  enviada_em date,
  validade_em date,
  owner_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corp_propostas TO authenticated;
GRANT ALL ON public.corp_propostas TO service_role;
ALTER TABLE public.corp_propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corp_propostas_staff" ON public.corp_propostas FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_corp_propostas_upd BEFORE UPDATE ON public.corp_propostas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.corp_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.corp_empresas(id) ON DELETE SET NULL,
  proposta_id uuid REFERENCES public.corp_propostas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo text,
  valor_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  inicio_em date,
  fim_em date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corp_contratos TO authenticated;
GRANT ALL ON public.corp_contratos TO service_role;
ALTER TABLE public.corp_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corp_contratos_staff" ON public.corp_contratos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_corp_contratos_upd BEFORE UPDATE ON public.corp_contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.corp_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid REFERENCES public.corp_contratos(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.corp_empresas(id) ON DELETE SET NULL,
  descricao text,
  valor_cents integer NOT NULL DEFAULT 0,
  vencimento date,
  status text NOT NULL DEFAULT 'pendente',
  pago_em timestamptz,
  nota_fiscal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corp_faturamento TO authenticated;
GRANT ALL ON public.corp_faturamento TO service_role;
ALTER TABLE public.corp_faturamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corp_faturamento_staff" ON public.corp_faturamento FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_corp_faturamento_upd BEFORE UPDATE ON public.corp_faturamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();