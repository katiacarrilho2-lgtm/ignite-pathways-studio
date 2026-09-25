import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateObject, generateText } from "npm:ai";
import { z } from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

// Mantém promises de background vivas após o response (Deno Edge Runtime).
// Sem isto, `(async()=>{})()` é morto quando a função retorna, deixando aulas eternamente em ai_pending.
function keepAlive(promise: Promise<unknown>) {
  try {
    // @ts-ignore EdgeRuntime existe no runtime do Supabase
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(promise);
      return;
    }
  } catch {/* */}
  // Fallback: garante que a promise é "consumida" para não vazar
  promise.catch((e) => console.error("background error:", e));
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const AI_REQUEST_TIMEOUT_MS = 75_000;
const AI_STALE_FAIL_MS = 10 * 60_000;
const QUEUE_BATCH_SIZE = 1;
const QUEUE_DELAY_MS = 1_500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withAiTimeout<T>(label: string, work: (signal: AbortSignal) => Promise<T>, timeoutMs = AI_REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(`timeout after ${timeoutMs}ms`);
      reject(new Error(`TIMEOUT: ${label} excedeu ${Math.round(timeoutMs / 1000)}s sem resposta da IA`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([work(controller.signal), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function buildGateway(key: string) {
  // Prioridade: 1) Lovable AI Gateway (cota maior e estável via créditos do workspace),
  //             2) Gemini direto (free tier, sujeito a 429),
  //             3) Groq.
  // Para forçar o provider antigo defina PREFER_GEMINI_DIRECT=true.
  const preferGemini = Deno.env.get("PREFER_GEMINI_DIRECT") === "true";
  if (preferGemini) {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      const provider = createOpenAICompatible({
        name: "google-direct",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        headers: { Authorization: `Bearer ${geminiKey}` },
      });
      return Object.assign(provider, { providerKind: "gemini-direct" });
    }
  }
  if (key) {
    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    return Object.assign(provider, { providerKind: "lovable" });
  }
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    const provider = createOpenAICompatible({
      name: "google-direct",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      headers: { Authorization: `Bearer ${geminiKey}` },
    });
    return Object.assign(provider, { providerKind: "gemini-direct" });
  }
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    const provider = createOpenAICompatible({
      name: "groq-direct",
      baseURL: "https://api.groq.com/openai/v1",
      headers: { Authorization: `Bearer ${groqKey}` },
    });
    return Object.assign(provider, { providerKind: "groq-direct" });
  }
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return Object.assign(provider, { providerKind: "lovable" });
}

function buildGeminiFallbackGateway() {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return null;
  const provider = createOpenAICompatible({
    name: "google-direct-fallback",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${geminiKey}` },
  });
  return Object.assign(provider, { providerKind: "gemini-direct" });
}

function gw(gateway: any, modelId: string) {
  // Mapeia o modelo conforme o provider ativo.
  let id = modelId;
  const providerKind = (gateway as any)?.providerKind;
  const usingGeminiDirect = providerKind === "gemini-direct";
  const usingGroq = providerKind === "groq-direct";
  if (usingGeminiDirect) {
    // Google AI Studio direto não aceita prefixo "google/".
    id = modelId.replace(/^google\//, "");
  } else if (usingGroq) {
    // Groq não tem modelos Gemini — mapeia para Llama 3.3 70B (rápido e gratuito).
    id = "llama-3.3-70b-versatile";
  }
  // Structured outputs (necessário para schemas Zod).
  return (gateway as any)(id, { structuredOutputs: true });
}

function isForbiddenAiError(error: any) {
  const message = `${error?.message ?? ""} ${error?.cause?.message ?? ""}`;
  return /\b403\b|forbidden/i.test(message);
}

async function generateValidatedWithFallback<T>(
  gateway: any,
  modelId: string,
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  maxOutputTokens = 8192,
  abortSignal?: AbortSignal,
): Promise<{ object: T; raw?: string }> {
  try {
    return await generateValidated(gw(gateway, modelId), system, prompt, schema, maxOutputTokens, abortSignal);
  } catch (error) {
    const fallback = (gateway as any)?.providerKind === "lovable" && isForbiddenAiError(error)
      ? buildGeminiFallbackGateway()
      : null;
    if (!fallback) throw error;
    console.warn("Lovable AI Gateway retornou 403; tentando fallback Gemini direto.");
    try {
      return await generateValidated(gw(fallback, modelId), system, prompt, schema, maxOutputTokens, abortSignal);
    } catch (fallbackError: any) {
      const e: any = new Error(`Gateway 403 e fallback Gemini falhou: ${fallbackError?.message ?? String(fallbackError)}`);
      e.raw = fallbackError?.raw;
      e.cause = fallbackError;
      throw e;
    }
  }
}

// ---------- Zod schemas ----------
const SkeletonSchema = z.object({
  description: z.string(),
  long_description: z.string(),
  objectives: z.array(z.string()),
  modules: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    image_prompt: z.string().optional(),
    lessons: z.array(z.object({
      title: z.string(),
      summary: z.string(),
    })),
  })),
});

const LessonTextSchema = z.object({
  objective: z.string(),
  theory_html: z.string(),
  summary: z.string(),
  key_points: z.array(z.string()),
  references: z.array(z.string()),
  practical_steps: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
  common_mistakes: z.array(z.object({
    mistake: z.string(),
    fix: z.string(),
  })).default([]),
  glossary: z.array(z.object({
    term: z.string(),
    meaning: z.string(),
  })).default([]),
  memorization: z.array(z.string()).default([]),
  teacher_notes: z.array(z.string()).default([]),
  video_topics: z.array(z.string()).default([]),
  youtube_query: z.string().default(""),
  complementary_materials: z.array(z.object({
    kind: z.string(),
    title: z.string(),
    reference: z.string(),
    // Aceita string vazia, ausente ou null — IA frequentemente devolve null
    url: z.preprocess((v) => (v == null ? "" : v), z.string().default("")),
  })).default([]),
});


// Coerções defensivas — Gemini às vezes devolve objetos/strings em campos string.
const toStr = (v: any): any => {
  if (v == null) return v;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    return v.text ?? v.value ?? v.content ?? v.label ?? v.question ?? v.answer ?? v.front ?? v.back
      ?? v.pergunta ?? v.resposta ?? v.frente ?? v.verso ?? v.enunciado ?? v.titulo ?? JSON.stringify(v);
  }
  return v;
};
const toStrArr = (v: any): any =>
  Array.isArray(v) ? v.map(toStr) : v;
const toCorrect = (v: any, options?: any[]): any => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (/^[0-9]+$/.test(t)) return parseInt(t, 10);
    const letter = t.match(/^[A-Da-d]$/);
    if (letter) return letter[0].toUpperCase().charCodeAt(0) - 65;
    if (Array.isArray(options)) {
      const idx = options.findIndex((o) => String(o).trim() === t);
      if (idx >= 0) return idx;
    }
  }
  if (v && typeof v === "object") {
    if (typeof v.index === "number") return v.index;
    if (typeof v.answer === "string" && Array.isArray(options)) {
      const idx = options.findIndex((o) => String(o).trim() === v.answer.trim());
      if (idx >= 0) return idx;
    }
  }
  return v;
};
const QuestionItem = z.preprocess((q: any) => {
  if (!q || typeof q !== "object") return q;
  const options = toStrArr(
    q.options ?? q.alternatives ?? q.choices
    ?? q.alternativas ?? q.opcoes ?? q.opções ?? q.respostas,
  );
  const correctRaw = q.correct ?? q.answer ?? q.correct_index ?? q.correctIndex ?? q.correctAnswer
    ?? q.resposta_correta ?? q.respostaCorreta ?? q.resposta ?? q.gabarito ?? q.indice_correto ?? q.correta;
  let correct = toCorrect(correctRaw, options);
  if (typeof correct !== "number" || !Number.isFinite(correct) || correct < 0) correct = 0;
  return {
    question: toStr(
      q.question ?? q.text ?? q.statement ?? q.prompt
      ?? q.pergunta ?? q.enunciado ?? q.questao ?? q.questão ?? q.titulo,
    ),
    options,
    correct,
    explanation: toStr(
      q.explanation ?? q.rationale ?? q.justification
      ?? q.explicacao ?? q.explicação ?? q.justificativa ?? q.comentario ?? q.comentário ?? "",
    ) ?? "",
  };
}, z.object({
  question: z.string(),
  options: z.array(z.string()),
  correct: z.number(),
  explanation: z.string().default(""),
}));

const QuizSchema = z.preprocess(
  (v: any) => {
    if (Array.isArray(v)) return { questions: v };
    if (v && typeof v === "object") {
      const arr = v.questions ?? v.items ?? v.quiz ?? v.data
        ?? v.perguntas ?? v.questoes ?? v.questões ?? v.avaliacao ?? v.avaliação;
      if (Array.isArray(arr)) return { questions: arr };
    }
    return v;
  },
  z.object({ questions: z.array(QuestionItem) }),
);

const FlipItem = z.preprocess((c: any) => {
  if (!c || typeof c !== "object") return c;
  return {
    front: toStr(c.front ?? c.question ?? c.term ?? c.q
      ?? c.frente ?? c.pergunta ?? c.termo ?? c.titulo ?? c.conceito),
    back: toStr(c.back ?? c.answer ?? c.definition ?? c.a
      ?? c.verso ?? c.resposta ?? c.definicao ?? c.definição ?? c.explicacao ?? c.explicação),
  };
}, z.object({ front: z.string(), back: z.string() }));
const FlipSchema = z.preprocess(
  (v: any) => {
    if (Array.isArray(v)) return { items: v };
    if (v && typeof v === "object") {
      const arr = v.items ?? v.cards ?? v.flashcards ?? v.data
        ?? v.cartoes ?? v.cartões ?? v.flips;
      if (Array.isArray(arr)) return { items: arr };
    }
    return v;
  },
  z.object({ items: z.array(FlipItem) }),
);

// ---------- Structured-output helper with raw-capture fallback ----------
async function generateValidated<T>(
  model: any,
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  maxOutputTokens = 8192,
  abortSignal?: AbortSignal,
): Promise<{ object: T; raw?: string }> {
  try {
    const { object } = await generateObject({
      model, system, prompt, schema, maxOutputTokens, abortSignal,
    });
    return { object: object as T };
  } catch (err: any) {
    // Fallback: request plain JSON text and parse manually so we can capture the raw output.
    const jsonInstruction = "\n\nIMPORTANTE: responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem ```), seguindo o formato solicitado.";
    let raw = "";
    try {
      const { text } = await generateText({
        model, system, prompt: prompt + jsonInstruction, maxOutputTokens, abortSignal,
      });
      raw = text ?? "";
      const cleaned = raw.trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        const e: any = new Error(`schema validation failed: ${validated.error.message}`);
        e.raw = raw; e.cause = err;
        throw e;
      }
      return { object: validated.data, raw };
    } catch (fallbackErr: any) {
      if (fallbackErr?.raw) throw fallbackErr;
      const e: any = new Error(`AI generation failed: ${err?.message ?? String(err)} | fallback: ${fallbackErr?.message ?? String(fallbackErr)}`);
      e.raw = raw; e.cause = err;
      throw e;
    }
  }
}

// ---------- Helpers ----------
function buildLessonHtml(c: z.infer<typeof LessonTextSchema>): string {
  const sec = (title: string, body: string) =>
    `<section><h2>${title}</h2>${body}</section>`;
  const list = (arr: string[]) =>
    `<ul>${arr.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  const videoHtml = (c.video_topics ?? []).length
    ? sec("Sugestões de temas para vídeos", `<p class="text-sm text-muted-foreground">Use estes temas para buscar vídeos reais no YouTube e anexá-los manualmente à aula.</p><ul>${c.video_topics!.map((t) =>
        `<li>${t}</li>`).join("")}</ul>`)
    : "";
  const matHtml = (c.complementary_materials ?? []).length
    ? sec("Material complementar", `<ul>${c.complementary_materials!.map((m) =>
        `<li><strong>${m.kind}:</strong> ${m.title} — <em>${m.reference}</em>${m.url ? ` (<a href="${m.url}" target="_blank" rel="noreferrer">link</a>)` : ""}</li>`).join("")}</ul>`)
    : "";
  return [
    sec("Objetivo da aula", `<p>${c.objective}</p>`),
    sec("Conteúdo principal", c.theory_html),
    sec("Resumo", `<p>${c.summary}</p>`),
    sec("Pontos-chave", list(c.key_points)),
    videoHtml,
    matHtml,
    sec("Referências", list(c.references)),
  ].filter(Boolean).join("\n");
}

type GenOptions = {
  level: string;
  audience?: string;
  workload?: string;
  tone: string;
  depth: string;
  include_materials: boolean;
  model: string;
};

async function generateLessonText(
  gateway: ReturnType<typeof buildGateway>,
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  lessonSummary: string,
  opts: GenOptions,
  abortSignal?: AbortSignal,
) {
  const sys = `Você é um especialista em educação profissionalizante brasileira. Gere conteúdo didático em português do Brasil, profissional, atualizado e correto. Para HTML use apenas <p>, <strong>, <em>, <ul>, <li>, <ol>, <h3>, <table>, <tr>, <td>, <th>. Nunca invente leis ou normas inexistentes.`;
  const prompt = `Curso: "${courseTitle}". Módulo: "${moduleTitle}". Aula: "${lessonTitle}".
Resumo da aula: ${lessonSummary}
Nível: ${opts.level}. Profundidade: ${opts.depth}. Tom: ${opts.tone}.${opts.audience ? ` Público-alvo: ${opts.audience}.` : ""}${opts.workload ? ` Carga horária do curso: ${opts.workload}.` : ""}

Gere:
- objective: objetivo de aprendizagem em 1-2 frases.
- theory_html: conteúdo teórico completo da aula em HTML (mínimo 400 palavras, com subtítulos h3 e listas quando ajudar).
- summary: resumo em 3-5 linhas.
- key_points: 5 a 8 pontos-chave.
- references: 3 a 6 referências bibliográficas reais (livros, normas, autores reconhecidos).
- video_topics: 3 a 5 SUGESTÕES DE TEMAS de busca no YouTube relacionadas à aula (apenas o tema/termo de busca em português, NUNCA URLs ou nomes de canais inventados).
- youtube_query: UM ÚNICO termo de busca curto, específico e em português, ideal para encontrar no YouTube o melhor vídeo prático/explicativo sobre esta aula. NÃO inclua URLs, nomes de canais nem aspas. Exemplos: "instalação de ar-condicionado split", "vácuo em sistemas de refrigeração", "PMOC manutenção de ar-condicionado".
${opts.include_materials ? "- complementary_materials: até 5 materiais (kind: norma, lei, manual, artigo ou documento; title; reference com identificador como 'NR-10', 'Lei 8.213/91', etc.; url opcional)." : "- complementary_materials: lista vazia."}`;

  const { object } = await generateValidatedWithFallback(
    gateway, opts.model, sys, prompt, LessonTextSchema, 12288, abortSignal,
  );
  return object as z.infer<typeof LessonTextSchema>;
}

async function generateQuiz(
  gateway: ReturnType<typeof buildGateway>,
  courseTitle: string,
  lessonTitle: string,
  numQuestions: number,
  opts: GenOptions,
  abortSignal?: AbortSignal,
) {
  const sys = `Gere questões de múltipla escolha didáticas e desafiadoras em português do Brasil. Cada questão tem exatamente 4 alternativas, uma correta (índice 0-3). Não repita perguntas.
FORMATO OBRIGATÓRIO: responda como JSON com o campo "questions" (array). Cada item DEVE usar EXATAMENTE as chaves em INGLÊS: "question" (string), "options" (array de 4 strings), "correct" (número 0 a 3). NUNCA use "pergunta", "alternativas" ou "resposta_correta".`;
  const prompt = `Curso: "${courseTitle}". Tema: "${lessonTitle}". Nível: ${opts.level}. Profundidade: ${opts.depth}.
Gere ${numQuestions} questões no formato { "questions": [ { "question": "...", "options": ["a","b","c","d"], "correct": 0 } ] }.`;
  const { object } = await generateValidatedWithFallback(
    gateway, opts.model, sys, prompt, QuizSchema, 8192, abortSignal,
  );
  // sanity: keep only well-formed questions
  const cleaned = {
    questions: (object.questions ?? []).filter(
      (q) => Array.isArray(q.options) && q.options.length === 4
        && Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3,
    ),
  };
  if (cleaned.questions.length === 0) {
    const e: any = new Error("quiz: nenhuma questão válida (4 opções + correct 0-3)");
    e.raw = JSON.stringify(object);
    throw e;
  }
  return cleaned as z.infer<typeof QuizSchema>;
}

async function generateFlashcards(
  gateway: ReturnType<typeof buildGateway>,
  courseTitle: string,
  lessonTitle: string,
  opts: GenOptions,
  abortSignal?: AbortSignal,
) {
  const sys = `Gere flashcards de estudo (frente: pergunta ou conceito; verso: resposta curta e clara) em português do Brasil.
FORMATO OBRIGATÓRIO: responda como JSON com o campo "items" (array). Cada item DEVE usar EXATAMENTE as chaves em INGLÊS: "front" (string) e "back" (string). NUNCA use "frente"/"verso" nem "flashcards".`;
  const prompt = `Curso: "${courseTitle}". Tema: "${lessonTitle}". Nível: ${opts.level}.
Gere de 10 a 15 flashcards no formato { "items": [ { "front": "...", "back": "..." } ] }.`;
  const { object } = await generateValidatedWithFallback(
    gateway, opts.model, sys, prompt, FlipSchema, 12288, abortSignal,
  );
  const cleaned = {
    items: (object.items ?? []).filter(
      (i) => typeof i?.front === "string" && i.front.trim() && typeof i?.back === "string" && i.back.trim(),
    ),
  };
  if (cleaned.items.length === 0) {
    const e: any = new Error("flashcards: nenhum item válido");
    e.raw = JSON.stringify(object);
    throw e;
  }
  return cleaned as z.infer<typeof FlipSchema>;
}

function sbAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function markLessonFailed(lessonId: string, phase: string, error: any, preserveContent?: any) {
  const admin = sbAdmin();
  const previous = preserveContent ?? (await admin.from("course_lessons").select("content").eq("id", lessonId).maybeSingle()).data?.content ?? {};
  await admin.from("course_lessons").update({
    content: {
      ...(previous as any),
      ai_pending: false,
      ai_error: error?.message ?? String(error),
      ai_error_at: new Date().toISOString(),
      ai_raw_response: typeof error?.raw === "string" ? error.raw.slice(0, 4000) : null,
      ai_failed_phase: phase,
    },
  }).eq("id", lessonId);
}

async function resetStalePendingLessons(courseId?: string, force = false) {
  const admin = sbAdmin();
  let lessons: any[] = [];
  if (courseId) {
    const { data: sections } = await admin.from("course_sections").select("id").eq("course_id", courseId);
    const secIds = (sections ?? []).map((s: any) => s.id);
    if (!secIds.length) return 0;
    const { data } = await admin.from("course_lessons").select("id, content, updated_at").in("section_id", secIds);
    lessons = data ?? [];
  } else {
    const { data } = await admin.from("course_lessons").select("id, content, updated_at").filter("content->>ai_pending", "eq", "true");
    lessons = data ?? [];
  }
  const cutoff = Date.now() - AI_STALE_FAIL_MS;
  const stale = lessons.filter((l: any) => l.content?.ai_pending === true && (force || !l.updated_at || new Date(l.updated_at).getTime() < cutoff));
  for (const l of stale) {
    await markLessonFailed(l.id, force ? "reset" : "timeout", new Error(force ? "RESET: geração em andamento foi destravada manualmente" : "TIMEOUT: geração anterior ficou presa em Gerando e foi liberada automaticamente"), l.content);
  }
  return stale.length;
}

// ---------- YouTube search (real API, never AI-invented URLs) ----------
function parseISODuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

type YoutubePick = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  duration_seconds: number;
};

async function youtubeSearchFirstValid(query: string): Promise<YoutubePick | null> {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key || !query.trim()) return null;
  try {
    const sUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    sUrl.searchParams.set("part", "snippet");
    sUrl.searchParams.set("type", "video");
    sUrl.searchParams.set("q", query.trim());
    sUrl.searchParams.set("maxResults", "10");
    sUrl.searchParams.set("relevanceLanguage", "pt");
    sUrl.searchParams.set("regionCode", "BR");
    sUrl.searchParams.set("safeSearch", "moderate");
    sUrl.searchParams.set("videoEmbeddable", "true");
    sUrl.searchParams.set("videoSyndicated", "true");
    sUrl.searchParams.set("key", key);
    const sr = await fetch(sUrl.toString());
    if (!sr.ok) { console.warn("yt search failed", sr.status, await sr.text()); return null; }
    const sd = await sr.json();
    const ids = (sd.items ?? []).map((it: any) => it?.id?.videoId).filter((x: any) => typeof x === "string");
    if (ids.length === 0) return null;
    const vUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    vUrl.searchParams.set("part", "snippet,contentDetails,status");
    vUrl.searchParams.set("id", ids.join(","));
    vUrl.searchParams.set("key", key);
    const vr = await fetch(vUrl.toString());
    if (!vr.ok) { console.warn("yt videos failed", vr.status, await vr.text()); return null; }
    const vd = await vr.json();
    for (const v of (vd.items ?? [])) {
      const dur = parseISODuration(v?.contentDetails?.duration ?? "PT0S");
      if (dur < 180) continue;
      const st = v?.status ?? {};
      if (st.privacyStatus && st.privacyStatus !== "public") continue;
      if (st.embeddable === false) continue;
      if (st.uploadStatus && st.uploadStatus !== "processed") continue;
      const sn = v?.snippet ?? {};
      const thumb = sn?.thumbnails?.maxres?.url || sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || "";
      return {
        videoId: v.id, title: sn.title ?? "", channel: sn.channelTitle ?? "",
        thumbnail: thumb, url: `https://www.youtube.com/watch?v=${v.id}`, duration_seconds: dur,
      };
    }
    return null;
  } catch (e) {
    console.warn("youtubeSearchFirstValid error", (e as any)?.message ?? e);
    return null;
  }
}

