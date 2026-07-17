CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text,
  phone text,
  cpf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_profiles enable row level security;
create policy "Students read own profile" on public.student_profiles for select to authenticated using (auth.uid() = user_id);
create policy "Students update own profile" on public.student_profiles for update to authenticated using (auth.uid() = user_id);
create policy "Students insert own profile" on public.student_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "Admins view all student profiles" on public.student_profiles for select to authenticated using (has_permission(auth.uid(), 'manage_users'));
create policy "Admins manage student profiles" on public.student_profiles for all to authenticated
  using (has_permission(auth.uid(), 'manage_users')) with check (has_permission(auth.uid(), 'manage_users'));
create trigger trg_student_profiles_updated before update on public.student_profiles
  for each row execute function public.update_updated_at_column();

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active',
  progress integer not null default 0 check (progress between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  unique (user_id, course_id)
);
alter table public.enrollments enable row level security;
create policy "Students view own enrollments" on public.enrollments for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all enrollments" on public.enrollments for select to authenticated using (has_permission(auth.uid(), 'manage_courses'));
create policy "Admins manage enrollments" on public.enrollments for all to authenticated
  using (has_permission(auth.uid(), 'manage_courses')) with check (has_permission(auth.uid(), 'manage_courses'));
create index idx_enrollments_user on public.enrollments(user_id);
create index idx_enrollments_course on public.enrollments(course_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare inv RECORD;
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  insert into public.student_profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (user_id) do nothing;
  if not exists (select 1 from public.user_roles where role = 'super_admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  end if;
  select * into inv from public.invitations
    where lower(email) = lower(new.email) and accepted_at is null and expires_at > now()
    order by created_at desc limit 1;
  if found then
    insert into public.user_roles (user_id, role) values (new.id, inv.role) on conflict do nothing;
    insert into public.user_permissions (user_id, permission, granted_by)
      select new.id, p, inv.invited_by from unnest(inv.permissions) as p
      on conflict do nothing;
    update public.invitations set accepted_at = now() where id = inv.id;
  end if;
  return new;
end;
$function$;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS phone1 text, ADD COLUMN IF NOT EXISTS phone2 text,
  ADD COLUMN IF NOT EXISTS contact_email text, ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS cep text, ADD COLUMN IF NOT EXISTS rua text,
  ADD COLUMN IF NOT EXISTS numero text, ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text, ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS birth_date date, ADD COLUMN IF NOT EXISTS sexo text,
  ADD COLUMN IF NOT EXISTS polo text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS vendedor text,
  ADD COLUMN IF NOT EXISTS liberar_apostila boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificado_liberado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bolsista boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_final date, ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_rg text,
  ADD COLUMN IF NOT EXISTS responsavel_cpf text,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE TABLE public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  data_inicio date, data_fim date,
  capacidade int NOT NULL DEFAULT 30,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.turma_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, user_id)
);
ALTER TABLE public.turma_alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage turmas" ON public.turmas FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_courses')) WITH CHECK (has_permission(auth.uid(), 'manage_courses'));
CREATE POLICY "Students view own turmas" ON public.turmas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turma_alunos ta WHERE ta.turma_id = turmas.id AND ta.user_id = auth.uid()));
CREATE POLICY "Admins manage turma_alunos" ON public.turma_alunos FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_courses')) WITH CHECK (has_permission(auth.uid(), 'manage_courses'));
CREATE POLICY "Students view own turma_alunos" ON public.turma_alunos FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  numero int NOT NULL DEFAULT 1,
  valor_cents int NOT NULL DEFAULT 0,
  vencimento date,
  status text NOT NULL DEFAULT 'aberto',
  paid_at timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage installments" ON public.installments FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_courses')) WITH CHECK (has_permission(auth.uid(), 'manage_courses'));
CREATE POLICY "Students view own installments" ON public.installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = installments.enrollment_id AND e.user_id = auth.uid()));
CREATE TRIGGER trg_turmas_upd BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_installments_upd BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_sections_course ON public.course_sections(course_id, sort_order);
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors manage course_sections" ON public.course_sections FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_courses'::app_permission))
  WITH CHECK (has_permission(auth.uid(), 'manage_courses'::app_permission));
CREATE POLICY "Enrolled students view course_sections" ON public.course_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_sections.course_id AND e.user_id = auth.uid()));
CREATE TRIGGER trg_course_sections_updated_at BEFORE UPDATE ON public.course_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  lesson_type text NOT NULL CHECK (lesson_type IN ('video','text','quiz','flip','accordion')),
  sort_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_path text,
  duration_seconds integer,
  passing_score integer NOT NULL DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_lessons_section ON public.course_lessons(section_id, sort_order);
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors manage course_lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_courses'::app_permission))
  WITH CHECK (has_permission(auth.uid(), 'manage_courses'::app_permission));
