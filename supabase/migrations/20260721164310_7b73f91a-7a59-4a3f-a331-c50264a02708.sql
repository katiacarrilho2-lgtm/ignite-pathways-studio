GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, app_permission) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.crm_can_manage_all(uuid) TO authenticated, anon;