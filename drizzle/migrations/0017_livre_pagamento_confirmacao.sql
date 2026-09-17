CREATE UNIQUE INDEX IF NOT EXISTS livre_order_payments_provider_external_uidx
  ON public.livre_order_payments (provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.livre_registrar_pagamento(
  _order_id uuid,
  _provider text,
  _external_id text,
  _status text,
  _valor_cents integer,
  _metodo text DEFAULT NULL,
  _preference_id text DEFAULT NULL,
  _raw jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.livre_orders%ROWTYPE;
  enr_id uuid;
  ja_pago boolean;
BEGIN
  SELECT * INTO o FROM public.livre_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado');
  END IF;

  ja_pago := (o.status = 'pago');

  INSERT INTO public.livre_order_payments
    (account_id, order_id, provider, external_id, preference_id, metodo, valor_cents, status, raw, paid_at)
  VALUES
    (o.account_id, o.id, _provider, _external_id, _preference_id, _metodo, COALESCE(_valor_cents, 0), _status, _raw,
     CASE WHEN _status = 'aprovado' THEN now() ELSE NULL END)
  ON CONFLICT (provider, external_id) WHERE external_id IS NOT NULL
  DO UPDATE SET
    status = EXCLUDED.status,
    metodo = COALESCE(EXCLUDED.metodo, public.livre_order_payments.metodo),
    valor_cents = EXCLUDED.valor_cents,
    raw = EXCLUDED.raw,
    preference_id = COALESCE(EXCLUDED.preference_id, public.livre_order_payments.preference_id),
    paid_at = COALESCE(public.livre_order_payments.paid_at, EXCLUDED.paid_at),
    updated_at = now();

  IF _status = 'aprovado' THEN
    IF COALESCE(_valor_cents, 0) < o.valor_final_cents THEN
      INSERT INTO public.audit_logs (modulo, acao, descricao, registro_id)
      VALUES ('cursos_livres', 'pagamento_valor_divergente',
              format('Pedido %s: pago %s, esperado %s', o.numero_pedido, _valor_cents, o.valor_final_cents), o.id::text);
      RETURN jsonb_build_object('ok', false, 'motivo', 'valor_divergente');
    END IF;

    IF ja_pago THEN
      RETURN jsonb_build_object('ok', true, 'duplicado', true, 'order_id', o.id, 'enrollment_id', o.enrollment_id);
    END IF;

    SELECT id INTO enr_id FROM public.enrollments
     WHERE user_id = o.user_id AND course_id = o.course_id;

    IF enr_id IS NULL THEN
      INSERT INTO public.enrollments (user_id, course_id, status, account_id, affiliate_id, seller_id)
      VALUES (o.user_id, o.course_id, 'ativo', o.account_id, o.affiliate_id, o.seller_id)
      RETURNING id INTO enr_id;
    END IF;

    UPDATE public.livre_orders
       SET status = 'pago', paid_at = now(), enrollment_id = enr_id, updated_at = now()
     WHERE id = o.id;

    INSERT INTO public.audit_logs (modulo, acao, descricao, registro_id)
    VALUES ('cursos_livres', 'pagamento_aprovado',
            format('Pedido %s aprovado (%s) — matricula liberada', o.numero_pedido, COALESCE(_metodo, _provider)), o.id::text);

    RETURN jsonb_build_object('ok', true, 'order_id', o.id, 'enrollment_id', enr_id);
  END IF;

  IF _status = 'estornado' THEN
    UPDATE public.livre_orders SET status = 'reembolsado', updated_at = now() WHERE id = o.id;
    IF o.enrollment_id IS NOT NULL THEN
      UPDATE public.enrollments SET status = 'suspenso' WHERE id = o.enrollment_id;
    END IF;
    INSERT INTO public.audit_logs (modulo, acao, descricao, registro_id)
    VALUES ('cursos_livres', 'pagamento_estornado',
            format('Pedido %s estornado — acesso suspenso', o.numero_pedido), o.id::text);
    RETURN jsonb_build_object('ok', true, 'order_id', o.id, 'reembolsado', true);
  END IF;

  INSERT INTO public.audit_logs (modulo, acao, descricao, registro_id)
  VALUES ('cursos_livres', 'pagamento_' || _status,
          format('Pedido %s - pagamento %s', o.numero_pedido, _status), o.id::text);

  RETURN jsonb_build_object('ok', true, 'order_id', o.id, 'status_pagamento', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.livre_registrar_pagamento(uuid, text, text, text, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.livre_registrar_pagamento(uuid, text, text, text, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.livre_registrar_pagamento(uuid, text, text, text, integer, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.livre_registrar_pagamento(uuid, text, text, text, integer, text, text, jsonb) TO service_role;