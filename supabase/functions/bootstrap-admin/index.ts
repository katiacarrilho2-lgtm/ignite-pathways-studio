import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const email = "001@multplick.local";
  const password = "787878";
  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing?.users?.find((u: any) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    user = data.user!;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }
  await admin.from("user_roles").upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id,role" });
  return new Response(JSON.stringify({ ok: true, user_id: user.id, username: "001", password }), {
    headers: { "Content-Type": "application/json" },
  });
});
