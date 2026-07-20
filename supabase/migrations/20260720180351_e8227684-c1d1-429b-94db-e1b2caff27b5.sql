
-- 1) Drop overly permissive policies on enrollment_exams / enrollment_exam_questions
DROP POLICY IF EXISTS "Public read exam" ON public.enrollment_exams;
DROP POLICY IF EXISTS "Public update exam by token" ON public.enrollment_exams;
DROP POLICY IF EXISTS "Public read exam questions" ON public.enrollment_exam_questions;

-- Revoke anon grants (staff-only via existing "Staff manage" ALL policies + authenticated grant)
REVOKE ALL ON public.enrollment_exams FROM anon;
REVOKE ALL ON public.enrollment_exam_questions FROM anon;

-- 2) Lock down SECURITY DEFINER functions.
-- Trigger-only + internal admin functions: no direct execution needed.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_track_creation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_track_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_username() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: only signed-in users need to execute them (via policies).
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(uuid, app_permission) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_can_manage_all(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, app_permission) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_manage_all(uuid) TO authenticated;
