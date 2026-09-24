CREATE OR REPLACE FUNCTION public.store_confirmar_pagamento(_order_id uuid, _nsu text, _valor int, _parcelas int, _metodo text, _receipt text, _raw jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.store_orders; app uuid; it record;
BEGIN
  SELECT * INTO o FROM store_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'motivo','pedido inexistente'); END IF;
  IF o.status = 'pago' THEN RETURN jsonb_build_object('ok',true,'duplicado',true); END IF;
  IF coalesce(_valor,0) < o.total_cents THEN
    INSERT INTO store_payments(order_id, account_id, transaction_nsu, status, valor_cents, raw) VALUES (o.id, o.account_id, _nsu, 'valor_divergente', _valor, _raw) ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok',false,'motivo','valor divergente'); END IF;
  INSERT INTO store_payments(order_id, account_id, transaction_nsu, status, valor_cents, parcelas, metodo, receipt_url, raw)
    VALUES (o.id, o.account_id, _nsu, 'pago', _valor, _parcelas, _metodo, _receipt, _raw) ON CONFLICT (provider, transaction_nsu) DO NOTHING;
  UPDATE store_orders SET status='pago', paid_at=now(), transaction_nsu=_nsu, metodo=_metodo, receipt_url=_receipt WHERE id=o.id;
  IF o.cupom_id IS NOT NULL THEN UPDATE store_coupons SET usos = usos + 1 WHERE id = o.cupom_id; END IF;
  UPDATE store_products SET estoque = estoque - 1 WHERE estoque IS NOT NULL AND id IN (SELECT product_id FROM store_order_items WHERE order_id=o.id);
  FOR it IN SELECT i.*, p.course_id, p.modalidade FROM store_order_items i LEFT JOIN store_products p ON p.id=i.product_id WHERE i.order_id=o.id LOOP
    INSERT INTO enrollment_applications(course_id, course_title, full_name, cpf, birth_date, email, phone, city, state, status, source,
      payment_method, promo_code, paid_at, paid_amount_cents, course_modality, account_id, notes, submitted_by)
    VALUES (it.course_id, it.nome, o.nome, o.cpf, o.nascimento, o.email, o.whatsapp, o.cidade, o.estado, 'novo', 'loja:'||coalesce(o.origem,'loja'),
      coalesce(_metodo,'infinitepay'), o.consultor, now(), it.preco_cents, it.modalidade, o.account_id,
      'Pedido '||o.numero||coalesce(' · polo '||o.polo,'')||coalesce(' · campanha '||o.campanha,''), NULL)
    RETURNING id INTO app;
  END LOOP;
  UPDATE store_orders SET enrollment_application_id = app WHERE id=o.id;
  INSERT INTO finance_entries(kind, name, amount_cents, due_date, paid_at, notes, account_id)
    VALUES ('receber', 'Loja '||o.numero||' · '||o.nome, _valor, current_date, now(),
      'InfinitePay NSU '||coalesce(_nsu,'')||coalesce(' · polo '||o.polo,'')||coalesce(' · consultor '||o.consultor,''), o.account_id);
  IF o.crm_lead_id IS NOT NULL THEN
    UPDATE crm_leads SET estagio='matriculado', descricao=concat_ws(E'\n',descricao,'VENDA REALIZADA · pedido '||o.numero), updated_at=now() WHERE id=o.crm_lead_id;
  END IF;
  PERFORM public.notify_network_master('Venda na loja: '||o.numero, o.nome||' · R$ '||to_char(_valor/100.0,'FM999G990D00'), '/admin/loja');
  IF o.account_id IS DISTINCT FROM account_root_id() THEN PERFORM public.notify_account_users(o.account_id, 'Venda na loja: '||o.numero, o.nome, '/polo'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.store_confirmar_pagamento(uuid,text,int,int,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_confirmar_pagamento(uuid,text,int,int,text,text,jsonb) TO service_role;