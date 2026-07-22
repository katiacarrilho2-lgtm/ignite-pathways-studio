
CREATE TABLE IF NOT EXISTS public.role_definitions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  base_role public.app_role NOT NULL DEFAULT 'viewer',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_definitions TO authenticated;
GRANT ALL ON public.role_definitions TO service_role;

ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view roles" ON public.role_definitions;
CREATE POLICY "Staff can view roles" ON public.role_definitions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage roles" ON public.role_definitions;
CREATE POLICY "Admins manage roles" ON public.role_definitions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_users'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_users'::app_permission));

DROP TRIGGER IF EXISTS update_role_definitions_updated_at ON public.role_definitions;
CREATE TRIGGER update_role_definitions_updated_at BEFORE UPDATE ON public.role_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_definitions(key, label, description, base_role, permissions, is_system, sort_order) VALUES
  ('super_admin', 'Master (Super Admin)', 'Acesso total à plataforma.', 'super_admin', ARRAY['manage_courses','manage_users','manage_leads','view_analytics','manage_content','manage_affiliates','view_commission','issue_boletos','settle_boletos','manage_certification'], true, 0),
  ('admin', 'Administrador', 'Gerencia operação diária.', 'admin', ARRAY['manage_courses','manage_users','manage_leads','view_analytics','manage_content','manage_affiliates','issue_boletos','settle_boletos'], true, 10),
  ('editor', 'Editor de conteúdo', 'Cria e edita cursos/aulas.', 'editor', ARRAY['manage_courses','manage_content'], true, 20),
  ('certificadora', 'Certificadora', 'Emite documentação para conselhos.', 'certificadora', ARRAY['manage_certification'], true, 30),
  ('viewer', 'Visualizador', 'Somente leitura.', 'viewer', ARRAY['view_analytics'], true, 40),
  ('vendedor', 'Vendedor', 'Equipe comercial: leads, matrículas e comissões.', 'viewer', ARRAY['manage_leads','view_commission','issue_boletos'], false, 50)
ON CONFLICT (key) DO NOTHING;
