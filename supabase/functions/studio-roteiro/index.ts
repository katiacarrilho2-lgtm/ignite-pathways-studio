import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { streamText } from "npm:ai";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const strip = (h: string) =>
  String(h ?? "").replace(/<\/(p|h\d|li|div)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { lessonTitle, courseTitle, content } = await req.json();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "Configuração de IA ausente" }), { status: 500, headers: cors });
    const text = strip(content?.html ?? content?.body ?? "").slice(0, 24000);
    if (!text) return new Response(JSON.stringify({ error: "Aula sem conteúdo de texto" }), { status: 400, headers: cors });

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `Você é roteirista de videoaulas técnicas da Multplick. Transforme a aula em cenas de 30 a 50 segundos (total ~5 min) SEM inventar informações: use apenas o conteúdo fornecido e preserve todos os dados técnicos. Responda SOMENTE com JSON válido: {"cenas":[{"titulo":string,"duracao_seg":number,"texto_tela":string,"narracao":string,"visual":string,"alerta":string}]}. Primeira cena = abertura/gancho, última = recapitulação. Narração em português do Brasil, natural e didática.`,
      prompt: `Curso: ${courseTitle}\nAula: ${lessonTitle}\nObjetivo: ${content?.objective ?? ""}\n\nConteúdo:\n${text}`,
    });
    let out = "";
    for await (const d of result.textStream) out += d;
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Resposta da IA sem roteiro");
    const json = JSON.parse(m[0]);
    return new Response(JSON.stringify(json), { headers: cors });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: cors });
  }
});
