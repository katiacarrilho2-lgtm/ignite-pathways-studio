<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Regras técnicas

- Ilustrações de aula por IA passam pela Edge Function `generate-lesson-image` (gateway Lovable AI, modelo `openai/gpt-image-2.5-sunburst`, SSE) e são salvas no bucket `course-images` via `uploadDataUrlAsImage` — a chave de IA nunca vai para o navegador.
