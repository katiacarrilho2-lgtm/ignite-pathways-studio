CREATE OR REPLACE FUNCTION public.store_upsert_lead(_nome text, _whats text, _email text, _curso text, _origem text, _desc text, _acc uuid, _estagio text, _valor int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lid uuid; w text := regexp_replace(coalesce(_whats,''),'\D','','g'); own uuid;
BEGIN
  SELECT id INTO lid FROM crm_leads WHERE (w <> '' AND regexp_replace(coalesce(telefone,''),'\D','','g') = w)
     OR (coalesce(_email,'') <> '' AND lower(email) = lower(_email)) ORDER BY updated_at DESC LIMIT 1;
  IF lid IS NULL THEN
    SELECT responsavel_user_id INTO own FROM contas_comerciais WHERE id = coalesce(_acc, account_root_id());
    IF own IS NULL THEN SELECT user_id INTO own FROM user_roles WHERE role = 'super_admin' ORDER BY id LIMIT 1; END IF;
    INSERT INTO crm_leads(nome, telefone, email, curso_interesse, origem, descricao, account_id, estagio, valor_cents, etiqueta, owner_id)
    VALUES (_nome, w, _email, _curso, _origem, _desc, coalesce(_acc, account_root_id()), _estagio::crm_stage, coalesce(_valor,0), 'quente', own) RETURNING id INTO lid;
  ELSE
    UPDATE crm_leads SET curso_interesse = coalesce(_curso, curso_interesse), estagio = _estagio::crm_stage,
      descricao = concat_ws(E'\n', descricao, _desc), valor_cents = greatest(coalesce(_valor,0), valor_cents), updated_at = now() WHERE id = lid;
  END IF;
  RETURN lid;
END $$;
REVOKE EXECUTE ON FUNCTION public.store_upsert_lead(text,text,text,text,text,text,uuid,text,int) FROM PUBLIC, anon, authenticated;