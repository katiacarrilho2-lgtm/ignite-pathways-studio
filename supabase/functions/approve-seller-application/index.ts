import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function genCode(name: string) {
  const base = (name || "VEND").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "VEND";
  const n = Math.floor(10 + Math.random() * 90);
  return `${base}${n}`;
}
function genPassword() {
  return Math.random().toString(36).slice(-4) + Math.floor(1000 + Math.random() * 9000);
}

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
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Token inválido" }, 401);
    const { data: hasPerm } = await admin.rpc("has_permission", {
      _user_id: userData.user.id, _permission: "manage_users",
    });
    if (!hasPerm) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const { application_id, commission_pct = 10, notes, make_member = true } = body as Record<string, any>;
    if (!application_id) return json({ error: "application_id obrigatório" }, 400);

    const { data: app, error: appErr } = await admin
      .from("seller_applications").select("*").eq("id", application_id).maybeSingle();
    if (appErr || !app) return json({ error: "Candidatura não encontrada" }, 404);
    if (app.status === "aprovado") return json({ error: "Já aprovada" }, 400);

    // Gera username numérico via RPC e cria usuário de login
    const { data: nextU } = await admin.rpc("next_username");
    const username = nextU as string;
    const loginEmail = `${username}@multplick.local`;
    const password = genPassword();

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: loginEmail, password, email_confirm: true,
      user_metadata: { full_name: app.full_name, username },
    });
    if (cErr || !created.user) return json({ error: cErr?.message || "Falha ao criar usuário" }, 400);
    const newUserId = created.user.id;

    // Profile com dados de contato
    await admin.from("profiles").upsert({
      user_id: newUserId,
      username,
      display_name: app.full_name,
      email: app.email,
      phone1: app.whatsapp,
      cpf: app.cpf,
      city: app.city,
      state: app.state,
      role_key: "vendedor",
      notes: [app.motivation && `Motivação: ${app.motivation}`, app.experience && `Experiência: ${app.experience}`, app.instagram && `IG: ${app.instagram}`].filter(Boolean).join("\n") || null,
    }, { onConflict: "user_id" });

    // Torna o aprovado um MEMBRO (papel viewer + permissão de leads) — apenas se solicitado
    if (make_member) {
      await admin.from("user_roles").insert({ user_id: newUserId, role: "viewer" });
      await admin.from("user_permissions").insert({ user_id: newUserId, permission: "manage_leads" });
    }

    // Cria afiliado com código único
    let code = genCode(app.full_name);
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await admin.from("affiliates").select("id").eq("code", code).maybeSingle();
      if (!exists) break;
      code = genCode(app.full_name);
    }
    const { data: aff, error: aErr } = await admin.from("affiliates").insert({
      user_id: newUserId, code, commission_pct, pix_key: app.pix_key || null, status: "ativo",
    }).select().single();
    if (aErr) return json({ error: aErr.message }, 400);

    // Atualiza candidatura
    await admin.from("seller_applications").update({
      status: "aprovado",
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
      approved_user_id: newUserId,
      approved_affiliate_id: aff.id,
      review_notes: notes || null,
    }).eq("id", application_id);

    return json({
      ok: true, username, password, code, is_member: !!make_member,
      login_url: `${new URL(req.url).origin.replace("functions", "app")}`,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});