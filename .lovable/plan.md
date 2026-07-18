## Problema

A rota `/matricula/pmoc` (link "Matricular" da página de curso) exibe "Módulo em manutenção" porque `src/pages/Matricula.tsx` foi substituído por stub durante a migração. É o formulário público de pré-matrícula que o aluno preenche antes de você aprovar em `/admin/pre-matriculas`.

## Boa notícia

- Arquivo original está no backup (361 linhas, formulário completo com validação Zod, rascunho em localStorage, seleção de curso/combo, forma de pagamento, código promocional).
- Só usa a tabela `enrollment_applications` — **já existe no banco** com todas as 35 colunas necessárias (confirmado no schema atual).
- Nenhuma migração de banco é necessária.

## Passos

1. Substituir `src/pages/Matricula.tsx` (stub de 12 linhas) pelo original do backup (361 linhas).
2. Rodar typecheck. Se houver algum erro pontual (ex.: coluna com nome diferente), ajustar o `.tsx` — não o banco.
3. Você testa em `/matricula/pmoc`: preencher e enviar. O registro aparece em `/admin/pre-matriculas` para você aprovar.

## Custo e risco

- **Estimativa**: 2–4 créditos (é 1 arquivo + build).
- **Risco baixo**: não mexe em schema, não mexe em outras telas.
- Se der erro de build no meu passo, eu corrijo sem custo extra de escopo (foi correção do que eu mesmo fiz).

## Fora deste plano (fica para depois)

- Player de curso com seções/aulas do PMOC (o builder salva, mas há erro em `course_sections`/`course_lessons` — vira próximo ticket).
- Tela `/admin/cargos` (tabela `role_definitions`).
- Restaurar `AdminFinanceiro.tsx`, `Checkout.tsx`, `Prova.tsx` etc.

Aprovando, sigo só com a substituição do `Matricula.tsx`.