**Estimativa antes de executar:** ~1 crédito para corrigir o fluxo básico de upload/salvamento/renderização. Não vou gerar imagens nem conteúdo por IA.

## Diagnóstico confirmado
- O curso `Instalação de Ar-Condicionado Split` tem 41 aulas.
- Só 1 aula tem `extra_images`; então as imagens extras realmente não estão sendo gravadas/organizadas na maioria das aulas.
- Existem dois fluxos de edição: o editor do builder (`/admin/cursos/.../conteudo`) e o editor rápido dentro do player. Eles salvam imagens de jeitos diferentes.
- O bucket `course-images` está privado; alguns pontos usam URL pública em vez de URL assinada. Isso explica imagem enviada que salva, mas não aparece.
- Ainda há imagens em base64 dentro do conteúdo de algumas aulas, o que deixa o salvamento pesado e instável.

## Plano de correção
1. **Unificar upload de imagem**
   - Criar um helper único no frontend para enviar imagem para `course-images`.
   - Sempre gerar URL assinada persistente após o upload.
   - Parar de usar `getPublicUrl` em bucket privado.

2. **Corrigir o editor principal do curso**
   - Atualizar o fluxo de imagem do `AdminCursoBuilder` para usar o mesmo upload seguro do editor rápido.
   - Garantir que imagem principal, galeria, vídeos extras e conteúdo HTML sejam salvos no mesmo JSON da aula.
   - Evitar que autosave sobrescreva alterações recém-feitas no editor.

3. **Corrigir o player/aluno**
   - Renderizar imagem principal e galeria mesmo quando houver vídeo principal, em ordem clara: vídeo, texto, imagens extras, vídeos extras, flashcards, quiz.
   - Tratar imagem quebrada com uma mensagem simples para o admin perceber que o link está inválido.

4. **Limpar visual do editor**
   - Trocar os blocos que mostram “HTML deste bloco” por campos mais amigáveis onde possível, sem quebrar o HTML já existente.
   - Deixar claro o botão correto para salvar.

5. **Verificação sem gastar IA**
   - Testar via banco se uma aula passa a salvar `extra_images` com URL assinada.
   - Conferir que o player usa os campos salvos.
   - Não gerar novas imagens, vídeos ou texto.

## Fora deste ajuste
- Não vou recriar o curso inteiro.
- Não vou gerar novas imagens com IA.
- Não vou mexer em outros módulos do dashboard neste passo.