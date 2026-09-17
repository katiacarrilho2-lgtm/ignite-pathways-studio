import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cursos Livres — cria a preferência de pagamento no Mercado Pago para um pedido existente.
// O valor NUNCA vem do navegador: é lido do pedido gravado no banco.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token) return json({ error: "Pagamento ainda não configurado." }, 503);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await asUser.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id obrigatório" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await admin
      .from("livre_orders")
      .select("id, user_id, course_id, numero_pedido, valor_final_cents, status, email, nome")
      .eq("id", order_id)
      .maybeSingle();

    if (!order || order.user_id !== user.id) return json({ error: "Pedido não encontrado" }, 404);
    if (order.status === "pago") return json({ error: "Este pedido já foi pago." }, 400);
    if (order.status !== "aguardando") return json({ error: "Pedido indisponível para pagamento." }, 400);
    if (!order.valor_final_cents || order.valor_final_cents <= 0) return json({ error: "Pedido sem valor válido." }, 400);

    const { data: course } = await admin.from("courses").select("title, slug").eq("id", order.course_id).maybeSingle();
    const origin = req.headers.get("origin") ?? "https://multplick.live";

    const body = {
      items: [{
        id: order.id,
        title: course?.title ?? "Curso livre Multplick",
        description: `Pedido ${order.numero_pedido ?? ""}`.trim().slice(0, 250),
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number((order.valor_final_cents / 100).toFixed(2)),
      }],
      payer: order.email ? { email: order.email, name: order.nome ?? undefined } : undefined,
      back_urls: {
        success: `${origin}/aluno/compras?pedido=${order.numero_pedido ?? ""}&status=sucesso`,
        failure: `${origin}/aluno/compras?pedido=${order.numero_pedido ?? ""}&status=falha`,
        pending: `${origin}/aluno/compras?pedido=${order.numero_pedido ?? ""}&status=pendente`,
      },
      auto_return: "approved",
      statement_descriptor: "MULTPLICK",
      external_reference: `livre:${order.id}`,
      notification_url: `${url}/functions/v1/livre-mp-webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const pref = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP preference error", pref);
      return json({ error: "Não foi possível iniciar o pagamento." }, 502);
    }

    await admin.from("livre_order_payments").insert({
      account_id: (await admin.from("livre_orders").select("account_id").eq("id", order.id).maybeSingle()).data?.account_id,
      order_id: order.id,
      provider: "mercado_pago",
      preference_id: pref.id,
      valor_cents: order.valor_final_cents,
      status: "pendente",
      raw: { preference: pref.id },
    });

    return json({ init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point, preference_id: pref.id });
  } catch (e) {
    console.error("livre-create-payment", e);
    return json({ error: "Erro inesperado ao iniciar o pagamento." }, 500);
  }
});
