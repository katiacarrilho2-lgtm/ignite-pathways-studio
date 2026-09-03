-- search_path fixo na função de conta raiz
CREATE OR REPLACE FUNCTION public.account_root_id()
RETURNS uuid LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;

-- funções de isolamento não são API pública para visitantes.
-- current_account_id() NÃO é revogada de anon: é o DEFAULT de account_id
-- usado pelos formulários públicos (registro público vai para a conta ROOT).
REVOKE EXECUTE ON FUNCTION public.account_visible(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.account_can_write(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_network_master(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_home_account_id(uuid) FROM anon;

-- funções de trigger nunca devem ser chamadas pela API
REVOKE EXECUTE ON FUNCTION public.profiles_guard_account_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.account_context_audit() FROM anon, authenticated;
