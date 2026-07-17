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
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) return json({ error: "Token inválido" }, 401);
    const { data: hasPerm } = await admin.rpc("has_permission", {
      _user_id: userData.user.id, _permission: "manage_users",
    });
    if (!hasPerm) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const {
      mode, // "existing" | "new_seller"
      user_id, code: codeIn, commission_pct = 10, pix_key,
      full_name, email, whatsapp, cpf, city, state, instagram, experience, motivation,
    } = body as Record<string, any>;

    let targetUserId = user_id as string | undefined;
    let username: string | null = null;
    let password: string | null = null;

    if (mode === "new_seller") {
      if (!full_name || !email || !whatsapp) return json({ error: "Nome, e-mail e WhatsApp são obrigatórios" }, 400);

      const { data: nextU } = await admin.rpc("next_username");
      username = nextU as string;
      const loginEmail = `${username}@multplick.local`;
      password = genPassword();

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: loginEmail, password, email_confirm: true,
        user_metadata: { full_name, username },
      });
      if (cErr || !created.user) return json({ error: cErr?.message || "Falha ao criar usuário" }, 400);
      targetUserId = created.user.id;

      await admin.from("profiles").upsert({
        user_id: targetUserId, username, display_name: full_name,
        email, phone1: whatsapp, cpf: cpf || null, city: city || null,
        state: state ? String(state).toUpperCase().slice(0, 2) : null,
        notes: [motivation && `Motivação: ${motivation}`, experience && `Experiência: ${experience}`, instagram && `IG: ${instagram}`].filter(Boolean).join("\n") || null,
      }, { onConflict: "user_id" });
    } else {
      if (!targetUserId) return json({ error: "user_id obrigatório" }, 400);
    }

    // Código único
    let code = (codeIn || "").toString().toUpperCase().trim().slice(0, 30) || genCode(full_name || "VEND");
    for (let i = 0; i < 6; i++) {
      const { data: exists } = await admin.from("affiliates").select("id").eq("code", code).maybeSingle();
      if (!exists) break;
      code = genCode(full_name || "VEND");
    }

    const { data: aff, error: aErr } = await admin.from("affiliates").insert({
      user_id: targetUserId, code,
      commission_pct: Number(commission_pct) || 10,
      pix_key: pix_key || null, status: "ativo",
    }).select().single();
    if (aErr) return json({ error: aErr.message }, 400);

    return json({ ok: true, affiliate: aff, code, username, password });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});