CREATE POLICY "Enrolled students view course_lessons" ON public.course_lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_sections s JOIN public.enrollments e ON e.course_id = s.course_id WHERE s.id = course_lessons.section_id AND e.user_id = auth.uid()));
CREATE TRIGGER trg_course_lessons_updated_at BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  score integer,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'manage_courses'::app_permission));
CREATE TRIGGER trg_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS passing_score integer NOT NULL DEFAULT 70;

CREATE POLICY "Editors upload course videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-videos' AND has_permission(auth.uid(), 'manage_courses'::app_permission));
CREATE POLICY "Editors update course videos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-videos' AND has_permission(auth.uid(), 'manage_courses'::app_permission));
CREATE POLICY "Editors delete course videos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-videos' AND has_permission(auth.uid(), 'manage_courses'::app_permission));
CREATE POLICY "Enrolled students read course videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-videos' AND (
    has_permission(auth.uid(), 'manage_courses'::app_permission)
    OR EXISTS (SELECT 1 FROM public.course_lessons l JOIN public.course_sections s ON s.id = l.section_id JOIN public.enrollments e ON e.course_id = s.course_id WHERE l.video_path = storage.objects.name AND e.user_id = auth.uid())
  ));

CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'ativo',
  pix_key TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate views own row" ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage affiliates" ON public.affiliates FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_users'::app_permission))
  WITH CHECK (has_permission(auth.uid(), 'manage_users'::app_permission));

CREATE TABLE public.affiliate_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  enrollment_id UUID,
  valor_cents INTEGER NOT NULL DEFAULT 0,
  commission_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate views own referrals" ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_referrals.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins manage referrals" ON public.affiliate_referrals FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'manage_users'::app_permission))
  WITH CHECK (has_permission(auth.uid(), 'manage_users'::app_permission));
CREATE TRIGGER trg_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.crm_stage AS ENUM ('novo','lead','fechamento','matriculado','cancelado','proximo_mes');
CREATE TYPE public.crm_temp AS ENUM ('frio','morno','quente');
CREATE TYPE public.crm_goal_scope AS ENUM ('dia','semana','mes');
CREATE TYPE public.crm_event_type AS ENUM ('anotacao','troca_estagio','whatsapp','agenda','criacao');

CREATE OR REPLACE FUNCTION public.crm_can_manage_all(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_master(_uid) OR public.has_permission(_uid, 'manage_users'::app_permission)
$$;

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, telefone text, email text,
  etiqueta crm_temp NOT NULL DEFAULT 'frio',
  valor_cents integer NOT NULL DEFAULT 0,
  estagio crm_stage NOT NULL DEFAULT 'novo',
  owner_id uuid NOT NULL,
  origem text, curso_interesse text, descricao text,
  motivo_cancelamento text, data_cancelamento date,
  atendimentos integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own leads" ON public.crm_leads FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Manager reads all leads" ON public.crm_leads FOR SELECT TO authenticated USING (public.crm_can_manage_all(auth.uid()));
CREATE POLICY "Owner updates own leads" ON public.crm_leads FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Manager updates all leads" ON public.crm_leads FOR UPDATE TO authenticated USING (public.crm_can_manage_all(auth.uid())) WITH CHECK (public.crm_can_manage_all(auth.uid()));
CREATE POLICY "Authenticated insert leads" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner deletes own leads" ON public.crm_leads FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.crm_can_manage_all(auth.uid()));
CREATE INDEX idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX idx_crm_leads_estagio ON public.crm_leads(estagio);

CREATE TABLE public.crm_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tipo crm_event_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  autor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.crm_lead_events TO authenticated;
GRANT ALL ON public.crm_lead_events TO service_role;
ALTER TABLE public.crm_lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read events of accessible leads" ON public.crm_lead_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND (l.owner_id = auth.uid() OR public.crm_can_manage_all(auth.uid()))));
CREATE POLICY "Insert events for accessible leads" ON public.crm_lead_events FOR INSERT TO authenticated
WITH CHECK (autor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND (l.owner_id = auth.uid() OR public.crm_can_manage_all(auth.uid()))));
CREATE INDEX idx_crm_events_lead ON public.crm_lead_events(lead_id);

CREATE TABLE public.crm_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  title text NOT NULL, notes text,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_appointments TO authenticated;
GRANT ALL ON public.crm_appointments TO service_role;
ALTER TABLE public.crm_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own appts" ON public.crm_appointments FOR SELECT TO authenticated USING (auth.uid() = owner_id OR public.crm_can_manage_all(auth.uid()));
CREATE POLICY "Owner writes own appts" ON public.crm_appointments FOR ALL TO authenticated USING (auth.uid() = owner_id OR public.crm_can_manage_all(auth.uid())) WITH CHECK (auth.uid() = owner_id OR public.crm_can_manage_all(auth.uid()));
CREATE INDEX idx_crm_appts_owner ON public.crm_appointments(owner_id);
CREATE INDEX idx_crm_appts_when ON public.crm_appointments(scheduled_at);

CREATE TABLE public.crm_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo crm_goal_scope NOT NULL UNIQUE,
  valor_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.crm_goals TO authenticated;
