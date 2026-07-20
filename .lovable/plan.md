## O erro que você está vendo

"Edge Function returned a non-2xx status code" = a função `youtube-search` respondeu `missing YOUTUBE_API_KEY`. Ou seja: o código está funcionando, o que falta é a **chave da API do YouTube** cadastrada como secret.

Sem essa chave, o YouTube não responde a ninguém — não tem como contornar no código.

## Como obter a chave (grátis, ~3 min)

1. Acesse **https://console.cloud.google.com/**
2. Crie um projeto (ou selecione um existente) — nome livre, ex.: "Multplick YouTube".
3. Menu → **APIs & Services → Library** → pesquise **"YouTube Data API v3"** → clique em **Enable**.
4. Menu → **APIs & Services → Credentials** → **+ Create Credentials** → **API key**.
5. Copie a chave (começa com `AIzaSy...`).
6. (Opcional, recomendado) clique em "Edit API key" e em "API restrictions" restrinja a chave à **YouTube Data API v3**.

A cota gratuita é de 10.000 unidades/dia — uma busca custa 100, um "usar link" custa 1. Dá tranquilamente para o uso do curso.

## O que farei depois que você colar a chave

1. Abrir o formulário seguro para você **colar `YOUTUBE_API_KEY`** (via ferramenta `add_secret` — o valor fica criptografado, não passa pelo chat).
2. **Testar** a função direto no backend com um `curl` (busca + lookup por link).
3. Você recarrega a aula e o botão "Buscar" / "Usar link" já vai funcionar.

## Custo

**0 créditos extras.** Está tudo dentro dos 1–2 créditos do plano anterior — só falta esse passo do secret.

## Preciso do seu ok

Confirma que vou abrir o formulário para você colar a `YOUTUBE_API_KEY`?
