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
      password, full_name, role, username: requestedUsername, username_prefix,
      email: emailInput, phone1, phone2, cpf, rg, cep, street, address_number,
      neighborhood, city, state, birth_date, responsible_name, responsible_rg,
      responsible_cpf, sex, polo, notes, avatar_url,
      account_id: requestedAccountId,
    } = body as Record<string, any>;

    if (!password || password.length < 4) return json({ error: "Senha inválida" }, 400);

    // Bootstrap mode: if no super_admin exists yet, allow open creation
    const { count: superAdminCount } = await admin
      .from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    const isBootstrap = (superAdminCount ?? 0) === 0;

    const ROOT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000001";
    // Conta de destino do novo usuário. NUNCA é escolhida livremente pelo cliente:
    // - Network Master pode direcionar para qualquer unidade existente;
    // - qualquer outro operador só cria usuário DENTRO da própria unidade.
    let targetAccountId = ROOT_ACCOUNT_ID;

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

      const { data: isNetworkMaster } = await admin.rpc("is_network_master", { _uid: userData.user.id });
      const { data: callerHome } = await admin.rpc("user_home_account_id", { _uid: userData.user.id });
      const callerAccount = callerHome || ROOT_ACCOUNT_ID;

      if (isNetworkMaster) {
        if (requestedAccountId && requestedAccountId !== callerAccount) {
          const { data: unit } = await admin
            .from("contas_comerciais").select("id").eq("id", requestedAccountId).maybeSingle();
          if (!unit) return json({ error: "Unidade inválida" }, 400);
          targetAccountId = unit.id;
        } else {
          targetAccountId = callerAccount;
        }
      } else {
        // Licenciado / staff de Polo: sempre a própria unidade, ignorando o que veio do cliente
        targetAccountId = callerAccount;
      }
    }


    const prefix = String(username_prefix ?? "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3);

    const normalizeUsername = (value: unknown) => {
      const raw = String(value ?? "").trim().toUpperCase();
      return prefix ? raw.replace(new RegExp(`^${prefix}`), "").replace(/\D/g, "") : raw.replace(/\D/g, "");
    };
    const compose = (num: string) => prefix ? `${prefix}${Number(num)}` : String(num).padStart(3, "0");

    const nextForPrefix = async () => {
      const { data: rows } = await admin.from("profiles").select("username").not("username", "is", null);
      const re = new RegExp(`^${prefix}(\\d+)$`, "i");
      const max = (rows ?? []).reduce((acc: number, r: any) => {
        const m = re.exec(String(r.username ?? "").trim());
        const n = m ? parseInt(m[1], 10) : NaN;
        return Number.isFinite(n) && n > acc ? n : acc;
      }, 0);
      return String(max + 1);
    };

    const getNextUsername = async (after?: string) => {
      if (prefix) {
        if (after) return String(Number(after) + 1);
        return await nextForPrefix();
      }
      if (after) return String(Number(after) + 1).padStart(3, "0");

      const { data: next, error: nextErr } = await admin.rpc("next_username");
      if (!nextErr && next) return String(next);

      const { data: rows } = await admin
        .from("profiles")
        .select("username")
        .not("username", "is", null);
      const max = (rows ?? []).reduce((acc: number, r: any) => {
        const n = parseInt(String(r.username ?? "").replace(/\D/g, ""), 10);
        return Number.isFinite(n) && n > acc ? n : acc;
      }, 0);
      return String(max + 1).padStart(3, "0");
    };

    let seq = normalizeUsername(requestedUsername);
    if (requestedUsername && !/^\d{1,6}$/.test(seq)) return json({ error: "Usuário deve ser numérico" }, 400);
    let username = seq ? compose(seq) : "";

    let created: any = null;
    let lastError = "";
    for (let attempt = 0; attempt < 50; attempt++) {
      if (!username) {
        seq = await getNextUsername(attempt === 0 ? undefined : seq);
        username = compose(seq);
      }

      const loginEmail = `${username.toLowerCase()}@multplick.local`;
      const result = await admin.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? `Usuário ${username}`, username },
      });

      if (!result.error) {
        created = result.data;
        break;
      }

      lastError = result.error.message;
      const alreadyExists = lastError.toLowerCase().includes("already") || lastError.toLowerCase().includes("registered");
      if (requestedUsername || !alreadyExists) return json({ error: lastError }, 400);
      seq = String(Number(seq || 0) + 1);
      username = compose(seq);
    }

    if (!created?.user?.id) return json({ error: lastError || "Não foi possível criar o usuário" }, 400);

    const loginEmail = `${username.toLowerCase()}@multplick.local`;

    // Assign role for non-bootstrap (bootstrap user already becomes super_admin via trigger)
    if (!isBootstrap && role && ["admin", "editor", "viewer", "certificadora"].includes(role)) {
      await admin.from("user_roles").insert({ user_id: created.user.id, role });
    }

    // Basic login profile used by admin lists and auth hooks
    // account_id vem SEMPRE do backend (nunca do payload do cliente).
    await admin.from("profiles").upsert({
      user_id: created.user.id,
      username,
      display_name: full_name ?? `Usuário ${username}`,
      email: loginEmail,
      avatar_url: avatar_url || null,
      account_id: targetAccountId,
    }, { onConflict: "user_id" });


    // Detailed student data lives in student_profiles in the restored schema
    await admin.from("student_profiles").upsert({
      user_id: created.user.id,
      full_name: full_name ?? `Usuário ${username}`,
      contact_email: emailInput || null,
      phone1: phone1 || null,
      phone2: phone2 || null,
      cpf: cpf || null,
      rg: rg || null,
      cep: cep || null,
      rua: street || null,
      numero: address_number || null,
      bairro: neighborhood || null,
      cidade: city || null,
      estado: state || null,
      birth_date: birth_date || null,
      responsavel_nome: responsible_name || null,
      responsavel_rg: responsible_rg || null,
      responsavel_cpf: responsible_cpf || null,
      sexo: sex || null,
      polo: polo || null,
      observacoes: notes || null,
      foto_url: avatar_url || null,
    }, { onConflict: "user_id" });

    return json({ username, user_id: created.user.id, bootstrap: isBootstrap, account_id: targetAccountId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});