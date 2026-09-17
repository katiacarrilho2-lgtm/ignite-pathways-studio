import { createClient } from "npm:@supabase/supabase-js@2";

// Cursos Livres — webhook do Mercado Pago.
// Valida a assinatura (quando configurada), consulta o pagamento real na API oficial,
// confere valor e pedido e delega a decisão ao banco (função livre_registrar_pagamento).
const ok = (t = "ok") => new Response(t, { status: 200 });

const MAP: Record<string, string> = {
  approved: "aprovado",
  authorized: "aprovado",
  pending: "pendente",
  in_process: "pendente",
  in_mediation: "pendente",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "estornado",
  charged_back: "estornado",
};

async function assinaturaValida(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!secret) return true; // sem segredo configurado, seguimos só com a consulta na API oficial
  const sig = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id") ?? "";
  if (!sig) return false;
  const parts = Object.fromEntries(
    sig.split(",").map((p) => p.split("=").map((s) => s.trim())).filter((p) => p.length === 2) as [string, string][],
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok();
  try {
    const url = new URL(req.url);
    let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    let topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        paymentId = paymentId ?? body?.data?.id ?? body?.id ?? null;
        topic = topic ?? body?.type ?? body?.action ?? null;
      } catch { /* ping vazio */ }
    }

    if (!paymentId) return ok();
    if (topic && !String(topic).includes("payment")) return ok("ignored");

    if (!(await assinaturaValida(req, String(paymentId)))) {
      console.error("Assinatura inválida no webhook", paymentId);
      return new Response("invalid signature", { status: 401 });
    }

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token) return ok("sem token");

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!mpRes.ok) {
      console.error("Falha ao consultar pagamento", mpRes.status, await mpRes.text());
      return ok("mp error");
    }
    const payment = await mpRes.json();

    const externalRef: string = payment.external_reference ?? "";
    if (!externalRef.startsWith("livre:")) return ok("nao e pedido livre");
    const orderId = externalRef.slice("livre:".length);

    const status = MAP[payment.status as string] ?? "pendente";
    const valorCents = Math.round((payment.transaction_amount ?? 0) * 100);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("livre_registrar_pagamento", {
      _order_id: orderId,
      _provider: "mercado_pago",
      _external_id: String(payment.id),
      _status: status,
      _valor_cents: valorCents,
      _metodo: payment.payment_method_id ?? null,
      _preference_id: payment.order?.id ? String(payment.order.id) : null,
      _raw: { id: payment.id, status: payment.status, status_detail: payment.status_detail, amount: payment.transaction_amount },
    });
    if (error) console.error("livre_registrar_pagamento", error);
    else console.log("pagamento processado", orderId, status, data);

    return ok();
  } catch (e) {
    console.error("livre-mp-webhook", e);
    return ok("error logged");
  }
});
