-- 1) Revoke direct EXECUTE on internal SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.affiliate_commission_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.messages_touch_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, app_permission) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_can_manage_all(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_conv_participant(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_username() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lead_bank_get_crm_statuses(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lead_bank_import_batch(jsonb, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_xp(integer, integer) FROM anon;

-- 2) is_staff: only real staff roles, not a bare "viewer" row
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','editor','certificadora')
  )
$function$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;

-- 3) enrollment_applications: ownership tracking + own-row read
ALTER TABLE public.enrollment_applications
  ADD COLUMN IF NOT EXISTS submitted_by uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Anyone can submit a pre-enrollment" ON public.enrollment_applications;
CREATE POLICY "Anyone can submit a pre-enrollment"
ON public.enrollment_applications FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(full_name)) BETWEEN 1 AND 200
  AND length(btrim(email)) BETWEEN 3 AND 320
  AND length(btrim(course_title)) BETWEEN 1 AND 300
  AND status = 'novo'
  AND (submitted_by IS NULL OR submitted_by = auth.uid())
);

CREATE POLICY "Submitters view own application"
ON public.enrollment_applications FOR SELECT TO authenticated
USING (submitted_by IS NOT NULL AND submitted_by = auth.uid());

-- 4) mkt_vault: dedicated credential permission
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage_vault';

-- 5) CRM leads realtime: stop broadcasting full old rows
ALTER TABLE public.crm_leads REPLICA IDENTITY DEFAULT;