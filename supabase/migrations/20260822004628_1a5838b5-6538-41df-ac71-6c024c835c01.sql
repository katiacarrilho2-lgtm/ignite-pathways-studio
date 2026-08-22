CREATE TABLE IF NOT EXISTS public.mkt_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.mkt_folders(id) ON DELETE SET NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_folders TO authenticated;
GRANT ALL ON public.mkt_folders TO service_role;
ALTER TABLE public.mkt_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage marketing folders" ON public.mkt_folders;
CREATE POLICY "Staff manage marketing folders" ON public.mkt_folders
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_mkt_folders_upd ON public.mkt_folders;
CREATE TRIGGER trg_mkt_folders_upd BEFORE UPDATE ON public.mkt_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mkt_assets
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.mkt_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_name text,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mkt_assets_folder ON public.mkt_assets(folder_id);

INSERT INTO public.mkt_folders (name, sort_order)
SELECT v.name, v.ord FROM (VALUES
  ('Instagram',10),('Facebook',20),('WhatsApp',30),('Reels',40),('Stories',50),
  ('Banners',60),('Cursos',70),('Logos',80),('Vídeos',90),('Documentos',100),('Outros',110)
) AS v(name, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.mkt_folders f WHERE f.name = v.name);

UPDATE public.mkt_assets a
SET folder_id = f.id
FROM public.mkt_folders f
WHERE a.folder_id IS NULL AND f.name = a.pasta;