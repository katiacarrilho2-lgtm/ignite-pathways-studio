
-- SUPPORT TICKETS
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  categoria TEXT DEFAULT 'geral',
  prioridade TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'aberto',
  resposta TEXT,
  respondido_por UUID REFERENCES auth.users(id),
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets select" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete tickets" ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CERTIFICATES
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  numero TEXT NOT NULL UNIQUE,
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  carga_horaria TEXT,
  nota_final NUMERIC,
  emitido_por UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff select cert" ON public.certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage cert" ON public.certificates FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_certificates_updated BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DOC LINKS
CREATE TABLE public.doc_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  categoria TEXT DEFAULT 'geral',
  icon TEXT,
  visible_to TEXT NOT NULL DEFAULT 'alunos', -- 'alunos' | 'staff'
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_links TO authenticated;
GRANT ALL ON public.doc_links TO service_role;
ALTER TABLE public.doc_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read doc_links" ON public.doc_links FOR SELECT TO authenticated
  USING (active = true OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage doc_links" ON public.doc_links FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_doc_links_updated BEFORE UPDATE ON public.doc_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
