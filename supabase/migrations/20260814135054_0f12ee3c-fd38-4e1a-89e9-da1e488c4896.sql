
-- ============ MENSAGENS ============
CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assunto text NOT NULL DEFAULT 'Dúvida',
  status text NOT NULL DEFAULT 'aberto',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_staff integer NOT NULL DEFAULT 0,
  unread_for_student integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_threads TO authenticated;
GRANT ALL ON public.message_threads TO service_role;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thread_owner_select" ON public.message_threads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "thread_owner_insert" ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "thread_update" ON public.message_threads FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "thread_staff_delete" ON public.message_threads FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_message_threads_upd BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  from_staff boolean NOT NULL DEFAULT false,
  corpo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.message_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND (public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.message_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())));
CREATE INDEX idx_messages_thread ON public.messages(thread_id, created_at);

CREATE OR REPLACE FUNCTION public.messages_touch_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.message_threads SET
    last_message_at = now(),
    unread_for_staff = CASE WHEN NEW.from_staff THEN unread_for_staff ELSE unread_for_staff + 1 END,
    unread_for_student = CASE WHEN NEW.from_staff THEN unread_for_student + 1 ELSE unread_for_student END,
    updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_messages_touch AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_touch_thread();

-- ============ AFILIADOS: comissão por parcela ============
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES public.installments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS course_title text,
  ADD COLUMN IF NOT EXISTS parcela_label text,
  ADD COLUMN IF NOT EXISTS comprovante_path text,
  ADD COLUMN IF NOT EXISTS comprovante_nome text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_installment ON public.affiliate_referrals(installment_id) WHERE installment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.affiliate_commission_on_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  aff public.affiliates;
  enr RECORD;
  base int;
  pct numeric;
BEGIN
  IF NEW.status <> 'pago' OR (TG_OP = 'UPDATE' AND OLD.status = 'pago') THEN
    RETURN NEW;
  END IF;
  SELECT e.id, e.affiliate_id, e.user_id, c.title AS course_title
    INTO enr
  FROM public.enrollments e
  LEFT JOIN public.courses c ON c.id = e.course_id
  WHERE e.id = NEW.enrollment_id;
  IF enr.affiliate_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO aff FROM public.affiliates WHERE id = enr.affiliate_id;
  IF aff.id IS NULL OR aff.status <> 'ativo' THEN RETURN NEW; END IF;
  base := COALESCE(NEW.valor_final_cents, NEW.valor_cents, 0);
  pct := COALESCE(aff.commission_pct, 0);
  INSERT INTO public.affiliate_referrals
    (affiliate_id, enrollment_id, installment_id, valor_cents, commission_cents, status,
     student_name, course_title, parcela_label)
  VALUES (aff.id, enr.id, NEW.id, base, ROUND(base * pct / 100.0)::int, 'pendente',
     (SELECT COALESCE(display_name, email) FROM public.profiles WHERE user_id = enr.user_id),
     enr.course_title, 'Parcela ' || NEW.numero)
  ON CONFLICT (installment_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_affiliate_commission ON public.installments;
CREATE TRIGGER trg_affiliate_commission AFTER INSERT OR UPDATE OF status ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_commission_on_paid();
