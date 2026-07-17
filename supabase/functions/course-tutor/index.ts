import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText } from "npm:ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, course, lessonTitle } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), { status: 400, headers: corsHeaders });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "missing LOVABLE_API_KEY" }), { status: 500, headers: corsHeaders });

    const courseTitle = course?.title ?? "este curso";
    const courseCategory = course?.category ?? "";
    const SYSTEM = `Você é o Professor Multplick, um tutor virtual da Multplick Formação Profissional especializado em "${courseTitle}"${courseCategory ? ` (categoria: ${courseCategory})` : ""}. ${lessonTitle ? `O aluno está estudando agora a aula: "${lessonTitle}". ` : ""}

Sua missão é tirar dúvidas do aluno sobre o conteúdo deste curso, como faria um professor presencial. Seja claro, didático, paciente e use exemplos práticos do dia a dia da área.

Regras:
- Responda SEMPRE em português do Brasil.
- Foque APENAS em assuntos relacionados ao curso "${courseTitle}" e à área técnica correspondente.
- Se a pergunta fugir totalmente do tema, redirecione gentilmente: "Essa pergunta está fora do escopo deste curso. Posso te ajudar com algum tópico de ${courseTitle}?"
- Use listas, exemplos e analogias quando ajudar o entendimento.
- Mantenha respostas objetivas (até 4 parágrafos curtos), exceto quando o aluno pedir explicação detalhada.
- Nunca invente normas, números ou procedimentos. Se não tiver certeza, diga e oriente o aluno a consultar o material oficial ou o suporte da Multplick.
- Nunca dê respostas prontas de provas/quiz — em vez disso, explique o conceito para o aluno aprender.`;

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      messages: messages.slice(-16).map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
    });

    return new Response(JSON.stringify({ reply: text }), { headers: corsHeaders });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
  }
});