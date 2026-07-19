## Curso completo: Instalação de Ar-Condicionado — Nível B

**Objetivo:** entregar o curso 100% pronto para o aluno abrir e estudar, com barra de progresso, prova final, certificado e apostila em PDF já funcionando (essas peças já existem no sistema).

**Custo estimado:** 45–65 créditos. Aviso quando ultrapassar 55.

### Escopo do conteúdo

- **Carga horária:** 260h
- **Categoria:** Cursos Técnicos
- **Preço:** Sob consulta (sem valor cadastrado)
- **Capa:** imagem gerada por IA (split-inverter em ambiente residencial)
- **Módulos:** 10
- **Aulas:** 50 (média de 5 por módulo, ~5h cada)

### Estrutura dos 10 módulos

1. Introdução ao ar-condicionado e mercado de trabalho
2. Termodinâmica e ciclo de refrigeração (linguagem simples)
3. Componentes: compressor, condensador, evaporador, válvula de expansão
4. Ferramentas, EPIs e segurança na instalação
5. Tipos de sistemas: split, multi-split, janela, cassete, VRF (visão geral)
6. Instalação passo a passo do split hi-wall (parte 1: preparação e fixação)
7. Instalação passo a passo (parte 2: tubulação, flangeamento, vácuo, carga)
8. Elétrica, disjuntores, dimensionamento de fiação e aterramento
9. Partida, testes, medições e entrega técnica ao cliente
10. Manutenção preventiva, PMOC básico e resolução de defeitos comuns

### O que cada aula contém

- Título + objetivo em 2 bullets
- Texto didático (300–500 palavras) em linguagem simples, com **negrito** nos pontos-chave e caixas de "Atenção / Segurança / Dica de campo"
- 1 vídeo do YouTube curado (canais técnicos BR: Mundo da Elétrica, Prof. Rodrigo, Instalador Profissional, etc.) — embed via `youtube_url` que o player já suporta
- 3–5 flashcards de memorização (pergunta/resposta)
- Mini-quiz de 3 questões ao final da aula
- 1–2 imagens ilustrativas por aula em módulos técnicos (ferramentas, componentes, esquemas) — geradas por IA quando não houver referência livre

### Avaliação e entrega ao aluno

- **Prova final:** 20 questões de múltipla escolha, nota mínima 70% (usa a tabela `enrollment_exams` já existente)
- **Barra de progresso:** já funciona automaticamente via `lesson_progress` conforme aula é marcada como concluída
- **Certificado:** emitido pelo fluxo atual em `/aluno/certificados` ao concluir 100% + prova aprovada
- **Apostila PDF:** botão "Baixar apostila" já existe no player; consolida todas as aulas em PDF
- **Vídeos:** embutidos no player; não há sincronização palavra-por-palavra com o texto (impossível garantir sem produção própria), mas cada vídeo é escolhido para reforçar o tema da aula. Uso de embed do YouTube é permitido pela própria plataforma — não gera plágio.

### Como será executado (técnico)

1. Inserir 1 registro em `courses` (slug `instalacao-ar-condicionado`, categoria, capa, descrição, `published=true`, `active=true`)
2. Gerar capa por IA e subir no bucket `course-images`
3. Inserir 10 registros em `course_sections`
4. Inserir 50 registros em `course_lessons` com HTML rico no campo `content`, `youtube_url`, `duration_minutes`, `flashcards` (JSON) e `quiz` (JSON) — usando as colunas já existentes no schema restaurado
5. Gerar imagens ilustrativas por IA em lote para as aulas técnicas (módulos 3, 4, 6, 7, 8) e anexar via `lesson_attachments`
6. Popular a prova final em `enrollment_exams` / `enrollment_exam_questions` (20 questões)
7. Testar abrindo `/aluno` logado como aluno para validar player, progresso, quiz e apostila

### Fora de escopo (para não estourar créditos)

- Curso de PMOC (fica para depois — não cabe nos créditos restantes)
- Área separada de "Professor" (você usa o `/admin/cursos` atual)
- Vídeos próprios / gravação
- Tradução para outros idiomas

### Confirmação

Ao aprovar, eu executo em ondas para você acompanhar o consumo:
- **Onda 1** (~10 cr): curso + capa + 10 módulos + esqueleto das 50 aulas
- **Onda 2** (~20–30 cr): conteúdo completo das aulas (texto, vídeos, flashcards, quizzes)
- **Onda 3** (~10–15 cr): imagens ilustrativas + prova final de 20 questões + teste

Se em qualquer onda o custo real superar minha faixa, eu paro e te aviso antes de continuar.