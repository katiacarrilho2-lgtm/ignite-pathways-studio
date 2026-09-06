CREATE TABLE public.site_settings (
  section TEXT PRIMARY KEY,
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  published JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings public read"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "site_settings matriz insert"
ON public.site_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_matriz_staff(auth.uid()));

CREATE POLICY "site_settings matriz update"
ON public.site_settings FOR UPDATE
TO authenticated
USING (public.is_matriz_staff(auth.uid()))
WITH CHECK (public.is_matriz_staff(auth.uid()));

CREATE POLICY "site_settings matriz delete"
ON public.site_settings FOR DELETE
TO authenticated
USING (public.is_matriz_staff(auth.uid()));

CREATE TRIGGER site_settings_touch
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();