-- ============================================================
-- ETAPA 1 — Endurecimento de segurança da fundação multi-conta
-- ============================================================

-- 1) profiles.account_id imutável para usuário comum.
--    Só Master de Rede (super_admin da ROOT) ou backend (service_role/postgres) pode mudar.
CREATE OR REPLACE FUNCTION public.profiles_guard_account_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- backend seguro (edge functions / migrações) passa direto
  IF auth.uid() IS NULL OR current_setting('role', true) IN ('service_role','postgres') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
    IF NOT public.is_network_master(auth.uid()) THEN
      RAISE EXCEPTION 'account_id do perfil é imutável para este usuário';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- usuário comum nunca escolhe a conta do próprio perfil
    IF NOT public.is_network_master(auth.uid())
       AND NEW.account_id IS DISTINCT FROM public.current_account_id() THEN
      NEW.account_id := public.current_account_id();
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_guard_account_id ON public.profiles;
CREATE TRIGGER trg_profiles_guard_account_id
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_account_id();

-- 2) Network Master = SOMENTE super_admin da conta ROOT.
--    Admin comum da Matriz deixa de enxergar toda a Rede.
--    TODO Etapa 2+: trocar por permissão explícita 'manage_network'.
CREATE OR REPLACE FUNCTION public.is_network_master(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _uid
      AND ur.role = 'super_admin'
      AND COALESCE(p.account_id, public.account_root_id()) = public.account_root_id()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_network_master(uuid) FROM anon;
