-- Permissoes administrativas coerentes com o modulo de afiliados
DROP POLICY IF EXISTS "Admins manage affiliates" ON public.affiliates;
CREATE POLICY "Affiliate managers manage affiliates"
ON public.affiliates FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_permission(auth.uid(), 'manage_affiliates'::public.app_permission))
WITH CHECK (public.is_master(auth.uid()) OR public.has_permission(auth.uid(), 'manage_affiliates'::public.app_permission));

DROP POLICY IF EXISTS "Admins manage referrals" ON public.affiliate_referrals;
CREATE POLICY "Affiliate managers manage referrals"
ON public.affiliate_referrals FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_permission(auth.uid(), 'manage_affiliates'::public.app_permission))
WITH CHECK (public.is_master(auth.uid()) OR public.has_permission(auth.uid(), 'manage_affiliates'::public.app_permission));

-- Metas individuais por afiliado
CREATE TABLE public.affiliate_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('dia','semana','quinzena','mes')),
  target_enrollments integer NOT NULL DEFAULT 0 CHECK (target_enrollments >= 0),
  reward_label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_goals TO authenticated;
GRANT ALL ON public.affiliate_goals TO service_role;
ALTER TABLE public.affiliate_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own goals"
ON public.affiliate_goals FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Master manages affiliate goals"
ON public.affiliate_goals FOR ALL TO authenticated
USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE TRIGGER trg_affiliate_goals_updated BEFORE UPDATE ON public.affiliate_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configuracao compartilhada do programa
CREATE TABLE public.affiliate_program_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  star_every integer NOT NULL DEFAULT 5 CHECK (star_every > 0),
  milestone_enrollments integer NOT NULL DEFAULT 30 CHECK (milestone_enrollments > 0),
  milestone_reward text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_program_settings TO authenticated;
GRANT ALL ON public.affiliate_program_settings TO service_role;
ALTER TABLE public.affiliate_program_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active affiliates view program settings"
ON public.affiliate_program_settings FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.user_id=auth.uid() AND a.status='ativo'));
CREATE POLICY "Master manages program settings"
ON public.affiliate_program_settings FOR ALL TO authenticated
USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE TRIGGER trg_affiliate_program_settings_updated BEFORE UPDATE ON public.affiliate_program_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.affiliate_program_settings(singleton, star_every, milestone_enrollments, milestone_reward)
VALUES (true, 5, 30, 'Prêmio a definir pelo master') ON CONFLICT (singleton) DO NOTHING;

-- Mensagens do master aos afiliados
CREATE TABLE public.affiliate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  sent_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_messages TO authenticated;
GRANT ALL ON public.affiliate_messages TO service_role;
ALTER TABLE public.affiliate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view addressed messages"
ON public.affiliate_messages FOR SELECT TO authenticated
USING (affiliate_id IS NULL OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id=affiliate_id AND a.user_id=auth.uid()));
CREATE POLICY "Affiliates mark addressed messages read"
ON public.affiliate_messages FOR UPDATE TO authenticated
USING (affiliate_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id=affiliate_id AND a.user_id=auth.uid()))
WITH CHECK (affiliate_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id=affiliate_id AND a.user_id=auth.uid()));
CREATE POLICY "Master manages affiliate messages"
ON public.affiliate_messages FOR ALL TO authenticated
USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()) AND sent_by=auth.uid());

-- Codigo de afiliado validado na pre-matricula
CREATE OR REPLACE FUNCTION public.enrollment_application_resolve_affiliate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_aff public.affiliates;
BEGIN
  IF NEW.promo_code IS NULL OR btrim(NEW.promo_code)='' THEN RETURN NEW; END IF;
  NEW.promo_code := upper(btrim(NEW.promo_code));
  SELECT * INTO v_aff FROM public.affiliates WHERE upper(code)=NEW.promo_code AND status='ativo';
  IF v_aff.id IS NULL THEN RAISE EXCEPTION 'Código de afiliado inválido ou inativo'; END IF;
  NEW.seller_id := v_aff.user_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enrollment_application_resolve_affiliate() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enrollment_application_affiliate ON public.enrollment_applications;
CREATE TRIGGER trg_enrollment_application_affiliate BEFORE INSERT OR UPDATE OF promo_code
ON public.enrollment_applications FOR EACH ROW EXECUTE FUNCTION public.enrollment_application_resolve_affiliate();

