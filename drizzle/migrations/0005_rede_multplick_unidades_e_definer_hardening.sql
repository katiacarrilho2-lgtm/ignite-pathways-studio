-- ============================================================
-- ETAPA 2 — Central Master da Rede Multplick
-- (A) Endurecimento de funções SECURITY DEFINER que leem dados por conta
-- (B) Campos de cadastro da unidade em contas_comerciais
-- Nada aqui toca em repasse_parceiros / repasse_contratos / repasse_parcelas.
-- ============================================================

-- ---------- (A1) leads do Banco de Leads: nunca atravessar a conta ----------
CREATE OR REPLACE FUNCTION public.lead_bank_get_crm_statuses(_lead_ids uuid[])
 RETURNS TABLE(lead_bank_id uuid, crm_lead_id uuid, crm_nome text, estagio text, stage_changed_at timestamp with time zone, seller_name text, status_atendimento text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (lb.id)
    lb.id, cl.id, cl.nome, cl.estagio::text, cl.stage_changed_at, p.display_name, lb.status_atendimento
  FROM public.leads_bank lb
  LEFT JOIN public.crm_leads cl
    ON public.account_visible(cl.account_id)
   AND (
      (NULLIF(regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g'), '')
        = NULLIF(regexp_replace(COALESCE(cl.telefone,''), '\D', '', 'g'), ''))
      OR (NULLIF(lower(COALESCE(lb.email,'')), '') = NULLIF(lower(COALESCE(cl.email,'')), ''))
    )
  LEFT JOIN public.profiles p ON p.user_id = cl.owner_id
  WHERE lb.id = ANY(_lead_ids)
    AND public.is_staff(auth.uid())
    AND public.account_visible(lb.account_id)
  ORDER BY lb.id, cl.stage_changed_at DESC NULLS LAST;
$function$;

-- ---------- (A2) importação em lote: dedupe só dentro da própria conta ----------
CREATE OR REPLACE FUNCTION public.lead_bank_import_batch(_items jsonb, _origem text, _origem_tipo text DEFAULT 'manual'::text, _grupo_nome text DEFAULT NULL::text, _situacao text DEFAULT 'reengajar'::text, _interesse_tipo text DEFAULT 'outro'::text, _curso_interesse text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  it jsonb;
  v_nome text; v_wpp text; v_email text; v_digits text;
  existing_id uuid;
  created int := 0; updated_existing int := 0; skipped int := 0; in_crm int := 0;
BEGIN
  IF uid IS NULL OR NOT public.is_staff(uid) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    v_nome  := NULLIF(btrim(COALESCE(it->>'nome','')), '');
    v_wpp   := NULLIF(btrim(COALESCE(it->>'whatsapp','')), '');
    v_email := NULLIF(lower(btrim(COALESCE(it->>'email',''))), '');
    v_digits := NULLIF(regexp_replace(COALESCE(v_wpp,''), '\D', '', 'g'), '');

    IF v_digits IS NULL AND v_email IS NULL THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    SELECT lb.id INTO existing_id
    FROM public.leads_bank lb
    WHERE lb.account_id IS NOT DISTINCT FROM public.current_account_id()
      AND ((v_digits IS NOT NULL AND right(regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g'), 8) = right(v_digits, 8)
            AND regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g') <> '')
        OR (v_email IS NOT NULL AND lower(COALESCE(lb.email,'')) = v_email))
    ORDER BY lb.created_at
    LIMIT 1;

    IF existing_id IS NULL THEN
      INSERT INTO public.leads_bank (nome, whatsapp, email, situacao, interesse_tipo, curso_interesse, origem, created_by, account_id)
      VALUES (COALESCE(v_nome, v_email, v_wpp, '(sem nome)'), v_wpp, v_email,
              COALESCE(_situacao,'reengajar'), COALESCE(_interesse_tipo,'outro'),
              _curso_interesse, COALESCE(_origem,'manual'), uid, public.current_account_id())
      RETURNING id INTO existing_id;
      created := created + 1;
    ELSE
      UPDATE public.leads_bank
         SET nome = CASE WHEN (nome IS NULL OR nome IN ('', '(sem nome)')) AND v_nome IS NOT NULL THEN v_nome ELSE nome END,
             email = COALESCE(email, v_email),
             whatsapp = COALESCE(whatsapp, v_wpp),
             curso_interesse = COALESCE(curso_interesse, _curso_interesse),
             updated_at = now()
       WHERE id = existing_id;
      updated_existing := updated_existing + 1;
      IF EXISTS (SELECT 1 FROM public.leads_bank WHERE id = existing_id AND status_atendimento <> 'disponivel') THEN
        in_crm := in_crm + 1;
      END IF;
    END IF;

    INSERT INTO public.lead_bank_origins (lead_id, origem, detalhe, last_seen_at)
    VALUES (existing_id, COALESCE(_origem_tipo,'manual'), COALESCE(_grupo_nome, _origem), now());
  END LOOP;

  RETURN jsonb_build_object('created', created, 'updated_existing', updated_existing, 'in_crm', in_crm, 'skipped', skipped);
END;
$function$;

-- ---------- (A3) envio para o CRM: só lead da própria conta ----------
CREATE OR REPLACE FUNCTION public.lead_bank_send_to_crm(_lead_bank_id uuid, _owner_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  lb public.leads_bank;
  v_digits text; v_email text; ex record; new_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.is_staff(uid) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO lb FROM public.leads_bank WHERE id = _lead_bank_id AND public.account_visible(account_id);
  IF lb.id IS NULL THEN RAISE EXCEPTION 'lead não encontrado'; END IF;

  v_digits := NULLIF(regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g'), '');
  v_email  := NULLIF(lower(btrim(COALESCE(lb.email,''))), '');

  SELECT cl.id, cl.estagio::text AS estagio, cl.stage_changed_at,
         COALESCE(p.display_name, p.email, 'Vendedor') AS seller_name
    INTO ex
  FROM public.crm_leads cl
  LEFT JOIN public.profiles p ON p.user_id = cl.owner_id
  WHERE public.account_visible(cl.account_id)
    AND ((v_digits IS NOT NULL
         AND NULLIF(regexp_replace(COALESCE(cl.telefone,''), '\D', '', 'g'), '') IS NOT NULL
         AND right(regexp_replace(COALESCE(cl.telefone,''), '\D', '', 'g'), 8) = right(v_digits, 8))
     OR (v_email IS NOT NULL AND lower(COALESCE(cl.email,'')) = v_email))
  ORDER BY cl.stage_changed_at DESC NULLS LAST
  LIMIT 1;

  IF ex.id IS NOT NULL THEN
    UPDATE public.leads_bank
       SET status_atendimento = CASE WHEN status_atendimento = 'disponivel' THEN 'em_atendimento' ELSE status_atendimento END,
           responsavel_id = COALESCE(responsavel_id, (SELECT owner_id FROM public.crm_leads WHERE id = ex.id)),
           updated_at = now()
     WHERE id = lb.id;
    RETURN jsonb_build_object('status','exists','crm_lead_id',ex.id,'estagio',ex.estagio,
                              'stage_changed_at',ex.stage_changed_at,'seller_name',ex.seller_name);
  END IF;

  INSERT INTO public.crm_leads (nome, telefone, email, estagio, owner_id, origem, curso_interesse, created_by, account_id)
  VALUES (COALESCE(NULLIF(btrim(lb.nome),''), lb.whatsapp, lb.email, '(sem nome)'),
          lb.whatsapp, lb.email, 'novo', COALESCE(_owner_id, uid),
          COALESCE(lb.origem, 'banco_leads'), lb.curso_interesse, uid,
          COALESCE(lb.account_id, public.current_account_id()))
  RETURNING id INTO new_id;

  UPDATE public.leads_bank
     SET status_atendimento = 'em_atendimento',
         responsavel_id = COALESCE(_owner_id, uid),
         ultimo_contato_em = now(),
         updated_at = now()
   WHERE id = lb.id;

  RETURN jsonb_build_object('status','created','crm_lead_id',new_id);
END;
$function$;

-- ---------- (B) Cadastro da unidade ----------
ALTER TABLE public.contas_comerciais
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_user_id uuid,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS data_ativacao date,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS taxa_implantacao_cents integer NOT NULL DEFAULT 0,
  -- identidade pública do Polo (a marca principal continua sendo MULTPLICK)
  ADD COLUMN IF NOT EXISTS nome_publico text,
  ADD COLUMN IF NOT EXISTS email_institucional text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS modelo_fachada text,
  ADD COLUMN IF NOT EXISTS identidade_observacoes text;

COMMENT ON COLUMN public.contas_comerciais.logo_url IS
  'Logo COMPLEMENTAR da unidade. A marca principal é sempre a Multplick e não pode ser substituída.';
COMMENT ON COLUMN public.contas_comerciais.tipo_da_conta IS
  'matriz | revendedor | licenciado';
COMMENT ON COLUMN public.contas_comerciais.status IS
  'em_implantacao | ativo | inativo | bloqueado';

-- escrita de unidades passa a ser exclusiva do Network Master (super_admin da ROOT)
DROP POLICY IF EXISTS "Super admin gerencia contas comerciais" ON public.contas_comerciais;
CREATE POLICY "network master gerencia unidades"
  ON public.contas_comerciais FOR ALL TO authenticated
  USING (public.is_network_master(auth.uid()))
  WITH CHECK (public.is_network_master(auth.uid()));
