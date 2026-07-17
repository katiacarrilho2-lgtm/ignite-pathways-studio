import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `t-${Date.now()}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "missing LOVABLE_API_KEY" }), { status: 500, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const {
      title, category = "geral", audience = "ambos",
      base = "", num_lessons = 6, tone = "Didático",
      depth = "Intermediário", model = "google/gemini-2.5-flash",
      cover_url = null, meet_url = null,
      files = [],
    } = body ?? {};
    if (!title?.trim()) return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: corsHeaders });

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const SYSTEM = `Você é especialista em criar treinamentos corporativos para a Multplick (formação profissional). Responda SEMPRE em português do Brasil. Use APENAS as informações da BASE fornecida pelo administrador como fonte primária — se a base for limitada, complemente com boas práticas reconhecidas da área, mas nunca invente normas, números ou citações legais. Crie conteúdo prático, claro e aplicável.`;

    const prompt = `Crie um treinamento completo intitulado "${title}".
Categoria: ${category}. Público-alvo: ${audience}. Tom: ${tone}. Profundidade: ${depth}.
Analise TODO o material anexado (PDFs, imagens, textos) e a BASE abaixo. Organize o conteúdo em ordem didática lógica e gere exatamente ${num_lessons} aulas que cubram o material de forma estruturada.

BASE DE CONTEÚDO (fonte primária — use isto como referência principal):
"""
${base?.trim() || "(sem base textual — use os anexos como referência principal)"}
"""

Para cada aula:
- title: curto e direto (até 70 caracteres)
- summary: 1-2 frases explicando o objetivo da aula
- content: roteiro/conteúdo em Markdown rico (300-600 palavras), com subtítulos, listas, exemplos práticos e, se aplicável, um checklist final. NÃO inclua links externos inventados.

Também escreva uma "description" geral do treinamento (2-4 frases).`;

    const userContent: any[] = [{ type: "text", text: prompt }];
    for (const f of (files as any[]).slice(0, 10)) {
      if (!f?.data_base64 || !f?.mime) continue;
      if (String(f.mime).startsWith("image/")) {
        userContent.push({ type: "image", image: `data:${f.mime};base64,${f.data_base64}` });
      } else {
        userContent.push({ type: "file", data: f.data_base64, mediaType: f.mime, filename: f.name || "arquivo" });
      }
    }

    const result = await generateText({
      model: gateway(model),
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
      maxOutputTokens: 12000,
      output: Output.object({
        schema: z.object({
          description: z.string(),
          lessons: z.array(z.object({
            title: z.string(),
            summary: z.string(),
            content: z.string(),
          })).min(1),
        }),
      }),
    });

    if ((result as any).finishReason === "length") {
      throw new Error("A IA gerou um conteúdo muito longo e a resposta foi cortada. Tente reduzir o número de aulas ou o tamanho dos anexos.");
    }

    const output: any = (result as any).output;
    if (!output?.lessons?.length) {
      throw new Error("IA não retornou aulas estruturadas. Tente novamente.");
    }
    const desc = output.description ?? "";
    const lessons = output.lessons.slice(0, Math.max(1, num_lessons));

    // pick a unique slug
    let slug = slugify(title);
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await admin.from("trainings").select("id").eq("slug", slug).maybeSingle();
      if (!exists) break;
      slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: training, error: tErr } = await admin.from("trainings").insert({
      title: title.trim(),
      slug,
      description: desc,
      category, audience,
      status: "rascunho",
      cover_url, meet_url,
    }).select("*").single();
    if (tErr) throw tErr;

    const rows = lessons.map((l, idx) => ({
      training_id: training.id,
      title: l.title,
      description: `**${l.summary}**\n\n${l.content}`,
      video_kind: "text",
      video_url: null,
      position: idx,
      attachments: [],
    }));
    const { error: lErr } = await admin.from("training_lessons").insert(rows);
    if (lErr) throw lErr;

    return new Response(JSON.stringify({ training_id: training.id, slug, lessons: rows.length }), { headers: corsHeaders });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error("generate-training-ai failed", {
      message: msg,
      name: e?.name,
      stack: e?.stack,
      details: e?.details,
      hint: e?.hint,
      code: e?.code,
    });
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
  }
});