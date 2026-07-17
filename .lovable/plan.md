## Diagnóstico

Rodei o preview local (`http://localhost:8080`) via headless Chromium e a **home renderiza corretamente** — logo Multplick, navbar, hero "A solução completa em formação profissional", CTAs e contadores aparecem. Não há erros de compilação nem `pageerror` no runtime. O dev server Vite está `ready` sem warnings críticos.

Portanto o "tela em branco" que você vê é quase certamente **cache do iframe de preview** carregado antes do `.env` existir / antes do último restart. E o **"files are missing"** no domínio publicado é porque o deploy atual corresponde ao estado quebrado anterior à migração — precisa de uma nova publicação.

## Passos

1. **Forçar refresh do preview**
   - Reiniciar o dev server Vite uma vez para garantir que o `.env` (Supabase URL/key) foi carregado no processo atual.
   - Pedir que você faça um hard reload (Ctrl/Cmd+Shift+R) na aba de preview.

2. **Verificar imports de assets externos**
   - Investigar os `ERR_NAME_NOT_RESOLVED` do console: identificar qual componente importa um `*.asset.json` apontando pra URL `/__l5e/assets-v1/...` (sistema de assets Lovable, que não resolve em Vite clássico) e trocar por import direto do binário local em `src/assets/`.
   - Isso não é bloqueante pra a home carregar, mas evita ruído e imagens quebradas em outras páginas (EJA, NR10, NR35, certificados).

3. **Republicar**
   - Após confirmar preview OK, publicar novamente pra sobrescrever o deploy quebrado que mostra "files are missing" em `multplick.live`.

## Detalhes técnicos

- Stack: Vite 5 + React Router (classic). `.env` já contém `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. `src/integrations/supabase/client.ts` lê via `import.meta.env` — funcionando.
- Nenhum erro de tipo/compilação pendente após os patches feitos em `AdminImagens.tsx` e `Checkout.tsx`.
- Os arquivos `src/assets/**/*.asset.json` são metadados do sistema Lovable Assets; em Vite clássico só valem os binários (`.jpg/.webp/.png`) irmãos. Caso algum componente faça `import meta from ".../foo.jpg.asset.json"` e use `meta.url`, esse URL aponta pra `/__l5e/...` e falha. A correção é `import img from ".../foo.jpg"` (Vite gera hash e serve corretamente).
- Publicar via botão Publish (ou tool `preview_ui--publish`) só após o preview estar visualmente OK.
