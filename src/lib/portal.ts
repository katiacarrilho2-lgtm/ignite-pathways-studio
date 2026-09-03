import { useLocation } from "react-router-dom";

/**
 * Base de rota do contexto atual: "/polo" dentro do Portal do Licenciado,
 * "/admin" no painel da Matriz. Evita duplicar páginas só para corrigir links.
 */
export const usePortalBase = () => {
  const { pathname } = useLocation();
  return pathname.startsWith("/polo") ? "/polo" : "/admin";
};

/** Caminhos do /admin que o Polo pode acessar (espelhados em /polo). */
export const POLO_ALLOWED_PATHS = [
  "", "agenda", "crm", "leads", "pre-matriculas", "afiliados", "meu-afiliado",
  "turmas", "chamada", "pedagogico/ocorrencias", "alunos",
  "financeiro", "relatorios/pagamentos", "usuarios", "cargos",
  "documentos-links", "mensagens", "suporte", "treinamentos",
  "escola-fisica", "almoxarifado", "solicitacoes", "documentos-internos",
];

/** Retorna o caminho equivalente em /polo, ou null quando o módulo é exclusivo da Matriz. */
export const mapAdminPathToPolo = (pathname: string): string | null => {
  const rest = pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");
  const allowed = POLO_ALLOWED_PATHS.some(
    (p) => (p === "" ? rest === "" : rest === p || rest.startsWith(p + "/")),
  );
  if (!allowed) return null;
  // financeiro/repasses é exclusivo da Matriz
  if (rest.startsWith("financeiro/repasses")) return null;
  return rest ? `/polo/${rest}` : "/polo";
};
