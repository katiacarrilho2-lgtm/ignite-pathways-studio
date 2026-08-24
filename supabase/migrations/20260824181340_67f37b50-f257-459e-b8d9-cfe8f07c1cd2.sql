DROP POLICY IF EXISTS "admins manage mkt_vault" ON public.mkt_vault;
CREATE POLICY "vault managers manage mkt_vault"
ON public.mkt_vault FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_permission(auth.uid(), 'manage_vault'))
WITH CHECK (public.is_master(auth.uid()) OR public.has_permission(auth.uid(), 'manage_vault'));