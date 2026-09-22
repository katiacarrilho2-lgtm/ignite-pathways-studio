-- Etapa 5: prova online (sorteio, respostas, correção automática no servidor)

ALTER TABLE public.exam_attempt_answers
  ADD COLUMN IF NOT EXISTS ordem_alternativas jsonb;

CREATE INDEX IF NOT EXISTS exam_questions_bank_course_ativo_idx
  ON public.exam_questions_bank (course_id, ativo);

-- Situação da avaliação para o aluno logado
CREATE OR REPLACE FUNCTION public.exam_status_curso(_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  cfg public.exam_configs%ROWTYPE;
  v_acesso boolean;
  v_usadas int;
  v_aberta uuid;
  v_ultima timestamptz;
  v_aprovado boolean;
  v_disponiveis int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = _course_id;
  IF NOT FOUND OR NOT cfg.ativo THEN
    RETURN jsonb_build_object('liberado', false, 'motivo', 'avaliacao_indisponivel');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = v_uid AND e.course_id = _course_id
      AND coalesce(e.status, 'ativo') NOT IN ('cancelado', 'suspenso')
  ) OR EXISTS (
    SELECT 1 FROM public.livre_orders o
    WHERE o.user_id = v_uid AND o.course_id = _course_id AND o.status = 'pago'
  ) INTO v_acesso;

  IF NOT v_acesso THEN
    RETURN jsonb_build_object('liberado', false, 'motivo', 'sem_acesso');
  END IF;

  SELECT count(*)::int, max(finalizado_em), bool_or(coalesce(aprovado, false))
    INTO v_usadas, v_ultima, v_aprovado
  FROM public.exam_attempts
  WHERE user_id = v_uid AND course_id = _course_id AND status <> 'anulada';

  SELECT id INTO v_aberta
  FROM public.exam_attempts
  WHERE user_id = v_uid AND course_id = _course_id AND status = 'em_andamento'
  ORDER BY iniciado_em DESC LIMIT 1;

  SELECT count(*)::int INTO v_disponiveis
  FROM public.exam_questions_bank
  WHERE ativo AND course_id = _course_id;

  RETURN jsonb_build_object(
    'liberado', true,
    'aprovado', coalesce(v_aprovado, false),
    'tentativas_usadas', coalesce(v_usadas, 0),
    'tentativas_permitidas', cfg.tentativas_permitidas,
    'qtd_questoes', cfg.qtd_questoes,
    'nota_minima', cfg.nota_minima,
    'tempo_minutos', cfg.tempo_minutos,
    'intervalo_horas', cfg.intervalo_nova_tentativa_horas,
    'instrucoes', cfg.instrucoes,
    'questoes_disponiveis', v_disponiveis,
    'ultima_finalizada_em', v_ultima,
    'tentativa_aberta', v_aberta
  );
END;
$$;

