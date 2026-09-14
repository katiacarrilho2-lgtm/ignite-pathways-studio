-- ============================================================
-- Etapa 1 — Base de dados: pedidos, pagamentos, avaliações e certificados
-- 100% aditivo. Nenhum DROP, nenhuma renomeação, nenhum dado apagado.
-- ============================================================

-- ---------- 1. Ampliação de courses (opt-in manual) ----------
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS tipo_curso text NOT NULL DEFAULT 'curso_livre',
  ADD COLUMN IF NOT EXISTS venda_livre boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_avaliacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emite_certificado_automatico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carga_horaria_horas integer;

-- ---------- 2. Ampliação de certificates (tabela única já existente) ----------
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.contas_comerciais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'curso_livre',
  ADD COLUMN IF NOT EXISTS attempt_id uuid,
  ADD COLUMN IF NOT EXISTS codigo_validacao text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valido',
  ADD COLUMN IF NOT EXISTS carga_horaria_horas integer,
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text;

-- backfill da conta a partir da matrícula correspondente (aditivo)
UPDATE public.certificates c
   SET account_id = e.account_id
  FROM public.enrollments e
 WHERE c.account_id IS NULL
   AND e.user_id = c.user_id
   AND e.course_id = c.course_id
   AND e.account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_codigo_validacao_uidx
  ON public.certificates(codigo_validacao) WHERE codigo_validacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS certificates_account_idx ON public.certificates(account_id);

-- ---------- 3. Pedidos ----------
CREATE TABLE public.livre_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  user_id uuid,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  cpf text,
  valor_cents integer NOT NULL DEFAULT 0,
  desconto_cents integer NOT NULL DEFAULT 0,
  valor_final_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  origem text,
  cupom text,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  seller_id uuid,
  paid_at timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT livre_orders_status_chk CHECK (status IN ('aguardando','pago','cancelado','reembolsado','expirado'))
);

CREATE INDEX livre_orders_account_status_idx ON public.livre_orders(account_id, status);
CREATE INDEX livre_orders_user_idx ON public.livre_orders(user_id);
CREATE INDEX livre_orders_course_idx ON public.livre_orders(course_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livre_orders TO authenticated;
GRANT ALL ON public.livre_orders TO service_role;
ALTER TABLE public.livre_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia pedidos" ON public.livre_orders
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "aluno ve proprio pedido" ON public.livre_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY account_isolation_livre_orders ON public.livre_orders
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

CREATE TRIGGER livre_orders_updated_at BEFORE UPDATE ON public.livre_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. Pagamentos do pedido ----------
CREATE TABLE public.livre_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.livre_orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercado_pago',
  external_id text,
  preference_id text,
  metodo text,
  valor_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  raw jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT livre_order_payments_status_chk CHECK (status IN ('pendente','aprovado','recusado','cancelado','estornado'))
);

CREATE INDEX livre_order_payments_order_idx ON public.livre_order_payments(order_id);
CREATE INDEX livre_order_payments_external_idx ON public.livre_order_payments(provider, external_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livre_order_payments TO authenticated;
GRANT ALL ON public.livre_order_payments TO service_role;
ALTER TABLE public.livre_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia pagamentos do pedido" ON public.livre_order_payments
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "aluno ve pagamento do proprio pedido" ON public.livre_order_payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.livre_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE POLICY account_isolation_livre_order_payments ON public.livre_order_payments
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

CREATE TRIGGER livre_order_payments_updated_at BEFORE UPDATE ON public.livre_order_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 5. Banco de questões (resposta correta nunca exposta ao aluno) ----------
CREATE TABLE public.exam_questions_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'avaliacao_conhecimentos',
  tema text,
  dificuldade text NOT NULL DEFAULT 'media',
  enunciado text NOT NULL,
  alternativas jsonb NOT NULL DEFAULT '[]'::jsonb,
  correta_index integer NOT NULL DEFAULT 0,
  explicacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_questions_dificuldade_chk CHECK (dificuldade IN ('facil','media','dificil'))
);

CREATE INDEX exam_questions_bank_course_idx ON public.exam_questions_bank(course_id) WHERE ativo;

-- sem acesso para anon; alunos NUNCA leem esta tabela diretamente
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions_bank TO authenticated;
GRANT ALL ON public.exam_questions_bank TO service_role;
ALTER TABLE public.exam_questions_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia banco de questoes" ON public.exam_questions_bank
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY account_isolation_exam_questions_bank ON public.exam_questions_bank
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

