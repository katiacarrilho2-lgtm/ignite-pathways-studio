
-- 1) company_settings: restrict SELECT to staff
DROP POLICY IF EXISTS "company_settings read all" ON public.company_settings;
CREATE POLICY "company_settings staff read"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- 2) crm_goals: staff-only read
DROP POLICY IF EXISTS "All staff read goals" ON public.crm_goals;
CREATE POLICY "Staff read goals"
  ON public.crm_goals FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- 3) crm_settings: staff-only read
DROP POLICY IF EXISTS "All staff read settings" ON public.crm_settings;
CREATE POLICY "Staff read settings"
  ON public.crm_settings FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4) Replace WITH CHECK (true) on public INSERT policies with basic validation
DROP POLICY IF EXISTS "Anyone creates lead" ON public.leads;
CREATE POLICY "Anyone creates lead"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(name)) BETWEEN 1 AND 200
    AND (email IS NULL OR length(email) <= 320)
    AND (phone IS NULL OR length(phone) <= 40)
    AND (message IS NULL OR length(message) <= 5000)
  );

DROP POLICY IF EXISTS "Anyone can submit a pre-enrollment" ON public.enrollment_applications;
CREATE POLICY "Anyone can submit a pre-enrollment"
  ON public.enrollment_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(full_name)) BETWEEN 1 AND 200
    AND length(btrim(email)) BETWEEN 3 AND 320
    AND length(btrim(course_title)) BETWEEN 1 AND 300
    AND status = 'novo'
  );

-- 5) Revoke direct EXECUTE from anon/authenticated on internal SECURITY DEFINER helpers.
-- RLS policies still evaluate these; direct RPC calls are no longer allowed.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, app_permission) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_can_manage_all(uuid) FROM PUBLIC, anon, authenticated;
