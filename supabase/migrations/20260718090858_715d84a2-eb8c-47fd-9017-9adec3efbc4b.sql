ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_username()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(username::integer), 0) + 1
    INTO next_num
  FROM public.profiles
  WHERE username ~ '^\d+$';

  RETURN lpad(next_num::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_username() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_username() TO service_role;