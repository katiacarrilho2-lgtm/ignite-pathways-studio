Plano para resolver sem consumir créditos com geração nova:

1. **Corrigir a causa principal do “salvo mas não aparece”**
   - Ajustar o editor de blocos para inicializar a partir de `html`, `body` ou `content_html` e salvar sempre nos campos compatíveis.
   - Garantir que alterações feitas em objetivo, blocos, flashcards, quiz, vídeos e imagens extras sejam persistidas no mesmo JSON que o player lê.

2. **Corrigir o editor antigo do builder**
   - Hoje o builder só mostra o editor rico completo para aulas do tipo texto; vou padronizar o salvamento para todos os tipos de aula que possam ter conteúdo complementar.
   - Evitar que o auto-save silencioso feche a janela ou salve uma versão incompleta.

3. **Corrigir o player e o preview administrativo**
   - Fazer o player e a pré-visualização renderizarem o mesmo conteúdo salvo pelo editor, em qualquer tipo de aula.
   - Manter vídeo principal, imagens extras, vídeos extras, flashcards e quiz inline aparecendo abaixo do texto quando existirem.

4. **Migrar apenas compatibilidade dos dados existentes**
   - Sem IA, sem imagens novas, sem geração de aulas.
   - Atualizar as aulas existentes que ainda têm `body` preenchido e `html` vazio para copiar o conteúdo para `html`, preservando tudo.

5. **Validar antes de dizer que está pronto**
   - Testar uma aula real do curso de ar-condicionado no banco: editar/salvar e confirmar que `html` e `body` ficam preenchidos.
   - Conferir no código que player e preview usam o mesmo fallback.
   - Se possível, abrir a tela no navegador e verificar visualmente o conteúdo renderizado.