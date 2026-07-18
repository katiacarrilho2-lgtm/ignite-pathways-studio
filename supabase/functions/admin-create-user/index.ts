import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const {
      password, full_name, role, username: requestedUsername,
      email: emailInput, phone1, phone2, cpf, rg, cep, street, address_number,
      neighborhood, city, state, birth_date, responsible_name, responsible_rg,
      responsible_cpf, sex, polo, notes, avatar_url,
    } = body as Record<string, any>;

    if (!password || password.length < 4) return json({ error: "Senha inválida" }, 400);

    // Bootstrap mode: if no super_admin exists yet, allow open creation
    const { count: superAdminCount } = await admin
      .from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    const isBootstrap = (superAdminCount ?? 0) === 0;

    if (!isBootstrap) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Não autenticado" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData.user) return json({ error: "Token inválido" }, 401);
      const { data: hasPerm } = await admin.rpc("has_permission", {
        _user_id: userData.user.id, _permission: "manage_users",
      });
      if (!hasPerm) return json({ error: "Sem permissão" }, 403);
    }

    // Resolve username
    let username = requestedUsername;
    if (!username) {
      const { data: next, error: nextErr } = await admin.rpc("next_username");
      if (nextErr || !next) {
        // Fallback: derive next numeric username from profiles
        const { data: rows } = await admin
          .from("profiles")
          .select("username")
          .not("username", "is", null);
        const max = (rows ?? []).reduce((acc: number, r: any) => {
          const n = parseInt(String(r.username).replace(/\D/g, ""), 10);
          return Number.isFinite(n) && n > acc ? n : acc;
        }, 0);
        username = String(max + 1).padStart(3, "0");
      } else {
        username = next as string;
      }
    }
    if (!/^\d{1,6}$/.test(username)) return json({ error: "Usuário deve ser numérico" }, 400);

    const loginEmail = `${username}@multplick.local`;

    const { data: created, error } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? `Usuário ${username}`, username },
    });
    if (error) return json({ error: error.message }, 400);

    // Assign role for non-bootstrap (bootstrap user already becomes super_admin via trigger)
    if (!isBootstrap && role && ["admin", "editor", "viewer", "certificadora"].includes(role)) {
      await admin.from("user_roles").insert({ user_id: created.user!.id, role });
    }

    // Upsert detailed profile fields
    await admin.from("profiles").upsert({
      user_id: created.user!.id,
      username,
      display_name: full_name ?? `Usuário ${username}`,
      email: emailInput || null,
      avatar_url: avatar_url || null,
      phone1: phone1 || null,
      phone2: phone2 || null,
      cpf: cpf || null,
      rg: rg || null,
      cep: cep || null,
      street: street || null,
      address_number: address_number || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      birth_date: birth_date || null,
      responsible_name: responsible_name || null,
      responsible_rg: responsible_rg || null,
      responsible_cpf: responsible_cpf || null,
      sex: sex || null,
      polo: polo || null,
      notes: notes || null,
    }, { onConflict: "user_id" });

    return json({ username, user_id: created.user!.id, bootstrap: isBootstrap });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});