-- Inicia (ou retoma) uma tentativa, sorteando as questões no servidor
CREATE OR REPLACE FUNCTION public.exam_iniciar_tentativa(_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  st jsonb;
  cfg public.exam_configs%ROWTYPE;
  v_attempt uuid;
  v_conta uuid;
  v_enroll uuid;
  v_usadas int;
  q record;
  i int := 0;
  n int;
  ordem jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  st := public.exam_status_curso(_course_id);
  IF NOT (st->>'liberado')::boolean THEN
    RAISE EXCEPTION 'Avaliação não disponível para este curso';
  END IF;

  IF st->>'tentativa_aberta' IS NOT NULL THEN
    RETURN (st->>'tentativa_aberta')::uuid;
  END IF;

  IF (st->>'aprovado')::boolean THEN
    RAISE EXCEPTION 'Você já foi aprovado nesta avaliação';
  END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = _course_id;
  v_usadas := (st->>'tentativas_usadas')::int;

  IF v_usadas >= cfg.tentativas_permitidas THEN
    RAISE EXCEPTION 'Número máximo de tentativas atingido';
  END IF;

  IF cfg.intervalo_nova_tentativa_horas IS NOT NULL
     AND st->>'ultima_finalizada_em' IS NOT NULL
     AND (st->>'ultima_finalizada_em')::timestamptz + make_interval(hours => cfg.intervalo_nova_tentativa_horas) > now() THEN
    RAISE EXCEPTION 'Aguarde o intervalo mínimo para uma nova tentativa';
  END IF;

  IF (st->>'questoes_disponiveis')::int < cfg.qtd_questoes THEN
    RAISE EXCEPTION 'Banco de questões insuficiente para esta avaliação';
  END IF;

  SELECT e.id, e.account_id INTO v_enroll, v_conta
  FROM public.enrollments e
  WHERE e.user_id = v_uid AND e.course_id = _course_id
  ORDER BY e.enrolled_at DESC NULLS LAST LIMIT 1;

  IF v_conta IS NULL THEN
    SELECT o.account_id INTO v_conta FROM public.livre_orders o
    WHERE o.user_id = v_uid AND o.course_id = _course_id AND o.status = 'pago'
    ORDER BY o.paid_at DESC NULLS LAST LIMIT 1;
  END IF;

  INSERT INTO public.exam_attempts (account_id, user_id, course_id, enrollment_id, tentativa, status, total_questoes)
  VALUES (coalesce(v_conta, public.current_account_id()), v_uid, _course_id, v_enroll, v_usadas + 1, 'em_andamento', cfg.qtd_questoes)
  RETURNING id INTO v_attempt;

  FOR q IN
    SELECT id, alternativas
    FROM public.exam_questions_bank
    WHERE ativo AND course_id = _course_id
    ORDER BY CASE WHEN cfg.embaralhar_questoes THEN random() ELSE 0 END, created_at
    LIMIT cfg.qtd_questoes
  LOOP
    i := i + 1;
    n := jsonb_array_length(q.alternativas);
    IF cfg.embaralhar_alternativas THEN
      SELECT jsonb_agg(x ORDER BY random()) INTO ordem FROM generate_series(0, n - 1) x;
    ELSE
      SELECT jsonb_agg(x ORDER BY x) INTO ordem FROM generate_series(0, n - 1) x;
    END IF;

    INSERT INTO public.exam_attempt_answers (account_id, attempt_id, question_id, ordem, ordem_alternativas)
    VALUES (coalesce(v_conta, public.current_account_id()), v_attempt, q.id, i, ordem);
  END LOOP;

  INSERT INTO public.audit_logs (actor_id, modulo, acao, descricao, registro_id)
  VALUES (v_uid, 'avaliacao', 'iniciar_tentativa', 'Tentativa ' || (v_usadas + 1) || ' iniciada', v_attempt);

  RETURN v_attempt;
END;
$$;

-- Estado da tentativa + questões SEM a resposta correta
CREATE OR REPLACE FUNCTION public.exam_tentativa(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a public.exam_attempts%ROWTYPE;
  cfg public.exam_configs%ROWTYPE;
  v_questoes jsonb;
  v_expira timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO a FROM public.exam_attempts WHERE id = _attempt_id;
  IF NOT FOUND OR (a.user_id <> v_uid AND NOT public.has_permission(v_uid, 'manage_courses')) THEN
    RAISE EXCEPTION 'Tentativa não encontrada';
  END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = a.course_id;
  IF cfg.tempo_minutos IS NOT NULL THEN
    v_expira := a.iniciado_em + make_interval(mins => cfg.tempo_minutos);
  END IF;

  SELECT jsonb_agg(item ORDER BY (item->>'ordem')::int) INTO v_questoes
  FROM (
    SELECT jsonb_build_object(
      'question_id', q.id,
      'ordem', ans.ordem,
      'enunciado', q.enunciado,
      'alternativas', (
        SELECT jsonb_agg(q.alternativas -> (idx.value)::int ORDER BY idx.ord)
        FROM jsonb_array_elements_text(coalesce(ans.ordem_alternativas, '[]'::jsonb)) WITH ORDINALITY AS idx(value, ord)
      ),
      'resposta_pos', CASE WHEN ans.resposta_index IS NULL THEN NULL ELSE (
        SELECT (idx.ord - 1)::int
        FROM jsonb_array_elements_text(coalesce(ans.ordem_alternativas, '[]'::jsonb)) WITH ORDINALITY AS idx(value, ord)
        WHERE (idx.value)::int = ans.resposta_index
      ) END,
      'correta', CASE WHEN a.status = 'em_andamento' THEN NULL ELSE ans.correta END,
      'explicacao', CASE WHEN a.status <> 'em_andamento' AND cfg.mostrar_respostas THEN q.explicacao ELSE NULL END,
      'correta_pos', CASE WHEN a.status <> 'em_andamento' AND cfg.mostrar_respostas THEN (
        SELECT (idx.ord - 1)::int
        FROM jsonb_array_elements_text(coalesce(ans.ordem_alternativas, '[]'::jsonb)) WITH ORDINALITY AS idx(value, ord)
        WHERE (idx.value)::int = q.correta_index
      ) ELSE NULL END
    ) AS item
    FROM public.exam_attempt_answers ans
    JOIN public.exam_questions_bank q ON q.id = ans.question_id
    WHERE ans.attempt_id = _attempt_id
  ) s;

  RETURN jsonb_build_object(
    'attempt_id', a.id,
    'course_id', a.course_id,
    'status', a.status,
    'tentativa', a.tentativa,
    'iniciado_em', a.iniciado_em,
    'expira_em', v_expira,
    'nota', a.nota,
    'acertos', a.acertos,
    'total_questoes', a.total_questoes,
    'aprovado', a.aprovado,
    'nota_minima', cfg.nota_minima,
    'mostrar_respostas', cfg.mostrar_respostas,
    'questoes', coalesce(v_questoes, '[]'::jsonb)
  );
END;
$$;

-- Salva a resposta (posição exibida) sem revelar acerto
CREATE OR REPLACE FUNCTION public.exam_responder(_attempt_id uuid, _question_id uuid, _pos int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a public.exam_attempts%ROWTYPE;
  cfg public.exam_configs%ROWTYPE;
  v_original int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO a FROM public.exam_attempts WHERE id = _attempt_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tentativa não encontrada'; END IF;
  IF a.status <> 'em_andamento' THEN RAISE EXCEPTION 'Esta avaliação já foi finalizada'; END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = a.course_id;
  IF cfg.tempo_minutos IS NOT NULL AND a.iniciado_em + make_interval(mins => cfg.tempo_minutos) < now() THEN
    RAISE EXCEPTION 'Tempo da avaliação esgotado';
  END IF;

  IF _pos IS NULL THEN
    UPDATE public.exam_attempt_answers
      SET resposta_index = NULL, respondido_em = now()
      WHERE attempt_id = _attempt_id AND question_id = _question_id;
    RETURN true;
  END IF;

  SELECT (idx.value)::int INTO v_original
  FROM public.exam_attempt_answers ans,
       LATERAL jsonb_array_elements_text(coalesce(ans.ordem_alternativas, '[]'::jsonb)) WITH ORDINALITY AS idx(value, ord)
  WHERE ans.attempt_id = _attempt_id AND ans.question_id = _question_id AND idx.ord = _pos + 1;

  IF v_original IS NULL THEN RAISE EXCEPTION 'Alternativa inválida'; END IF;

  UPDATE public.exam_attempt_answers
    SET resposta_index = v_original, respondido_em = now()
    WHERE attempt_id = _attempt_id AND question_id = _question_id;

  RETURN true;
END;
$$;

-- Correção automática no servidor
CREATE OR REPLACE FUNCTION public.exam_finalizar(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a public.exam_attempts%ROWTYPE;
  cfg public.exam_configs%ROWTYPE;
  v_total int;
  v_acertos int;
  v_nota numeric;
  v_aprovado boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO a FROM public.exam_attempts WHERE id = _attempt_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tentativa não encontrada'; END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = a.course_id;

  IF a.status <> 'em_andamento' THEN
    RETURN jsonb_build_object('status', a.status, 'nota', a.nota, 'acertos', a.acertos,
      'total_questoes', a.total_questoes, 'aprovado', a.aprovado, 'nota_minima', cfg.nota_minima);
  END IF;

  UPDATE public.exam_attempt_answers ans
    SET correta = (ans.resposta_index IS NOT NULL AND ans.resposta_index = q.correta_index)
    FROM public.exam_questions_bank q
    WHERE q.id = ans.question_id AND ans.attempt_id = _attempt_id;

  SELECT count(*)::int, count(*) FILTER (WHERE correta)::int
    INTO v_total, v_acertos
  FROM public.exam_attempt_answers WHERE attempt_id = _attempt_id;

  v_nota := CASE WHEN v_total > 0 THEN round((v_acertos::numeric * 100) / v_total, 2) ELSE 0 END;
  v_aprovado := v_nota >= cfg.nota_minima;

  UPDATE public.exam_attempts
    SET status = 'finalizada', finalizado_em = now(), nota = v_nota, acertos = v_acertos,
        total_questoes = v_total, aprovado = v_aprovado, updated_at = now()
    WHERE id = _attempt_id;

  INSERT INTO public.audit_logs (actor_id, modulo, acao, descricao, registro_id)
  VALUES (v_uid, 'avaliacao', 'finalizar_tentativa',
          'Nota ' || v_nota || ' (' || v_acertos || '/' || v_total || ') - ' ||
          CASE WHEN v_aprovado THEN 'aprovado' ELSE 'reprovado' END, _attempt_id);

  RETURN jsonb_build_object('status', 'finalizada', 'nota', v_nota, 'acertos', v_acertos,
    'total_questoes', v_total, 'aprovado', v_aprovado, 'nota_minima', cfg.nota_minima,
    'mostrar_respostas', cfg.mostrar_respostas);
END;
$$;

REVOKE ALL ON FUNCTION public.exam_status_curso(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_iniciar_tentativa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_tentativa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_responder(uuid, uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exam_finalizar(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.exam_status_curso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_iniciar_tentativa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_tentativa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_responder(uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_finalizar(uuid) TO authenticated;