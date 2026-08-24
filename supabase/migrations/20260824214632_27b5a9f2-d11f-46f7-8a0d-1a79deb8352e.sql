REVOKE ALL ON FUNCTION public.repasse_contrato_after_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repasse_installment_after_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repasse_previsao(date, integer, integer) FROM PUBLIC, anon;
