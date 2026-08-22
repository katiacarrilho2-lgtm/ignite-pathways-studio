-- ============ DEPARTAMENTOS ============
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#2563eb',
  icone text,
  sort_order int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read departments" ON public.departments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "managers write departments" ON public.departments FOR ALL TO authenticated
  USING (public.crm_can_manage_all(auth.uid())) WITH CHECK (public.crm_can_manage_all(auth.uid()));
CREATE TRIGGER trg_departments_upd BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.departments (slug, nome, cor, sort_order) VALUES
  ('administracao','Administração','#0f172a',1),
  ('secretaria','Secretaria','#0ea5e9',2),
  ('pedagogia','Pedagogia','#8b5cf6',3),
  ('financeiro','Financeiro','#16a34a',4),
  ('marketing','Marketing','#f43f5e',5),
  ('comercial','Comercial','#f59e0b',6),
  ('almoxarifado','Almoxarifado','#64748b',7),
  ('professores','Professores','#0891b2',8),
  ('direcao','Direção','#7c3aed',9);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- staff pode ver colegas (necessário para o chat interno)
CREATE POLICY "staff read staff profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND public.is_staff(user_id));

-- ============ REDE INTERNA ============
CREATE TABLE public.internal_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'dm' CHECK (tipo IN ('dm','grupo','departamento')),
  titulo text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.internal_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.internal_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT '1970-01-01',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.internal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.internal_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  reply_to uuid REFERENCES public.internal_messages(id) ON DELETE SET NULL,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_internal_messages_conv ON public.internal_messages(conversation_id, created_at DESC);

-- ============ NOTIFICAÇÕES ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'mensagem',
  titulo text NOT NULL,
  corpo text,
  link text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read_at, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.internal_conversations, public.internal_participants, public.internal_messages, public.notifications TO service_role;

CREATE OR REPLACE FUNCTION public.is_conv_participant(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.internal_participants WHERE conversation_id = _conv AND user_id = _uid)
$$;
REVOKE ALL ON FUNCTION public.is_conv_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conv_participant(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.internal_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv read" ON public.internal_conversations FOR SELECT TO authenticated
  USING (public.is_conv_participant(id, auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "conv insert" ON public.internal_conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "conv update" ON public.internal_conversations FOR UPDATE TO authenticated
  USING (public.is_conv_participant(id, auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "conv delete" ON public.internal_conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "part read" ON public.internal_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_conv_participant(conversation_id, auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "part insert" ON public.internal_participants FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "part update" ON public.internal_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));
CREATE POLICY "part delete" ON public.internal_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "msg read" ON public.internal_messages FOR SELECT TO authenticated
  USING (public.is_conv_participant(conversation_id, auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "msg insert" ON public.internal_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conv_participant(conversation_id, auth.uid()));
CREATE POLICY "msg delete" ON public.internal_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));
CREATE POLICY "notif insert staff" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));
CREATE POLICY "notif delete own" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));

-- trigger: atualiza conversa e notifica participantes
CREATE OR REPLACE FUNCTION public.internal_message_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  conv public.internal_conversations;
  dep_name text;
  sender_name text;
BEGIN
  UPDATE public.internal_conversations
     SET last_message_at = NEW.created_at,
         last_message_preview = left(NEW.body, 140),
         resolved_at = NULL,
         updated_at = now()
   WHERE id = NEW.conversation_id
   RETURNING * INTO conv;

  SELECT COALESCE(display_name, email) INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT nome INTO dep_name FROM public.departments d
    WHERE d.id = COALESCE(conv.department_id, (SELECT department_id FROM public.profiles WHERE user_id = NEW.sender_id));

  INSERT INTO public.notifications (user_id, tipo, titulo, corpo, link, department_id)
  SELECT p.user_id, 'mensagem',
         '🔥 ' || COALESCE(dep_name, 'Rede Interna') || ' chamando',
         COALESCE(sender_name, 'Alguém') || ' enviou uma mensagem.',
         '/admin/rede-interna?c=' || conv.id,
         conv.department_id
  FROM public.internal_participants p
  WHERE p.conversation_id = NEW.conversation_id AND p.user_id <> NEW.sender_id;

  UPDATE public.internal_participants SET last_read_at = NEW.created_at
   WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_internal_message_fanout AFTER INSERT ON public.internal_messages
  FOR EACH ROW EXECUTE FUNCTION public.internal_message_fanout();

CREATE TRIGGER trg_internal_conv_upd BEFORE UPDATE ON public.internal_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;