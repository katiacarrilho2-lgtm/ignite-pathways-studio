export const PROPOSAL_TYPES = [
  { value: "capacitacao", label: "Capacitação Corporativa" },
  { value: "in_company", label: "Treinamento In Company" },
  { value: "ead", label: "Venda de Cursos EAD" },
  { value: "licenciamento", label: "Licenciamento Multplick" },
  { value: "revenda", label: "Revenda de Cursos" },
  { value: "afiliados", label: "Programa de Afiliados" },
  { value: "parceria", label: "Parceria Comercial" },
  { value: "representacao_pj", label: "Representação Comercial PJ" },
  { value: "consultoria", label: "Consultoria Educacional" },
] as const;

export const CLIENT_TYPES = [
  "Empresa", "Indústria", "Usina", "Hospital", "Clínica", "Prefeitura",
  "Escola", "Comércio", "Construção Civil", "Agronegócio",
  "Licenciado Multplick", "Revendedor de Cursos", "Afiliado",
  "Vendedor PJ", "Representante Comercial", "Parceiro Estratégico",
] as const;

export const MODALIDADES = ["EAD", "Ao Vivo", "Híbrido", "In Company"] as const;

export type ProposalType = typeof PROPOSAL_TYPES[number]["value"];

export interface ProposalData {
  // cliente
  cliente_tipo?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  contato_nome?: string;
  contato_cargo?: string;
  contato_email?: string;
  contato_telefone?: string;
  colaboradores?: number;
  // proposta
  modalidade?: string;
  cursos?: string; // texto livre, um por linha
  plano_licenciamento?: string;
  plano_revenda?: string;
  comissao_afiliado?: string;
  comissao_pj?: string;
  investimento_texto?: string;
  condicoes?: string;
  observacoes?: string;
  // gerado / editável
  diagnostico?: string;
  beneficios?: string[];
  cursos_recomendados?: string[];
  cronograma?: string[];
  apresentacao?: string;
  /** local + data exibidos acima da assinatura (override do calculado a partir da empresa) */
  local_assinatura?: string;
}

export const proposalTypeLabel = (v: string) =>
  PROPOSAL_TYPES.find((p) => p.value === v)?.label ?? v;