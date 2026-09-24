ALTER TABLE public.enrollment_applications
  ADD COLUMN IF NOT EXISTS guardian_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS guardian_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS guardian_submitted_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS enrollment_applications_guardian_token_idx ON public.enrollment_applications(guardian_token);

CREATE OR REPLACE FUNCTION public.guardian_form_info(_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('aluno', full_name, 'curso', course_title, 'enviado', guardian_submitted_at IS NOT NULL)
  FROM public.enrollment_applications WHERE guardian_token = _token
$$;

CREATE OR REPLACE FUNCTION public.guardian_form_submit(_token uuid, _data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _k text; _clean jsonb := '{}'::jsonb;
BEGIN
  SELECT id INTO _id FROM public.enrollment_applications WHERE guardian_token = _token;
  IF _id IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Link inválido'); END IF;
  FOREACH _k IN ARRAY ARRAY['nome','cpf','rg','orgao_emissor','data_expedicao','nascimento','parentesco','cep','rua','numero','complemento','bairro','cidade','estado','whatsapp','email'] LOOP
    IF _data ? _k THEN _clean := _clean || jsonb_build_object(_k, left(coalesce(_data->>_k,''), 200)); END IF;
  END LOOP;
  IF length(coalesce(_clean->>'nome','')) < 3 OR length(regexp_replace(coalesce(_clean->>'cpf',''),'\D','','g')) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nome e CPF são obrigatórios');
  END IF;
  UPDATE public.enrollment_applications SET guardian_data = _clean, guardian_submitted_at = now() WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.guardian_form_info(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_form_submit(uuid, jsonb) TO anon, authenticated;