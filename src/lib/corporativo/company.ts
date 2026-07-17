export interface CompanySettings {
  id?: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  responsavel_nome?: string | null;
  responsavel_cargo?: string | null;
  logo_url?: string | null;
}

export const DEFAULT_COMPANY: CompanySettings = {
  razao_social: "Multplick Educação Profissional e Corporativa",
  nome_fantasia: "Multplick",
  cidade: "São José do Rio Preto",
  uf: "SP",
  email: "contato@multplick.live",
  site: "multplick.live",
  responsavel_nome: "Kátia Joaquim",
  responsavel_cargo: "Diretora Comercial",
};

export const formatProposalLocalDate = (company: CompanySettings, date = new Date()): string => {
  const cidade = company.cidade || "São José do Rio Preto";
  const uf = company.uf || "SP";
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${cidade}/${uf}, ${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
};