-- 1) MATRIZ x REDE: o painel /admin passa a enxergar SOMENTE a conta atual.
-- O Network Master continua administrando a Rede via funções dedicadas abaixo
-- e via "Visualizar como Polo" (account_context).
CREATE OR REPLACE FUNCTION public.account_visible(_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(_account, public.account_root_id()) = public.current_account_id()
$$;

CREATE OR REPLACE FUNCTION public.account_can_write(_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(_account, public.account_root_id()) = public.current_account_id()
$$;

-- 2) Impedir a criação de uma segunda Matriz
CREATE OR REPLACE FUNCTION public.contas_comerciais_guard_matriz()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tipo_da_conta = 'matriz' AND NEW.id <> public.account_root_id() THEN
    RAISE EXCEPTION 'Já existe uma Matriz Multplick. Cadastre a unidade como licenciado ou revendedor.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.id = public.account_root_id() AND NEW.tipo_da_conta <> 'matriz' THEN
    RAISE EXCEPTION 'A conta Matriz não pode mudar de tipo.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contas_comerciais_guard_matriz ON public.contas_comerciais;
CREATE TRIGGER trg_contas_comerciais_guard_matriz
BEFORE INSERT OR UPDATE ON public.contas_comerciais
FOR EACH ROW EXECUTE FUNCTION public.contas_comerciais_guard_matriz();

-- 3) Visões da REDE (somente Polos/Revendedores, nunca a Matriz)
CREATE OR REPLACE FUNCTION public.rede_stats()
RETURNS TABLE(account_id uuid, usuarios bigint, leads bigint, pre_matriculas bigint, matriculas bigint, ultima_atividade timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id,
    (SELECT count(*) FROM public.profiles p WHERE p.account_id = c.id),
    (SELECT count(*) FROM public.crm_leads l WHERE l.account_id = c.id),
    (SELECT count(*) FROM public.enrollment_applications a WHERE a.account_id = c.id),
    (SELECT count(*) FROM public.enrollments e WHERE e.account_id = c.id),
    GREATEST(
      (SELECT max(l.created_at) FROM public.crm_leads l WHERE l.account_id = c.id),
      (SELECT max(a.created_at) FROM public.enrollment_applications a WHERE a.account_id = c.id),
      (SELECT max(e.enrolled_at) FROM public.enrollments e WHERE e.account_id = c.id)
    )
  FROM public.contas_comerciais c
  WHERE public.is_network_master(auth.uid())
    AND c.id <> public.account_root_id()
    AND COALESCE(c.tipo_da_conta,'') IN ('licenciado','revendedor')
$$;

CREATE OR REPLACE FUNCTION public.rede_equipe(_account uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, cargo text, ativo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.user_id, p.display_name, p.username, p.cargo, p.ativo
  FROM public.profiles p
  WHERE public.is_network_master(auth.uid())
    AND p.account_id = _account
    AND _account <> public.account_root_id()
  ORDER BY p.username
$$;

CREATE OR REPLACE FUNCTION public.rede_pre_matriculas(_account uuid DEFAULT NULL)
RETURNS TABLE(id uuid, account_id uuid, polo text, full_name text, course_title text, status text, created_at timestamptz, city text, state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.id, a.account_id, c.nome, a.full_name, a.course_title, a.status, a.created_at, a.city, a.state
  FROM public.enrollment_applications a
  JOIN public.contas_comerciais c ON c.id = a.account_id
  WHERE public.is_network_master(auth.uid())
    AND a.account_id IS NOT NULL
    AND a.account_id <> public.account_root_id()
    AND COALESCE(c.tipo_da_conta,'') IN ('licenciado','revendedor')
    AND (_account IS NULL OR a.account_id = _account)
  ORDER BY a.created_at DESC
  LIMIT 500
$$;

CREATE OR REPLACE FUNCTION public.rede_matriculas(_account uuid DEFAULT NULL)
RETURNS TABLE(id uuid, account_id uuid, polo text, aluno text, curso text, status text, enrolled_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.id, e.account_id, c.nome, COALESCE(p.display_name, p.username), co.title, e.status, e.enrolled_at
  FROM public.enrollments e
  JOIN public.contas_comerciais c ON c.id = e.account_id
  LEFT JOIN public.profiles p ON p.user_id = e.user_id
  LEFT JOIN public.courses co ON co.id = e.course_id
  WHERE public.is_network_master(auth.uid())
    AND e.account_id IS NOT NULL
    AND e.account_id <> public.account_root_id()
    AND COALESCE(c.tipo_da_conta,'') IN ('licenciado','revendedor')
    AND (_account IS NULL OR e.account_id = _account)
  ORDER BY e.enrolled_at DESC
  LIMIT 500
$$;

CREATE OR REPLACE FUNCTION public.rede_suporte()
RETURNS TABLE(id uuid, account_id uuid, polo text, assunto text, mensagem text, categoria text, prioridade text, status text, resposta text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.id, t.account_id, c.nome, t.assunto, t.mensagem, t.categoria, t.prioridade, t.status, t.resposta, t.created_at
  FROM public.support_tickets t
  JOIN public.contas_comerciais c ON c.id = t.account_id
  WHERE public.is_network_master(auth.uid())
    AND t.account_id IS NOT NULL
    AND t.account_id <> public.account_root_id()
    AND COALESCE(c.tipo_da_conta,'') IN ('licenciado','revendedor')
  ORDER BY t.created_at DESC
  LIMIT 500
$$;

REVOKE ALL ON FUNCTION public.rede_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rede_equipe(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rede_pre_matriculas(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rede_matriculas(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rede_suporte() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rede_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_equipe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_pre_matriculas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_matriculas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_suporte() TO authenticated;