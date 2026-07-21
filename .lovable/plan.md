
# Refazer o curso "Instalação de Ar-Condicionado Split — Preparatório"

## Diagnóstico do que está hoje no banco

Já conferi o curso `instalacao-ar-split-preparatorio` (id `982a…4dd`):

- 10 módulos e 40 aulas criados ✅
- Cada aula tem `body` (~4,5 KB), 5 flashcards e 4 questões de quiz ✅
- Apenas ~20 das 40 aulas têm `image_url` (as outras ficaram sem imagem) ⚠️
- **Não existe prova final** no banco, mas o JSON traz 20 questões prontas ❌
- O `body` atual foi montado de forma resumida — não usa toda a riqueza do JSON (explicação simples, conteúdo detalhado em 6 parágrafos, passo a passo, alertas, ferramentas, ponte para a prática). Por isso a sensação de "aula fria / apostila". ❌

## O que o JSON original tem por aula (e que vou usar de verdade)

Cada uma das 40 aulas do JSON traz:

- `simple_explanation` (parágrafo introdutório)
- `detailed_content` (6 parágrafos aprofundados)
- `practical_steps` (8 passos numerados)
- `safety_alerts` (4 alertas)
- `tools_and_materials` (6 itens)
- `practice_lab_bridge` (ponte para a aula presencial)
- `image_prompts` (4 sugestões) e `video_references` (3 buscas)
- `flashcards` (5) e `quiz` (4 com explicação)

Mais um `final_exam` com 20 questões e regras de aprovação (70%).

## O que vou fazer

1. **Ler o JSON local** que você já enviou (nada de IA, nada de gerar imagem nova).
2. **Gerar um HTML rico e padronizado** para cada aula com estas seções visuais:
   - Objetivo da aula (badge)
   - Explicação simples (bloco destacado)
   - Conteúdo detalhado (parágrafos + subtítulos)
   - Passo a passo (lista ordenada com números grandes)
   - Alertas de segurança (bloco vermelho com ícone ⚠️)
   - Ferramentas e materiais (lista com ícone 🧰)
   - Ponte para a aula prática (bloco azul “Na prática presencial…”)
   - Referências de vídeo (lista para você colar links depois)
3. **Preservar** flashcards e quiz (a estrutura já está boa) e **normalizar** o campo `answer` do quiz (o player espera `answer`, o JSON traz `correct_option_index`).
4. **Manter as image_urls que já existem** nas ~20 aulas e adicionar no JSONB o array `image_prompts` completo, para você (ou eu, depois) gerar as faltantes sob demanda.
5. **Criar a Prova Final** (`is_final: true`) como uma 41ª aula do tipo `quiz`, ligada a uma nova seção “Avaliação Final”, com as 20 questões do JSON e nota mínima 70%.
6. **Estilos** já existem em `.lesson-content` no `index.css`. Só vou acrescentar 4 classes utilitárias (`.lesson-callout--safety`, `.lesson-callout--bridge`, `.lesson-steps`, `.lesson-tools`) para os blocos novos ficarem com visual premium.
7. **Verificação:** consulta SQL confirmando 40 aulas atualizadas + 1 prova final criada, e abertura visual de 1 aula no `/admin/cursos/:id/preview` para você validar.

## Como executo (técnico)

- Script Python local lê o JSON e gera **um único arquivo SQL** com `UPDATE` em cada `course_lessons` (por posição dentro da seção) + `INSERT` da seção "Avaliação Final" e da aula da prova final.
- Rodo tudo via **uma chamada** de `supabase--insert` (bulk) — nada de edge function nova, nada de créditos de IA.
- Ajuste no CSS: `src/index.css` (adição incremental, sem tocar em componentes).

## O que **não** faço nesta rodada (para não gastar créditos)

- Não gero novas imagens com IA. As ~20 imagens já geradas continuam. As faltantes ficam com os `image_prompts` salvos, prontas para gerar depois se você pedir.
- Não busco vídeos no YouTube. As `video_references` ficam listadas na aula para você colar o link no `YoutubePickerDialog`.

## Estimativa

**1 a 2 créditos** no total: leitura do JSON local, geração do SQL, um insert em lote, uma verificação e um pequeno patch de CSS. Sem chamadas de IA.

## Depois que eu terminar, o que fica visível pra você

- `/admin/cursos/<id>/preview` — cada aula com blocos coloridos, passos, alertas, ferramentas e ponte prática.
- `/aluno` → curso → player já lendo o mesmo HTML (o `CursoPlayer` usa o mesmo `content.body`).
- Uma **Prova Final** no fim do curso com 20 questões e regra de 70%.

## Pergunta antes de eu começar

Confirma que posso executar exatamente esse plano (refazer o `body` das 40 aulas + criar a Prova Final, sem gerar imagens novas)? Se preferir que eu **também já gere as ~20 imagens faltantes** na mesma rodada, me diz — nesse caso a estimativa sobe para **8 a 10 créditos** no total.
