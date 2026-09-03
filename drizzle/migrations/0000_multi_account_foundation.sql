-- ============================================================
-- ETAPA 1 — FUNDAÇÃO MULTI-CONTA / MULTI-POLO (aditiva)
-- Conta ROOT = 00000000-0000-0000-0000-000000000001 (Multplick Oficial)
-- ============================================================

-- 1) Contexto de conta ativa do Master (validado no backend, nunca só no browser)
CREATE TABLE IF NOT EXISTS public.account_context (
  user_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_context TO authenticated;
GRANT ALL ON public.account_context TO service_role;
ALTER TABLE public.account_context ENABLE ROW LEVEL SECURITY;

-- 2) account_id em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_id uuid;
UPDATE public.profiles SET account_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE account_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN account_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS idx_profiles_account ON public.profiles(account_id);

-- 3) Funções de isolamento
CREATE OR REPLACE FUNCTION public.account_root_id()
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;

CREATE OR REPLACE FUNCTION public.is_network_master(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _uid
      AND ur.role IN ('super_admin','admin')
      AND COALESCE(p.account_id, public.account_root_id()) = public.account_root_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.user_home_account_id(_uid uuid DEFAULT auth.uid())
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT p.account_id FROM public.profiles p WHERE p.user_id = _uid), public.account_root_id())
$$;

-- conta ativa: Master pode assumir outra conta (registro em account_context, validado no banco)
CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_network_master(auth.uid())
      THEN COALESCE((SELECT ac.account_id FROM public.account_context ac WHERE ac.user_id = auth.uid()),
                    public.user_home_account_id(auth.uid()))
    ELSE public.user_home_account_id(auth.uid())
  END
$$;

-- leitura: master vê tudo; demais só a própria conta (NULL = legado, tratado como ROOT)
CREATE OR REPLACE FUNCTION public.account_visible(_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_network_master(auth.uid())
      OR COALESCE(_account, public.account_root_id()) = public.user_home_account_id(auth.uid())
$$;

-- escrita: só na própria conta; master pode escrever na conta que estiver visualizando
CREATE OR REPLACE FUNCTION public.account_can_write(_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_network_master(auth.uid()) THEN true
    ELSE COALESCE(_account, public.account_root_id()) = public.user_home_account_id(auth.uid())
  END
$$;

REVOKE EXECUTE ON FUNCTION public.is_network_master(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_home_account_id(uuid) FROM anon;

-- 4) Policies do account_context (troca de unidade só para Master)
DROP POLICY IF EXISTS "master manages own account context" ON public.account_context;
CREATE POLICY "master manages own account context" ON public.account_context
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_network_master(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_network_master(auth.uid()));

-- 5) Auditoria da troca de unidade
CREATE OR REPLACE FUNCTION public.account_context_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
  SELECT NEW.user_id,
         COALESCE(p.display_name, p.email, 'Master'),
         'rede',
         'trocar_unidade',
         'Conta original: ' || COALESCE((SELECT nome FROM public.contas_comerciais WHERE id = public.user_home_account_id(NEW.user_id)), '?')
           || ' → Conta visualizada: ' || COALESCE((SELECT nome FROM public.contas_comerciais WHERE id = NEW.account_id), '?'),
         NEW.account_id::text
  FROM public.profiles p WHERE p.user_id = NEW.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_account_context_audit ON public.account_context;
CREATE TRIGGER trg_account_context_audit
AFTER INSERT OR UPDATE ON public.account_context
FOR EACH ROW EXECUTE FUNCTION public.account_context_audit();

DROP TRIGGER IF EXISTS trg_account_context_upd ON public.account_context;
CREATE TRIGGER trg_account_context_upd
BEFORE UPDATE ON public.account_context
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) account_id nas tabelas dos módulos do Polo + backfill + default + isolamento restritivo
DO $do$
DECLARE
  t text;
  novas text[] := ARRAY[
    'enrollment_applications','student_profiles','leads_bank','crm_goals','affiliates',
    'affiliate_referrals','support_tickets','agenda_events','admin_tasks','attendance',
    'class_sessions','classrooms','pedagogic_occurrences','inventory_items','inventory_movements',
    'internal_requests','internal_documents','doc_links','notifications','patrimonio',
    'maintenance_requests','turma_alunos','crm_lead_events','crm_appointments'
  ];
  todas text[];
BEGIN
  -- 6a) adiciona coluna + backfill nas tabelas novas
  FOREACH t IN ARRAY novas LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS account_id uuid', t);
    EXECUTE format('UPDATE public.%I SET account_id = public.account_root_id() WHERE account_id IS NULL', t);
  END LOOP;

  -- 6b) default + índice + policy restritiva em todas as tabelas com account_id
  todas := novas || ARRAY['crm_leads','turmas','enrollments','installments','finance_entries','profiles'];

  FOREACH t IN ARRAY todas LOOP
    EXECUTE format('UPDATE public.%I SET account_id = public.account_root_id() WHERE account_id IS NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN account_id SET DEFAULT public.current_account_id()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(account_id)', 'idx_'||t||'_account', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'account_isolation_'||t, t);
    IF t = 'profiles' THEN
      EXECUTE format($f$
        CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
        USING (user_id = auth.uid() OR public.account_visible(account_id))
        WITH CHECK (user_id = auth.uid() OR public.account_can_write(account_id))
      $f$, 'account_isolation_'||t, t);
    ELSE
      EXECUTE format($f$
        CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
        USING (public.account_visible(account_id))
        WITH CHECK (public.account_can_write(account_id))
      $f$, 'account_isolation_'||t, t);
    END IF;
  END LOOP;
END $do$;

-- 7) profiles.account_id NOT NULL é seguro (backfill acima cobriu 100% das linhas)
ALTER TABLE public.profiles ALTER COLUMN account_id SET NOT NULL;