async function checkAuth(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  // check has_permission via RPC-like select
  const admin = sbAdmin();
  const { data: perms } = await admin.from("user_permissions")
    .select("permission").eq("user_id", user.id).eq("permission", "manage_courses");
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "super_admin");
  if ((perms ?? []).length === 0 && (roles ?? []).length === 0) return null;
  return user;
}

async function generateLessonContentBackground(
  lessonId: string,
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  lessonSummary: string,
  opts: GenOptions,
  key: string,
  runId?: string,
) {
  const gateway = buildGateway(key);
  const admin = sbAdmin();
  try {
    // Preserva vídeo existente (regeneração não substitui escolha do admin)
    const { data: existing } = await admin
      .from("course_lessons").select("content").eq("id", lessonId).maybeSingle();
    const prevContent = (existing?.content as any) ?? {};
    const existingYoutube = prevContent.youtube ?? null;
    const existingAttachments = Array.isArray(prevContent.attachments) ? prevContent.attachments : [];

    const content = await withAiTimeout(`aula ${lessonTitle}`, (signal) =>
      generateLessonText(gateway, courseTitle, moduleTitle, lessonTitle, lessonSummary, opts, signal)
    );
    const html = buildLessonHtml(content);

    // Busca real no YouTube (só se ainda não houver vídeo associado)
    let youtube = existingYoutube;
    let ytMeta: any = null;
    if (!existingYoutube && content.youtube_query) {
      const pick = await youtubeSearchFirstValid(content.youtube_query);
      if (pick) {
        youtube = pick;
        ytMeta = {
          youtube_query: content.youtube_query,
          selected_video_id: pick.videoId,
          selected_at: new Date().toISOString(),
        };
      } else {
        // nenhum vídeo válido — NÃO inventar URL
        ytMeta = { youtube_query: content.youtube_query, selected_video_id: null, selected_at: new Date().toISOString() };
      }
    }

    if (!(await canWriteGenerationResult(lessonId, runId))) return;
    await admin.from("course_lessons").update({
      content: {
        html,
        objective: content.objective,
        theory_html: content.theory_html,
        summary: content.summary,
        key_points: content.key_points,
        references: content.references,
        video_topics: content.video_topics ?? [],
        complementary_materials: content.complementary_materials ?? [],
        youtube: youtube ?? null,
        // Preserva anexos enviados manualmente
        attachments: existingAttachments,
        ai_generated: true,
        ai_pending: false,
        ai_error: null,
        ai_error_at: null,
        ai_raw_response: null,
        ai_failed_phase: null,
        ai_cancelled: false,
        ai_run_id: runId ?? prevContent.ai_run_id ?? null,
        ai_meta: {
          model: opts.model,
          generated_at: new Date().toISOString(),
          options: opts,
          ...(ytMeta ? { youtube: ytMeta } : {}),
        },
      },
    }).eq("id", lessonId);
  } catch (e: any) {
    await markLessonFailedIfCurrent(lessonId, "text", e, runId);
  }
}

