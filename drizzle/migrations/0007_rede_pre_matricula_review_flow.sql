-- Etapa 4 — Fluxo de pré-matrículas da Rede (Polo -> Matriz) + alertas
ALTER TABLE public.enrollment_applications
  ADD COLUMN IF NOT EXISTS network_review_status text,
  ADD COLUMN IF NOT EXISTS network_review_message text,
  ADD COLUMN IF NOT EXISTS network_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS network_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS network_submitted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_applications_network_review_status_check') THEN
    ALTER TABLE public.enrollment_applications
      ADD CONSTRAINT enrollment_applications_network_review_status_check
      CHECK (network_review_status IS NULL OR network_review_status IN
        ('aguardando_analise','em_analise','correcao_solicitada','aprovada','recusada','matriculada'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enrollment_applications_network_review
  ON public.enrollment_applications (network_review_status, account_id);

-- ============ helpers de notificação ============
CREATE OR REPLACE FUNCTION public.notify_network_master(_titulo text, _corpo text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, tipo, titulo, corpo, link, account_id)
  SELECT p.user_id, 'solicitacao', _titulo, _corpo, _link, public.account_root_id()
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'super_admin'
  WHERE p.account_id = public.account_root_id();
$$;

CREATE OR REPLACE FUNCTION public.notify_account_users(_account uuid, _titulo text, _corpo text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, tipo, titulo, corpo, link, account_id)
  SELECT p.user_id, 'solicitacao', _titulo, _corpo, _link, _account
  FROM public.profiles p
  WHERE p.account_id = _account AND coalesce(p.ativo, true);
$$;

REVOKE ALL ON FUNCTION public.notify_network_master(text,text,text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_account_users(uuid,text,text,text) FROM public, anon, authenticated;

-- ============ INSERT: ficha do Polo entra na fila da Rede ============
CREATE OR REPLACE FUNCTION public.network_pre_matricula_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.account_id, public.account_root_id()) <> public.account_root_id() THEN
    NEW.network_review_status := 'aguardando_analise';
    NEW.network_submitted_at := now();
    NEW.submitted_by := coalesce(NEW.submitted_by, auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.network_pre_matricula_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _polo text;
BEGIN
  IF NEW.network_review_status = 'aguardando_analise' THEN
    SELECT nome INTO _polo FROM public.contas_comerciais WHERE id = NEW.account_id;
    PERFORM public.notify_network_master(
      'NOVA PRÉ-MATRÍCULA DA REDE — ' || coalesce(_polo, 'Polo'),
      NEW.full_name || ' · ' || NEW.course_title,
      '/admin/licenciados/matriculas?ficha=' || NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_network_pre_matricula_bi ON public.enrollment_applications;
CREATE TRIGGER trg_network_pre_matricula_bi BEFORE INSERT ON public.enrollment_applications
FOR EACH ROW EXECUTE FUNCTION public.network_pre_matricula_before_insert();

DROP TRIGGER IF EXISTS trg_network_pre_matricula_ai ON public.enrollment_applications;
CREATE TRIGGER trg_network_pre_matricula_ai AFTER INSERT ON public.enrollment_applications
FOR EACH ROW EXECUTE FUNCTION public.network_pre_matricula_after_insert();

-- ============ UPDATE: guarda de segurança + notificações ============
CREATE OR REPLACE FUNCTION public.network_pre_matricula_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _allow boolean;
BEGIN
  IF coalesce(NEW.account_id, public.account_root_id()) = public.account_root_id() THEN
    RETURN NEW;
  END IF;

  _allow := coalesce(current_setting('app.network_flow', true), '') = 'on'
            OR public.is_network_master(auth.uid());

  IF NEW.network_review_status IS DISTINCT FROM OLD.network_review_status AND NOT _allow THEN
    RAISE EXCEPTION 'Somente a Matriz Multplick pode alterar a análise da ficha';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'matriculado' THEN
    IF NOT _allow THEN
      RAISE EXCEPTION 'Somente a Matriz Multplick pode matricular fichas da Rede';
    END IF;
    NEW.network_review_status := 'matriculada';
    NEW.network_reviewed_at := now();
    NEW.network_reviewed_by := auth.uid();
  END IF;

  -- campos de parecer nunca são editáveis pelo Polo
  IF NOT _allow THEN
    NEW.network_review_message := OLD.network_review_message;
    NEW.network_reviewed_at := OLD.network_reviewed_at;
    NEW.network_reviewed_by := OLD.network_reviewed_by;
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.network_pre_matricula_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _polo text; _titulo text;
BEGIN
  IF NEW.network_review_status IS NOT DISTINCT FROM OLD.network_review_status THEN
    RETURN NEW;
  END IF;
  SELECT nome INTO _polo FROM public.contas_comerciais WHERE id = NEW.account_id;

  IF NEW.network_review_status = 'aguardando_analise' THEN
    PERFORM public.notify_network_master(
      'PRÉ-MATRÍCULA REENVIADA — ' || coalesce(_polo, 'Polo'),
      NEW.full_name || ' · ' || NEW.course_title,
      '/admin/licenciados/matriculas?ficha=' || NEW.id::text);
    RETURN NEW;
  END IF;

  _titulo := CASE NEW.network_review_status
    WHEN 'em_analise' THEN 'PRÉ-MATRÍCULA EM ANÁLISE'
    WHEN 'correcao_solicitada' THEN 'CORREÇÃO SOLICITADA PELA MULTPLICK'
    WHEN 'aprovada' THEN 'PRÉ-MATRÍCULA APROVADA'
    WHEN 'recusada' THEN 'PRÉ-MATRÍCULA RECUSADA'
    WHEN 'matriculada' THEN 'ALUNO MATRICULADO'
    ELSE NULL END;

  IF _titulo IS NOT NULL THEN
    PERFORM public.notify_account_users(NEW.account_id, _titulo,
      NEW.full_name || ' · ' || NEW.course_title ||
        coalesce(' — ' || nullif(NEW.network_review_message, ''), ''),
      '/polo/pre-matriculas?ficha=' || NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_network_pre_matricula_bu ON public.enrollment_applications;
CREATE TRIGGER trg_network_pre_matricula_bu BEFORE UPDATE ON public.enrollment_applications
FOR EACH ROW EXECUTE FUNCTION public.network_pre_matricula_before_update();

DROP TRIGGER IF EXISTS trg_network_pre_matricula_au ON public.enrollment_applications;
CREATE TRIGGER trg_network_pre_matricula_au AFTER UPDATE ON public.enrollment_applications
FOR EACH ROW EXECUTE FUNCTION public.network_pre_matricula_after_update();

-- ============ RPC: fila da Rede ============
CREATE OR REPLACE FUNCTION public.rede_fila_pre_matriculas()
RETURNS TABLE (
  id uuid, account_id uuid, polo text, full_name text, course_title text,
  course_id uuid, status text, network_review_status text, network_review_message text,
  network_reviewed_at timestamptz, network_submitted_at timestamptz,
  submitted_by uuid, submitted_by_name text, created_at timestamptz,
  city text, state text, phone text, email text, cpf text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.account_id, c.nome, a.full_name, a.course_title, a.course_id, a.status,
         coalesce(a.network_review_status, 'aguardando_analise'), a.network_review_message,
         a.network_reviewed_at, coalesce(a.network_submitted_at, a.created_at),
         a.submitted_by, p.display_name, a.created_at, a.city, a.state, a.phone, a.email, a.cpf
  FROM public.enrollment_applications a
  JOIN public.contas_comerciais c ON c.id = a.account_id
  LEFT JOIN public.profiles p ON p.user_id = a.submitted_by
  WHERE public.is_network_master(auth.uid())
    AND a.account_id <> public.account_root_id()
    AND c.tipo_da_conta IN ('licenciado','revendedor')
  ORDER BY coalesce(a.network_submitted_at, a.created_at) DESC;
$$;

-- ============ RPC: ações da Matriz ============
CREATE OR REPLACE FUNCTION public.rede_review_pre_matricula(_id uuid, _action text, _message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _novo text; _app public.enrollment_applications; _nome text;
BEGIN
  IF NOT public.is_network_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a Matriz Multplick pode analisar fichas da Rede';
  END IF;
  SELECT * INTO _app FROM public.enrollment_applications WHERE id = _id;
  IF _app.id IS NULL OR _app.account_id = public.account_root_id() THEN
    RAISE EXCEPTION 'Ficha não encontrada na Rede';
  END IF;

  _novo := CASE _action
    WHEN 'assumir' THEN 'em_analise'
    WHEN 'aprovar' THEN 'aprovada'
    WHEN 'correcao' THEN 'correcao_solicitada'
    WHEN 'recusar' THEN 'recusada'
    ELSE NULL END;
  IF _novo IS NULL THEN RAISE EXCEPTION 'Ação inválida'; END IF;
  IF _novo = 'correcao_solicitada' AND coalesce(btrim(_message), '') = '' THEN
    RAISE EXCEPTION 'Informe o que precisa ser corrigido';
  END IF;

  PERFORM set_config('app.network_flow', 'on', true);
  UPDATE public.enrollment_applications
     SET network_review_status = _novo,
         network_review_message = CASE WHEN _novo = 'correcao_solicitada' THEN btrim(_message) ELSE nullif(btrim(coalesce(_message,'')), '') END,
         network_reviewed_at = now(),
         network_reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = _id;

  SELECT display_name INTO _nome FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
  VALUES (auth.uid(), _nome, 'rede_pre_matriculas', _novo,
          _app.full_name || coalesce(' — ' || btrim(coalesce(_message,'')), ''), _id);

  RETURN jsonb_build_object('ok', true, 'status', _novo);
END $$;

-- ============ RPC: Polo reenvia após correção ============
CREATE OR REPLACE FUNCTION public.polo_reenviar_pre_matricula(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app public.enrollment_applications; _home uuid; _nome text;
BEGIN
  SELECT * INTO _app FROM public.enrollment_applications WHERE id = _id;
  IF _app.id IS NULL THEN RAISE EXCEPTION 'Ficha não encontrada'; END IF;
  _home := public.user_home_account_id(auth.uid());
  IF _home IS NULL OR _home = public.account_root_id() OR _home <> _app.account_id THEN
    RAISE EXCEPTION 'Ficha de outra unidade';
  END IF;
  IF coalesce(_app.network_review_status,'') <> 'correcao_solicitada' THEN
    RAISE EXCEPTION 'Só é possível reenviar fichas com correção solicitada';
  END IF;

  PERFORM set_config('app.network_flow', 'on', true);
  UPDATE public.enrollment_applications
     SET network_review_status = 'aguardando_analise',
         network_submitted_at = now(),
         network_reviewed_at = NULL,
         network_reviewed_by = NULL,
         updated_at = now()
   WHERE id = _id;

  SELECT display_name INTO _nome FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.audit_logs (actor_id, actor_name, modulo, acao, descricao, registro_id)
  VALUES (auth.uid(), _nome, 'rede_pre_matriculas', 'reenviada', _app.full_name, _id);

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.rede_fila_pre_matriculas() FROM public, anon;
REVOKE ALL ON FUNCTION public.rede_review_pre_matricula(uuid,text,text) FROM public, anon;
REVOKE ALL ON FUNCTION public.polo_reenviar_pre_matricula(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rede_fila_pre_matriculas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_review_pre_matricula(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.polo_reenviar_pre_matricula(uuid) TO authenticated;