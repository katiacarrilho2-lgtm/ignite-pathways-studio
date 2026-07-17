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
  contratante_razao?: string;
  contratante_tipo?: string;
  contratada_razao?: string;
  objeto?: string;
  valor_texto?: string;
  forma_pagamento?: string;
  comissao?: string;
  territorio?: string;
  exclusividade?: string;
  prazo_meses?: number;
  observacoes?: string;
  base_clauses?: Array<{ titulo: string; texto: string }>;
}

const SYSTEM = `Você é um(a) advogado(a) brasileiro(a) sênior, especialista em contratos comerciais e em educação corporativa, atuando pela Multplick.
Sua tarefa é gerar/revisar a minuta de um contrato em português brasileiro, com linguagem jurídica formal, clara e objetiva.
Considere a legislação brasileira aplicável (Código Civil, Lei 4.886/65 para representação comercial, CDC, LGPD e, quando público, Lei 14.133/2021).
Sempre retorne APENAS JSON válido seguindo exatamente o schema:
{
  "objeto": "string (1-2 parágrafos descrevendo o objeto do contrato adaptado ao caso)",
  "clausulas": [
    { "titulo": "TÍTULO DA CLÁUSULA EM CAIXA ALTA", "texto": "Texto da cláusula em 1 a 3 parágrafos." }
  ]
}
Diretrizes:
- Gere entre 8 e 14 cláusulas, contemplando: objeto, escopo/obrigações, vigência, valor/pagamento, propriedade intelectual, confidencialidade/LGPD, rescisão, multa, foro e demais cláusulas pertinentes ao tipo.
- Se "base_clauses" for fornecido, use-as como ponto de partida e refine, mantendo a mesma ordem geral.
- NÃO insira marcação Markdown nem texto fora do JSON.`;

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

    const baseTxt = (body.base_clauses || []).map((c, i) => `${i + 1}. ${c.titulo}\n${c.texto}`).join("\n\n");

    const userPrompt = `Tipo de contrato: ${body.tipo}
Contratada: ${body.contratada_razao || "Multplick Educação Profissional Ltda."}
Contratante: ${body.contratante_razao || "—"} (${body.contratante_tipo || "—"})
Objeto pretendido: ${body.objeto || "—"}
Valor: ${body.valor_texto || "a combinar"}
Forma de pagamento: ${body.forma_pagamento || "—"}
Comissão: ${body.comissao || "—"}
Território: ${body.territorio || "—"}
Exclusividade: ${body.exclusividade || "—"}
Prazo (meses): ${body.prazo_meses ?? "—"}
Observações do negociador: ${body.observacoes || "—"}

Cláusulas base (refine/melhore mantendo a coerência):
${baseTxt || "(nenhuma — gere do zero, adequadas ao tipo)"}

Gere o JSON conforme o schema do sistema.`;

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

    const clausulas = Array.isArray(parsed.clausulas)
      ? parsed.clausulas
          .filter((c: any) => c && typeof c === "object")
          .map((c: any) => ({
            titulo: typeof c.titulo === "string" ? c.titulo : "",
            texto: typeof c.texto === "string" ? c.texto : "",
          }))
          .filter((c: any) => c.titulo || c.texto)
      : [];

    return new Response(JSON.stringify({
      objeto: typeof parsed.objeto === "string" ? parsed.objeto : "",
      clausulas,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});