REVOKE ALL ON FUNCTION public.next_username() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_username() FROM anon;
GRANT EXECUTE ON FUNCTION public.next_username() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_username() TO service_role;