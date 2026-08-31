# Editar tarefas na agenda do Dashboard

Hoje o widget de Agenda e tarefas só permite criar, marcar como concluída e excluir. Vamos adicionar edição.

## O que muda

- Botão de lápis (editar) em cada tarefa, tanto na lista do dia selecionado quanto no Checklist.
- Clicar abre o mesmo modal já existente, agora em modo edição: título, data, hora e anotação preenchidos.
- Botão "Salvar" atualiza a tarefa; "Criar" continua para tarefas novas.
- Anotação passa a ser exibida na lista (hoje é salva mas não aparece).

## Detalhes técnicos

Arquivo único: `src/components/admin/AdminTasksWidget.tsx`.

- Novo estado `editing: Task | null`; o diálogo usa `editing ? "Editar tarefa" : "Nova tarefa"`.
- `saveTask` faz `update` em `admin_tasks` quando `editing` existe, senão mantém o `insert` atual.
- Sem mudanças no banco, nas permissões ou em outras telas.

Custo estimado: menos de 1 crédito.
