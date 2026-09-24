
CREATE TABLE public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, slug text NOT NULL UNIQUE,
  grupo text NOT NULL DEFAULT 'loja',
  descricao text, imagem_url text, icone text,
  ordem int NOT NULL DEFAULT 100, ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.store_categories(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'curso',
  tipo_venda text NOT NULL DEFAULT 'compra_direta',
  nome text NOT NULL, slug text NOT NULL UNIQUE,
  modalidade text, descricao_curta text, descricao text, para_quem text, pre_requisitos text,
  duracao text, carga_horaria text, inicio text, metodologia text, conteudo text, beneficios text,
  certificado_texto text, como_funciona text, instituicao text, formas_pagamento text,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb, objetivos text[] NOT NULL DEFAULT '{}',
  imagem_url text, imagem_alt text,
  preco_cents int, preco_promo_cents int, promo_ativa boolean NOT NULL DEFAULT false,
  promo_inicio date, promo_fim date,
  estoque int, validade date,
  disponivel_loja boolean NOT NULL DEFAULT false, destaque boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 100, cta_texto text,
  mec_reconhecido boolean NOT NULL DEFAULT false, sistec boolean NOT NULL DEFAULT false,
  conselho_profissional text, texto_regulatorio text,
  seo_titulo text, seo_descricao text, indexavel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0, UNIQUE(bundle_id, product_id)
);
CREATE TABLE public.store_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text, subtitulo text, imagem_desktop text, imagem_mobile text,
  botao_texto text, botao_link text, botao2_texto text, botao2_link text,
  ordem int NOT NULL DEFAULT 100, ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE, tipo text NOT NULL DEFAULT 'percentual',
  valor numeric NOT NULL DEFAULT 0,
  produtos uuid[] NOT NULL DEFAULT '{}', categorias uuid[] NOT NULL DEFAULT '{}',
  inicio date, fim date, limite_uso int, usos int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp text, infinitepay_handle text, modo text NOT NULL DEFAULT 'producao',
  aparencia jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.store_order_seq;
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE, token uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid DEFAULT public.account_root_id(),
  user_id uuid, nome text NOT NULL, cpf text, nascimento date, email text NOT NULL, whatsapp text NOT NULL,
  cidade text, estado text,
  subtotal_cents int NOT NULL DEFAULT 0, desconto_cents int NOT NULL DEFAULT 0, total_cents int NOT NULL DEFAULT 0,
  cupom_id uuid REFERENCES public.store_coupons(id), cupom_codigo text,
  status text NOT NULL DEFAULT 'aguardando_pagamento',
  metodo text, origem text, campanha text, polo text, consultor text, affiliate_id uuid,
  infinitepay_slug text, transaction_nsu text, receipt_url text, checkout_url text,
  crm_lead_id uuid, enrollment_application_id uuid, idem_key text UNIQUE,
  paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  account_id uuid DEFAULT public.account_root_id(),
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  nome text NOT NULL, quantidade int NOT NULL DEFAULT 1, preco_cents int NOT NULL
);
CREATE TABLE public.store_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  account_id uuid DEFAULT public.account_root_id(),
  provider text NOT NULL DEFAULT 'infinitepay', transaction_nsu text, status text NOT NULL,
  valor_cents int, parcelas int, metodo text, receipt_url text, raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider, transaction_nsu)
);
CREATE TABLE public.store_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text, order_nsu text, resultado text, payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_categories, public.store_products, public.store_bundle_items, public.store_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories, public.store_products, public.store_bundle_items, public.store_banners, public.store_coupons, public.store_settings, public.store_orders, public.store_order_items TO authenticated;
GRANT SELECT ON public.store_payments, public.store_webhook_logs TO authenticated;
GRANT ALL ON public.store_categories, public.store_products, public.store_bundle_items, public.store_banners, public.store_coupons, public.store_settings, public.store_orders, public.store_order_items, public.store_payments, public.store_webhook_logs TO service_role;
GRANT USAGE ON SEQUENCE public.store_order_seq TO service_role;

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.store_can_manage(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_matriz_staff(_uid) AND (public.has_permission(_uid,'manage_courses') OR public.has_permission(_uid,'mod_cupons') OR public.is_master(_uid))
$$;
REVOKE EXECUTE ON FUNCTION public.store_can_manage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_can_manage(uuid) TO authenticated;

CREATE POLICY "cat publico" ON public.store_categories FOR SELECT USING (ativo OR (auth.uid() IS NOT NULL AND public.store_can_manage(auth.uid())));
CREATE POLICY "cat gestao" ON public.store_categories FOR ALL TO authenticated USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "prod publico" ON public.store_products FOR SELECT USING (disponivel_loja OR (auth.uid() IS NOT NULL AND public.store_can_manage(auth.uid())));
CREATE POLICY "prod gestao" ON public.store_products FOR ALL TO authenticated USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "bundle publico" ON public.store_bundle_items FOR SELECT USING (true);
CREATE POLICY "bundle gestao" ON public.store_bundle_items FOR ALL TO authenticated USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "banner publico" ON public.store_banners FOR SELECT USING (ativo OR (auth.uid() IS NOT NULL AND public.store_can_manage(auth.uid())));
CREATE POLICY "banner gestao" ON public.store_banners FOR ALL TO authenticated USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "cupom gestao" ON public.store_coupons FOR ALL TO authenticated USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "settings gestao" ON public.store_settings FOR ALL TO authenticated USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "logs gestao" ON public.store_webhook_logs FOR SELECT TO authenticated USING (public.store_can_manage(auth.uid()));

CREATE POLICY "ped equipe" ON public.store_orders FOR SELECT TO authenticated
  USING ((public.is_staff(auth.uid()) AND (public.is_network_master(auth.uid()) OR account_id = public.user_home_account_id(auth.uid()))) OR user_id = auth.uid());
CREATE POLICY "ped gestao upd" ON public.store_orders FOR UPDATE TO authenticated
  USING (public.store_can_manage(auth.uid())) WITH CHECK (public.store_can_manage(auth.uid()));
CREATE POLICY "itens ver" ON public.store_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id));
CREATE POLICY "pag ver" ON public.store_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id));

