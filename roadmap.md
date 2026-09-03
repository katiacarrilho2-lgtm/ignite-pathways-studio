# Roadmap — Rede Multplick

## Etapa 1 — Fundação multi-conta (EM ANDAMENTO)
- [ ] `account_id` em `profiles` + tabelas dos módulos do Polo (aditivo, backfill para conta ROOT)
- [ ] Funções `current_account_id()`, `is_network_master()`, `account_visible()`, `account_can_write()`
- [ ] Policies RESTRICTIVE de isolamento por conta
- [ ] Contexto de "Visualizar Polo" validado no backend + auditoria em `audit_logs`
- [ ] `useCommercialAccounts` real (substituir shim)
- [ ] Testes de isolamento com Polo A / Polo B / Master e remoção das fixtures

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
