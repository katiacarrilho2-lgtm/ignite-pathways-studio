# Rede Interna e Gestão Multplick — evolução do sistema atual

Analisei o banco e o painel atuais. Muita coisa do prompt **já existe** e não será recriada.

## Já existe (reaproveitar, não duplicar)
- Alunos / matrículas / pré-matrículas / turmas / documentos / certificados (`student_profiles`, `enrollments`, `enrollment_applications`, `turmas`, `turma_alunos`, `student_documents`, `certificates`, `doc_links`)
- Financeiro (`finance_entries`, `installments`, `contas_comerciais`) + widget de contas a pagar/receber
- Comercial (`crm_leads`, `leads_bank`, `connect_*`) e Marketing completo (`mkt_*`)
- Mensagens aluno↔staff (`message_threads`, `messages`), Suporte (`support_tickets`), Tarefas admin (`admin_tasks`)
- Usuários, cargos e permissões `mod_*` (`user_roles`, `user_permissions`, `role_definitions`, `src/lib/permissions.ts`)

## Falta criar (o escopo real)
1. **Departamentos** — tabela `departments` + vínculo no perfil do colaborador (reusa `profiles`/`user_roles`, sem tabela nova de usuários).
2. **Rede Interna (chat staff↔staff)** — `internal_conversations`, `internal_participants`, `internal_messages`: DM, grupo e canal por departamento, não lidas, busca, marcar resolvida, realtime.
3. **Notificações globais** — `notifications` + sino no topo do painel, contador, deep-link por módulo, marcar lida.
4. **Solicitações internas** — `internal_requests` + `internal_request_events`: número, setor solicitante/responsável, prioridade, prazo, status, histórico, notificação automática.
5. **Almoxarifado** — `inventory_items` + `inventory_movements` (entrada/saída), saldo calculado, alerta de estoque baixo.
6. **Escola física** — `classrooms`, `equipment`, `room_reservations` com bloqueio de conflito de horário.
7. **Patrimônio e manutenção** — `assets`, `maintenance_requests`.
8. **Chamada presencial** — `class_sessions` + `attendance` ligados a `turmas`/`turma_alunos`, com totais e % de frequência.
9. **Pedagogia** — `pedagogic_occurrences`, plano de aula/notas ligados às turmas existentes (sem recriar turmas).
10. **Agenda geral** — view unificada (aulas, reuniões, reservas, tarefas, manutenções, campanhas) com filtro por departamento.
11. **Documentos internos** — `internal_documents` + pastas, reusando o padrão da Biblioteca de Marketing e bucket privado.
12. **Auditoria** — `audit_logs` + triggers nos módulos sensíveis (frequência, financeiro, solicitações, arquivos).
13. **Dashboard administrativo** — cards consolidados (alunos, leads, receitas, inadimplência, solicitações abertas, estoque baixo, não lidas, aulas do dia).

## Organização do menu (reordenação, sem quebrar rotas)
```text
Dashboard · Rede Interna · Notificações(sino no topo)
Secretaria (Alunos, Pré-matrículas, Turmas, Documentos, Certificação)
Pedagogia (Turmas, Chamada, Notas, Ocorrências)
Financeiro · Comercial (CRM, Leads, Connect) · Marketing
Almoxarifado · Escola Física (Salas, Reservas, Patrimônio, Manutenção)
Solicitações · Agenda · Documentos Internos · Administração (Usuários, Cargos, Auditoria)
```
Os itens atuais viram subitens dessas pastas — nenhuma rota existente é removida.

## Permissões
Novos valores `mod_*`: `mod_rede_interna`, `mod_solicitacoes`, `mod_almoxarifado`, `mod_escola_fisica`, `mod_patrimonio`, `mod_manutencao`, `mod_pedagogia`, `mod_frequencia`, `mod_agenda`, `mod_documentos_internos`, `mod_auditoria`. Presets por departamento em Cargos.
Super admin (você) enxerga todas as conversas internas via política de leitura ampla, sem indicador visual para os demais. Recomendo registrar isso na política interna de uso do sistema.

## Entrega em 4 etapas
| Etapa | Conteúdo | Créditos |
|---|---|---|
| 1 | Departamentos, Rede Interna (chat completo), Notificações globais + sino | ~3–4 |
| 2 | Solicitações internas, Almoxarifado com alertas, Auditoria | ~3 |
| 3 | Escola física (salas/reservas/patrimônio/manutenção), Chamada presencial, Pedagogia | ~3–4 |
| 4 | Agenda geral, Documentos internos, Dashboard consolidado, reorganização do menu e permissões | ~2–3 |

**Total estimado: 11 a 14 créditos.** Cada etapa é funcional sozinha e conectada ao banco — sem telas de fachada.
