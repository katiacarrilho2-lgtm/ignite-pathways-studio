CREATE OR REPLACE FUNCTION public.lead_bank_import_batch(
  _items jsonb,
  _origem text,
  _origem_tipo text DEFAULT 'manual',
  _grupo_nome text DEFAULT NULL,
  _situacao text DEFAULT 'reengajar',
  _interesse_tipo text DEFAULT 'outro',
  _curso_interesse text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    WHERE (v_digits IS NOT NULL AND right(regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g'), 8) = right(v_digits, 8)
           AND regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g') <> '')
       OR (v_email IS NOT NULL AND lower(COALESCE(lb.email,'')) = v_email)
    ORDER BY lb.created_at
    LIMIT 1;

    IF existing_id IS NULL THEN
      INSERT INTO public.leads_bank (nome, whatsapp, email, situacao, interesse_tipo, curso_interesse, origem, created_by)
      VALUES (COALESCE(v_nome, v_email, v_wpp, '(sem nome)'), v_wpp, v_email,
              COALESCE(_situacao,'reengajar'), COALESCE(_interesse_tipo,'outro'),
              _curso_interesse, COALESCE(_origem,'manual'), uid)
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
$$;

REVOKE ALL ON FUNCTION public.lead_bank_import_batch(jsonb, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_bank_import_batch(jsonb, text, text, text, text, text, text) TO authenticated;