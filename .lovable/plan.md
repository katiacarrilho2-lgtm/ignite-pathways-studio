# Plano: Publicar as páginas técnicas da Faculdade LA

## Objetivo
Publicar as alterações já feitas nas páginas `/curso-regular` e `/curso-por-competencia`, que agora usam a identidade da Faculdade LA (Grupo LA Educação), com o Técnico Regular a R$ 129,90 em 12x.

## O que será publicado
- `src/pages/CursoRegular.tsx`
- `src/pages/CursoPorCompetencia.tsx`
- `public/la-educacao-logo.png`

## Pré-verificação
- Typecheck já validado: `OK`
- Zero ocorrências de "Universal" / "CEE-PA" nas páginas técnicas
- Logo LA Educação presente e servida de `public/`
- Rodapé com CNPJ 36.131.612/0001-60 em ambas as páginas

## Ação
1. Executar `preview_ui--publish` para publicar o projeto no domínio atual.
2. Aguardar a conclusão do deploy (geralmente cerca de 1 minuto).
3. Confirmar a URL publicada ao usuário.

## Pós-publicação
- Lembrar que, se houver domínio customizado conectado, o deploy também reflete lá.
- O usuário poderá negociar descontos sobre o valor de R$ 129,90 no atendimento.
