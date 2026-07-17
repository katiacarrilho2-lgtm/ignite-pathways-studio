import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) return json({ error: "Token inválido" }, 401);

    // Só quem gerencia usuários OU cursos pode personificar
    const [{ data: hasUsers }, { data: hasCourses }] = await Promise.all([
      admin.rpc("has_permission", { _user_id: userData.user.id, _permission: "manage_users" }),
      admin.rpc("has_permission", { _user_id: userData.user.id, _permission: "manage_courses" }),
    ]);
    if (!hasUsers && !hasCourses) return json({ error: "Sem permissão" }, 403);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: "user_id obrigatório" }, 400);

    // Nunca deixar personificar outro master (evita escalada)
    const { data: targetIsMaster } = await admin.rpc("is_master", { _user_id: user_id });
    if (targetIsMaster && userData.user.id !== user_id) {
      return json({ error: "Não é permitido personificar um master" }, 403);
    }

    const { data: target, error: tErr } = await admin.auth.admin.getUserById(user_id);
    if (tErr || !target.user?.email) return json({ error: "Usuário alvo não encontrado" }, 404);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
    });
    if (linkErr || !link.properties?.hashed_token) {
      return json({ error: linkErr?.message || "Falha ao gerar link" }, 400);
    }

    return json({
      hashed_token: link.properties.hashed_token,
      email: target.user.email,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});