export type TipoCertificacao = "curso_livre" | "avaliacao_conhecimentos";

export const TIPO_LABEL: Record<string, string> = {
  curso_livre: "Curso Livre",
  avaliacao_conhecimentos: "Avaliação de Conhecimentos",
};

export type ExamConfig = {
  id?: string;
  course_id?: string;
  tipo?: string;
  ativo: boolean;
  nota_minima: number;
  qtd_questoes: number;
  tempo_minutos: number | null;
  tentativas_permitidas: number;
  intervalo_nova_tentativa_horas: number | null;
  embaralhar_questoes: boolean;
  embaralhar_alternativas: boolean;
  mostrar_respostas: boolean;
  libera_certificado: boolean;
  instrucoes?: string | null;
};

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  ativo: false,
  nota_minima: 70,
  qtd_questoes: 15,
  tempo_minutos: null,
  tentativas_permitidas: 2,
  intervalo_nova_tentativa_horas: null,
  embaralhar_questoes: true,
  embaralhar_alternativas: true,
  mostrar_respostas: false,
  libera_certificado: false,
};

export const formatBRL = (cents?: number | null) =>
  cents == null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Preço vigente considerando promoção com período válido. */
export const precoVigenteCents = (c: {
  price_cents?: number | null;
  preco_promocional_cents?: number | null;
  promocao_ativa?: boolean | null;
  promocao_inicio?: string | null;
  promocao_fim?: string | null;
}): number | null => {
  const base = c.price_cents ?? null;
  if (!c.promocao_ativa || c.preco_promocional_cents == null) return base;
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.promocao_inicio && hoje < c.promocao_inicio) return base;
  if (c.promocao_fim && hoje > c.promocao_fim) return base;
  return c.preco_promocional_cents;
};

export const TEXTO_PADRAO_CERTIFICADO: Record<TipoCertificacao, string> = {
  curso_livre:
    'Certificamos que [NOME DO ALUNO] concluiu o curso livre "[NOME DO CURSO]", promovido pela Multplick Formação Profissional, cumprindo os critérios estabelecidos para esta formação.',
  avaliacao_conhecimentos:
    'Certificamos que [NOME DO ALUNO] foi aprovado na avaliação de conhecimentos referente à formação "[NOME DO CURSO]", conforme os critérios estabelecidos pela Multplick Formação Profissional.',
};

/** Campos obrigatórios para ativar venda/certificação automática. */
export const validarCursoLivre = (
  c: { tipo_curso?: string | null; price_cents?: number | null; exige_avaliacao?: boolean | null; emite_certificado_automatico?: boolean | null },
  exam: ExamConfig,
): string | null => {
  if (!c.tipo_curso || !(c.tipo_curso in TIPO_LABEL)) return "Selecione o tipo de certificação.";
  if (!c.price_cents || c.price_cents <= 0) return "Informe um preço normal válido para venda automática.";
  if (c.exige_avaliacao) {
    if (!exam.qtd_questoes || exam.qtd_questoes < 1) return "Informe a quantidade de questões da prova.";
    if (!exam.nota_minima || exam.nota_minima < 1 || exam.nota_minima > 100) return "Nota mínima deve ficar entre 1 e 100.";
    if (!exam.tentativas_permitidas || exam.tentativas_permitidas < 1) return "Informe o número de tentativas permitidas.";
  }
  if (c.emite_certificado_automatico && !c.exige_avaliacao && c.tipo_curso === "avaliacao_conhecimentos")
    return "Avaliação de Conhecimentos exige que a avaliação esteja ativada.";
  return null;
};

export const centsFromInput = (v: string): number | null => {
  const digits = v.replace(/\D/g, "");
  return digits ? Number(digits) : null;
};

export const centsToInput = (cents?: number | null) =>
  cents != null ? (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
