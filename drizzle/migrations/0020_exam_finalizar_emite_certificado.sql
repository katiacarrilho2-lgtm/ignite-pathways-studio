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
  v_cert uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO a FROM public.exam_attempts WHERE id = _attempt_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tentativa não encontrada'; END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = a.course_id;

  IF a.status <> 'em_andamento' THEN
    SELECT id INTO v_cert FROM public.certificates WHERE attempt_id = _attempt_id;
    RETURN jsonb_build_object('status', a.status, 'nota', a.nota, 'acertos', a.acertos,
      'total_questoes', a.total_questoes, 'aprovado', a.aprovado, 'nota_minima', cfg.nota_minima,
      'certificado_id', v_cert);
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

  IF v_aprovado THEN
    v_cert := public.certificado_emitir_por_tentativa(_attempt_id);
  END IF;

  RETURN jsonb_build_object('status', 'finalizada', 'nota', v_nota, 'acertos', v_acertos,
    'total_questoes', v_total, 'aprovado', v_aprovado, 'nota_minima', cfg.nota_minima,
    'mostrar_respostas', cfg.mostrar_respostas, 'certificado_id', v_cert);
END;
$$;