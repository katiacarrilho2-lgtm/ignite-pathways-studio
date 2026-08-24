DELETE FROM public.affiliate_referrals a
USING public.affiliate_referrals b
WHERE a.installment_id IS NOT NULL
  AND a.installment_id = b.installment_id
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_referrals_installment_id_key
  ON public.affiliate_referrals (installment_id)
  WHERE installment_id IS NOT NULL;