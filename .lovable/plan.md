## Problema

A rota `/admin/cursos/:id/preview` está apontando para `src/pages/admin/AdminCursoPreview.tsx`, que hoje é um **stub de manutenção** (foi um dos 60 arquivos "stubbed" durante a migração). Por isso, ao clicar em **Visualizar**, aparece a mensagem "Módulo em manutenção".

## O que fazer

Restaurar o arquivo `AdminCursoPreview.tsx` a partir do backup (`/tmp/backup`) e ajustá-lo para o schema atual:

1. Copiar o `AdminCursoPreview.tsx` original do backup.
2. Ajustar imports/queries para as tabelas já existentes: `courses`, `course_sections`, `course_lessons`.
3. Garantir que o preview renderize:
   - Título, descrição e capa do curso
   - Lista de seções → aulas na ordem (`order_index`)
   - Player de vídeo do YouTube (quando `video_url` presente)
   - Conteúdo textual (rich text) da aula
   - Flashcards e quizzes (quando existirem no JSON da aula)
4. Sem alterações de banco — apenas frontend.

## Custo estimado

**2–4 créditos** (uma tela, sem migração, sem edge function).

Aguardo seu "ok" para executar.
