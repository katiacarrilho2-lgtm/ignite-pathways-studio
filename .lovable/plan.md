## Objetivo

Reescrever 3 aulas do curso "Instalação de Ar-Condicionado" no padrão premium, para você validar antes de aplicar ao curso inteiro.

## Aulas escolhidas (piloto)

Vou pegar 1 aula de cada perfil, para o modelo cobrir todos os tipos de conteúdo:

1. **Uma aula teórica** (ex.: Módulo 1 – Termodinâmica / ciclo de refrigeração)
2. **Uma aula prática de instalação** (ex.: Módulo 5 – Instalação da unidade evaporadora/condensadora)
3. **Uma aula técnica de elétrica ou vácuo** (ex.: Módulo 4 – Ligações elétricas OU Módulo 6 – Vácuo e carga de gás)

A escolha final das 3 aulas eu confirmo lendo `course_lessons` antes de escrever.

## Padrão premium de cada aula

Cada aula reescrita terá, dentro do `content` (jsonb) já existente:

- **Introdução** (por que essa aula importa, onde se aplica no dia a dia)
- **Conteúdo teórico aprofundado** (linguagem simples, tom profissional, 800–1500 palavras em HTML rico: subtítulos, listas, tabelas quando fizer sentido)
- **Passo a passo prático** com numeração clara
- **Normas e segurança** aplicáveis (NR-10, NR-35, NBR 16401, etc. quando pertinente — sem inventar números)
- **Erros comuns em campo** e como evitar
- **Checklist final** de execução/verificação
- **Flashcards de memorização** (6–10 cards no array `content.flashcards`)
- **Quiz com explicação** (5–8 questões no array `content.quiz`, cada uma com `explanation`)
- **Vídeo do YouTube e imagem já existentes preservados** (não sobrescrevo `content.youtube` nem a `<img>` da seção)

## Como será entregue

- Atualização direta no banco (`UPDATE course_lessons SET content = ...`) preservando `youtube` e imagem já inseridos.
- Você abre `/admin/cursos/<id>/preview` e navega nas 3 aulas para avaliar.
- Se aprovar o padrão, aí planejamos a reescrita do curso completo (estimativa realista: 35–55 créditos, como já conversado).

## Custo estimado deste piloto

**3–5 créditos** (leitura das 3 aulas atuais + 3 updates com conteúdo denso). Sem migração, sem edge function, sem gerar novas mídias.

## Fora de escopo

- Não vou tocar nas outras 47 aulas.
- Não vou mexer em schema, RLS ou edge functions.
- Não vou trocar vídeos nem imagens já inseridos.

Aguardo seu "ok" para executar.