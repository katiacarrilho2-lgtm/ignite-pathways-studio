DROP FUNCTION IF EXISTS public.affiliate_ranking();
DROP FUNCTION IF EXISTS public.affiliate_remaining_installments();
DROP FUNCTION IF EXISTS public.affiliate_goal_progress();

CREATE POLICY "Affiliates view installments from own referrals"
ON public.installments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.enrollments e
  JOIN public.affiliates a ON a.id=e.affiliate_id
  WHERE e.id=installments.enrollment_id AND a.user_id=auth.uid()
));

CREATE POLICY "Affiliates view own referred enrollments"
ON public.enrollments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.affiliates a
  WHERE a.id=enrollments.affiliate_id AND a.user_id=auth.uid()
));