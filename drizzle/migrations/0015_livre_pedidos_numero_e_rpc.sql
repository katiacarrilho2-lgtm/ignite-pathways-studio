-- Etapa 3 — número do pedido + criação segura do pedido pendente (aditivo)

ALTER TABLE public.livre_orders ADD COLUMN IF NOT EXISTS numero_pedido text;

CREATE SEQUENCE IF NOT EXISTS public.livre_orders_numero_seq;

CREATE UNIQUE INDEX IF NOT EXISTS livre_orders_numero_uidx
  ON public.livre_orders(numero_pedido) WHERE numero_pedido IS NOT NULL;

CREATE OR REPLACE FUNCTION public.livre_orders_set_numero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_pedido IS NULL THEN
    NEW.numero_pedido := 'MPL-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.livre_orders_numero_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.livre_orders_set_numero() FROM PUBLIC;

DROP TRIGGER IF EXISTS livre_orders_numero ON public.livre_orders;
CREATE TRIGGER livre_orders_numero BEFORE INSERT ON public.livre_orders
  FOR EACH ROW EXECUTE FUNCTION public.livre_orders_set_numero();

-- preço vigente calculado no servidor (promoção só vale dentro do período)
CREATE OR REPLACE FUNCTION public.livre_preco_vigente(_course_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN c.promocao_ativa
     AND c.preco_promocional_cents IS NOT NULL
     AND (c.promocao_inicio IS NULL OR CURRENT_DATE >= c.promocao_inicio)
     AND (c.promocao_fim IS NULL OR CURRENT_DATE <= c.promocao_fim)
      THEN c.preco_promocional_cents
    ELSE c.price_cents
  END
  FROM public.courses c WHERE c.id = _course_id;
$$;

GRANT EXECUTE ON FUNCTION public.livre_preco_vigente(uuid) TO anon, authenticated;

-- CPF já cadastrado? (não expõe nenhum dado pessoal, apenas sim/não)
CREATE OR REPLACE FUNCTION public.livre_cpf_em_uso(_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
     WHERE regexp_replace(coalesce(sp.cpf,''), '\D', '', 'g') = regexp_replace(coalesce(_cpf,''), '\D', '', 'g')
       AND length(regexp_replace(coalesce(_cpf,''), '\D', '', 'g')) = 11
       AND sp.user_id IS DISTINCT FROM auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.livre_cpf_em_uso(text) TO anon, authenticated;

-- criação do pedido pendente: o navegador só informa o curso
CREATE OR REPLACE FUNCTION public.livre_criar_pedido(_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _course RECORD;
  _preco integer;
  _account uuid;
  _staff boolean;
  _sp RECORD;
  _email text;
  _existing RECORD;
  _id uuid;
  _numero text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para continuar.';
  END IF;

  SELECT * INTO _course FROM public.courses WHERE id = _course_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Curso não encontrado.';
  END IF;

  _staff := public.has_permission(_uid, 'manage_courses');

  IF _course.tipo_curso NOT IN ('curso_livre','avaliacao_conhecimentos') THEN
    RAISE EXCEPTION 'Este curso não está disponível para compra online.';
  END IF;

  -- público só compra curso ativo e com venda livre habilitada; sede pode testar antes
  IF NOT _staff AND (_course.active IS NOT TRUE OR _course.venda_livre IS NOT TRUE) THEN
    RAISE EXCEPTION 'Este curso ainda não está disponível para compra.';
  END IF;

  _preco := public.livre_preco_vigente(_course_id);
  IF _preco IS NULL OR _preco <= 0 THEN
    RAISE EXCEPTION 'Curso sem preço válido cadastrado.';
  END IF;

  SELECT * INTO _sp FROM public.student_profiles WHERE user_id = _uid;
  SELECT email INTO _email FROM public.profiles WHERE user_id = _uid;
  _account := public.user_home_account_id(_uid);

  -- idempotência: reaproveita pedido pendente recente do mesmo aluno/curso
  SELECT * INTO _existing FROM public.livre_orders
   WHERE user_id = _uid AND course_id = _course_id AND status = 'aguardando'
   ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE public.livre_orders
       SET valor_cents = _preco, valor_final_cents = _preco - desconto_cents
     WHERE id = _existing.id
     RETURNING id, numero_pedido INTO _id, _numero;
    RETURN jsonb_build_object('id', _id, 'numero_pedido', _numero,
      'valor_final_cents', _preco - _existing.desconto_cents, 'reaproveitado', true);
  END IF;

  INSERT INTO public.livre_orders (account_id, user_id, course_id, nome, email, telefone, cpf,
                                   valor_cents, valor_final_cents, status, origem)
  VALUES (_account, _uid, _course_id,
          coalesce(_sp.full_name, 'Aluno'),
          coalesce(_sp.contact_email, _email, ''),
          coalesce(_sp.phone, _sp.phone1),
          _sp.cpf, _preco, _preco, 'aguardando', 'site_curso_livre')
  RETURNING id, numero_pedido INTO _id, _numero;

  RETURN jsonb_build_object('id', _id, 'numero_pedido', _numero,
    'valor_final_cents', _preco, 'reaproveitado', false);
END;
$$;

REVOKE ALL ON FUNCTION public.livre_criar_pedido(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.livre_criar_pedido(uuid) TO authenticated;