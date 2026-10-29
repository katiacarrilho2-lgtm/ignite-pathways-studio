CREATE OR REPLACE FUNCTION public.polo_repasse_devido(_course_id uuid, _account uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT CASE r.tipo_regra
      WHEN 'valor_fixo_multplick' THEN r.valor_fixo_cents
      WHEN 'percentual_multplick' THEN ROUND(COALESCE(NULLIF(r.preco_sugerido_cents,0), c.price_cents, 0) * r.percentual / 100.0)::int
      ELSE NULL END
    FROM public.polo_regras r
    LEFT JOIN public.courses c ON c.id = _course_id
    WHERE r.ativo AND r.tipo_regra IN ('valor_fixo_multplick','percentual_multplick')
      AND (r.account_id IS NULL OR r.account_id = _account)
      AND ((r.escopo = 'curso' AND r.course_id = _course_id)
        OR (r.escopo = 'categoria' AND r.categoria_id = c.categoria_id))
    ORDER BY (r.escopo = 'curso') DESC, r.account_id NULLS LAST
    LIMIT 1), 0)
$$;

CREATE TABLE public.rede_repasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.enrollment_applications(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  course_id uuid,
  aluno text,
  curso text,
  valor_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  recebido_em timestamptz,
  recebido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.rede_repasses TO authenticated;
GRANT ALL ON public.rede_repasses TO service_role;
ALTER TABLE public.rede_repasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polo ve os proprios repasses" ON public.rede_repasses FOR SELECT TO authenticated
  USING (public.account_visible(account_id) OR public.is_network_master(auth.uid()));
CREATE POLICY "matriz baixa repasses" ON public.rede_repasses FOR UPDATE TO authenticated
  USING (public.is_network_master(auth.uid())) WITH CHECK (public.is_network_master(auth.uid()));

CREATE OR REPLACE FUNCTION public.rede_repasse_on_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.network_review_status = 'aprovada'
     AND COALESCE(OLD.network_review_status,'') <> 'aprovada'
     AND NEW.account_id IS NOT NULL AND NEW.account_id <> public.account_root_id() THEN
    INSERT INTO public.rede_repasses(application_id, account_id, course_id, aluno, curso, valor_cents)
    VALUES (NEW.id, NEW.account_id, NEW.course_id, NEW.full_name, NEW.course_title,
            public.polo_repasse_devido(NEW.course_id, NEW.account_id))
    ON CONFLICT (application_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rede_repasse_on_approve AFTER UPDATE OF network_review_status ON public.enrollment_applications
  FOR EACH ROW EXECUTE FUNCTION public.rede_repasse_on_approve();

INSERT INTO public.rede_repasses(application_id, account_id, course_id, aluno, curso, valor_cents)
SELECT a.id, a.account_id, a.course_id, a.full_name, a.course_title, public.polo_repasse_devido(a.course_id, a.account_id)
FROM public.enrollment_applications a
WHERE a.network_review_status IN ('aprovada','matriculada') AND a.account_id IS NOT NULL AND a.account_id <> public.account_root_id()
ON CONFLICT DO NOTHING;

ALTER TABLE public.zz_e2e_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "somente master" ON public.zz_e2e_log FOR ALL TO authenticated
  USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));