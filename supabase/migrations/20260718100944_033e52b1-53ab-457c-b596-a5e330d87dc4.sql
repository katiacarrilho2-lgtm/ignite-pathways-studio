
-- company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  inscricao_estadual text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  telefone text,
  whatsapp text,
  email text,
  site text,
  instagram text,
  facebook text,
  linkedin text,
  responsavel_nome text,
  responsavel_cargo text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings read all" ON public.company_settings;
CREATE POLICY "company_settings read all"
  ON public.company_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "company_settings staff manage" ON public.company_settings;
CREATE POLICY "company_settings staff manage"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'::app_permission));

DROP TRIGGER IF EXISTS company_settings_updated ON public.company_settings;
CREATE TRIGGER company_settings_updated
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.company_settings (
  razao_social, nome_fantasia, cnpj, endereco, cidade, uf,
  email, site, responsavel_nome, responsavel_cargo
)
SELECT
  'Multplick Educação Profissional e Corporativa',
  'Multplick', '', '', 'São José do Rio Preto', 'SP',
  'contato@multplick.live', 'multplick.live',
  'Kátia Joaquim', 'Diretora Comercial'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- contas_comerciais (versão simplificada, TEXT em vez de ENUM)
CREATE TABLE IF NOT EXISTS public.contas_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  tipo_da_conta text NOT NULL DEFAULT 'principal',
  status text NOT NULL DEFAULT 'ativa',
  parent_id uuid NULL REFERENCES public.contas_comerciais(id) ON DELETE SET NULL,
  configuracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  documento_fiscal text,
  email_contato text,
  telefone_contato text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_comerciais TO authenticated;
GRANT ALL ON public.contas_comerciais TO service_role;

ALTER TABLE public.contas_comerciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin gerencia contas comerciais" ON public.contas_comerciais;
CREATE POLICY "Super admin gerencia contas comerciais"
  ON public.contas_comerciais FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

-- account_id em enrollments e finance_entries
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.contas_comerciais(id) ON DELETE SET NULL;

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.contas_comerciais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_account ON public.enrollments(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_account ON public.finance_entries(account_id);
