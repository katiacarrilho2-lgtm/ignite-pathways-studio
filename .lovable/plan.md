# Onde estão as 3 aulas premium

As 3 aulas foram salvas no banco (confirmado via query): cada uma com corpo HTML de 4.4k–5.7k caracteres, 7–8 flashcards e 6–7 questões de quiz.

## Localização

Curso: **Instalação de Ar-Condicionado** (`slug: instalacao-ar-condicionado`, id `b13267f6-53c0-4624-82dd-d54317a219cf`)

| Aula | Seção | Posição |
|---|---|---|
| O ciclo de refrigeração passo a passo | Termodinâmica e Ciclo de Refrigeração | Seção 2 → aula 2 |
| Fixação da evaporadora — o que ninguém te conta | Instalação Passo a Passo — Preparação e Fixação | Seção 6 → aula 2 |
| Segurança elétrica: como não morrer no dia de serviço | Ferramentas, EPIs e Segurança na Instalação | Seção 4 → aula 3 |

## Rotas para abrir

- Preview admin: `/admin/cursos/b13267f6-53c0-4624-82dd-d54317a219cf/preview`
- Builder/edição: `/admin/cursos/b13267f6-53c0-4624-82dd-d54317a219cf/conteudo`
- Lista de cursos: `/admin/cursos`

## Próximo passo proposto

1. Você abre o preview e confirma se o texto premium, flashcards e quiz aparecem renderizados.
2. Se **não** aparecerem (tela em manutenção, corpo vazio, etc.), eu investigo `AdminCursoPreview.tsx` — o dado está no banco, então seria bug de renderização (custo estimado: 1–2 créditos para diagnóstico + correção).
3. Se aparecerem OK, você aprova o padrão e eu sigo com as 47 aulas restantes conforme estimativa anterior (35–55 créditos).

Nenhuma alteração de código ou banco neste plano — só navegação e verificação.
