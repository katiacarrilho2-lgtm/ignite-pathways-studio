CREATE TABLE public.admin_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  notes text,
  due_date date,
  due_time time,
  priority text NOT NULL DEFAULT 'normal',
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_tasks TO authenticated;
GRANT ALL ON public.admin_tasks TO service_role;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage tasks" ON public.admin_tasks FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_admin_tasks_upd BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();