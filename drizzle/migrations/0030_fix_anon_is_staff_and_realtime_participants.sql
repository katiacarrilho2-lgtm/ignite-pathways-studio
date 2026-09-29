GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='internal_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_participants;
  END IF;
END $$;