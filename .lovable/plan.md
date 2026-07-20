## O que está acontecendo

A tela de edição de aula já tem o botão **"Buscar vídeo"**, mas ele chama a edge function `youtube-search`, que hoje precisa de duas coisas para funcionar:

1. **A função `youtube-search` implantada** no backend (o código existe em `supabase/functions/youtube-search/index.ts`, mas ainda não foi implantada no ambiente atual).
2. **A chave `YOUTUBE_API_KEY`** cadastrada como secret do backend (a função retorna `missing YOUTUBE_API_KEY` se ela não existir).

Além disso, hoje **não existe campo para colar um link do YouTube manualmente** — só a busca. É por isso que "colar o link" não faz nada.

## Sobre o custo

Isso é ajuste da estrutura que eu montei, não é curso novo. Fica em **1–2 créditos** no total (implantar a função, ajustar o diálogo, testar). Só há custo extra se você **não tiver** uma chave da YouTube Data API — nesse caso é grátis, mas você precisa gerar a chave no Google Cloud (te passo o passo a passo) e me mandar para eu salvar como secret.

## O que vou fazer (após seu ok)

1. **Implantar** a edge function `youtube-search` (já pronta no código).
2. **Cadastrar `YOUTUBE_API_KEY`** como secret do backend usando a chave que você fornecer.
3. **Adicionar campo "Colar link do YouTube"** no diálogo `YoutubePickerDialog`:
   - aceita URLs `youtube.com/watch?v=…`, `youtu.be/…` e `youtube.com/shorts/…`
   - extrai o `videoId`, busca título/canal/thumb/duração via a mesma função (novo modo `lookup`) e grava na aula igual à busca faz hoje
4. **Testar** com um `curl` na função e uma aula real do curso de Ar-Condicionado.

## Detalhes técnicos

- `supabase/functions/youtube-search/index.ts`: aceitar `{ mode: "lookup", videoId }` além do `query` atual; no modo `lookup` chamar só `videos.list` (mais barato em quota).
- `src/components/admin/YoutubePickerDialog.tsx`: adicionar um `Input` "Colar link do YouTube" + botão "Usar este link"; ao colar, faz `parseYoutubeUrl(url)` no client e invoca `youtube-search` com `mode: "lookup"`.
- Nenhuma mudança de schema; nenhum outro arquivo afetado.

## O que eu preciso de você

- **Confirmar o "ok"** para eu executar (1–2 créditos).
- **Uma chave da YouTube Data API v3** (Google Cloud → APIs & Services → Credentials). Se preferir, me avise e eu te mando o passo a passo antes.
