-- ============ CONNECT ============
CREATE TABLE public.connect_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT 'slate',
  ordem integer NOT NULL DEFAULT 0,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_pipeline_stages TO authenticated;
GRANT ALL ON public.connect_pipeline_stages TO service_role;
ALTER TABLE public.connect_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage stages" ON public.connect_pipeline_stages FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT 'slate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_contact_tags TO authenticated;
GRANT ALL ON public.connect_contact_tags TO service_role;
ALTER TABLE public.connect_contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage tags" ON public.connect_contact_tags FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text,
  email text,
  cidade text,
  estado text,
  origem text,
  status text NOT NULL DEFAULT 'novo',
  tipo text NOT NULL DEFAULT 'contato',
  tags text[] NOT NULL DEFAULT '{}',
  observacoes text,
  opt_out boolean NOT NULL DEFAULT false,
  stage_id uuid REFERENCES public.connect_pipeline_stages(id) ON DELETE SET NULL,
  stage_ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_connect_contacts_stage ON public.connect_contacts(stage_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_contacts TO authenticated;
GRANT ALL ON public.connect_contacts TO service_role;
ALTER TABLE public.connect_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage contacts" ON public.connect_contacts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  mensagem text,
  status text NOT NULL DEFAULT 'rascunho',
  tipo_publico text NOT NULL DEFAULT 'contato',
  etiquetas text[] NOT NULL DEFAULT '{}',
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorrencia text NOT NULL DEFAULT 'unica',
  dias_semana integer[] NOT NULL DEFAULT '{}',
  horarios text[] NOT NULL DEFAULT '{}',
  data_inicio date,
  data_fim date,
  intervalo_min integer NOT NULL DEFAULT 30,
  intervalo_max integer NOT NULL DEFAULT 90,
  pausa_apos_msgs integer NOT NULL DEFAULT 50,
  pausa_minutos integer NOT NULL DEFAULT 10,
  total_destinatarios integer NOT NULL DEFAULT 0,
  total_enviadas integer NOT NULL DEFAULT 0,
  total_falhas integer NOT NULL DEFAULT 0,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_campaigns TO authenticated;
GRANT ALL ON public.connect_campaigns TO service_role;
ALTER TABLE public.connect_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage campaigns" ON public.connect_campaigns FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_campaign_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.connect_campaigns(id) ON DELETE CASCADE,
  mensagem text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ccv_campaign ON public.connect_campaign_variants(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_campaign_variants TO authenticated;
GRANT ALL ON public.connect_campaign_variants TO service_role;
ALTER TABLE public.connect_campaign_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage variants" ON public.connect_campaign_variants FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_campaign_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.connect_campaigns(id) ON DELETE CASCADE,
  nome text,
  url text,
  file_path text,
  mime text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cca_campaign ON public.connect_campaign_attachments(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_campaign_attachments TO authenticated;
GRANT ALL ON public.connect_campaign_attachments TO service_role;
ALTER TABLE public.connect_campaign_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage attachments" ON public.connect_campaign_attachments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.connect_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.connect_contacts(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.connect_campaign_variants(id) ON DELETE SET NULL,
  mensagem text,
  status text NOT NULL DEFAULT 'pendente',
  erro text,
  tentativas integer NOT NULL DEFAULT 0,
  agendada_para timestamptz,
  enviada_em timestamptz,
  whatsapp_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ccm_campaign ON public.connect_campaign_messages(campaign_id);
CREATE INDEX idx_ccm_status ON public.connect_campaign_messages(status, agendada_para);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_campaign_messages TO authenticated;
GRANT ALL ON public.connect_campaign_messages TO service_role;
ALTER TABLE public.connect_campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage messages" ON public.connect_campaign_messages FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.connect_api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'simulado',
  numero text,
  phone_number_id text,
  business_account_id text,
  webhook_verify_token text,
  token_set boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'desconectado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_api_config TO authenticated;
GRANT ALL ON public.connect_api_config TO service_role;
ALTER TABLE public.connect_api_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage api config" ON public.connect_api_config FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.connect_api_config (provider) VALUES ('simulado');
INSERT INTO public.connect_pipeline_stages (nome, cor, ordem, is_final) VALUES
  ('Novo', 'slate', 0, false),
  ('Em conversa', 'amber', 1, false),
  ('Interessado', 'sky', 2, false),
  ('Fechado', 'emerald', 3, true),
  ('Perdido', 'rose', 4, true);

-- ============ BANCO DE LEADS ============
CREATE TABLE public.leads_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text,
  email text,
  cidade text,
  estado text,
  interesse_tipo text DEFAULT 'outro',
  curso_interesse text,
  situacao text NOT NULL DEFAULT 'reengajar',
  status_atendimento text NOT NULL DEFAULT 'disponivel',
  origem text NOT NULL DEFAULT 'manual',
  notas text,
  responsavel_id uuid,
  ultimo_contato_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_bank TO authenticated;
GRANT ALL ON public.leads_bank TO service_role;
ALTER TABLE public.leads_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage leads bank" ON public.leads_bank FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.lead_bank_origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads_bank(id) ON DELETE CASCADE,
  origem text NOT NULL,
  detalhe text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lbo_lead ON public.lead_bank_origins(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_bank_origins TO authenticated;
GRANT ALL ON public.lead_bank_origins TO service_role;
ALTER TABLE public.lead_bank_origins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage lead origins" ON public.lead_bank_origins FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.leads_bank_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads_bank(id) ON DELETE CASCADE,
  texto text NOT NULL,
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lbc_lead ON public.leads_bank_comments(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_bank_comments TO authenticated;
GRANT ALL ON public.leads_bank_comments TO service_role;
ALTER TABLE public.leads_bank_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage lead comments" ON public.leads_bank_comments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.lead_bank_get_crm_statuses(_lead_ids uuid[])
RETURNS TABLE (
  lead_bank_id uuid,
  crm_lead_id uuid,
  crm_nome text,
  estagio text,
  stage_changed_at timestamptz,
  seller_name text,
  status_atendimento text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (lb.id)
    lb.id,
    cl.id,
    cl.nome,
    cl.estagio::text,
    cl.stage_changed_at,
    p.display_name,
    lb.status_atendimento
  FROM public.leads_bank lb
  LEFT JOIN public.crm_leads cl
    ON (
      (NULLIF(regexp_replace(COALESCE(lb.whatsapp,''), '\D', '', 'g'), '')
        = NULLIF(regexp_replace(COALESCE(cl.telefone,''), '\D', '', 'g'), ''))
      OR (NULLIF(lower(COALESCE(lb.email,'')), '') = NULLIF(lower(COALESCE(cl.email,'')), ''))
    )
  LEFT JOIN public.profiles p ON p.user_id = cl.owner_id
  WHERE lb.id = ANY(_lead_ids)
    AND public.is_staff(auth.uid())
  ORDER BY lb.id, cl.stage_changed_at DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.lead_bank_get_crm_statuses(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_bank_get_crm_statuses(uuid[]) TO authenticated, service_role;

-- ============ CRM PROMO BANNERS ============
CREATE TABLE public.crm_promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  price text,
  price_label text,
  badge text,
  color text NOT NULL DEFAULT 'navy',
  image_url text,
  cta_url text,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_promo_banners TO authenticated;
GRANT ALL ON public.crm_promo_banners TO service_role;
ALTER TABLE public.crm_promo_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage promo banners" ON public.crm_promo_banners FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_connect_stages_upd BEFORE UPDATE ON public.connect_pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_connect_tags_upd BEFORE UPDATE ON public.connect_contact_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_connect_contacts_upd BEFORE UPDATE ON public.connect_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_connect_campaigns_upd BEFORE UPDATE ON public.connect_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_connect_api_upd BEFORE UPDATE ON public.connect_api_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_leads_bank_upd BEFORE UPDATE ON public.leads_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_promo_upd BEFORE UPDATE ON public.crm_promo_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();