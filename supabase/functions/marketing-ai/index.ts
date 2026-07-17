import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText } from "npm:ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SYSTEM_MARKETING = `Você é a copywriter sênior da Multplick Formação Profissional. Escreva em português do Brasil, com tom profissional, direto, persuasivo e moderno — adequado a redes sociais, anúncios, e-mails e landing pages de cursos técnicos, NRs, EJA, graduações e o programa Seja Licenciado Multplick. Foque em benefícios concretos, gatilhos mentais éticos (autoridade, prova social, escassez real), CTAs claros e linguagem brasileira natural. Nunca invente preços. Use emojis com moderação quando o canal pedir.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "missing LOVABLE_API_KEY" }), { status: 500, headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body?.action ?? "text");

    if (action === "image") {
      const prompt = String(body?.prompt ?? "").trim();
      const size = String(body?.size ?? "1024x1024");
      const model = String(body?.model ?? "google/gemini-2.5-flash-image");
      if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: corsHeaders });

      const isOpenAI = model.startsWith("openai/");
      const payload = isOpenAI
        ? { model, prompt, size, n: 1 }
        : { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] };

      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) return new Response(JSON.stringify({ error: txt }), { status: res.status, headers: corsHeaders });
      const data = JSON.parse(txt);
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) return new Response(JSON.stringify({ error: "no image returned" }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), { headers: corsHeaders });
    }

    // text or chat
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const model = String(body?.model ?? "google/gemini-3-flash-preview");
    const system = String(body?.system ?? SYSTEM_MARKETING);

    if (action === "chat") {
      const messages = Array.isArray(body?.messages) ? body.messages : [];
      const { text } = await generateText({
        model: gateway(model),
        system,
        messages: messages.slice(-20).map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
      });
      return new Response(JSON.stringify({ reply: text }), { headers: corsHeaders });
    }

    // action === "text"
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: corsHeaders });
    const { text } = await generateText({
      model: gateway(model),
      system,
      prompt,
    });
    return new Response(JSON.stringify({ text }), { headers: corsHeaders });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
  }
});