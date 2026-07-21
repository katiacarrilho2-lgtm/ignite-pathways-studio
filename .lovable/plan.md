## Escopo — Opção B + 3 (~5 créditos)

Deixar as 40 aulas do curso "Instalação de Ar-Condicionado Split — Preparatório" mais dinâmicas, únicas e interativas, sem gerar vídeos automaticamente (você cola os links depois pelo YoutubePickerDialog que já existe).

## O que entrego

**1. Identidade visual por módulo (10 módulos, 10 cores/ícones)**
- Cada módulo ganha uma cor de destaque e um ícone temático (refrigeração, elétrica, vácuo, brasagem, testes, etc.).
- O cabeçalho da aula, a barra lateral e os blocos de destaque usam essa cor — nenhuma aula parece igual à outra.

**2. Imagens de kit de ferramentas (10 imagens, 1 por módulo)**
- Uma imagem "kit" por módulo mostrando as ferramentas daquele bloco com nome ao lado (ex.: manifold, bomba de vácuo, torquímetro, flangeador…).
- Substitui o bloco de texto "Ferramentas e materiais" por essa imagem visual + legenda.
- Geradas via IA, subidas no CDN e vinculadas no `content.tools_image_url` da aula.

**3. Ícones inline nas ferramentas repetidas**
- Além da imagem do kit, cada ferramenta citada no texto ganha um ícone Lucide (chave, termômetro, multímetro…) para escaneabilidade.

**4. Blocos mais vivos e menos "apostila"**
- Passos numerados com círculos coloridos grandes.
- Alertas de segurança em vermelho com ícone ⚠️ e borda pulsante suave.
- "Ponte para a prática presencial" em azul com ícone de mão/ferramenta.
- Objetivo da aula como badge no topo.

**5. Barra de progresso da aula**
- Barra fina no topo do player que preenche conforme o aluno rola a aula.
- Ao clicar em "Concluir aula", grava em `lesson_progress` (tabela já existe) e mostra check verde na sidebar.
- Progresso do curso agregado no card do `/aluno` (já existe base, só ligar).

**6. Flashcards e quiz mais divertidos**
- Flashcard: animação 3D de virada (flip) suave.
- Quiz: feedback imediato colorido + confete leve quando gabarita 100%.

**7. Vídeo por aula — pronto pra você colar**
- Em cada aula, se `content.youtube.videoId` estiver vazio, aparece um botão discreto "Adicionar vídeo desta aula" (só no modo admin/preview) que abre o `YoutubePickerDialog` já existente.
- No modo aluno, se não tiver vídeo ainda, mostra o link de sugestão de busca do JSON ("Buscar no YouTube: …") como fallback — nada quebra.
- Salvo os 3 termos de busca do JSON em `content.video_suggestions` pra facilitar sua curadoria depois.

## O que NÃO faço nesta rodada

- Não gero vídeos nem chamo API do YouTube.
- Não mexo em outros cursos.
- Não mexo em schema de banco (uso colunas/JSONB que já existem).

## Detalhes técnicos

- `src/index.css`: adiciona paleta por módulo (`--mod-1` … `--mod-10`), animações do flashcard, barra de progresso e utilitários dos novos blocos.
- `src/pages/aluno/CursoPlayer.tsx`: barra de progresso ao rolar, botão "Concluir aula" gravando em `lesson_progress`, render da `tools_image_url`, ícones inline por ferramenta, animação do flashcard, confete no quiz, fallback de sugestão de vídeo.
- `src/pages/admin/AdminCursoPreview.tsx`: mesmos blocos visuais + botão "Adicionar vídeo" abrindo `YoutubePickerDialog`.
- Script Python local (não vai pro repo) monta um mapa `moduleId → cor/ícone/kit_image_url`, gera as 10 imagens de kit via IA, sobe no CDN e faz um `bulk-update-lessons` gravando `theme`, `tools_image_url` e `video_suggestions` em cada aula. Sem migração nova.

## Verificação

- Abro `/admin/cursos/<id>/preview` em 3 aulas de módulos diferentes e confirmo cor/ícone/kit distintos.
- Abro `/aluno` → curso → aula, rolo até o fim, clico "Concluir aula" e confirmo que a sidebar marca ✓ e o card do dashboard sobe o %.
- Confirmo no console que não há erro de RLS ao gravar `lesson_progress`.

## Custo

**~5 créditos** (10 imagens de kit + código). Sem surpresa: se algo estourar, paro e te aviso antes.