async function generateQuizLessonBackground(
  lessonId: string,
  courseTitle: string,
  lessonTitle: string,
  numQuestions: number,
  opts: GenOptions,
  key: string,
  runId?: string,
) {
  const gateway = buildGateway(key);
  const admin = sbAdmin();
  try {
    const q = await withAiTimeout(`quiz ${lessonTitle}`, (signal) =>
      generateQuiz(gateway, courseTitle, lessonTitle, numQuestions, opts, signal)
    );
    const { data: cur } = await admin.from("course_lessons").select("content").eq("id", lessonId).maybeSingle();
    const prev = (cur?.content as any) ?? {};
    if (!(await canWriteGenerationResult(lessonId, runId))) return;
    await admin.from("course_lessons").update({
      content: {
        ...prev,
        questions: q.questions,
        ai_generated: true,
        ai_pending: false,
        ai_error: null, ai_error_at: null, ai_raw_response: null, ai_failed_phase: null,
        ai_cancelled: false,
        ai_run_id: runId ?? prev.ai_run_id ?? null,
        ai_meta: { model: opts.model, generated_at: new Date().toISOString() },
      },
    }).eq("id", lessonId);
  } catch (e: any) {
    await markLessonFailedIfCurrent(lessonId, "quiz", e, runId);
  }
}

