import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";
const GATEWAY = "https://ai.gateway.lovable.dev";

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
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: perms } = await admin.from("user_permissions")
    .select("permission").eq("user_id", user.id).eq("permission", "manage_courses");
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "super_admin");
  if ((perms ?? []).length === 0 && (roles ?? []).length === 0) return null;
  return user;
}

function buildPrompt(raw: string) {
  return [
    "Ilustração educacional profissional para material didático técnico brasileiro.",
    `Tema da aula: ${raw}.`,
    "Estilo: fotografia realista, iluminação clara e natural, ambiente de trabalho real,",
    "composição limpa e organizada, foco no equipamento/procedimento descrito, cores sóbrias.",
    "Sem texto, sem letras, sem números, sem logotipos, sem marcas d'água, sem colagens.",
    "Enquadramento horizontal, adequado para o topo de uma aula online.",
  ].join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const user = await checkAuth(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { prompt?: string; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Requisição inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = (body.prompt ?? "").toString().trim();
  if (!raw) {
    return new Response(JSON.stringify({ error: "Descreva a imagem desejada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stream = body.stream !== false;
  const upstream = await fetch(`${GATEWAY}/v1/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: buildPrompt(raw),
      size: "1536x1024",
      ...(stream ? { stream: true, partial_images: 1 } : {}),
    }),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-cache",
    },
  });
});