GRANT ALL ON public.crm_goals TO service_role;
ALTER TABLE public.crm_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read goals" ON public.crm_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master writes goals" ON public.crm_goals FOR ALL TO authenticated USING (public.crm_can_manage_all(auth.uid())) WITH CHECK (public.crm_can_manage_all(auth.uid()));
INSERT INTO public.crm_goals (escopo, valor_cents) VALUES ('dia',0),('semana',0),('mes',0);

CREATE TABLE public.crm_settings (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.crm_settings TO authenticated;
GRANT ALL ON public.crm_settings TO service_role;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read settings" ON public.crm_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master writes settings" ON public.crm_settings FOR ALL TO authenticated USING (public.crm_can_manage_all(auth.uid())) WITH CHECK (public.crm_can_manage_all(auth.uid()));
INSERT INTO public.crm_settings (chave, valor) VALUES ('whatsapp_template', '{"text":"Olá {nome}, tudo bem? Aqui é da Multplick"}'::jsonb);

CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_appts_updated BEFORE UPDATE ON public.crm_appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.crm_track_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.estagio IS DISTINCT FROM OLD.estagio THEN
    NEW.stage_changed_at = now();
    INSERT INTO public.crm_lead_events(lead_id, tipo, payload, autor_id)
    VALUES (NEW.id, 'troca_estagio', jsonb_build_object('de', OLD.estagio, 'para', NEW.estagio), COALESCE(auth.uid(), NEW.owner_id));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_crm_stage_change BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.crm_track_stage_change();

CREATE OR REPLACE FUNCTION public.crm_track_creation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.crm_lead_events(lead_id, tipo, payload, autor_id)
  VALUES (NEW.id, 'criacao', jsonb_build_object('estagio', NEW.estagio), COALESCE(auth.uid(), NEW.created_by, NEW.owner_id));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_crm_creation AFTER INSERT ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.crm_track_creation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_lead_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_appointments;
ALTER TABLE public.crm_leads REPLICA IDENTITY FULL;

CREATE TABLE public.enrollment_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  course_title TEXT NOT NULL, full_name TEXT NOT NULL,
  cpf TEXT, birth_date DATE, rg TEXT, rg_issuer TEXT, rg_issue_date DATE,
  naturalidade TEXT, father_name TEXT, mother_name TEXT,
  cep TEXT, street TEXT, neighborhood TEXT, city TEXT, state TEXT,
  phone TEXT, email TEXT NOT NULL,
  schooling TEXT, graduation_year TEXT, institution TEXT,
  payment_method TEXT, status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT, source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.enrollment_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_applications TO authenticated;
GRANT ALL ON public.enrollment_applications TO service_role;
ALTER TABLE public.enrollment_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a pre-enrollment" ON public.enrollment_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can view applications" ON public.enrollment_applications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update applications" ON public.enrollment_applications FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete applications" ON public.enrollment_applications FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER update_enrollment_applications_updated_at BEFORE UPDATE ON public.enrollment_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_enrollment_apps_course ON public.enrollment_applications(course_id);
CREATE INDEX idx_enrollment_apps_created ON public.enrollment_applications(created_at DESC);

CREATE TABLE public.enrollment_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.enrollment_applications(id) ON DELETE CASCADE,
  course_title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  score integer, passed boolean,
  duration_minutes integer NOT NULL DEFAULT 30,
  passing_score integer NOT NULL DEFAULT 70,
  access_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  started_at timestamptz, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.enrollment_exams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_exams TO authenticated;
GRANT ALL ON public.enrollment_exams TO service_role;
ALTER TABLE public.enrollment_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage exams" ON public.enrollment_exams FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public read exam" ON public.enrollment_exams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public update exam by token" ON public.enrollment_exams FOR UPDATE TO anon, authenticated
  USING (status <> 'completed') WITH CHECK (true);
CREATE TRIGGER trg_enrollment_exams_updated BEFORE UPDATE ON public.enrollment_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.enrollment_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.enrollment_exams(id) ON DELETE CASCADE,
  position integer NOT NULL,
  text text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exam_questions_exam ON public.enrollment_exam_questions(exam_id, position);
GRANT SELECT ON public.enrollment_exam_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_exam_questions TO authenticated;
GRANT ALL ON public.enrollment_exam_questions TO service_role;
ALTER TABLE public.enrollment_exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage exam questions" ON public.enrollment_exam_questions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Public read exam questions" ON public.enrollment_exam_questions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.student_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('rg','cpf','reservista','comprovante_pagamento','comprovante_residencia','historico_escolar','foto_3x4')),
  file_path text NOT NULL,
  file_name text, mime text, size_bytes integer,
  status text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado','aprovado','rejeitado')),
  notes text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_documents TO authenticated;
GRANT ALL ON public.student_documents TO service_role;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno gerencia proprios documentos" ON public.student_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE INDEX idx_student_documents_user ON public.student_documents(user_id);
CREATE TRIGGER trg_student_documents_updated BEFORE UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turma_alunos TO authenticated;
GRANT ALL ON public.turma_alunos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sections TO authenticated;
GRANT ALL ON public.course_sections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;