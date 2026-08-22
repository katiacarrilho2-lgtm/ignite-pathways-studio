REVOKE ALL ON FUNCTION public.internal_message_fanout() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_message_fanout() TO service_role;