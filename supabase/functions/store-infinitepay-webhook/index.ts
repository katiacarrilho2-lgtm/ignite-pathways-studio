import { createClient } from "npm:@supabase/supabase-js@2";

// Loja Multplick — webhook da InfinitePay (e verificação no retorno do cliente).
// Nunca confia no conteúdo recebido: sempre confirma na API oficial (payment_check)
// antes de marcar como pago. Confirmação duplicada é ignorada pelo banco.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let p: Record<string, any> = {};
  try { p = await req.json(); } catch { return json({ ok: false }, 400); }
  const orderId = String(p.order_nsu ?? "");
  const nsu = p.transaction_nsu ? String(p.transaction_nsu) : null;
  const slug = p.invoice_slug ?? p.slug ?? null;
  const log = (resultado: string, extra: unknown = null) =>
    sb.from("store_webhook_logs").insert({ provider: "infinitepay", order_nsu: orderId, resultado, payload: { recebido: p, extra } });

  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !nsu || !slug) { await log("ignorado_dados_incompletos"); return json({ ok: false }, 400); }

  const { data: o } = await sb.from("store_orders").select("id,status,total_cents").eq("id", orderId).maybeSingle();
  if (!o) { await log("pedido_inexistente"); return json({ ok: false }, 400); }
  if (o.status === "pago") { await log("duplicado"); return json({ ok: true, status: "pago" }); }

  const { data: st } = await sb.from("store_settings").select("infinitepay_handle").eq("id", 1).maybeSingle();
  const handle = (Deno.env.get("INFINITEPAY_HANDLE") || st?.infinitepay_handle || "").replace(/^\$/, "").trim();
  if (!handle) { await log("nao_configurado"); return json({ ok: false }, 503); }

  const r = await fetch("https://api.infinitepay.io/invoices/public/checkout/payment_check", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, order_nsu: orderId, transaction_nsu: nsu, slug }),
  });
  const chk = await r.json().catch(() => ({}));
  if (!r.ok || !chk?.success || !chk?.paid) { await log("nao_confirmado", chk); return json({ ok: true, status: o.status }); }

  const valor = Number(chk.paid_amount ?? chk.amount ?? p.paid_amount ?? 0);
  const { data: res, error } = await sb.rpc("store_confirmar_pagamento", {
    _order_id: orderId, _nsu: nsu, _valor: valor, _parcelas: Number(chk.installments ?? p.installments ?? 1),
    _metodo: String(chk.capture_method ?? p.capture_method ?? "infinitepay"), _receipt: p.receipt_url ?? null, _raw: { webhook: p, check: chk },
  });
  await log(error ? "erro_confirmacao" : (res as any)?.ok ? "pago" : "recusado", error?.message ?? res);
  if (error) return json({ ok: false }, 500);
  return json({ ok: true, status: (res as any)?.ok ? "pago" : o.status });
});
