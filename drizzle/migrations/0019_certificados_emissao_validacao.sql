-- Etapa 6: emissão de certificado, numeração única, validação pública

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS snapshot jsonb,
  ADD COLUMN IF NOT EXISTS reativado_em timestamptz,
  ADD COLUMN IF NOT EXISTS reativado_por uuid;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_attempt_unique ON public.certificates(attempt_id) WHERE attempt_id IS NOT NULL;

-- Numeração MPL-ANO-000001
CREATE OR REPLACE FUNCTION public.certificado_proximo_numero()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano text := to_char(now(), 'YYYY');
  v_seq int;
BEGIN
  SELECT coalesce(max(substring(numero from '\d+$')::int), 0) + 1 INTO v_seq
  FROM public.certificates
  WHERE numero LIKE 'MPL-' || v_ano || '-%';
  RETURN 'MPL-' || v_ano || '-' || lpad(v_seq::text, 6, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.certificado_proximo_numero() FROM anon, authenticated;

-- Emissão a partir de uma tentativa aprovada (idempotente)
CREATE OR REPLACE FUNCTION public.certificado_emitir_por_tentativa(_attempt_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.exam_attempts%ROWTYPE;
  cfg public.exam_configs%ROWTYPE;
  c public.courses%ROWTYPE;
  s public.certificate_settings%ROWTYPE;
  v_nome text; v_cpf text; v_cert uuid; v_num text; v_cod text; v_texto text; v_tipo text;
BEGIN
  SELECT * INTO a FROM public.exam_attempts WHERE id = _attempt_id;
  IF NOT FOUND OR NOT coalesce(a.aprovado, false) THEN RETURN NULL; END IF;

  SELECT id INTO v_cert FROM public.certificates WHERE attempt_id = _attempt_id;
  IF v_cert IS NOT NULL THEN RETURN v_cert; END IF;

  SELECT * INTO cfg FROM public.exam_configs WHERE course_id = a.course_id;
  SELECT * INTO c FROM public.courses WHERE id = a.course_id;
  IF NOT coalesce(c.emite_certificado_automatico, false) OR NOT coalesce(cfg.libera_certificado, false) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO s FROM public.certificate_settings ORDER BY created_at LIMIT 1;

  SELECT coalesce(sp.full_name, p.display_name), sp.cpf INTO v_nome, v_cpf
  FROM public.profiles p
  LEFT JOIN public.student_profiles sp ON sp.user_id = p.user_id
  WHERE p.user_id = a.user_id;

  IF v_nome IS NULL OR length(btrim(v_nome)) < 3 THEN RETURN NULL; END IF;

  v_tipo := coalesce(c.tipo_curso, 'curso_livre');
  v_texto := CASE
    WHEN c.certificado_texto_modo = 'personalizado' AND coalesce(btrim(c.certificado_texto_custom), '') <> ''
      THEN c.certificado_texto_custom
    WHEN v_tipo = 'avaliacao_conhecimentos'
      THEN 'Certificamos que [NOME DO ALUNO] foi aprovado na avaliação de conhecimentos referente à formação "[NOME DO CURSO]", conforme os critérios estabelecidos pela Multplick Formação Profissional.'
    ELSE 'Certificamos que [NOME DO ALUNO] concluiu o curso livre "[NOME DO CURSO]", promovido pela Multplick Formação Profissional, cumprindo os critérios estabelecidos para esta formação.'
  END;

  v_num := public.certificado_proximo_numero();
  v_cod := upper(replace(gen_random_uuid()::text, '-', ''));
  v_cod := substring(v_cod from 1 for 12);

  INSERT INTO public.certificates (
    account_id, user_id, course_id, attempt_id, numero, codigo_validacao, tipo, status,
    nota_final, carga_horaria_horas, emitido_em, snapshot
  ) VALUES (
    a.account_id, a.user_id, a.course_id, a.id, v_num, v_cod, v_tipo, 'ativo',
    a.nota,
    CASE WHEN v_tipo = 'curso_livre' THEN c.carga_horaria_horas ELSE NULL END,
    now(),
    jsonb_build_object(
      'aluno_nome', v_nome,
      'aluno_cpf', v_cpf,
      'curso_titulo', c.title,
      'tipo', v_tipo,
      'titulo_documento', CASE WHEN v_tipo = 'avaliacao_conhecimentos' THEN 'CERTIFICADO' ELSE 'CERTIFICADO DE CONCLUSÃO' END,
      'carga_horaria_horas', CASE WHEN v_tipo = 'curso_livre' THEN c.carga_horaria_horas ELSE NULL END,
      'nota', a.nota,
      'texto', v_texto,
      'empresa', coalesce(s.empresa, 'Multplick Formação Profissional'),
      'cnpj', s.cnpj,
      'responsavel_nome', coalesce(s.responsavel_nome, 'Euclides Joaquim'),
      'responsavel_cargo', coalesce(s.responsavel_cargo, 'Coordenador'),
      'assinatura_url', s.assinatura_url,
      'logo_url', s.logo_url,
      'validacao_base_url', coalesce(s.validacao_base_url, 'https://multplick.live/validar-certificado')
    )
  ) RETURNING id INTO v_cert;

  INSERT INTO public.audit_logs (actor_id, modulo, acao, descricao, registro_id)
  VALUES (a.user_id, 'certificacao', 'emitir_certificado', 'Certificado ' || v_num || ' emitido automaticamente', v_cert);

  RETURN v_cert;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.certificado_emitir_por_tentativa(uuid) FROM anon, authenticated;

-- Validação pública (sem dados sensíveis)
CREATE OR REPLACE FUNCTION public.certificado_validar(_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_cpf text;
BEGIN
  SELECT c.*, co.title AS curso_titulo INTO r
  FROM public.certificates c
  JOIN public.courses co ON co.id = c.course_id
  WHERE upper(c.codigo_validacao) = upper(btrim(_codigo));

  IF NOT FOUND THEN RETURN jsonb_build_object('encontrado', false); END IF;

  v_cpf := coalesce(r.snapshot->>'aluno_cpf', '');
  v_cpf := CASE WHEN length(regexp_replace(v_cpf, '\D', '', 'g')) = 11
                THEN '***.***.***-' || right(regexp_replace(v_cpf, '\D', '', 'g'), 2)
                ELSE NULL END;

  RETURN jsonb_build_object(
    'encontrado', true,
    'status', r.status,
    'numero', r.numero,
    'aluno_nome', coalesce(r.snapshot->>'aluno_nome', ''),
    'cpf_mascarado', v_cpf,
    'curso_titulo', coalesce(r.snapshot->>'curso_titulo', r.curso_titulo),
    'titulo_documento', coalesce(r.snapshot->>'titulo_documento', 'CERTIFICADO'),
    'carga_horaria_horas', r.carga_horaria_horas,
    'emitido_em', r.emitido_em,
    'empresa', coalesce(r.snapshot->>'empresa', 'Multplick Formação Profissional'),
    'cancelado_em', r.cancelado_em
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.certificado_validar(text) TO anon, authenticated;

-- Cancelar / reativar (somente equipe com permissão)
CREATE OR REPLACE FUNCTION public.certificado_cancelar(_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_permission(v_uid, 'manage_certification'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF coalesce(btrim(_motivo), '') = '' THEN RAISE EXCEPTION 'Informe o motivo do cancelamento'; END IF;

  UPDATE public.certificates
    SET status = 'cancelado', cancelado_em = now(), cancelado_por = v_uid, motivo_cancelamento = _motivo, updated_at = now()
  WHERE id = _id;

  INSERT INTO public.audit_logs (actor_id, modulo, acao, descricao, registro_id)
  VALUES (v_uid, 'certificacao', 'cancelar_certificado', _motivo, _id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.certificado_cancelar(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.certificado_cancelar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.certificado_reativar(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_permission(v_uid, 'manage_certification'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.certificates
    SET status = 'ativo', reativado_em = now(), reativado_por = v_uid, updated_at = now()
  WHERE id = _id;

  INSERT INTO public.audit_logs (actor_id, modulo, acao, descricao, registro_id)
  VALUES (v_uid, 'certificacao', 'reativar_certificado', 'Certificado reativado', _id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.certificado_reativar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.certificado_reativar(uuid) TO authenticated;