-- Comissao idempotente pelo valor efetivamente recebido
CREATE OR REPLACE FUNCTION public.affiliate_commission_on_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE aff public.affiliates; enr record; base integer; pct numeric;
BEGIN
  IF NEW.status <> 'pago' THEN RETURN NEW; END IF;
  SELECT e.id,e.affiliate_id,e.user_id,c.title AS course_title INTO enr
  FROM public.enrollments e LEFT JOIN public.courses c ON c.id=e.course_id
  WHERE e.id=NEW.enrollment_id;
  IF enr.affiliate_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO aff FROM public.affiliates WHERE id=enr.affiliate_id AND status='ativo';
  IF aff.id IS NULL THEN RETURN NEW; END IF;
  base := GREATEST(COALESCE(NEW.valor_final_cents,NEW.valor_cents,0),0);
  pct := GREATEST(COALESCE(aff.commission_pct,0),0);
  INSERT INTO public.affiliate_referrals
    (affiliate_id,enrollment_id,installment_id,valor_cents,commission_cents,status,student_name,course_title,parcela_label)
  VALUES
    (aff.id,enr.id,NEW.id,base,round(base*pct/100.0)::integer,'pendente',
     (SELECT COALESCE(display_name,email) FROM public.profiles WHERE user_id=enr.user_id),
     enr.course_title,
     CASE WHEN NEW.numero=1 AND NOT EXISTS (SELECT 1 FROM public.installments i WHERE i.enrollment_id=NEW.enrollment_id AND i.id<>NEW.id) THEN 'Pagamento integral' ELSE 'Parcela '||NEW.numero END)
  ON CONFLICT (installment_id) DO UPDATE SET
    affiliate_id=EXCLUDED.affiliate_id,
    enrollment_id=EXCLUDED.enrollment_id,
    valor_cents=EXCLUDED.valor_cents,
    commission_cents=EXCLUDED.commission_cents,
    student_name=EXCLUDED.student_name,
    course_title=EXCLUDED.course_title,
    parcela_label=EXCLUDED.parcela_label;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.affiliate_commission_on_paid() FROM PUBLIC, anon, authenticated;

-- Consulta segura do progresso/ranking sem PII nem valores de terceiros
CREATE OR REPLACE FUNCTION public.affiliate_ranking()
RETURNS TABLE(affiliate_id uuid, display_name text, paid_enrollments bigint, stars bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.id, COALESCE(p.display_name,'Afiliado'),
    count(DISTINCT r.enrollment_id) FILTER (WHERE r.valor_cents>0),
    floor((count(DISTINCT r.enrollment_id) FILTER (WHERE r.valor_cents>0))::numeric /
      GREATEST(COALESCE((SELECT star_every FROM public.affiliate_program_settings WHERE singleton),5),1))::bigint
  FROM public.affiliates a
  LEFT JOIN public.profiles p ON p.user_id=a.user_id
  LEFT JOIN public.affiliate_referrals r ON r.affiliate_id=a.id
  WHERE a.status='ativo' AND (public.is_master(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates me WHERE me.user_id=auth.uid() AND me.status='ativo'))
  GROUP BY a.id,p.display_name
  ORDER BY 3 DESC,2;
$$;
REVOKE ALL ON FUNCTION public.affiliate_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_ranking() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.affiliate_remaining_installments()
RETURNS TABLE(id uuid,enrollment_id uuid,numero integer,valor_cents integer,valor_final_cents integer,vencimento date,status text,student_name text,course_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT i.id,i.enrollment_id,i.numero,i.valor_cents,i.valor_final_cents,i.vencimento,i.status,
   COALESCE(p.display_name,p.email),c.title
 FROM public.installments i
 JOIN public.enrollments e ON e.id=i.enrollment_id
 JOIN public.affiliates a ON a.id=e.affiliate_id
 LEFT JOIN public.profiles p ON p.user_id=e.user_id
 LEFT JOIN public.courses c ON c.id=e.course_id
 WHERE a.user_id=auth.uid() AND i.status<>'pago'
 ORDER BY i.vencimento NULLS LAST,i.numero;
$$;
REVOKE ALL ON FUNCTION public.affiliate_remaining_installments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_remaining_installments() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.affiliate_goal_progress()
RETURNS TABLE(affiliate_id uuid,period text,target_enrollments integer,reward_label text,paid_enrollments bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT g.affiliate_id,g.period,g.target_enrollments,g.reward_label,
   count(DISTINCT r.enrollment_id) FILTER (WHERE r.created_at >= CASE g.period
     WHEN 'dia' THEN date_trunc('day',now())
     WHEN 'semana' THEN date_trunc('week',now())
     WHEN 'quinzena' THEN CASE WHEN extract(day from now())<=15 THEN date_trunc('month',now()) ELSE date_trunc('month',now())+interval '15 days' END
     ELSE date_trunc('month',now()) END)
 FROM public.affiliate_goals g
 JOIN public.affiliates a ON a.id=g.affiliate_id
 LEFT JOIN public.affiliate_referrals r ON r.affiliate_id=g.affiliate_id
 WHERE g.active AND (a.user_id=auth.uid() OR public.is_master(auth.uid()))
 GROUP BY g.affiliate_id,g.period,g.target_enrollments,g.reward_label;
$$;
REVOKE ALL ON FUNCTION public.affiliate_goal_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_goal_progress() TO authenticated, service_role;

-- Completa lancamentos antigos que ja apontam para uma parcela
UPDATE public.affiliate_referrals r SET
 student_name=COALESCE(r.student_name,p.display_name,p.email),
 course_title=COALESCE(r.course_title,c.title),
 parcela_label=COALESCE(r.parcela_label,CASE WHEN i.numero=1 AND NOT EXISTS (SELECT 1 FROM public.installments x WHERE x.enrollment_id=e.id AND x.id<>i.id) THEN 'Pagamento integral' ELSE 'Parcela '||i.numero END)
FROM public.installments i
JOIN public.enrollments e ON e.id=i.enrollment_id
LEFT JOIN public.profiles p ON p.user_id=e.user_id
LEFT JOIN public.courses c ON c.id=e.course_id
WHERE r.installment_id=i.id;