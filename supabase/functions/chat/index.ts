import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText } from "npm:ai";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SYSTEM = `Você é a assistente virtual da Multplick Formação Profissional, uma empresa brasileira especializada em capacitação industrial, NRs (Normas Regulamentadoras), cursos técnicos, graduações, pós-graduações, EJA, treinamentos in company e o programa "Seja Licenciado Multplick".

Responda sempre em português do Brasil, com tom profissional, acolhedor e direto. Foque em:
- Tirar dúvidas sobre cursos (categorias, duração, modalidade)
- Explicar NRs (NR-10, NR-33, NR-35 etc.)
- Explicar o programa "Seja Licenciado" (revendedor autorizado)
- Orientar empresas sobre treinamentos in company
- Direcionar para o catálogo oficial: https://licenciado.laeducacao.com.br/catalogo-la
- Direcionar para o WhatsApp comercial: (18) 99684-1902 — https://wa.me/5518996841902

Se a pergunta for fora do escopo da Multplick, responda gentilmente e direcione o usuário ao WhatsApp. Nunca invente preços. Mantenha respostas curtas (até 4 parágrafos curtos) e use listas quando útil.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { messages, contact } = body ?? {};
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), { status: 400, headers: corsHeaders });
    }

    // Captura de lead: se o front enviou contact OU se detectamos email/telefone na última msg do usuário
    try {
      const supaUrl = Deno.env.get("SUPABASE_URL");
      const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supaUrl && supaKey) {
        const lastUser = [...messages].reverse().find((m: any) => m?.role === "user");
        const text = String(lastUser?.content ?? "");
        const emailRx = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
        const phoneRx = /(\+?55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/;
        const detectedEmail = contact?.email || text.match(emailRx)?.[0] || null;
        const detectedPhone = contact?.phone || text.match(phoneRx)?.[0] || null;
        const name = contact?.name || "Visitante do chatbot";
        if (detectedEmail || detectedPhone) {
          const supa = createClient(supaUrl, supaKey);
          const transcript = messages.slice(-10)
            .map((m: any) => `${m.role === "user" ? "USUÁRIO" : "IA"}: ${String(m.content ?? "").slice(0, 500)}`)
            .join("\n");
          await supa.from("leads").insert({
            name: String(name).slice(0, 120),
            email: detectedEmail ? String(detectedEmail).slice(0, 200) : null,
            phone: detectedPhone ? String(detectedPhone).slice(0, 40) : null,
            message: transcript.slice(0, 2000),
            source: "chatbot",
          });
        }
      }
    } catch (_e) { /* não bloqueia a resposta */ }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "missing LOVABLE_API_KEY" }), { status: 500, headers: corsHeaders });

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      messages: messages.slice(-12).map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
    });

    return new Response(JSON.stringify({ reply: text }), { headers: corsHeaders });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
  }
});
