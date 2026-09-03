-- Master enxerga tudo quando NÃO está visualizando uma unidade específica.
-- Ao assumir uma unidade (account_context), passa a ver exatamente o que aquele Polo vê.
CREATE OR REPLACE FUNCTION public.account_visible(_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(_account, public.account_root_id()) = public.current_account_id()
      OR (public.is_network_master(auth.uid())
          AND NOT EXISTS (SELECT 1 FROM public.account_context ac WHERE ac.user_id = auth.uid()))
$$;

-- Escrita sempre na conta ativa (a própria, ou a unidade assumida pelo Master).
CREATE OR REPLACE FUNCTION public.account_can_write(_account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(_account, public.account_root_id()) = public.current_account_id()
      OR (public.is_network_master(auth.uid())
          AND NOT EXISTS (SELECT 1 FROM public.account_context ac WHERE ac.user_id = auth.uid()))
$$;
