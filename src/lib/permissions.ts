// Catálogo completo de permissões da plataforma.
// "mod_*" = acesso à pasta/módulo do painel. As demais são permissões de ação (legado).

export type PermGroup = {
  group: string;
  items: { id: string; label: string }[];
};

export const PERMISSION_GROUPS: PermGroup[] = [
  {
    group: "Painel",
    items: [
      { id: "mod_dashboard", label: "Dashboard" },
      { id: "mod_relatorios", label: "Relatórios" },
      { id: "view_analytics", label: "Ver analytics / indicadores" },
    ],
  },
  {
    group: "Comercial e CRM",
    items: [
      { id: "mod_crm", label: "CRM" },
      { id: "mod_leads", label: "Leads" },
      { id: "mod_connect", label: "Multplick Connect (WhatsApp)" },
      { id: "mod_corporativo", label: "Corporativo (B2B)" },
      { id: "manage_leads", label: "Ação: gerenciar leads" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { id: "mod_marketing", label: "Central de Marketing" },
      { id: "mod_promo", label: "Carrossel da Home" },
      { id: "mod_parceiros", label: "Parceiros" },
      { id: "mod_cupons", label: "Cupons" },
      { id: "mod_imagens", label: "Imagens" },
      { id: "manage_content", label: "Ação: editar conteúdo do site" },
    ],
  },
  {
    group: "Cursos e conteúdo",
    items: [
      { id: "mod_cursos", label: "Cursos" },
      { id: "mod_cursos_ia", label: "Gerar Curso com IA" },
      { id: "mod_categorias", label: "Categorias" },
      { id: "mod_andamento", label: "Andamento das turmas" },
      { id: "mod_treinamentos", label: "Treinamentos internos" },
      { id: "manage_courses", label: "Ação: gerenciar cursos" },
    ],
  },
  {
    group: "Alunos e matrículas",
    items: [
      { id: "mod_alunos", label: "Alunos" },
      { id: "mod_pre_matriculas", label: "Pré-matrículas" },
      { id: "mod_turmas", label: "Turmas" },
      { id: "mod_documentos_links", label: "Links de Documentos" },
      { id: "mod_certificacao", label: "Certificação e Conselhos" },
      { id: "manage_certification", label: "Ação: emitir certificação" },
    ],
  },
  {
    group: "Atendimento",
    items: [
      { id: "mod_mensagens", label: "Mensagens dos alunos" },
      { id: "mod_suporte", label: "Suporte / chamados" },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { id: "mod_financeiro", label: "Financeiro" },
      { id: "issue_boletos", label: "Ação: emitir boletos" },
      { id: "settle_boletos", label: "Ação: baixar boletos (marcar pago)" },
      { id: "view_commission", label: "Ver comissões" },
    ],
  },
  {
    group: "Afiliados",
    items: [
      { id: "mod_afiliados", label: "Afiliados (gestão)" },
      { id: "mod_meu_afiliado", label: "Meu Afiliado (área pessoal)" },
      { id: "manage_affiliates", label: "Ação: gerenciar afiliados" },
    ],
  },
  {
    group: "Rede interna",
    items: [
      { id: "mod_rede_interna", label: "Rede Interna (chat da equipe)" },
      { id: "mod_agenda", label: "Agenda Geral" },
      { id: "mod_solicitacoes", label: "Solicitações internas" },
      { id: "mod_documentos_internos", label: "Documentos internos" },
      { id: "mod_departamentos", label: "Departamentos" },
    ],
  },
  {
    group: "Escola física e patrimônio",
    items: [
      { id: "mod_escola_fisica", label: "Escola Física (salas e reservas)" },
      { id: "mod_patrimonio", label: "Patrimônio" },
      { id: "mod_manutencao", label: "Manutenção" },
      { id: "mod_almoxarifado", label: "Almoxarifado / estoque" },
    ],
  },
  {
    group: "Pedagógico",
    items: [
      { id: "mod_pedagogia", label: "Pedagogia (ocorrências)" },
      { id: "mod_frequencia", label: "Lista de chamada presencial" },
    ],
  },
  {
    group: "Administração",
    items: [
      { id: "mod_usuarios", label: "Usuários" },
      { id: "mod_cargos", label: "Cargos e permissões" },
      { id: "mod_auditoria", label: "Auditoria do sistema" },
      { id: "manage_users", label: "Ação: gerenciar usuários e cargos" },
    ],
  },
];


export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.items);

export const permLabel = (id: string) =>
  ALL_PERMISSIONS.find(p => p.id === id)?.label ?? id;
