CREATE TABLE public.mkt_assets (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pasta text not null default 'Geral',
  tipo text not null default 'imagem',
  file_path text,
  url text,
  mime text,
  size_bytes integer,
  tags text[] not null default '{}',
  campaign_id uuid references public.mkt_campaigns(id) on delete set null,
  observacoes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_assets TO authenticated;
GRANT ALL ON public.mkt_assets TO service_role;
ALTER TABLE public.mkt_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage mkt_assets" ON public.mkt_assets FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_mkt_assets_upd BEFORE UPDATE ON public.mkt_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mkt_social_posts (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  legenda text,
  rede text not null default 'instagram',
  formato text not null default 'feed',
  status text not null default 'ideia',
  scheduled_at timestamptz,
  campaign_id uuid references public.mkt_campaigns(id) on delete set null,
  asset_id uuid references public.mkt_assets(id) on delete set null,
  link text,
  responsavel_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_social_posts TO authenticated;
GRANT ALL ON public.mkt_social_posts TO service_role;
ALTER TABLE public.mkt_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage mkt_social_posts" ON public.mkt_social_posts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_mkt_social_upd BEFORE UPDATE ON public.mkt_social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mkt_vault (
  id uuid primary key default gen_random_uuid(),
  servico text not null,
  categoria text not null default 'rede_social',
  login text,
  senha text,
  url text,
  notas text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_vault TO authenticated;
GRANT ALL ON public.mkt_vault TO service_role;
ALTER TABLE public.mkt_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage mkt_vault" ON public.mkt_vault FOR ALL TO authenticated USING (public.crm_can_manage_all(auth.uid())) WITH CHECK (public.crm_can_manage_all(auth.uid()));
CREATE TRIGGER trg_mkt_vault_upd BEFORE UPDATE ON public.mkt_vault FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "staff read marketing files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'marketing-files' AND public.is_staff(auth.uid()));
CREATE POLICY "staff upload marketing files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marketing-files' AND public.is_staff(auth.uid()));
CREATE POLICY "staff update marketing files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'marketing-files' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete marketing files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'marketing-files' AND public.is_staff(auth.uid()));