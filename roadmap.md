# Roadmap — Rede Multplick

## Etapa 1 — Fundação multi-conta (CONCLUÍDA)
- [x] `account_id` em `profiles` + tabelas dos módulos do Polo (aditivo, backfill para conta ROOT)
- [x] Funções `current_account_id()`, `is_network_master()`, `account_visible()`, `account_can_write()`
- [x] Policies RESTRICTIVE de isolamento por conta (30 tabelas)
- [x] Contexto de "Visualizar Polo" validado no backend + auditoria em `audit_logs`
- [x] `useCommercialAccounts` real (substituir shim)
- [x] Testes de isolamento com Polo A / Polo B / Master e remoção das fixtures
- Pendente para a Etapa 2/3: edge functions (`admin-create-user`) definirem o `account_id` da unidade ao criar usuários do Polo

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
