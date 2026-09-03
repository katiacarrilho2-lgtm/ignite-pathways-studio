CREATE TABLE public.polo_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL DEFAULT 'curso',
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.course_categories(id) ON DELETE CASCADE,
  instituicao text,
  account_id uuid REFERENCES public.contas_comerciais(id) ON DELETE CASCADE,
  preco_minimo_cents integer NOT NULL DEFAULT 0,
  preco_sugerido_cents integer NOT NULL DEFAULT 0,
  custo_interno_cents integer NOT NULL DEFAULT 0,
  tipo_regra text NOT NULL DEFAULT 'percentual_licenciado',
  percentual numeric(5,2) NOT NULL DEFAULT 40,
  valor_fixo_cents integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT polo_regras_escopo_chk CHECK (escopo IN ('curso','categoria','instituicao')),
  CONSTRAINT polo_regras_tipo_chk CHECK (tipo_regra IN ('percentual_licenciado','valor_fixo_multplick'))
);

CREATE INDEX polo_regras_course_idx ON public.polo_regras(course_id);
CREATE INDEX polo_regras_categoria_idx ON public.polo_regras(categoria_id);
CREATE INDEX polo_regras_account_idx ON public.polo_regras(account_id);

-- Somente a Matriz (Network Master) fala com esta tabela pela Data API.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polo_regras TO authenticated;
GRANT ALL ON public.polo_regras TO service_role;

ALTER TABLE public.polo_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_rede_gerencia_regras" ON public.polo_regras
  FOR ALL TO authenticated
  USING (public.is_network_master(auth.uid()))
  WITH CHECK (public.is_network_master(auth.uid()));

CREATE TRIGGER polo_regras_updated_at BEFORE UPDATE ON public.polo_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visão segura para o Polo: NUNCA expõe custo interno da Multplick.
CREATE OR REPLACE FUNCTION public.polo_regras_visiveis()
RETURNS TABLE(
  id uuid, escopo text, course_id uuid, course_title text,
  categoria_id uuid, categoria_nome text, instituicao text,
  preco_minimo_cents integer, preco_sugerido_cents integer,
  tipo_regra text, percentual numeric, valor_fixo_cents integer, observacoes text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.escopo, r.course_id, c.title, r.categoria_id, cat.name, r.instituicao,
         r.preco_minimo_cents, r.preco_sugerido_cents,
         r.tipo_regra, r.percentual, r.valor_fixo_cents, r.observacoes
  FROM public.polo_regras r
  LEFT JOIN public.courses c ON c.id = r.course_id
  LEFT JOIN public.course_categories cat ON cat.id = r.categoria_id
  WHERE r.ativo
    AND (r.account_id IS NULL OR r.account_id = public.current_account_id())
    AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.polo_regras_visiveis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.polo_regras_visiveis() TO authenticated;

-- Preço mínimo aplicável a um curso, na ordem: regra do curso > categoria > 0.
CREATE OR REPLACE FUNCTION public.polo_preco_minimo(_course_id uuid, _account uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT r.preco_minimo_cents
    FROM public.polo_regras r
    LEFT JOIN public.courses c ON c.id = _course_id
    WHERE r.ativo
      AND (r.account_id IS NULL OR r.account_id = COALESCE(_account, public.current_account_id()))
      AND ((r.escopo = 'curso' AND r.course_id = _course_id)
        OR (r.escopo = 'categoria' AND r.categoria_id = c.categoria_id))
    ORDER BY (r.escopo = 'curso') DESC, r.account_id NULLS LAST
    LIMIT 1
  ), 0)
$$;

REVOKE ALL ON FUNCTION public.polo_preco_minimo(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.polo_preco_minimo(uuid, uuid) TO authenticated;

-- Resumo comercial do mês: só parcelas efetivamente PAGAS geram comissão prevista.
CREATE OR REPLACE FUNCTION public.polo_resumo_comercial(_ym text DEFAULT to_char(now(),'YYYY-MM'), _account uuid DEFAULT NULL)
RETURNS TABLE(recebido_cents bigint, elegivel_cents bigint, repasse_previsto_cents bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _acc uuid := COALESCE(_account, public.current_account_id());
  _ini date := to_date(_ym || '-01','YYYY-MM-DD');
BEGIN
  IF _acc IS NULL OR NOT public.account_visible(_acc) THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  WITH pagas AS (
    SELECT i.id,
           COALESCE(i.valor_final_cents, i.valor_cents) AS valor,
           e.course_id
    FROM public.installments i
    JOIN public.enrollments e ON e.id = i.enrollment_id
    WHERE i.account_id = _acc
      AND i.status = 'pago'
      AND i.paid_at >= _ini
      AND i.paid_at < (_ini + interval '1 month')
  ), calc AS (
    SELECT p.valor,
           (SELECT r.percentual FROM public.polo_regras r
            LEFT JOIN public.courses c ON c.id = p.course_id
            WHERE r.ativo AND r.tipo_regra = 'percentual_licenciado'
              AND (r.account_id IS NULL OR r.account_id = _acc)
              AND ((r.escopo = 'curso' AND r.course_id = p.course_id)
                OR (r.escopo = 'categoria' AND r.categoria_id = c.categoria_id))
            ORDER BY (r.escopo = 'curso') DESC, r.account_id NULLS LAST
            LIMIT 1) AS perc
    FROM pagas p
  )
  SELECT COALESCE(SUM(valor),0)::bigint,
         COALESCE(SUM(valor) FILTER (WHERE perc IS NOT NULL),0)::bigint,
         COALESCE(SUM(ROUND(valor * perc / 100.0)) FILTER (WHERE perc IS NOT NULL),0)::bigint
  FROM calc;
END;
$$;

REVOKE ALL ON FUNCTION public.polo_resumo_comercial(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.polo_resumo_comercial(text, uuid) TO authenticated;