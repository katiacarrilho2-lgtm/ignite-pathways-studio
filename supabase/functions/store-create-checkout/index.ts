import { createClient } from "npm:@supabase/supabase-js@2";

// Loja Multplick — gera o link de pagamento da InfinitePay para um pedido já criado no banco.
// O valor vem SEMPRE do pedido gravado (calculado no servidor), nunca do navegador.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { order_id, token, origin } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: o } = await sb.from("store_orders").select("*").eq("id", order_id).eq("token", token).maybeSingle();
    if (!o) return json({ error: "Pedido não encontrado" }, 404);
    if (o.status !== "aguardando_pagamento") return json({ error: "Pedido não está aguardando pagamento", status: o.status }, 400);

    const { data: st } = await sb.from("store_settings").select("infinitepay_handle").eq("id", 1).maybeSingle();
    const handle = (Deno.env.get("INFINITEPAY_HANDLE") || st?.infinitepay_handle || "").replace(/^\$/, "").trim();
    if (!handle) return json({ error: "Pagamento ainda não configurado", code: "not_configured" }, 503);

    if (o.checkout_url) return json({ url: o.checkout_url });

    const { data: itens } = await sb.from("store_order_items").select("nome, preco_cents, quantidade").eq("order_id", o.id);
    // Desconto de cupom aplicado proporcionalmente em um único item consolidado quando houver
    const items = o.desconto_cents > 0
      ? [{ quantity: 1, price: o.total_cents, description: `Pedido ${o.numero}` }]
      : (itens ?? []).map((i) => ({ quantity: i.quantidade, price: i.preco_cents, description: i.nome.slice(0, 120) }));

    const base = (origin && /^https?:\/\//.test(origin)) ? origin : "https://multplick.live";
    const body = {
      handle,
      order_nsu: o.id,
      redirect_url: `${base}/loja/confirmacao?pedido=${o.id}&t=${o.token}`,
      webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/store-infinitepay-webhook`,
      items,
      customer: { name: o.nome, email: o.email, phone_number: `+55${o.whatsapp.replace(/^55/, "")}` },
    };
    const r = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.url) {
      await sb.from("store_webhook_logs").insert({ provider: "infinitepay", order_nsu: o.id, resultado: "erro_checkout", payload: data });
      return json({ error: "Não foi possível gerar o pagamento. Tente novamente." }, 502);
    }
    await sb.from("store_orders").update({ checkout_url: data.url, infinitepay_slug: data.slug ?? null }).eq("id", o.id);
    return json({ url: data.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
