import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson-image`;

type ImagePayload = { type?: string; b64_json?: string; error?: { message?: string } };

/**
 * Gera uma ilustração da aula com IA. Chama `onFrame` a cada prévia recebida
 * (isFinal=true na imagem definitiva).
 */
export async function streamLessonImage(
  prompt: string,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const send = (stream: boolean) => {
    signal?.throwIfAborted();
    return fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, stream }),
      signal: signal ?? null,
    });
  };

  const friendly = async (res: Response) => {
    const text = await res.text().catch(() => "");
    let message = text;
    try { message = JSON.parse(text)?.error?.message ?? JSON.parse(text)?.error ?? text; } catch { /* texto puro */ }
    if (res.status === 402) return "Créditos de IA esgotados. Recarregue para continuar gerando imagens.";
    if (res.status === 429) return "Muitas gerações seguidas. Aguarde alguns segundos e tente de novo.";
    if (res.status === 401) return "Sessão expirada. Faça login novamente.";
    return message || `Falha ao gerar imagem (${res.status})`;
  };

  const res = await send(true);
  if (!res.ok || !res.body) throw new Error(await friendly(res));

  let sawCompleted = false;
  let sawAnyEvent = false;
  let streamError: string | undefined;

  const parser = createParser({
    onEvent(event) {
      let payload: ImagePayload | undefined;
      try { payload = JSON.parse(event.data) as ImagePayload; } catch { payload = undefined; }
      if (event.event === "error" || payload?.type === "error") {
        sawAnyEvent = true;
        streamError = payload?.error?.message ?? "Falha ao gerar imagem";
        return;
      }
      const type = event.event || payload?.type;
      if (type !== "image_generation.partial_image" && type !== "image_generation.completed") return;
      sawAnyEvent = true;
      if (!payload?.b64_json) { streamError = "A resposta não trouxe imagem"; return; }
      const isFinal = type === "image_generation.completed";
      flushSync(() => onFrame(`data:image/png;base64,${payload!.b64_json}`, isFinal));
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<string>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal?.aborted || sawAnyEvent || (error instanceof Error && error.name === "AbortError")) throw error;
        break;
      }
      if (chunk.done) break;
      parser.feed(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  signal?.throwIfAborted();
  if (streamError) throw new Error(streamError);

  if (!sawAnyEvent) {
    const replay = await send(false);
    if (!replay.ok) throw new Error(await friendly(replay));
    const json = (await replay.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("A resposta não trouxe imagem");
    onFrame(`data:image/png;base64,${b64}`, true);
    return;
  }
  if (!sawCompleted) throw new Error("A geração foi interrompida antes de concluir");
}
