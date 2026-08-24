CREATE TABLE public.affiliate_public_stats (
  affiliate_id uuid PRIMARY KEY REFERENCES public.affiliates(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  paid_enrollments integer NOT NULL DEFAULT 0 CHECK (paid_enrollments >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_public_stats TO authenticated;
GRANT ALL ON public.affiliate_public_stats TO service_role;
ALTER TABLE public.affiliate_public_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view internal ranking"
ON public.affiliate_public_stats FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.affiliates a WHERE a.user_id=auth.uid() AND a.status='ativo'
));

CREATE OR REPLACE FUNCTION public.refresh_affiliate_public_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_id uuid;
BEGIN
  target_id := COALESCE(NEW.affiliate_id,OLD.affiliate_id);
  INSERT INTO public.affiliate_public_stats(affiliate_id,display_name,paid_enrollments,updated_at)
  SELECT a.id,COALESCE(p.display_name,'Afiliado'),
    count(DISTINCT r.enrollment_id) FILTER (WHERE r.valor_cents>0),now()
  FROM public.affiliates a
  LEFT JOIN public.profiles p ON p.user_id=a.user_id
  LEFT JOIN public.affiliate_referrals r ON r.affiliate_id=a.id
  WHERE a.id=target_id
  GROUP BY a.id,p.display_name
  ON CONFLICT (affiliate_id) DO UPDATE SET
    display_name=EXCLUDED.display_name,
    paid_enrollments=EXCLUDED.paid_enrollments,
    updated_at=now();
  RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.refresh_affiliate_public_stats() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_refresh_affiliate_public_stats ON public.affiliate_referrals;
CREATE TRIGGER trg_refresh_affiliate_public_stats
AFTER INSERT OR UPDATE OR DELETE ON public.affiliate_referrals
FOR EACH ROW EXECUTE FUNCTION public.refresh_affiliate_public_stats();

INSERT INTO public.affiliate_public_stats(affiliate_id,display_name,paid_enrollments)
SELECT a.id,COALESCE(p.display_name,'Afiliado'),count(DISTINCT r.enrollment_id) FILTER (WHERE r.valor_cents>0)
FROM public.affiliates a
LEFT JOIN public.profiles p ON p.user_id=a.user_id
LEFT JOIN public.affiliate_referrals r ON r.affiliate_id=a.id
GROUP BY a.id,p.display_name
ON CONFLICT (affiliate_id) DO UPDATE SET display_name=EXCLUDED.display_name,paid_enrollments=EXCLUDED.paid_enrollments,updated_at=now();