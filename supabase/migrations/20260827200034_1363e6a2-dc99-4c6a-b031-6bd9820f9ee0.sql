CREATE OR REPLACE FUNCTION public.lead_bank_send_to_crm(_lead_bank_id uuid, _owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  lb public.leads_bank;
  v_digits text;
  v_email text;
  ex record;
  new_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.is_staff(uid) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO lb FROM public.leads_bank WHERE id = _lead_bank_id;
  IF lb.id IS NULL THEN RAISE EXCEPTION 'lead não encontrado'; END IF;

  v_digits := NULLIF(regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g'), '');
  v_email  := NULLIF(lower(btrim(COALESCE(lb.email,''))), '');

  SELECT cl.id, cl.estagio::text AS estagio, cl.stage_changed_at,
         COALESCE(p.display_name, p.email, 'Vendedor') AS seller_name
    INTO ex
  FROM public.crm_leads cl
  LEFT JOIN public.profiles p ON p.user_id = cl.owner_id
  WHERE (v_digits IS NOT NULL
         AND NULLIF(regexp_replace(COALESCE(cl.telefone,''), '\D', '', 'g'), '') IS NOT NULL
         AND right(regexp_replace(COALESCE(cl.telefone,''), '\D', '', 'g'), 8) = right(v_digits, 8))
     OR (v_email IS NOT NULL AND lower(COALESCE(cl.email,'')) = v_email)
  ORDER BY cl.stage_changed_at DESC NULLS LAST
  LIMIT 1;

  IF ex.id IS NOT NULL THEN
    UPDATE public.leads_bank
       SET status_atendimento = CASE WHEN status_atendimento = 'disponivel' THEN 'em_atendimento' ELSE status_atendimento END,
           responsavel_id = COALESCE(responsavel_id, (SELECT owner_id FROM public.crm_leads WHERE id = ex.id)),
           updated_at = now()
     WHERE id = lb.id;
    RETURN jsonb_build_object(
      'status', 'exists',
      'crm_lead_id', ex.id,
      'estagio', ex.estagio,
      'stage_changed_at', ex.stage_changed_at,
      'seller_name', ex.seller_name
    );
  END IF;

  INSERT INTO public.crm_leads (nome, telefone, email, estagio, owner_id, origem, curso_interesse, created_by)
  VALUES (COALESCE(NULLIF(btrim(lb.nome),''), lb.whatsapp, lb.email, '(sem nome)'),
          lb.whatsapp, lb.email, 'novo', COALESCE(_owner_id, uid),
          COALESCE(lb.origem, 'banco_leads'), lb.curso_interesse, uid)
  RETURNING id INTO new_id;

  UPDATE public.leads_bank
     SET status_atendimento = 'em_atendimento',
         responsavel_id = COALESCE(_owner_id, uid),
         ultimo_contato_em = now(),
         updated_at = now()
   WHERE id = lb.id;

  RETURN jsonb_build_object('status', 'created', 'crm_lead_id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.lead_bank_send_to_crm(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_bank_send_to_crm(uuid, uuid) TO authenticated;