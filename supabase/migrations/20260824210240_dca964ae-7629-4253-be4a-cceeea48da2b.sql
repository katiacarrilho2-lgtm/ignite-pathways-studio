CREATE OR REPLACE FUNCTION public.is_affiliate_of_application(_uid uuid, _promo_code text, _seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL AND (
    _seller_id = _uid
    OR EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.user_id = _uid
        AND a.status = 'ativo'
        AND _promo_code IS NOT NULL
        AND upper(a.code) = upper(_promo_code)
    )
  )
$$;

REVOKE ALL ON FUNCTION public.is_affiliate_of_application(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_affiliate_of_application(uuid, text, uuid) TO authenticated;

CREATE POLICY "Affiliates view their own referred applications"
ON public.enrollment_applications
FOR SELECT
TO authenticated
USING (public.is_affiliate_of_application(auth.uid(), promo_code, seller_id));