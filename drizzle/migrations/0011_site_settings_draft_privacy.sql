REVOKE SELECT ON public.site_settings FROM anon;
GRANT SELECT (section, published, published_at, updated_at) ON public.site_settings TO anon;