import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Body {
  tipo: string;
  modalidade?: string;
  razao_social?: string;
  cliente_tipo?: string;
  cidade?: string;
  uf?: string;
  colaboradores?: number;
  cursos?: string;
  observacoes?: string;
  investimento_texto?: string;
}

const SYSTEM = `Você é um especialista em educação corporativa e parcerias comerciais da Multplick.
Gere conteúdo profissional, persuasivo e objetivo em português brasileiro para uma proposta comercial.
Sempre retorne APENAS JSON válido seguindo exatamente o schema:
{
  "apresentacao": "string (2-4 parágrafos curtos sobre a Multplick adaptados ao perfil do cliente)",
  "diagnostico": "string (1-2 parágrafos identificando dores e oportunidades)",
  "beneficios": ["string", "..." (6-8 itens objetivos)],
  "cursos_recomendados": ["string", "..." (5-10 nomes de cursos)],
  "cronograma": ["string", "..." (4-6 etapas com período sugerido)]
}
Não inclua markdown, comentários nem texto fora do JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = (await req.json()) as Body;

    const userPrompt = `Tipo da proposta: ${body.tipo}
Modalidade: ${body.modalidade || "não definida"}
Cliente: ${body.razao_social || "—"} (${body.cliente_tipo || "—"})
Local: ${body.cidade || "—"}${body.uf ? "/" + body.uf : ""}
Colaboradores: ${body.colaboradores || "—"}
Cursos/áreas mencionados: ${body.cursos || "—"}
Investimento informado: ${body.investimento_texto || "a combinar"}
Observações do vendedor: ${body.observacoes || "—"}

Gere o JSON conforme o schema do sistema, adaptando linguagem, exemplos e cursos ao perfil acima.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `Falha na IA: ${t.slice(0, 300)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiRes.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      apresentacao: typeof parsed.apresentacao === "string" ? parsed.apresentacao : "",
      diagnostico: typeof parsed.diagnostico === "string" ? parsed.diagnostico : "",
      beneficios: Array.isArray(parsed.beneficios) ? parsed.beneficios.filter((x: any) => typeof x === "string") : [],
      cursos_recomendados: Array.isArray(parsed.cursos_recomendados) ? parsed.cursos_recomendados.filter((x: any) => typeof x === "string") : [],
      cronograma: Array.isArray(parsed.cronograma) ? parsed.cronograma.filter((x: any) => typeof x === "string") : [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});