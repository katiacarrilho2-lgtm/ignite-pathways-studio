# Rede Multplick — Auditoria, Arquitetura Multi-Polo e Orçamento

Nada foi implementado, nenhuma tabela criada, nenhuma migração aplicada. Abaixo está a auditoria verificada no banco e no código, a arquitetura proposta e o orçamento por etapas.

## Achado mais importante

O projeto **tem o esqueleto multi-conta, mas ele hoje é decorativo**:

- `account_id` existe em apenas **8 tabelas**: `crm_leads`, `crm_lead_events`, `crm_appointments`, `turmas`, `turma_alunos`, `enrollments`, `installments`, `finance_entries`.
- `contas_comerciais` existe com 1 linha (a raiz) e tem `parent_id`, `tipo_da_conta`, `status`, `slug` — serve como tabela de unidades sem precisar criar outra.
- **Nenhuma política RLS usa `account_id`** (verificado: 0 policies). O isolamento hoje é zero no banco.
- `useCommercialAccounts` é um *shim* que devolve sempre `activeAccountId: null`, então `withAccount()` grava todo mundo na conta raiz.
- `profiles` **não tem** `account_id` — não há como saber a que Polo um usuário pertence.

Ou seja: a fundação existe e economiza trabalho, mas o isolamento real ainda precisa ser construído.

## Respostas às 18 perguntas

**1. Tabelas que já têm `account_id`:** as 8 listadas acima.

**2. Módulos preparados para multi-conta:** CRM (leads, agenda, eventos), Turmas, Alunos/Matrículas, Pré-matrículas, Financeiro (parcelas e lançamentos). Preparados no sentido de "gravam a coluna" — não no sentido de "filtram por ela".

**3. Módulos que usam `withAccount`:** `CrmKanban`, `CrmAgenda`, `CrmLeadDialog`, `AdminAlunos`, `AdminAlunoEdit`, `AdminMatriculas`, `AdminPreMatriculas`, `AdminTurmas`, `FinanceWidget`.

**4. Tabelas que ainda precisam de `account_id`:** `profiles` (essencial), `enrollment_applications`, `student_profiles`, `leads_bank`, `crm_goals`, `affiliates`, `affiliate_referrals`, `support_tickets`, `agenda_events`, `admin_tasks`, `attendance`, `class_sessions`, `classrooms`, `pedagogic_occurrences`, `inventory_items`, `inventory_movements`, `internal_requests`, `internal_documents`, `doc_links`, `notifications`, `user_roles`/`user_permissions` (via profile), `patrimonio`, `maintenance_requests`.

**5. RLS a ajustar:** todas as tabelas acima. O padrão será uma função `security definer`:

```text
current_account_id()  -> account_id do profile do auth.uid()
is_network_master()   -> super_admin/admin da conta raiz
account_visible(uuid) -> master OU account_id = current_account_id()
```

Cada policy vira `USING (public.account_visible(account_id))`. Sem isso o Polo A enxerga o Polo B.

**6. Reutilizável quase sem alteração:** CRM completo (Kanban, Banco de Leads, Agenda, Relatórios, Listagem); Pré-matrículas; Alunos; Turmas; Chamada; Ocorrências pedagógicas; Escola Física; Almoxarifado; Solicitações internas; Documentos internos; Mensagens/Rede Interna; Suporte; Treinamentos; Afiliados; Agenda; Links de Documentos; NotificationBell; UrgencyCenter; InternalMessageAlert; exportação CSV; login numérico com prefixo por cargo (já faz `001`/`M1`, fará `P1`).

**7. Precisa só de adaptação:** Dashboard (filtro por conta + KPIs da unidade); Usuários e Cargos (criar só dentro do próprio Polo, nunca master); Central de Marketing (flag de visibilidade para a Rede + tela somente leitura no `/polo`); Treinamentos (público-alvo: todos / licenciados / revendedores / polo específico); Suporte (destino Polo→Matriz + categorias); Relatórios (seletor de Polo para o master); Afiliados (separar Multplick→Polo de Polo→vendedor).

**8. Criado do zero:** função e policies de isolamento; `account_id` nas tabelas faltantes; cadastro de unidades (tipo Revendedor R$ 0 / Licenciado R$ 200); layout e menu `/polo`; fila de aprovação de pré-matrículas da Rede; regras comerciais por instituição/curso/categoria com custo interno visível só ao master; motor de fechamento 28→27 com NF até 14 e pagamento dia 15; painel de planejamento financeiro; modo "Visualizar Polo X" para o master.

**9. Componentes compartilhados entre `/admin` e `/polo`:** praticamente todas as páginas atuais. O isolamento passa a vir do banco (RLS), não do componente — então a mesma página serve os dois contextos. O que muda é o layout em volta e o menu.

