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

- Uploaded lesson videos use the existing private `course-videos` bucket and `course_lessons.video_path` across all lesson types; shared `UploadedLessonVideo` playback uses signed URLs so editor, preview and student views stay consistent without public storage.

- Ilustrações de aula por IA passam pela Edge Function `generate-lesson-image` (gateway Lovable AI, modelo `openai/gpt-image-2.5-sunburst`, SSE) e são salvas no bucket `course-images` via `uploadDataUrlAsImage` — a chave de IA nunca vai para o navegador.
- Landing /refrigeracao reads site_settings section pagina_refrigeracao (editable in /admin/site-refrigeracao); payment buttons are owner-pasted InfinitePay links, no API integration.