CREATE TRIGGER exam_questions_bank_updated_at BEFORE UPDATE ON public.exam_questions_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6. Configuração da avaliação ----------
CREATE TABLE public.exam_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'avaliacao_conhecimentos',
  ativo boolean NOT NULL DEFAULT false,
  nota_minima integer NOT NULL DEFAULT 70,
  qtd_questoes integer NOT NULL DEFAULT 10,
  tempo_minutos integer,
  tentativas_permitidas integer NOT NULL DEFAULT 3,
  embaralhar_questoes boolean NOT NULL DEFAULT true,
  embaralhar_alternativas boolean NOT NULL DEFAULT true,
  libera_certificado boolean NOT NULL DEFAULT false,
  instrucoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_configs_course_uk UNIQUE (course_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_configs TO authenticated;
GRANT ALL ON public.exam_configs TO service_role;
ALTER TABLE public.exam_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia config de prova" ON public.exam_configs
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "aluno matriculado le config de prova" ON public.exam_configs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = exam_configs.course_id AND e.user_id = auth.uid()));

CREATE POLICY account_isolation_exam_configs ON public.exam_configs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

CREATE TRIGGER exam_configs_updated_at BEFORE UPDATE ON public.exam_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 7. Tentativas ----------
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  tentativa integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'em_andamento',
  questoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  nota numeric(5,2),
  acertos integer,
  total_questoes integer,
  aprovado boolean,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_attempts_status_chk CHECK (status IN ('em_andamento','finalizada','expirada','anulada'))
);

CREATE INDEX exam_attempts_user_course_idx ON public.exam_attempts(user_id, course_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia tentativas" ON public.exam_attempts
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "aluno ve propria tentativa" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY account_isolation_exam_attempts ON public.exam_attempts
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

CREATE TRIGGER exam_attempts_updated_at BEFORE UPDATE ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 8. Respostas ----------
CREATE TABLE public.exam_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.exam_questions_bank(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 1,
  resposta_index integer,
  correta boolean,
  respondido_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX exam_attempt_answers_attempt_idx ON public.exam_attempt_answers(attempt_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempt_answers TO authenticated;
GRANT ALL ON public.exam_attempt_answers TO service_role;
ALTER TABLE public.exam_attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia respostas" ON public.exam_attempt_answers
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "aluno ve respostas da propria tentativa" ON public.exam_attempt_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));

CREATE POLICY account_isolation_exam_attempt_answers ON public.exam_attempt_answers
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

-- ---------- 9. Configurações do certificado ----------
CREATE TABLE public.certificate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL DEFAULT public.current_account_id() REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  empresa text NOT NULL DEFAULT 'Multplick Formação Profissional',
  cnpj text,
  responsavel_nome text,
  responsavel_cargo text,
  cidade text,
  uf text,
  logo_url text,
  assinatura_url text,
  texto_padrao text,
  validacao_base_url text,
  singleton boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificate_settings_account_uk UNIQUE (account_id, singleton)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_settings TO authenticated;
GRANT ALL ON public.certificate_settings TO service_role;
ALTER TABLE public.certificate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff gerencia config do certificado" ON public.certificate_settings
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_courses'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY account_isolation_certificate_settings ON public.certificate_settings
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.account_visible(account_id))
  WITH CHECK (public.account_can_write(account_id));

CREATE TRIGGER certificate_settings_updated_at BEFORE UPDATE ON public.certificate_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 10. Leitura segura de questões pelo aluno (sem resposta correta) ----------
CREATE OR REPLACE FUNCTION public.exam_questoes_da_tentativa(_attempt_id uuid)
RETURNS TABLE(question_id uuid, ordem integer, enunciado text, alternativas jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, ans.ordem, q.enunciado, q.alternativas
  FROM public.exam_attempt_answers ans
  JOIN public.exam_attempts a ON a.id = ans.attempt_id
  JOIN public.exam_questions_bank q ON q.id = ans.question_id
  WHERE ans.attempt_id = _attempt_id
    AND auth.uid() IS NOT NULL
    AND (a.user_id = auth.uid() OR public.has_permission(auth.uid(), 'manage_courses'))
  ORDER BY ans.ordem
$$;

REVOKE ALL ON FUNCTION public.exam_questoes_da_tentativa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exam_questoes_da_tentativa(uuid) TO authenticated;

-- ---------- 11. Auditoria ----------
CREATE OR REPLACE FUNCTION public.livre_order_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
    VALUES (auth.uid(), NULL, 'pedidos_curso_livre', 'status_alterado',
            format('Pedido %s: %s -> %s', NEW.id, OLD.status, NEW.status), NEW.id);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
    VALUES (auth.uid(), NULL, 'pedidos_curso_livre', 'criado',
            format('Pedido criado para %s', NEW.email), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER livre_orders_audit AFTER INSERT OR UPDATE ON public.livre_orders
  FOR EACH ROW EXECUTE FUNCTION public.livre_order_audit();

CREATE OR REPLACE FUNCTION public.certificate_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
    VALUES (auth.uid(), NULL, 'certificados', 'emitido',
            format('Certificado %s emitido', COALESCE(NEW.numero, NEW.id::text)), NEW.id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
    VALUES (auth.uid(), NULL, 'certificados', 'status_alterado',
            format('Certificado %s: %s -> %s', COALESCE(NEW.numero, NEW.id::text), OLD.status, NEW.status), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER certificates_audit AFTER INSERT OR UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.certificate_audit();
