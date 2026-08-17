CREATE TABLE public.document_upload_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text,'-',''),
  label text,
  student_name text,
  student_email text,
  student_phone text,
  user_id uuid,
  revoked boolean not null default false,
  expires_at timestamptz not null default now() + interval '90 days',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_upload_links TO authenticated;
GRANT ALL ON public.document_upload_links TO service_role;
ALTER TABLE public.document_upload_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage upload links" ON public.document_upload_links FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_doc_upload_links_upd BEFORE UPDATE ON public.document_upload_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.student_documents ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.student_documents ADD COLUMN IF NOT EXISTS link_id uuid REFERENCES public.document_upload_links(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_student_documents_link ON public.student_documents(link_id);
