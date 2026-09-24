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

## Etapa 7 — Criativos da Rede (concluída)
- Migração `0009_rede_criativos_visibilidade.sql`: `mkt_assets.rede_visivel/rede_publico/rede_account_id/copy_texto`, helpers `is_matriz_staff`, `rede_publico_do_usuario`, `mkt_asset_liberado`, `mkt_path_liberado`; RLS de mkt_assets/mkt_folders e storage `marketing-files` (Matriz administra, Polo só lê o liberado).
- `MarketingArquivos.tsx`: diálogo "Disponibilizar para a Rede" (sim/não, público, polo específico, copy).
- `/polo/criativos` (`src/pages/polo/PoloCriativos.tsx`): somente leitura — visualizar, baixar, copiar copy.
- Pendente: módulo Treinamentos ainda é stub; colunas `courses.is_treinamento/rede_publico/rede_account_id` já criadas para o público-alvo quando o módulo for reativado.

## Pendente (aguardando autorização)
- [ ] Central de Configurações do site (substituir "Andamento"): identidade visual, fontes, hero, banners, textos, seções da home, menu, rodapé, biblioteca de mídia, rascunho/publicar.
- Configurações do site: Bloco 1 (identidade) e Bloco 2 (página inicial) concluídos. Próximo: Bloco 3 (textos das páginas, menu e rodapé) e Bloco 4 (mídia/publicação).

## Cursos Livres — Etapa 3 (concluída)
- Migrações `0015_livre_pedidos_numero_e_rpc.sql` (numero_pedido MPL-AAAA-000000, `livre_preco_vigente`, `livre_cpf_em_uso`, `livre_criar_pedido`) e `0016_livre_criar_pedido_revoke_anon.sql`.
- 3 cursos livres piloto criados (inativos, R$ 59,90, venda/certificação desativadas).
- Páginas `/certifique-sua-experiencia`, `/certifique-sua-experiencia/:slug`, `/checkout/:slug` (cadastro/login + pedido pendente) e `/aluno/compras`.
- Pré-visualização da sede: botão em Cursos → `?preview=1`.
- [ ] Etapa 4 (Mercado Pago + liberação automática) — aguardando autorização.

## Cursos Livres — Etapa 4 (concluída)
- Migração `0017_livre_pagamento_confirmacao.sql`: índice único (provider, external_id) e RPC `livre_registrar_pagamento` (SECURITY DEFINER, só service_role) — confere valor, libera matrícula uma única vez, trata estorno (pedido reembolsado + matrícula suspensa) e grava auditoria.
- Edge functions novas: `livre-create-payment` (valor lido do pedido no servidor) e `livre-mp-webhook` (verify_jwt=false, valida assinatura quando há segredo, consulta o pagamento na API oficial, idempotente).
- `create-payment` e `mp-webhook` antigos intactos.
- Frontend: Checkout leva ao Mercado Pago; `/aluno/compras` com PAGAR AGORA, retorno com atualização automática e aviso de pagamento confirmado.
- Pendente: cadastrar MERCADO_PAGO_ACCESS_TOKEN (e opcionalmente MERCADO_PAGO_WEBHOOK_SECRET) e testar uma compra real em modo teste.
## Cursos Livres — Etapa 5 (concluída)
- Migração `0018_exam_online_etapa5.sql`: coluna `exam_attempt_answers.ordem_alternativas`, índice `(course_id, ativo)` no banco de questões e RPCs SECURITY DEFINER `exam_status_curso`, `exam_iniciar_tentativa`, `exam_tentativa`, `exam_responder`, `exam_finalizar` (execute só para `authenticated`).
- Correção 100% no servidor; gabarito nunca vai ao navegador durante a prova; alternativas embaralhadas por tentativa (posição exibida → índice original no servidor).
- Admin: `/admin/questoes` (`AdminBancoQuestoes.tsx`) — criar/editar/duplicar/ativar/excluir, filtros por curso, situação e busca; item no menu com `mod_cursos`.
- Aluno: `/aluno/avaliacao/:courseId` (`Avaliacao.tsx`) — uma questão por vez, progresso, cronômetro, retomada, resultado com nota e nova tentativa; `MinhasCompras` agora leva à prova.
## Cursos Livres — Etapa 6 (concluída)
- Migrações `0019_certificados_emissao_validacao.sql` (snapshot congelado, índice único por tentativa, RPCs `certificado_proximo_numero`, `certificado_emitir_por_tentativa`, `certificado_validar` (pública), `certificado_cancelar`, `certificado_reativar`) e `0020_exam_finalizar_emite_certificado.sql`.
- Emissão 100% no servidor ao aprovar na prova, apenas quando o curso tem certificado automático e a prova libera certificado; numeração MPL-ANO-000000; idempotente por tentativa.
- PDF A4 paisagem em `src/lib/certificadoPdf.ts` (logo, assinatura gráfica ou digitalizada, QR Code, carga horária só quando aplicável, marca CANCELADO).
- Página pública `/validar-certificado/:codigo` (CPF mascarado) e área do aluno `/aluno/certificados` com download.
- Admin `/admin/certificacao`: busca, filtro por status, download do PDF, cancelar/reativar com auditoria e aba de Configurações do certificado (inclui upload da assinatura).
- [x] Etapa 7 (painel consolidado /admin/cursos-livres + teste ponta a ponta) — concluída.
- [ ] Pendente: chave do Mercado Pago (teste/produção) para cobranças reais.

## Loja Online (InfinitePay) — 24/09/2026
- [x] Tabelas store_* + RLS por conta, catálogo, carrinho, checkout, webhook, CRM, financeiro, admin (/admin/loja)
- [ ] Informar InfiniteTag da InfinitePay no painel (Loja › Pagamentos) e fazer 1 compra real de valor mínimo — depende do usuário
- [ ] Cadastrar produtos/preços/imagens — depende do usuário
