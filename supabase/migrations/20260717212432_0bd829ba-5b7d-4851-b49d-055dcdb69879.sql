
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'editor', 'viewer');
CREATE TYPE public.app_permission AS ENUM ('manage_courses','manage_users','manage_leads','view_analytics','manage_content');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, email TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  permissions public.app_permission[] NOT NULL DEFAULT '{}',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_categories TO authenticated;
GRANT ALL ON public.course_categories TO service_role;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  categoria_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL,
  duration TEXT,
  price_cents INTEGER,
  description TEXT,
  long_description TEXT,
  image_url TEXT,
  external_url TEXT,
  coursebox_embed_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  has_teacher_manual BOOLEAN NOT NULL DEFAULT false,
  teacher_manual_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT, phone TEXT, message TEXT, source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission public.app_permission)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
      OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = _user_id AND permission = _permission)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_course_categories_updated BEFORE UPDATE ON public.course_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv RECORD;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;
  SELECT * INTO inv FROM public.invitations
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, permission, granted_by)
      SELECT NEW.id, p, inv.invited_by FROM unnest(inv.permissions) AS p
      ON CONFLICT DO NOTHING;
    UPDATE public.invitations SET accepted_at = now() WHERE id = inv.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_users'));

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_users'));
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users view own permissions" ON public.user_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all permissions" ON public.user_permissions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_users'));
CREATE POLICY "Admins manage permissions" ON public.user_permissions FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'manage_users')) WITH CHECK (public.has_permission(auth.uid(), 'manage_users'));

CREATE POLICY "Admins view invitations" ON public.invitations FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_users'));
CREATE POLICY "Admins manage invitations" ON public.invitations FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'manage_users')) WITH CHECK (public.has_permission(auth.uid(), 'manage_users'));

CREATE POLICY "Anyone reads active categories" ON public.course_categories FOR SELECT USING (active = true);
CREATE POLICY "Editors manage categories" ON public.course_categories FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'manage_courses')) WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "Anyone reads active courses" ON public.courses FOR SELECT USING (active = true);
CREATE POLICY "Editors view all courses" ON public.courses FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_courses'));
CREATE POLICY "Editors manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'manage_courses')) WITH CHECK (public.has_permission(auth.uid(), 'manage_courses'));

CREATE POLICY "Anyone creates lead" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view leads" ON public.leads FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_leads'));
CREATE POLICY "Admins update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'manage_leads'));
CREATE POLICY "Admins delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'manage_leads'));

CREATE POLICY "Course images public read" ON storage.objects FOR SELECT USING (bucket_id = 'course-images');
CREATE POLICY "Editors upload course images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-images' AND public.has_permission(auth.uid(), 'manage_courses'));
CREATE POLICY "Editors update course images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'course-images' AND public.has_permission(auth.uid(), 'manage_courses'));
CREATE POLICY "Editors delete course images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-images' AND public.has_permission(auth.uid(), 'manage_courses'));
