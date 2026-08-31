# Central de Urgências no topo do painel

Um botão fixo no canto superior direito (ao lado do sino), sempre visível em qualquer aba do painel, que mostra o que precisa ser resolvido hoje. Assim, mesmo saindo do Dashboard para Tarefas ou CRM, a urgência continua piscando na sua frente.

## Como vai funcionar

- Ícone de alerta com contador vermelho pulsante (ex.: "3").
- Ao clicar, abre um painel lateral/popover com as urgências agrupadas:
  - Leads marcados como urgentes no CRM
  - Tarefas do dia e tarefas atrasadas (não concluídas)
  - Compromissos da agenda de hoje ainda não realizados
  - Solicitações internas e chamados de suporte em aberto
- Cada item mostra título, horário e um botão para ir direto ao lugar certo (CRM, Tarefas, Suporte...).
- Ações rápidas por item: "Concluir" (quando for tarefa/compromisso) e "Adiar 1h" / "Lembrar mais tarde".
- Lembrete automático: se houver urgência pendente, o botão pisca a cada 10 minutos e mostra um aviso curto no canto — para você não esquecer quando estiver em outra aba.
- Ao abrir o painel pela manhã (primeiro acesso do dia), o painel de urgências abre sozinho uma vez.
- Atualização em tempo real: novas urgências aparecem sem precisar recarregar.

## Quem vê

Somente master/admin e usuários com permissão de gestão, seguindo a mesma regra já usada no alerta de leads urgentes. O restante da equipe vê apenas o que é dela (tarefas/solicitações próprias).

## Detalhes técnicos

- Novo componente `src/components/admin/UrgencyCenter.tsx`, montado no header desktop e mobile de `src/components/admin/AdminLayout.tsx`, ao lado de `NotificationBell`.
- Fontes de dados (somente leitura, sem mudança de schema):
  - `crm_leads` com `urgente = true`
  - `admin_tasks` com `done = false` e `due_date <= hoje`
  - `crm_appointments` de hoje com `done = false`
  - `internal_requests` e `support_tickets` com status em aberto
- Realtime via canal Supabase nas mesmas tabelas; recarga também a cada 5 min.
- "Adiar" e "abriu hoje" ficam em `localStorage` por usuário (sem custo de banco).
- Ações de concluir usam `update` nas tabelas já existentes (`admin_tasks.done`, `crm_appointments.done`).
- Reaproveita o som/estilo já existentes em `CrmUrgentAlerts.tsx`, sem duplicar o alerta de leads urgentes.

## Custo estimado

Cerca de 1 a 2 créditos (um componente novo + pequeno ajuste no layout, sem migração de banco).