async function generateFlipLessonBackground(
  lessonId: string,
  courseTitle: string,
  lessonTitle: string,
  opts: GenOptions,
  key: string,
  runId?: string,
) {
  const gateway = buildGateway(key);
  const admin = sbAdmin();
  try {
    const f = await withAiTimeout(`flashcards ${lessonTitle}`, (signal) =>
      generateFlashcards(gateway, courseTitle, lessonTitle, opts, signal)
    );
    const { data: cur } = await admin.from("course_lessons").select("content").eq("id", lessonId).maybeSingle();
    const prev = (cur?.content as any) ?? {};
    if (!(await canWriteGenerationResult(lessonId, runId))) return;
    await admin.from("course_lessons").update({
      content: {
        ...prev,
        items: f.items,
        ai_generated: true,
        ai_pending: false,
        ai_error: null, ai_error_at: null, ai_raw_response: null, ai_failed_phase: null,
        ai_cancelled: false,
        ai_run_id: runId ?? prev.ai_run_id ?? null,
        ai_meta: { model: opts.model, generated_at: new Date().toISOString() },
      },
    }).eq("id", lessonId);
  } catch (e: any) {
    await markLessonFailedIfCurrent(lessonId, "flip", e, runId);
  }
}

type AiQueueJob = {
  lessonId: string;
  kind: "text" | "quiz" | "flip";
  moduleTitle: string;
  lessonTitle: string;
  lessonSummary: string;
  runId?: string;
};

const isGeneratableKind = (kind: string): kind is AiQueueJob["kind"] =>
  kind === "text" || kind === "quiz" || kind === "flip";

const newRunId = () => crypto.randomUUID();

async function runGenerationJob(job: AiQueueJob, courseTitle: string, opts: GenOptions, key: string) {
  if (job.kind === "text") {
    await generateLessonContentBackground(job.lessonId, courseTitle, job.moduleTitle, job.lessonTitle, job.lessonSummary, opts, key, job.runId);
  } else if (job.kind === "quiz") {
    const numQ = job.moduleTitle === "Avaliação Final" || /avalia/i.test(job.lessonTitle) ? 20 : 10;
    await generateQuizLessonBackground(job.lessonId, courseTitle, job.lessonTitle, numQ, opts, key, job.runId);
  } else {
    await generateFlipLessonBackground(job.lessonId, courseTitle, job.lessonTitle, opts, key, job.runId);
  }
}

async function shouldSkipGenerationJob(job: AiQueueJob) {
  const admin = sbAdmin();
  const { data } = await admin.from("course_lessons").select("content").eq("id", job.lessonId).maybeSingle();
  const content = (data?.content as any) ?? {};
  if (content.ai_cancelled === true) return true;
  if (content.ai_pending !== true) return true;
  if (!job.runId && content.ai_run_id) return true;
  if (job.runId && content.ai_run_id && content.ai_run_id !== job.runId) return true;
  return false;
}

async function canWriteGenerationResult(lessonId: string, runId?: string) {
  const admin = sbAdmin();
  const { data } = await admin.from("course_lessons").select("content").eq("id", lessonId).maybeSingle();
  const content = (data?.content as any) ?? {};
  if (content.ai_cancelled === true) return false;
  if (!runId && content.ai_run_id) return false;
  if (runId && content.ai_run_id && content.ai_run_id !== runId) return false;
  return true;
}

async function markLessonFailedIfCurrent(lessonId: string, phase: string, error: any, runId?: string) {
  const admin = sbAdmin();
  const { data } = await admin.from("course_lessons").select("content").eq("id", lessonId).maybeSingle();
  const content = (data?.content as any) ?? {};
  if (content.ai_cancelled === true) return;
  if (runId && content.ai_run_id && content.ai_run_id !== runId) return;
  if (!runId && content.ai_run_id) return;
  await markLessonFailed(lessonId, phase, error, content);
}

async function processGenerationQueue(jobs: AiQueueJob[], courseTitle: string, opts: GenOptions, key: string) {
  for (let i = 0; i < jobs.length; i += QUEUE_BATCH_SIZE) {
    const batch = jobs.slice(i, i + QUEUE_BATCH_SIZE);
    await Promise.all(batch.map(async (job) => {
      try {
        if (await shouldSkipGenerationJob(job)) return;
        await runGenerationJob(job, courseTitle, opts, key);
      } catch (e) {
        console.error("generation queue job failed", job.lessonId, e);
        await markLessonFailedIfCurrent(job.lessonId, job.kind, e, job.runId);
      }
    }));
    if (i + QUEUE_BATCH_SIZE < jobs.length) await wait(QUEUE_DELAY_MS);
  }
}