**10. Como criar `/polo` sem duplicar código:** um `PoloLayout` novo (logo Multplick, nome da unidade, menu enxuto) que renderiza as **mesmas** páginas via rotas apontando para os componentes existentes. Zero cópia de página.

```text
/polo
 ├─ index            -> Dashboard (mesmo componente, dados da conta)
 ├─ crm/*            -> CrmLayout + páginas atuais
 ├─ pre-matriculas   -> AdminPreMatriculas
 ├─ alunos, turmas, chamada, pedagogia
 ├─ financeiro       -> visão da unidade
 ├─ afiliados, treinamentos, criativos (leitura)
 ├─ agenda, mensagens, solicitacoes, documentos
 ├─ escola-fisica, almoxarifado
 └─ usuarios         -> equipe do Polo
```

**11. Funcionários por Polo:** `profiles.account_id` + os cargos e permissões `mod_*` que já existem. O Licenciado cria usuário e o backend força a conta dele; papéis master ficam bloqueados por policy.

**12. Master visualizando um Polo:** seletor de unidade que grava a conta ativa; `current_account_id()` respeita a escolha quando o usuário é master. O master vê o sistema exatamente como o Polo, e a troca fica registrada em `audit_logs`.

**13. Estrutura mínima nova:**
- `contas_comerciais`: reaproveitada; acrescentar cidade, UF, responsável, taxa de adesão, logo/identidade, data de ativação.
- `account_id` nas tabelas do item 4.
- `polo_regras` — regra comercial por instituição/curso/categoria (custo interno, preço mínimo, sugerido, tipo de remuneração, % ou fixo, ativo).
- `polo_fechamentos` + `polo_fechamento_itens` — ciclo 28→27, total apurado, status, NF, comprovante, valor transferido para o próximo ciclo.
- 3 funções `security definer` de isolamento.

**14. Multi-account + Portal do Polo:** 16–22 créditos.

**15. Financeiro da Rede + fechamento + NF:** 8–11 créditos.

**16. InfinitePay (separado, depois):** checkout simples 10–14; recorrência 8–12; os dois juntos 16–22.

**17. Os dois manuais em PDF (após o sistema pronto e testado):** 6–9 créditos.

**18. Custo total:** **31–42 créditos** para a Rede completa sem InfinitePay e sem manuais. Com manuais: 37–51. Com InfinitePay checkout: 47–65 — aí já estoura seu saldo, então fica para depois.

## Etapas propostas (cabem nos 63 créditos)

| # | Etapa | Créditos | Entrega |
|---|---|---|---|
| 1 | Fundação multi-conta: `account_id` nas tabelas faltantes, funções e RLS de isolamento, seletor de conta ativa real | 7 – 9 | Isolamento real no banco |
| 2 | Cadastro de Unidades + Painel Master `/admin/licenciados` com cards | 5 – 6 | Master enxerga e cria Polos |
| 3 | Portal `/polo`: layout, menu, dashboard e módulos reaproveitados | 6 – 8 | **Licenciado real já opera** |
| 4 | Fila de aprovação de pré-matrículas da Rede + alertas "Polo chamando" | 3 – 4 | Fluxo comercial fechado |
| 5 | Regras comerciais + Financeiro do Polo | 4 – 5 | Comissão 40% sobre recebido, R$ 30 profissionalizante |
| 6 | Financeiro da Rede: fechamento 27, NF até 14, pagamento 15, comprovante, planejamento | 4 – 6 | Ciclo financeiro completo |
| 7 | Criativos para a Rede + Treinamentos por público | 2 – 4 | Conteúdo chega ao Polo |
| | **Total** | **31 – 42** | |

**Comece pela 1 → 2 → 3.** Com ~20 créditos você já coloca um Licenciado real vendendo, com CRM, pré-matrícula e dados isolados. As etapas 5 e 6 podem esperar o primeiro ciclo de vendas, já que o primeiro fechamento só ocorre no dia 27.

Manuais em PDF e InfinitePay ficam fora deste plano, como você pediu.

## Notas técnicas

- Migrações serão aditivas: coluna nullable → backfill para a conta raiz → código passa a filtrar. Nada é apagado nem renomeado.
- **Repasses de Faculdades permanece intocado.** É a relação Faculdade→Multplick e não será reutilizado no financeiro do Licenciado.
- Módulos bloqueados no `/polo`: Corporativo, CRM Corporativo, Propostas e Contratos B2B, Configurações da Matriz, Gerar Curso IA, Repasses de Faculdades, Parceiros institucionais, Auditoria global.
- Cada etapa termina com verificação de isolamento: entrar como usuário de um Polo e confirmar que nenhum dado de outra unidade aparece.
