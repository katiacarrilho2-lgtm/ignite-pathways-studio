# Importar curso "Instalação de Ar-Condicionado Split — Preparatório para Aula Prática"

## O que será feito

Importação **em lote** direto no banco a partir do JSON enviado. Nada de gerar imagens/vídeos com IA agora — o JSON já traz *prompts de imagem* e *buscas de YouTube* por aula, que ficam salvos no conteúdo para você (ou eu, depois) transformar em mídia quando quiser.

## Escopo do conteúdo importado

- **1 curso novo** (não sobrescreve o curso "Instalação de Ar-Condicionado" atual — slug diferente)
- **10 módulos** (course_sections)
- **40 aulas** (course_lessons) — todas do tipo `text`
- Cada aula recebe no `content` JSONB:
  - `body` em markdown compilado a partir de: explicação simples, conteúdo detalhado, passo a passo prático, alertas de segurança, ferramentas/materiais, ponte para a prática
  - `flashcards` (5 por aula → 200 no total)
  - `quiz` com explicações (4 por aula → 160 questões no total)
  - `image_prompts` (guardados para gerar imagens depois)
  - `video_references` com termos de busca do YouTube (guardados para você colar o link depois no editor)

## Dados do curso

- **Título:** Instalação de Ar-Condicionado Split — Preparatório para Aula Prática
- **Slug:** `instalacao-ar-split-preparatorio`
- **Duração:** 200 horas
- **Categoria:** mesma do curso atual de ar-condicionado
- **Passing score:** 70
- **Published:** false (rascunho, você publica quando quiser)

## Como será executado (técnico)

1. Script local lê o JSON e gera **um único arquivo SQL** com:
   - `INSERT` do curso
   - `INSERT` das 10 seções
   - `INSERT` das 40 aulas com `content` JSONB montado
2. Rodo via ferramenta de inserção (uma única chamada).
3. Confirmo com `SELECT count(*)` que 10 seções e 40 aulas foram criadas.

## O que **não** faço nesta etapa (para economizar créditos)

- Não gero imagens com IA (os prompts ficam salvos na aula)
- Não faço busca no YouTube por aula (os termos de busca ficam salvos)
- Não crio prova final separada — o JSON não traz prova final, só quizzes por aula

Se depois você quiser, posso gerar imagens/vídeos por aula sob demanda com estimativa separada.

## Estimativa

**3 a 5 créditos** no total (leitura + geração do SQL + insert em lote + verificação).

## Onde ver depois

- `/admin/cursos` → "Instalação de Ar-Condicionado Split — Preparatório para Aula Prática"
- Editor de conteúdo: `/admin/cursos/<id>/conteudo`
- Preview: `/admin/cursos/<id>/preview`