async function invokeInternalQueue(jobs: AiQueueJob[], courseTitle: string, opts: GenOptions) {
  if (jobs.length === 0) return;
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-course-ai`;
  const token = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token) throw new Error("missing SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-internal-job-token": token,
    },
    body: JSON.stringify({ action: "process_queue", payload: { jobs, course_title: courseTitle, options: opts } }),
  });
  const body = await response.text();
  if (!response.ok) console.error("internal queue dispatch failed", response.status, body);
}

async function actionProcessQueue(payload: any, key: string, req: Request) {
  const internalToken = req.headers.get("x-internal-job-token");
  if (!internalToken || internalToken !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return json({ error: "unauthorized" }, 401);
  }
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs.filter((j: any) => j?.lessonId && isGeneratableKind(j?.kind)) as AiQueueJob[] : [];
  const courseTitle = payload?.course_title;
  const opts = payload?.options as GenOptions;
  if (!courseTitle || !opts?.model) return json({ error: "payload de fila inválido" }, 400);
  const batch = jobs.slice(0, QUEUE_BATCH_SIZE);
  const remaining = jobs.slice(QUEUE_BATCH_SIZE);
  await processGenerationQueue(batch, courseTitle, opts, key);
  if (remaining.length > 0) {
    keepAlive(wait(QUEUE_DELAY_MS).then(() => invokeInternalQueue(remaining, courseTitle, opts)));
  }
  return json({ ok: true, processed: batch.length, remaining: remaining.length });
}

// ---------- Actions ----------
async function actionFullCourse(payload: any, key: string) {
  const {
    title, category, workload, level, num_modules, lessons_per_module, depth,
    audience, tone, extra_prompt, include_materials, include_image_prompts,
    model,
  } = payload;
  if (!title || !category) return json({ error: "title e category são obrigatórios" }, 400);

  const opts: GenOptions = {
    level, audience, workload, tone: tone || "Didático", depth: depth || "Intermediário",
    include_materials: include_materials !== false,
    model: model || DEFAULT_MODEL,
  };

  const gateway = buildGateway(key);
  const admin = sbAdmin();

  // Step A: skeleton
  const sys = `Você é um designer instrucional brasileiro. Crie estruturas completas de cursos profissionalizantes, claras e progressivas, em português do Brasil.`;
  const prompt = `Crie a estrutura COMPLETA do curso a seguir.
Título: "${title}"
Categoria: ${category}
Carga horária: ${workload || "a definir"}
Nível: ${level}
Profundidade: ${depth}
${audience ? `Público-alvo: ${audience}` : ""}
${tone ? `Tom: ${tone}` : ""}
${extra_prompt ? `Instruções adicionais: ${extra_prompt}` : ""}

Estruture com EXATAMENTE ${num_modules} módulos, cada um com EXATAMENTE ${lessons_per_module} aulas.
- description: descrição curta de 1-2 frases para card.
- long_description: descrição completa (2-3 parágrafos) sobre o curso.
- objectives: 5-8 objetivos de aprendizagem do curso.
- modules[].title: nome do módulo.
- modules[].summary: 1-2 frases descrevendo o módulo.
${include_image_prompts ? `- modules[].image_prompt: prompt de imagem em INGLÊS, MUITO ESPECÍFICO ao tema técnico do módulo (não genérico). Descreva uma cena realista de treinamento profissional que represente literalmente a atividade do módulo. Exemplos de mapeamento por tema:
  • Instalação → "HVAC technician installing a split air conditioner indoor unit on a wall, using drill and level, professional uniform"
  • Higienização → "Professional technician deep-cleaning an air conditioner evaporator coil with foam spray and protective cover, gloves and mask"
  • Gases Refrigerantes → "Refrigeration technician handling R-410A cylinder connected to a manifold gauge set, pressure hoses, workshop bench"
  • PMOC → "Technical inspector filling PMOC maintenance checklist on clipboard next to commercial HVAC unit, measuring instruments visible"
  • Diagnóstico de Defeitos → "HVAC technician using digital multimeter and clamp meter to diagnose an air conditioner circuit board, close-up of hands and instruments"
  • Segurança → "Worker wearing full PPE (helmet, gloves, harness) following safety procedures in industrial training environment"
Identifique o tema central do módulo a partir do título e do summary, e construa uma cena análoga e específica (pessoas, equipamentos, ferramentas, ambiente reais do ofício). NUNCA use prompts genéricos como "people learning" ou "classroom".
SEMPRE termine o prompt com este sufixo exato: ", realistic photography, professional training environment, high detail, corporate style, educational course banner, 16:9 aspect ratio, premium quality, sharp focus, natural lighting, photorealistic, --ar 16:9".` : ""}
- modules[].lessons[].title: título da aula.
- modules[].lessons[].summary: 1 frase descrevendo o que a aula aborda.

Progressão didática: do fundamental ao avançado. Cubra teoria, prática, segurança/normas quando aplicável, e avaliação.`;

  const { object: skeleton } = await withAiTimeout(`estrutura do curso ${title}`, (abortSignal) =>
    generateObject({
      model: gw(gateway, opts.model),
      system: sys,
      prompt,
      schema: SkeletonSchema,
      abortSignal,
    })
  );
  const sk = skeleton as z.infer<typeof SkeletonSchema>;

  // unique slug
  const baseSlug = slugify(title) || "curso-ia";
  let slug = baseSlug;
  for (let i = 1; i < 20; i++) {
    const { data: ex } = await admin.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!ex) break;
    slug = `${baseSlug}-${i + 1}`;
  }

  const { data: course, error: cErr } = await admin.from("courses").insert({
    title, slug, category, duration: workload || null,
    description: sk.description, long_description: sk.long_description,
    active: true, published: false, featured: false, sort_order: 100,
  }).select("id").single();
  if (cErr) return json({ error: cErr.message }, 500);
  const courseId = course.id;

  // create sections + skeleton lessons
  const sectionsToCreate = sk.modules.map((m, i) => ({
    course_id: courseId,
    title: m.title,
    sort_order: (i + 1) * 10,
    ai_meta: include_image_prompts && m.image_prompt
      ? { image_prompt: m.image_prompt, summary: m.summary }
      : { summary: m.summary },
  }));
  const { data: createdSections, error: sErr } = await admin
    .from("course_sections").insert(sectionsToCreate).select("id, title, sort_order");
  if (sErr) return json({ error: sErr.message }, 500);
  // sort matches insertion order
  const sortedSections = [...(createdSections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

  // create skeleton lessons (text + quiz + flip per module)
  const jobs: AiQueueJob[] = [];
  const runId = newRunId();

  for (let mi = 0; mi < sk.modules.length; mi++) {
    const m = sk.modules[mi];
    const sec = sortedSections[mi];
    const lessonRows: any[] = [];
    let order = 10;
    for (const l of m.lessons) {
      lessonRows.push({
        section_id: sec.id, title: l.title, lesson_type: "text", sort_order: order,
        content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, summary: l.summary },
      });
      order += 10;
    }
    lessonRows.push({
      section_id: sec.id, title: `Quiz — ${m.title}`, lesson_type: "quiz", sort_order: order,
      content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, questions: [] },
    });
    order += 10;
    lessonRows.push({
      section_id: sec.id, title: `Flashcards — ${m.title}`, lesson_type: "flip", sort_order: order,
      content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, items: [] },
    });
    const { data: created } = await admin.from("course_lessons").insert(lessonRows).select("id, title, lesson_type, sort_order");
    const sorted = [...(created ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    for (let i = 0; i < m.lessons.length; i++) {
      jobs.push({
        lessonId: sorted[i].id, kind: "text",
        moduleTitle: m.title, lessonTitle: m.lessons[i].title, lessonSummary: m.lessons[i].summary,
        runId,
      });
    }
    jobs.push({
      lessonId: sorted[m.lessons.length].id, kind: "quiz",
      moduleTitle: m.title, lessonTitle: m.title, lessonSummary: m.summary,
      runId,
    });
    jobs.push({
      lessonId: sorted[m.lessons.length + 1].id, kind: "flip",
      moduleTitle: m.title, lessonTitle: m.title, lessonSummary: m.summary,
      runId,
    });
  }

  // Final assessment section
  const finalSortOrder = (sk.modules.length + 1) * 10;
  const { data: finalSec } = await admin.from("course_sections").insert({
    course_id: courseId, title: "Avaliação Final", sort_order: finalSortOrder, ai_meta: {},
  }).select("id").single();
  const { data: finalLesson } = await admin.from("course_lessons").insert({
    section_id: finalSec!.id, title: "Avaliação Final", lesson_type: "quiz", sort_order: 10,
    content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, questions: [] }, passing_score: 70,
  }).select("id").single();
  jobs.push({
    lessonId: finalLesson!.id, kind: "quiz",
    moduleTitle: "Avaliação Final", lessonTitle: `Avaliação Final — ${title}`, lessonSummary: sk.description,
    runId,
  });

  // count totals for client polling
  const totalLessons = jobs.length;

  // Fila em lotes encadeados para evitar rate limit/timeouts do Gemini sem prender uma única execução longa.
  keepAlive(invokeInternalQueue(jobs, title, opts));

  return json({ course_id: courseId, slug, total_lessons: totalLessons });
}

async function actionLesson(payload: any, key: string) {
  const { lesson_id, options } = payload;
  if (!lesson_id) return json({ error: "lesson_id obrigatório" }, 400);
  const admin = sbAdmin();
  const { data: lesson } = await admin.from("course_lessons")
    .select("id, title, lesson_type, section_id, content").eq("id", lesson_id).maybeSingle();
  if (!lesson) return json({ error: "aula não encontrada" }, 404);
  const { data: section } = await admin.from("course_sections")
    .select("id, title, course_id").eq("id", lesson.section_id).single();
  const { data: course } = await admin.from("courses")
    .select("title").eq("id", section!.course_id).single();

  const opts: GenOptions = {
    level: options?.level || "Profissionalizante",
    audience: options?.audience,
    workload: options?.workload,
    tone: options?.tone || "Didático",
    depth: options?.depth || "Intermediário",
    include_materials: options?.include_materials !== false,
    model: options?.model || DEFAULT_MODEL,
  };

  if (!isGeneratableKind(lesson.lesson_type)) {
    return json({ error: "Este tipo de aula não é gerado por IA" }, 400);
  }
  const runId = newRunId();

  await admin.from("course_lessons").update({
    content: { ...(lesson.content ?? {}), ai_pending: true, ai_error: null, ai_error_at: null, ai_raw_response: null, ai_failed_phase: null, ai_cancelled: false, ai_run_id: runId },
  }).eq("id", lesson_id);

  const summary = (lesson.content as any)?.summary ?? lesson.title;
  const job = { lessonId: lesson.id, kind: lesson.lesson_type, moduleTitle: section!.title, lessonTitle: lesson.title, lessonSummary: summary, runId };

  // Synchronous mode: client is driving a sequential per-lesson queue and
  // needs to wait for the actual generation to finish before moving on.
  if (payload?.sync === true) {
    try {
      await processGenerationQueue([job], course!.title, opts, key);
    } catch (e: any) {
      return json({ error: e?.message || String(e) }, 500);
    }
    const { data: after } = await admin.from("course_lessons")
      .select("content").eq("id", lesson.id).maybeSingle();
    const c: any = (after as any)?.content ?? {};
    if (c.ai_error) {
      return json({ error: c.ai_error, phase: c.ai_failed_phase ?? null }, 502);
    }
    return json({ ok: true, sync: true });
  }

  keepAlive(processGenerationQueue([job], course!.title, opts, key));
  return json({ ok: true });
}

async function actionModule(payload: any, key: string) {
  const { section_id, options } = payload;
  if (!section_id) return json({ error: "section_id obrigatório" }, 400);
  const admin = sbAdmin();
  const { data: section } = await admin.from("course_sections")
    .select("id, title, course_id").eq("id", section_id).single();
  const { data: course } = await admin.from("courses")
    .select("title").eq("id", section!.course_id).single();
  const { data: lessons } = await admin.from("course_lessons")
    .select("id, title, lesson_type, content").eq("section_id", section_id).order("sort_order");

  const opts: GenOptions = {
    level: options?.level || "Profissionalizante",
    audience: options?.audience,
    workload: options?.workload,
    tone: options?.tone || "Didático",
    depth: options?.depth || "Intermediário",
    include_materials: options?.include_materials !== false,
    model: options?.model || DEFAULT_MODEL,
  };

  const queueJobs: AiQueueJob[] = (lessons ?? [])
    .filter((l: any) => isGeneratableKind(l.lesson_type))
    .map((l: any) => ({ ...l, aiRunId: newRunId() }))
    .map((l: any) => ({
      lessonId: l.id,
      kind: l.lesson_type,
      moduleTitle: section!.title,
      lessonTitle: l.title,
      lessonSummary: (l.content as any)?.summary ?? l.title,
      runId: l.aiRunId,
    }));

  for (const l of queueJobs) {
    await admin.from("course_lessons").update({
      content: { ...(((lessons ?? []).find((row: any) => row.id === l.lessonId)?.content as any) ?? {}), ai_pending: true, ai_error: null, ai_error_at: null, ai_raw_response: null, ai_failed_phase: null, ai_cancelled: false, ai_run_id: l.runId },
    }).eq("id", l.lessonId);
  }

  keepAlive(invokeInternalQueue(queueJobs, course!.title, opts));

  return json({ ok: true, total: queueJobs.length });
}

// ---------- Entry ----------
async function actionLessonFromImage(payload: any, key: string) {
  const { lesson_id, images, extra_prompt, options } = payload;
  if (!lesson_id) return json({ error: "lesson_id obrigatório" }, 400);
  if (!Array.isArray(images) || images.length === 0) return json({ error: "envie ao menos uma imagem" }, 400);

  const admin = sbAdmin();
  const { data: lesson } = await admin.from("course_lessons")
    .select("id, title, section_id, content").eq("id", lesson_id).maybeSingle();
  if (!lesson) return json({ error: "aula não encontrada" }, 404);
  const { data: section } = await admin.from("course_sections")
    .select("id, title, course_id").eq("id", lesson.section_id).single();
  const { data: course } = await admin.from("courses")
    .select("title").eq("id", section!.course_id).single();

  const opts: GenOptions = {
    level: options?.level || "Profissionalizante",
    audience: options?.audience,
    workload: options?.workload,
    tone: options?.tone || "Didático",
    depth: options?.depth || "Intermediário",
    include_materials: options?.include_materials !== false,
    model: options?.model || DEFAULT_MODEL,
  };

  await admin.from("course_lessons").update({
    content: { ...((lesson.content as any) ?? {}), ai_pending: true },
  }).eq("id", lesson_id);

  keepAlive((async () => {
    const gateway = buildGateway(key);
    try {
      const sys = `Você é um especialista em educação profissionalizante brasileira. Analise as imagens enviadas (prints, manuais técnicos, diagramas, esquemas, fotografias de equipamento) e gere uma AULA COMPLETA em português do Brasil baseada estritamente no que está visível. Para HTML use apenas <p>, <strong>, <em>, <ul>, <li>, <ol>, <h3>, <table>, <tr>, <td>, <th>. Nunca invente normas ou dados que não estejam na imagem.`;
      const textPart = `Curso: "${course!.title}". Módulo: "${section!.title}". Aula atual: "${lesson.title}".
Nível: ${opts.level}. Profundidade: ${opts.depth}. Tom: ${opts.tone}.${opts.audience ? ` Público-alvo: ${opts.audience}.` : ""}
${extra_prompt ? `Instruções do administrador: ${extra_prompt}` : ""}

Com base nas imagens enviadas, gere:
- objective: objetivo de aprendizagem em 1-2 frases.
- theory_html: conteúdo teórico completo em HTML (mínimo 400 palavras), descrevendo e explicando o que aparece nas imagens, com subtítulos h3 e listas.
- summary: resumo em 3-5 linhas.
- key_points: 5 a 8 pontos-chave extraídos das imagens.
- references: 3 a 6 referências reais relacionadas ao tema.
- video_topics: 3 a 5 sugestões de TEMAS de busca no YouTube (apenas termos, NUNCA URLs ou canais inventados).
${opts.include_materials ? "- complementary_materials: até 5 materiais (kind, title, reference, url opcional)." : "- complementary_materials: lista vazia."}`;

      const userContent: any[] = [{ type: "text", text: textPart }];
      for (const img of images) {
        // img can be a data URL ("data:image/png;base64,...") or http(s) URL
        userContent.push({ type: "image", image: img });
      }

      const { object } = await withAiTimeout(`imagem ${lesson.title}`, (abortSignal) =>
        generateObject({
          model: gw(gateway, opts.model),
          system: sys,
          messages: [{ role: "user", content: userContent }],
          schema: LessonTextSchema,
          abortSignal,
        })
      );
      const content = object as z.infer<typeof LessonTextSchema>;
      const html = buildLessonHtml(content);
      const { data: existingImg } = await admin
        .from("course_lessons").select("content").eq("id", lesson_id).maybeSingle();
      const existingYoutube = (existingImg?.content as any)?.youtube ?? null;
      let youtube = existingYoutube;
      let ytMeta: any = null;
      if (!existingYoutube && content.youtube_query) {
        const pick = await youtubeSearchFirstValid(content.youtube_query);
        if (pick) {
          youtube = pick;
          ytMeta = { youtube_query: content.youtube_query, selected_video_id: pick.videoId, selected_at: new Date().toISOString() };
        } else {
          ytMeta = { youtube_query: content.youtube_query, selected_video_id: null, selected_at: new Date().toISOString() };
        }
      }
      await admin.from("course_lessons").update({
        content: {
          html,
          objective: content.objective,
          theory_html: content.theory_html,
          summary: content.summary,
          key_points: content.key_points,
          references: content.references,
          video_topics: content.video_topics ?? [],
          complementary_materials: content.complementary_materials ?? [],
          youtube: youtube ?? null,
          ai_generated: true,
          ai_pending: false,
          ai_meta: {
            model: opts.model, generated_at: new Date().toISOString(),
            source: "image", num_images: images.length,
            ...(ytMeta ? { youtube: ytMeta } : {}),
          },
        },
      }).eq("id", lesson_id);
    } catch (e: any) {
      console.error("lesson_from_image failed:", e?.message ?? e);
      await markLessonFailed(lesson_id, "image", e, lesson.content);
    }
  })());

  return json({ ok: true });
}

// ---------- Reprocess only failed / stale lessons ----------
async function actionReprocessFailures(payload: any, key: string) {
  const { course_id, lesson_ids, options, stale_minutes } = payload ?? {};
  if (!course_id) return json({ error: "course_id obrigatório" }, 400);
  const admin = sbAdmin();
  const released = await resetStalePendingLessons(course_id);

  const { data: course } = await admin.from("courses").select("id, title").eq("id", course_id).maybeSingle();
  if (!course) return json({ error: "curso não encontrado" }, 404);
  const { data: sections } = await admin.from("course_sections")
    .select("id, title").eq("course_id", course_id).order("sort_order");
  const secIds = (sections ?? []).map((s: any) => s.id);
  if (!secIds.length) return json({ ok: true, total: 0, note: "sem seções" });

  const { data: allLessons } = await admin.from("course_lessons")
    .select("id, title, lesson_type, section_id, content, updated_at").in("section_id", secIds);

  const staleMs = typeof stale_minutes === "number" ? stale_minutes * 60_000 : AI_STALE_FAIL_MS;
  const now = Date.now();
  const allowedLessonIds = Array.isArray(lesson_ids) && lesson_ids.length > 0
    ? new Set(lesson_ids.filter((id: any) => typeof id === "string"))
    : null;
  const toRerun = (allLessons ?? []).filter((l: any) => {
    if (allowedLessonIds && !allowedLessonIds.has(l.id)) return false;
    const c = l.content ?? {};
    if (c.ai_error) return true;
    if (c.ai_pending === true) {
      const updated = l.updated_at ? new Date(l.updated_at).getTime() : 0;
      return now - updated > staleMs;
    }
    return false;
  });

  if (toRerun.length === 0) return json({ ok: true, total: 0, released });

  const opts: GenOptions = {
    level: options?.level || "Profissionalizante",
    audience: options?.audience,
    workload: options?.workload,
    tone: options?.tone || "Didático",
    depth: options?.depth || "Intermediário",
    include_materials: options?.include_materials !== false,
    model: options?.model || DEFAULT_MODEL,
  };

  const sectionTitleById = new Map((sections ?? []).map((s: any) => [s.id, s.title]));

  const queueJobs: AiQueueJob[] = toRerun
    .filter((l: any) => isGeneratableKind(l.lesson_type))
    .map((l: any) => ({ ...l, aiRunId: newRunId() }))
    .map((l: any) => ({
      lessonId: l.id,
      kind: l.lesson_type,
      moduleTitle: sectionTitleById.get(l.section_id) ?? "",
      lessonTitle: l.title,
      lessonSummary: (l.content as any)?.summary ?? l.title,
      runId: l.aiRunId,
    }));

  // Mark only generatable failed lessons as pending and clear previous error.
  for (const job of queueJobs) {
    const source = toRerun.find((row: any) => row.id === job.lessonId);
    const prev = (source?.content as any) ?? {};
    await admin.from("course_lessons").update({
      content: {
        ...prev,
        ai_pending: true,
        ai_error: null,
        ai_error_at: null,
        ai_raw_response: null,
        ai_failed_phase: null,
        ai_cancelled: false,
        ai_run_id: job.runId,
      },
    }).eq("id", job.lessonId);
  }

  // Synchronous mode: run inline (used by one-by-one sequential reprocessing
  // from the frontend). Returns only after the job(s) actually finish so the
  // client can surface the real error (timeout / rate limit / parse error).
  if (payload?.sync === true) {
    try {
      await processGenerationQueue(queueJobs, course.title, opts, key);
    } catch (e: any) {
      return json({ error: e?.message || String(e), total: queueJobs.length, released }, 500);
    }
    // Inspect resulting lesson state to report success/failure back.
    const ids = queueJobs.map((j) => j.lessonId);
    const { data: after } = await admin.from("course_lessons")
      .select("id, content").in("id", ids);
    const failures = (after ?? [])
      .filter((l: any) => l.content?.ai_error)
      .map((l: any) => ({ id: l.id, error: l.content.ai_error, phase: l.content.ai_failed_phase }));
    if (failures.length > 0) {
      const msg = failures.map((f) => `${f.phase || "ia"}: ${f.error}`).join(" | ");
      return json({ error: msg, failures, total: queueJobs.length, released }, 502);
    }
    return json({ ok: true, total: queueJobs.length, released, sync: true });
  }

  keepAlive(invokeInternalQueue(queueJobs, course.title, opts));

  return json({ ok: true, total: queueJobs.length, released });
}

async function actionReleaseStalePending(payload: any) {
  const { course_id, force } = payload ?? {};
  if (!course_id) return json({ error: "course_id obrigatório" }, 400);
  const released = await resetStalePendingLessons(course_id, force === true);
  return json({ ok: true, released });
}

async function actionCancelGeneration(payload: any) {
  const { course_id } = payload ?? {};
  if (!course_id) return json({ error: "course_id obrigatório" }, 400);
  const admin = sbAdmin();
  const { data: sections } = await admin.from("course_sections").select("id").eq("course_id", course_id);
  const secIds = (sections ?? []).map((s: any) => s.id);
  if (!secIds.length) return json({ ok: true, cancelled: 0 });
  const { data: lessons } = await admin.from("course_lessons")
    .select("id, content")
    .in("section_id", secIds)
    .filter("content->>ai_pending", "eq", "true");
  let cancelled = 0;
  for (const l of lessons ?? []) {
    const prev = (l.content as any) ?? {};
    await admin.from("course_lessons").update({
      content: {
        ...prev,
        ai_pending: false,
        ai_cancelled: true,
        ai_cancelled_at: new Date().toISOString(),
        ai_error: "CANCELADO: geração interrompida manualmente",
        ai_error_at: new Date().toISOString(),
        ai_raw_response: null,
        ai_failed_phase: "cancelled",
      },
    }).eq("id", l.id);
    cancelled += 1;
  }
  return json({ ok: true, cancelled });
}

// ---------- Import Syllabus ----------
function parseSyllabus(raw: string): { title: string; lessons: string[] }[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const modules: { title: string; lessons: string[] }[] = [];
  let cur: { title: string; lessons: string[] } | null = null;

  const stripBullet = (s: string) =>
    s.replace(/^[-*•·●▪►▶→]+\s*/, "")
     .replace(/^(\d+[\.\)]\s*)+/, "")
     .replace(/^([a-zA-Z][\.\)]\s*)/, "")
     .replace(/^#+\s*/, "")
     .trim();

  const isModule = (s: string) => {
    const t = s.toLowerCase();
    return /^#{1,3}\s/.test(s) ||
      /^m[oó]dulo\b/i.test(s) || /^unidade\b/i.test(s) ||
      /^cap[ií]tulo\b/i.test(s) || /^parte\b/i.test(s) ||
      /^module\b/i.test(t) || /^section\b/i.test(t);
  };

  for (const raw of lines) {
    const line = raw;
    if (isModule(line)) {
      const title = stripBullet(line.replace(/^(m[oó]dulo|unidade|cap[ií]tulo|parte|module|section)\s*\d*\s*[-–:.)]*\s*/i, "")).trim()
        || stripBullet(line);
      cur = { title: title || `Módulo ${modules.length + 1}`, lessons: [] };
      modules.push(cur);
    } else {
      const txt = stripBullet(line.replace(/^aulas?\s*\d*\s*[-–:.)]*\s*/i, "")).trim();
      if (!txt) continue;
      if (!cur) { cur = { title: "Módulo 1", lessons: [] }; modules.push(cur); }
      cur.lessons.push(txt);
    }
  }
  return modules.filter((m) => m.lessons.length > 0);
}

async function actionImportSyllabus(payload: any, key: string) {
  const {
    title, category, workload, level, depth, audience, tone, extra_prompt,
    include_materials, include_image_prompts, model, syllabus,
  } = payload;
  if (!title || !category) return json({ error: "title e category são obrigatórios" }, 400);
  if (!syllabus || typeof syllabus !== "string") return json({ error: "syllabus obrigatório" }, 400);

  const modules = parseSyllabus(syllabus);
  if (!modules.length) return json({ error: "Não foi possível identificar módulos/aulas no texto colado." }, 400);

  const opts: GenOptions = {
    level, audience, workload, tone: tone || "Didático", depth: depth || "Intermediário",
    include_materials: include_materials !== false,
    model: model || DEFAULT_MODEL,
  };

  const admin = sbAdmin();

  // unique slug
  const baseSlug = slugify(title) || "curso-ia";
  let slug = baseSlug;
  for (let i = 1; i < 20; i++) {
    const { data: ex } = await admin.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!ex) break;
    slug = `${baseSlug}-${i + 1}`;
  }

  const shortDesc = `${title} — ${modules.length} módulos, ${modules.reduce((a, m) => a + m.lessons.length, 0)} aulas.`;
  const { data: course, error: cErr } = await admin.from("courses").insert({
    title, slug, category, duration: workload || null,
    description: shortDesc, long_description: extra_prompt || shortDesc,
    active: true, published: false, featured: false, sort_order: 100,
  }).select("id").single();
  if (cErr) return json({ error: cErr.message }, 500);
  const courseId = course.id;

  const sectionsToCreate = modules.map((m, i) => ({
    course_id: courseId, title: m.title, sort_order: (i + 1) * 10,
    ai_meta: { summary: "", imported: true },
  }));
  const { data: createdSections, error: sErr } = await admin
    .from("course_sections").insert(sectionsToCreate).select("id, title, sort_order");
  if (sErr) return json({ error: sErr.message }, 500);
  const sortedSections = [...(createdSections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

  const jobs: AiQueueJob[] = [];
  const runId = newRunId();

  for (let mi = 0; mi < modules.length; mi++) {
    const m = modules[mi];
    const sec = sortedSections[mi];
    const lessonRows: any[] = [];
    let order = 10;
    for (const lt of m.lessons) {
      lessonRows.push({
        section_id: sec.id, title: lt, lesson_type: "text", sort_order: order,
        content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, summary: "" },
      });
      order += 10;
    }
    lessonRows.push({
      section_id: sec.id, title: `Quiz — ${m.title}`, lesson_type: "quiz", sort_order: order,
      content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, questions: [] },
    });
    order += 10;
    lessonRows.push({
      section_id: sec.id, title: `Flashcards — ${m.title}`, lesson_type: "flip", sort_order: order,
      content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, items: [] },
    });
    const { data: created } = await admin.from("course_lessons").insert(lessonRows).select("id, title, lesson_type, sort_order");
    const sorted = [...(created ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    for (let i = 0; i < m.lessons.length; i++) {
      jobs.push({ lessonId: sorted[i].id, kind: "text", moduleTitle: m.title, lessonTitle: m.lessons[i], lessonSummary: "", runId });
    }
    jobs.push({ lessonId: sorted[m.lessons.length].id, kind: "quiz", moduleTitle: m.title, lessonTitle: m.title, lessonSummary: "", runId });
    jobs.push({ lessonId: sorted[m.lessons.length + 1].id, kind: "flip", moduleTitle: m.title, lessonTitle: m.title, lessonSummary: "", runId });
  }

  // Final assessment
  const finalSortOrder = (modules.length + 1) * 10;
  const { data: finalSec } = await admin.from("course_sections").insert({
    course_id: courseId, title: "Avaliação Final", sort_order: finalSortOrder, ai_meta: {},
  }).select("id").single();
  const { data: finalLesson } = await admin.from("course_lessons").insert({
    section_id: finalSec!.id, title: "Avaliação Final", lesson_type: "quiz", sort_order: 10,
    content: { ai_pending: true, ai_run_id: runId, ai_cancelled: false, questions: [] }, passing_score: 70,
  }).select("id").single();
  jobs.push({ lessonId: finalLesson!.id, kind: "quiz", moduleTitle: "Avaliação Final", lessonTitle: `Avaliação Final — ${title}`, lessonSummary: shortDesc, runId });

  const totalLessons = jobs.length;

  keepAlive(invokeInternalQueue(jobs, title, opts));

  return json({ course_id: courseId, slug, total_lessons: totalLessons, modules: modules.length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, payload } = body ?? {};
    if (action === "process_queue") {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return json({ error: "missing LOVABLE_API_KEY" }, 500);
      return await actionProcessQueue(payload ?? {}, key, req);
    }

    const user = await checkAuth(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "missing LOVABLE_API_KEY" }, 500);
    if (!action) return json({ error: "action obrigatório" }, 400);

    if (action === "full_course") return await actionFullCourse(payload ?? {}, key);
    if (action === "lesson") return await actionLesson(payload ?? {}, key);
    if (action === "module") return await actionModule(payload ?? {}, key);
    if (action === "lesson_from_image") return await actionLessonFromImage(payload ?? {}, key);
    if (action === "release_stale_pending") return await actionReleaseStalePending(payload ?? {});
    if (action === "cancel_generation") return await actionCancelGeneration(payload ?? {});
    if (action === "reprocess_failures") return await actionReprocessFailures(payload ?? {}, key);
    if (action === "import_syllabus") return await actionImportSyllabus(payload ?? {}, key);
    return json({ error: "action desconhecida" }, 400);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    console.error("generate-course-ai error:", msg);
    return json({ error: msg }, status);
  }
});