# Roadmap — Rede Multplick

## Etapa 1 — Fundação multi-conta (CONCLUÍDA + revisão de segurança)
- [x] `account_id` em `profiles` + tabelas dos módulos do Polo (aditivo, backfill para conta ROOT)
- [x] Funções `current_account_id()`, `is_network_master()`, `account_visible()`, `account_can_write()`
- [x] Policies RESTRICTIVE de isolamento por conta (30 tabelas)
- [x] Contexto de "Visualizar Polo" validado no backend + auditoria em `audit_logs`
- [x] `useCommercialAccounts` real (substituir shim)
- [x] Testes de isolamento com Polo A / Polo B / Master e remoção das fixtures
- [x] `profiles.account_id` imutável via trigger `profiles_guard_account_id`
- [x] Network Master = somente `super_admin` da conta ROOT (admin comum perdeu acesso global)
- [x] EXECUTE das funções de conta revogado de `anon` (exceto `current_account_id`, usada como DEFAULT nos formulários públicos)
- Pendente para a Etapa 2/3: edge functions (`admin-create-user`) definirem o `account_id` da unidade ao criar usuários do Polo
- Pendente: trocar `is_network_master` por permissão explícita `manage_network` quando o enum for ampliado

## Aguardando autorização do usuário
- Etapa 2 — Cadastro de Unidades + Painel Master `/admin/licenciados`
- Etapa 3 — Portal `/polo`
- Etapa 4 — Fila de aprovação de pré-matrículas da Rede
- Etapa 5 — Regras comerciais + Financeiro do Polo
- Etapa 6 — Financeiro da Rede (fechamento 27, NF 14, pagamento 15)
- Etapa 7 — Criativos e Treinamentos por público
- Depois: InfinitePay e manuais em PDF

## Regras fixas
- Repasses de Faculdades (`repasse_*`) é Faculdade↔Multplick: não tocar, não reutilizar para Licenciado.

## Etapa 2 — Central Master da Rede Multplick (concluída)
- /admin/licenciados + /admin/licenciados/:id (exclusivo Network Master, guard + RLS)
- contas_comerciais com dados cadastrais/comerciais/identidade (migração 0005)
- Funções SECURITY DEFINER de leads filtradas por conta
- admin-create-user grava profiles.account_id da unidade (Polo nunca escapa da própria conta)
- Banner "Visualizando como Polo" no AdminLayout; Repasses de Faculdades intocado
- Próxima etapa (não iniciada): Portal /polo, Financeiro da Rede, InfinitePay, manuais

## Etapa 3 — Portal do Polo (/polo) — concluída
- `src/lib/portal.ts`: `usePortalBase`, `POLO_ALLOWED_PATHS`, `mapAdminPathToPolo` (Repasses de Faculdades fora do Polo).
- `src/components/polo/PoloLayout.tsx`: layout institucional próprio, menu setorizado por permissões `mod_*`, banner de impersonação do Master.
- Rotas `/polo/*` em `App.tsx` reutilizando 100% das páginas existentes (nenhuma duplicada).
- `AdminLayout`: usuário de unidade não-matriz é redirecionado do `/admin` para o equivalente `/polo`; módulos exclusivos da Matriz mostram "Acesso negado".
- `RequirePermission` reconhece caminhos `/polo`; abas de CRM/Leads e links do Dashboard usam base dinâmica.
- Testado com unidade fixture + Playwright: 20 rotas do portal carregam, master global cai em `/admin`, fixtures removidas.
- Pendente (Etapas 5+): financeiro de licenciados, InfinitePay, manuais.

## Etapa 4 — Fluxo de pré-matrículas da Rede + alertas (concluída)
- Migração `0007_rede_pre_matricula_review_flow.sql`: colunas `network_review_*`/`network_submitted_at`, triggers de guarda e notificação, RPCs `rede_fila_pre_matriculas`, `rede_review_pre_matricula`, `polo_reenviar_pre_matricula`.
- Fila "aguardando análise" + ações (assumir/aprovar/correção/recusar/matricular) em `/admin/licenciados/matriculas`.
- `/polo/pre-matriculas` mostra status da análise, mensagem de correção e botão de reenvio.
- Alertas reaproveitam `UrgencyCenter` (Matriz) e `NotificationBell` (Polo). Aprovar não matricula.
- Matricular reaproveita o fluxo da Matriz (troca de contexto para o Polo + `/admin/pre-matriculas`).

- [x] Etapa 5A — Regras comerciais (polo_regras) + visão comercial do Polo (recebido/elegível/repasse previsto). Etapa 6 (fechamento, NF, pagamento dia 15, InfinitePay) NÃO iniciada.

- [x] Bugfix: redirecionamento de login por account_id (Polo -> /polo), bloqueio de /admin para Polo e Dashboard do Polo escopado por conta.
