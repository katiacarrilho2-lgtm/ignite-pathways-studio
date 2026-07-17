import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) return json({ error: "Token inválido" }, 401);
    const { data: hasPerm } = await admin.rpc("has_permission", { _user_id: userData.user.id, _permission: "manage_users" });
    const { data: hasCourse } = await admin.rpc("has_permission", { _user_id: userData.user.id, _permission: "manage_courses" });
    if (!hasPerm && !hasCourse) return json({ error: "Sem permissão" }, 403);

    const { user_id, password } = await req.json();
    const cleanPassword = String(password ?? "").trim();
    if (!user_id || !cleanPassword || cleanPassword.length < 4) return json({ error: "Parâmetros inválidos" }, 400);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("username")
      .eq("user_id", user_id)
      .maybeSingle();
    if (profileError) return json({ error: profileError.message }, 400);

    const username = String(profile?.username ?? "").replace(/\D/g, "").padStart(3, "0");
    const loginEmail = username ? `${username}@multplick.local` : undefined;

    const { error } = await admin.auth.admin.updateUserById(user_id, {
      password: cleanPassword,
      ...(loginEmail ? { email: loginEmail, email_confirm: true, user_metadata: { username } } : {}),
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, username: username || null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});