CREATE TRIGGER t_store_cat_upd BEFORE UPDATE ON public.store_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_store_prod_upd BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_store_ban_upd BEFORE UPDATE ON public.store_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_store_cup_upd BEFORE UPDATE ON public.store_coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_store_ord_upd BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_settings(id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.store_preco_vigente(_p public.store_products) RETURNS int
LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT CASE WHEN _p.promo_ativa AND _p.preco_promo_cents IS NOT NULL AND _p.preco_promo_cents > 0
     AND (_p.promo_inicio IS NULL OR _p.promo_inicio <= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
     AND (_p.promo_fim IS NULL OR _p.promo_fim >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
   THEN _p.preco_promo_cents ELSE _p.preco_cents END
$$;

CREATE OR REPLACE FUNCTION public.store_upsert_lead(_nome text, _whats text, _email text, _curso text, _origem text, _desc text, _acc uuid, _estagio text, _valor int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lid uuid; w text := regexp_replace(coalesce(_whats,''),'\D','','g');
BEGIN
  SELECT id INTO lid FROM crm_leads WHERE (w <> '' AND regexp_replace(coalesce(telefone,''),'\D','','g') = w)
     OR (coalesce(_email,'') <> '' AND lower(email) = lower(_email)) ORDER BY updated_at DESC LIMIT 1;
  IF lid IS NULL THEN
    INSERT INTO crm_leads(nome, telefone, email, curso_interesse, origem, descricao, account_id, estagio, valor_cents, etiqueta)
    VALUES (_nome, w, _email, _curso, _origem, _desc, coalesce(_acc, account_root_id()), _estagio::crm_stage, coalesce(_valor,0), 'quente') RETURNING id INTO lid;
  ELSE
    UPDATE crm_leads SET curso_interesse = coalesce(_curso, curso_interesse), estagio = _estagio::crm_stage,
      descricao = concat_ws(E'\n', descricao, _desc), valor_cents = greatest(coalesce(_valor,0), valor_cents), updated_at = now() WHERE id = lid;
  END IF;
  RETURN lid;
END $$;

CREATE OR REPLACE FUNCTION public.store_criar_pedido(_itens uuid[], _cliente jsonb, _cupom text, _origem jsonb, _idem text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.store_orders; p public.store_products; sub int := 0; descv int := 0; c public.store_coupons;
  acc uuid := public.account_root_id(); aff uuid; pid uuid; elegivel int := 0; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; lid uuid;
BEGIN
  IF _idem IS NOT NULL THEN
    SELECT * INTO o FROM store_orders WHERE idem_key = _idem;
    IF FOUND THEN RETURN jsonb_build_object('id',o.id,'token',o.token,'numero',o.numero,'total_cents',o.total_cents); END IF;
  END IF;
  IF coalesce(array_length(_itens,1),0) = 0 THEN RAISE EXCEPTION 'Carrinho vazio'; END IF;
  IF coalesce(trim(_cliente->>'nome'),'') = '' OR coalesce(trim(_cliente->>'email'),'') = '' OR coalesce(trim(_cliente->>'whatsapp'),'') = '' THEN
    RAISE EXCEPTION 'Dados obrigatórios ausentes'; END IF;
  FOREACH pid IN ARRAY _itens LOOP
    SELECT * INTO p FROM store_products WHERE id = pid AND disponivel_loja AND tipo_venda = 'compra_direta';
    IF NOT FOUND OR coalesce(public.store_preco_vigente(p),0) <= 0 THEN RAISE EXCEPTION 'Produto indisponível para compra'; END IF;
    IF p.estoque IS NOT NULL AND p.estoque <= 0 THEN RAISE EXCEPTION 'Produto esgotado'; END IF;
    IF p.validade IS NOT NULL AND p.validade < hoje THEN RAISE EXCEPTION 'Oferta expirada'; END IF;
    sub := sub + public.store_preco_vigente(p);
  END LOOP;
  IF nullif(trim(coalesce(_cupom,'')),'') IS NOT NULL THEN
    SELECT * INTO c FROM store_coupons WHERE upper(codigo) = upper(trim(_cupom)) AND ativo
      AND (inicio IS NULL OR inicio <= hoje) AND (fim IS NULL OR fim >= hoje) AND (limite_uso IS NULL OR usos < limite_uso);
    IF NOT FOUND THEN RAISE EXCEPTION 'Cupom inválido ou expirado'; END IF;
    FOREACH pid IN ARRAY _itens LOOP
      SELECT * INTO p FROM store_products WHERE id = pid;
      IF (cardinality(c.produtos)=0 AND cardinality(c.categorias)=0) OR p.id = ANY(c.produtos) OR p.category_id = ANY(c.categorias) THEN
        elegivel := elegivel + public.store_preco_vigente(p); END IF;
    END LOOP;
    IF elegivel = 0 THEN RAISE EXCEPTION 'Cupom não se aplica a estes cursos'; END IF;
    descv := CASE WHEN c.tipo = 'percentual' THEN round(elegivel * least(c.valor,100) / 100.0) ELSE least(round(c.valor*100)::int, elegivel) END;
  END IF;
  IF nullif(_origem->>'polo','') IS NOT NULL THEN
    SELECT id INTO acc FROM contas_comerciais WHERE slug = _origem->>'polo' LIMIT 1;
    acc := coalesce(acc, public.account_root_id());
  END IF;
  IF nullif(_origem->>'consultor','') IS NOT NULL THEN
    SELECT id INTO aff FROM affiliates WHERE upper(code) = upper(_origem->>'consultor') LIMIT 1;
  END IF;
  INSERT INTO store_orders(numero, account_id, user_id, nome, cpf, nascimento, email, whatsapp, cidade, estado,
    subtotal_cents, desconto_cents, total_cents, cupom_id, cupom_codigo, origem, campanha, polo, consultor, affiliate_id, idem_key)
  VALUES ('LJ-'||to_char(now(),'YYYY')||'-'||lpad(nextval('store_order_seq')::text,6,'0'), acc, auth.uid(),
    trim(_cliente->>'nome'), nullif(regexp_replace(coalesce(_cliente->>'cpf',''),'\D','','g'),''), nullif(_cliente->>'nascimento','')::date,
    lower(trim(_cliente->>'email')), regexp_replace(_cliente->>'whatsapp','\D','','g'), _cliente->>'cidade', _cliente->>'estado',
    sub, descv, sub - descv, c.id, c.codigo, coalesce(nullif(_origem->>'origem',''),'loja'), nullif(_origem->>'campanha',''),
    nullif(_origem->>'polo',''), nullif(_origem->>'consultor',''), aff, _idem)
  RETURNING * INTO o;
  FOREACH pid IN ARRAY _itens LOOP
    SELECT * INTO p FROM store_products WHERE id = pid;
    INSERT INTO store_order_items(order_id, account_id, product_id, nome, preco_cents) VALUES (o.id, acc, p.id, p.nome, public.store_preco_vigente(p));
  END LOOP;
  lid := public.store_upsert_lead(o.nome, o.whatsapp, o.email, (SELECT string_agg(nome, ' + ') FROM store_order_items WHERE order_id=o.id),
     coalesce(o.origem,'loja'), 'Pedido '||o.numero||' aguardando pagamento', acc, 'fechamento', o.total_cents);
  UPDATE store_orders SET crm_lead_id = lid WHERE id = o.id;
  RETURN jsonb_build_object('id',o.id,'token',o.token,'numero',o.numero,'total_cents',o.total_cents);
END $$;

CREATE OR REPLACE FUNCTION public.store_registrar_interesse(_tipo text, _dados jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lid uuid; txt text; acc uuid := account_root_id();
BEGIN
  IF coalesce(trim(_dados->>'nome'),'') = '' OR coalesce(trim(_dados->>'whatsapp'),'') = '' THEN RAISE EXCEPTION 'Informe nome e WhatsApp'; END IF;
  IF nullif(_dados->>'polo','') IS NOT NULL THEN acc := coalesce((SELECT id FROM contas_comerciais WHERE slug=_dados->>'polo' LIMIT 1), acc); END IF;
  SELECT string_agg(key||': '||value, E'\n') INTO txt FROM jsonb_each_text(_dados) WHERE value <> '';
  lid := public.store_upsert_lead(trim(_dados->>'nome'), _dados->>'whatsapp', _dados->>'email', _dados->>'curso',
    CASE WHEN _tipo='proposta' THEN 'corporativo' ELSE coalesce(nullif(_dados->>'origem',''),'loja') END,
    CASE WHEN _tipo='proposta' THEN 'Lead Corporativo' ELSE 'Verificação de experiência' END || E'\n' || left(coalesce(txt,''), 3000), acc, 'novo', 0);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.store_pedido_publico(_id uuid, _token uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('id',o.id,'numero',o.numero,'status',o.status,'total_cents',o.total_cents,'nome',o.nome,'checkout_url',o.checkout_url,
    'itens',(SELECT jsonb_agg(jsonb_build_object('nome',i.nome,'preco_cents',i.preco_cents)) FROM store_order_items i WHERE i.order_id=o.id))
  FROM store_orders o WHERE o.id=_id AND o.token=_token
$$;

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
    VALUES ('receita', 'Loja '||o.numero||' · '||o.nome, _valor, current_date, now(),
      'InfinitePay NSU '||coalesce(_nsu,'')||coalesce(' · polo '||o.polo,'')||coalesce(' · consultor '||o.consultor,''), o.account_id);
  IF o.crm_lead_id IS NOT NULL THEN
    UPDATE crm_leads SET estagio='matriculado', descricao=concat_ws(E'\n',descricao,'VENDA REALIZADA · pedido '||o.numero), updated_at=now() WHERE id=o.crm_lead_id;
  END IF;
  PERFORM public.notify_network_master('Venda na loja: '||o.numero, o.nome||' · R$ '||to_char(_valor/100.0,'FM999G990D00'), '/admin/loja');
  IF o.account_id IS DISTINCT FROM account_root_id() THEN PERFORM public.notify_account_users(o.account_id, 'Venda na loja: '||o.numero, o.nome, '/polo'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.store_catalogo_ia(_busca text DEFAULT NULL) RETURNS TABLE(nome text, slug text, categoria text, modalidade text, duracao text, carga_horaria text, preco_cents int, preco_vigente_cents int, promocao boolean, formas_pagamento text, tipo_venda text, link text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p.nome, p.slug, c.nome, p.modalidade, p.duracao, p.carga_horaria, p.preco_cents, public.store_preco_vigente(p),
    public.store_preco_vigente(p) IS DISTINCT FROM p.preco_cents, p.formas_pagamento, p.tipo_venda, 'https://multplick.live/curso/'||p.slug
  FROM store_products p LEFT JOIN store_categories c ON c.id=p.category_id
  WHERE p.disponivel_loja AND (_busca IS NULL OR p.nome ILIKE '%'||_busca||'%' OR c.nome ILIKE '%'||_busca||'%')
  ORDER BY p.ordem, p.nome
$$;

REVOKE EXECUTE ON FUNCTION public.store_upsert_lead(text,text,text,text,text,text,uuid,text,int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_confirmar_pagamento(uuid,text,int,int,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_confirmar_pagamento(uuid,text,int,int,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_criar_pedido(uuid[],jsonb,text,jsonb,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_registrar_interesse(text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_pedido_publico(uuid,uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_catalogo_ia(text) TO anon, authenticated, service_role;

INSERT INTO public.store_categories(nome, slug, grupo, ordem) VALUES
 ('Cursos Técnicos','cursos-tecnicos','loja',10),('Técnico por Competência','tecnico-por-competencia','loja',20),
 ('EJA / Supletivo','eja-supletivo','loja',30),('Graduação','graduacao','loja',40),('Pós-Graduação','pos-graduacao','loja',50),
 ('Profissionalizantes','profissionalizantes','loja',60),('Refrigeração e Climatização','refrigeracao-e-climatizacao','loja',70),
 ('NRs e Segurança','nrs-e-seguranca','loja',80),('Treinamentos Corporativos','treinamentos-corporativos','loja',90),
 ('Combos','combos','loja',100),
 ('Manutenção Industrial','corp-manutencao-industrial','corporativo',10),('Refrigeração e Climatização','corp-refrigeracao','corporativo',20),
 ('Elétrica','corp-eletrica','corporativo',30),('Segurança / NRs','corp-seguranca-nrs','corporativo',40),('Operadores','corp-operadores','corporativo',50),
 ('Logística','corp-logistica','corporativo',60),('Liderança Operacional','corp-lideranca-operacional','corporativo',70),
 ('Treinamentos personalizados','corp-personalizados','corporativo',80)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_banners(titulo, subtitulo, botao_texto, botao_link, botao2_texto, botao2_link, ordem) VALUES
 ('Invista na sua formação. Transforme seu futuro.','Cursos para quem quer começar, se qualificar ou transformar experiência em formação profissional.','Ver cursos','#cursos','Falar com um consultor','whatsapp',1);
