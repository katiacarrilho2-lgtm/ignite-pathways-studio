-- ============ SOLICITAÇÕES INTERNAS ============
CREATE SEQUENCE IF NOT EXISTS public.internal_request_seq;
CREATE TABLE public.internal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero int NOT NULL DEFAULT nextval('public.internal_request_seq'),
  titulo text NOT NULL,
  descricao text,
  from_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  solicitante_id uuid,
  responsavel_id uuid,
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_analise','em_andamento','aguardando','concluida','cancelada')),
  prazo date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.internal_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.internal_requests(id) ON DELETE CASCADE,
  autor_id uuid,
  tipo text NOT NULL DEFAULT 'comentario',
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ALMOXARIFADO ============
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  localizacao text,
  fornecedor text,
  valor_unit_cents int NOT NULL DEFAULT 0,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  data date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  fornecedor text,
  setor_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  responsavel_id uuid,
  documento text,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.inventory_apply_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.inventory_items;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventory_items
       SET quantidade = quantidade + (CASE WHEN NEW.tipo='entrada' THEN NEW.quantidade ELSE -NEW.quantidade END),
           updated_at = now()
     WHERE id = NEW.item_id RETURNING * INTO item;
    IF item.quantidade <= item.estoque_minimo THEN
      INSERT INTO public.notifications (user_id, tipo, titulo, corpo, link)
      SELECT ur.user_id, 'estoque', '📦 Estoque baixo',
             'Estoque de ' || item.nome || ' está em ' || item.quantidade || ' ' || item.unidade || '.',
             '/admin/almoxarifado'
      FROM public.user_roles ur WHERE ur.role = 'super_admin';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.inventory_items
       SET quantidade = quantidade - (CASE WHEN OLD.tipo='entrada' THEN OLD.quantidade ELSE -OLD.quantidade END),
           updated_at = now()
     WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.inventory_apply_movement() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_apply_movement() TO service_role;
CREATE TRIGGER trg_inventory_move AFTER INSERT OR DELETE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.inventory_apply_movement();

-- ============ ESCOLA FÍSICA ============
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  capacidade int NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'sala',
  localizacao text,
  status text NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','ocupada','manutencao','inativa')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.room_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  finalidade text NOT NULL DEFAULT 'aula' CHECK (finalidade IN ('aula','reuniao','evento','atendimento')),
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  responsavel_id uuid,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.room_reservation_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.fim <= NEW.inicio THEN RAISE EXCEPTION 'O término deve ser depois do início'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.room_reservations r
    WHERE r.classroom_id = NEW.classroom_id AND r.id <> COALESCE(NEW.id, gen_random_uuid())
      AND NEW.inicio < r.fim AND NEW.fim > r.inicio
  ) THEN RAISE EXCEPTION 'Conflito de horário: já existe reserva para esta sala nesse período'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.room_reservation_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.room_reservation_check() TO service_role;
CREATE TRIGGER trg_room_reservation_check BEFORE INSERT OR UPDATE ON public.room_reservations
  FOR EACH ROW EXECUTE FUNCTION public.room_reservation_check();

-- ============ PATRIMÔNIO E MANUTENÇÃO ============
CREATE TABLE public.patrimonio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  nome text NOT NULL,
  categoria text,
  numero_patrimonio text,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  localizacao text,
  responsavel_id uuid,
  estado text NOT NULL DEFAULT 'bom',
  status text NOT NULL DEFAULT 'em_uso' CHECK (status IN ('em_uso','manutencao','danificado','baixado')),
  data_aquisicao date,
  valor_cents int NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'outros',
  problema text NOT NULL,
  local text,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  patrimonio_id uuid REFERENCES public.patrimonio(id) ON DELETE SET NULL,
  responsavel_id uuid,
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_andamento','concluido','cancelado')),
  solucao text,
  custo_cents int NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CHAMADA PRESENCIAL / PEDAGOGIA ============
CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data date NOT NULL,
  titulo text,
  professor_id uuid,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, data, titulo)
);
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL,
  presente boolean NOT NULL DEFAULT true,
  observacao text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_user_id)
);
CREATE TABLE public.pedagogic_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'ocorrencia',
  titulo text NOT NULL,
  descricao text,
  gravidade text NOT NULL DEFAULT 'leve' CHECK (gravidade IN ('leve','media','grave')),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_acompanhamento','resolvida')),
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ AGENDA GERAL ============
CREATE TABLE public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'reuniao',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz,
  local text,
  responsavel_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ DOCUMENTOS INTERNOS ============
CREATE TABLE public.internal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'administracao',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  mime text,
  size_bytes bigint,
  descricao text,
  restrito boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ AUDITORIA ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  modulo text NOT NULL,
  acao text NOT NULL,
  descricao text,
  registro_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============ GRANTS + RLS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['internal_requests','internal_request_events','inventory_items','inventory_movements',
    'classrooms','room_reservations','patrimonio','maintenance_requests','class_sessions','attendance',
    'pedagogic_occurrences','agenda_events','internal_documents','audit_logs']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "staff write %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_upd BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- auditoria é somente-leitura para staff (inserção via app), sem edição/remoção
DROP POLICY "staff write audit_logs" ON public.audit_logs;
CREATE POLICY "staff insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- notificação automática ao criar solicitação
CREATE OR REPLACE FUNCTION public.internal_request_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dep text;
BEGIN
  SELECT nome INTO dep FROM public.departments WHERE id = NEW.from_department_id;
  INSERT INTO public.notifications (user_id, tipo, titulo, corpo, link, department_id)
  SELECT p.user_id, 'solicitacao',
         '📋 Nova solicitação #' || NEW.numero,
         COALESCE(dep,'Um setor') || ' abriu: ' || NEW.titulo,
         '/admin/solicitacoes?r=' || NEW.id, NEW.to_department_id
  FROM public.profiles p
  WHERE (NEW.to_department_id IS NOT NULL AND p.department_id = NEW.to_department_id AND public.is_staff(p.user_id))
     OR p.user_id = NEW.responsavel_id;
  INSERT INTO public.internal_request_events (request_id, autor_id, tipo, descricao)
  VALUES (NEW.id, NEW.solicitante_id, 'criacao', 'Solicitação criada');
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.internal_request_notify() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_request_notify() TO service_role;
CREATE TRIGGER trg_internal_request_notify AFTER INSERT ON public.internal_requests
  FOR EACH ROW EXECUTE FUNCTION public.internal_request_notify();