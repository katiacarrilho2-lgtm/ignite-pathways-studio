-- Visibilidade dos materiais de marketing para a Rede Multplick
ALTER TABLE public.mkt_assets
  ADD COLUMN IF NOT EXISTS rede_visivel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rede_publico text NOT NULL DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS rede_account_id uuid REFERENCES public.contas_comerciais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS copy_texto text;

ALTER TABLE public.mkt_assets
  DROP CONSTRAINT IF EXISTS mkt_assets_rede_publico_check;
ALTER TABLE public.mkt_assets
  ADD CONSTRAINT mkt_assets_rede_publico_check
  CHECK (rede_publico IN ('todos','licenciados','revendedores','polo'));

CREATE INDEX IF NOT EXISTS mkt_assets_rede_idx ON public.mkt_assets (rede_visivel, rede_publico);

-- Preparação para treinamentos por público (UI virá quando o módulo for reativado)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_treinamento boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rede_publico text NOT NULL DEFAULT 'interno',
  ADD COLUMN IF NOT EXISTS rede_account_id uuid REFERENCES public.contas_comerciais(id) ON DELETE SET NULL;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_rede_publico_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_rede_publico_check
  CHECK (rede_publico IN ('interno','todos','licenciados','revendedores','polo'));

-- Helpers
CREATE OR REPLACE FUNCTION public.is_matriz_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(_uid)
     AND public.user_home_account_id(_uid) = '00000000-0000-0000-0000-000000000001'::uuid;
$$;

CREATE OR REPLACE FUNCTION public.rede_publico_do_usuario(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.tipo_da_conta
  FROM public.contas_comerciais c
  WHERE c.id = public.user_home_account_id(_uid);
$$;

CREATE OR REPLACE FUNCTION public.mkt_asset_liberado(_uid uuid, _asset_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mkt_assets a
    WHERE a.id = _asset_id
      AND a.rede_visivel
      AND (
        a.rede_publico = 'todos'
        OR (a.rede_publico = 'licenciados' AND public.rede_publico_do_usuario(_uid) = 'licenciado')
        OR (a.rede_publico = 'revendedores' AND public.rede_publico_do_usuario(_uid) = 'revendedor')
        OR (a.rede_publico = 'polo' AND a.rede_account_id = public.user_home_account_id(_uid))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.mkt_path_liberado(_uid uuid, _path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mkt_assets a
    WHERE a.file_path = _path
      AND public.mkt_asset_liberado(_uid, a.id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_matriz_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_publico_do_usuario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mkt_asset_liberado(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mkt_path_liberado(uuid, text) TO authenticated;

-- RLS: Matriz administra tudo; Polo só lê o que foi liberado para a Rede
DROP POLICY IF EXISTS "staff manage mkt_assets" ON public.mkt_assets;
CREATE POLICY "matriz manage mkt_assets" ON public.mkt_assets
  FOR ALL TO authenticated
  USING (public.is_matriz_staff(auth.uid()))
  WITH CHECK (public.is_matriz_staff(auth.uid()));
CREATE POLICY "rede read mkt_assets" ON public.mkt_assets
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND public.mkt_asset_liberado(auth.uid(), id));

DROP POLICY IF EXISTS "Staff manage marketing folders" ON public.mkt_folders;
CREATE POLICY "matriz manage mkt_folders" ON public.mkt_folders
  FOR ALL TO authenticated
  USING (public.is_matriz_staff(auth.uid()))
  WITH CHECK (public.is_matriz_staff(auth.uid()));
CREATE POLICY "rede read mkt_folders" ON public.mkt_folders
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Storage: leitura restrita ao material liberado
DROP POLICY IF EXISTS "staff read marketing files" ON storage.objects;
CREATE POLICY "marketing files read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-files'
    AND (
      public.is_matriz_staff(auth.uid())
      OR (public.is_staff(auth.uid()) AND public.mkt_path_liberado(auth.uid(), name))
    )
  );
DROP POLICY IF EXISTS "staff update marketing files" ON storage.objects;
CREATE POLICY "marketing files update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-files' AND public.is_matriz_staff(auth.uid()));
DROP POLICY IF EXISTS "staff delete marketing files" ON storage.objects;
CREATE POLICY "marketing files delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-files' AND public.is_matriz_staff(auth.uid()));
DROP POLICY IF EXISTS "staff upload marketing files" ON storage.objects;
CREATE POLICY "marketing files upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-files' AND public.is_matriz_staff(auth.uid()));
