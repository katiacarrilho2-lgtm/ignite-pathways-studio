GRANT SELECT ON public.contas_comerciais TO authenticated;

DROP POLICY IF EXISTS "usuario le a propria unidade" ON public.contas_comerciais;
CREATE POLICY "usuario le a propria unidade" ON public.contas_comerciais
  FOR SELECT TO authenticated
  USING (id = public.user_home_account_id(auth.uid()) OR public.is_network_master(auth.uid()));
