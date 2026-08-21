CREATE TABLE public.mkt_campaigns (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  objetivo text,
  canal text not null default 'instagram',
  status text not null default 'planejada',
  budget_cents integer not null default 0,
  gasto_cents integer not null default 0,
  leads integer not null default 0,
  vendas integer not null default 0,
  receita_cents integer not null default 0,
  inicio date,
  fim date,
  responsavel_id uuid,
  observacoes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_campaigns TO authenticated;
GRANT ALL ON public.mkt_campaigns TO service_role;
ALTER TABLE public.mkt_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage mkt_campaigns" ON public.mkt_campaigns FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_mkt_campaigns_upd BEFORE UPDATE ON public.mkt_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mkt_tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  status text not null default 'backlog',
  prioridade text not null default 'media',
  responsavel_id uuid,
  campaign_id uuid REFERENCES public.mkt_campaigns(id) ON DELETE SET NULL,
  due_date date,
  ordem integer not null default 0,
  done_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_tasks TO authenticated;
GRANT ALL ON public.mkt_tasks TO service_role;
ALTER TABLE public.mkt_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage mkt_tasks" ON public.mkt_tasks FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_mkt_tasks_upd BEFORE UPDATE ON public.mkt_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();