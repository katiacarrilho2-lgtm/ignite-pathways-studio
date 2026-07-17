import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook Mercado Pago — recebe notificações e atualiza parcelas
// Endpoint público: /functions/v1/mp-webhook

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
    let topic = url.searchParams.get("type") || url.searchParams.get("topic");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        paymentId = paymentId ?? body?.data?.id ?? body?.id ?? null;
        topic = topic ?? body?.type ?? body?.action ?? null;
      } catch { /* body vazio ou não json */ }
    }

    if (!paymentId) {
      // MP às vezes envia ping vazio pra testar — responde 200
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (topic && !String(topic).includes("payment")) {
      return new Response("ignored", { status: 200, headers: corsHeaders });
    }

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token) return new Response("no token", { status: 500, headers: corsHeaders });

    // Busca pagamento no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!mpRes.ok) {
      const t = await mpRes.text();
      console.error("MP fetch payment failed", mpRes.status, t);
      return new Response("mp error", { status: 200, headers: corsHeaders });
    }
    const payment = await mpRes.json();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const status = payment.status; // approved, pending, rejected, cancelled, refunded
    const externalRef: string | null = payment.external_reference ?? null;
    const amountCents = Math.round((payment.transaction_amount ?? 0) * 100);
    const method = payment.payment_method_id ?? "unknown";

    console.log("MP webhook", { paymentId, status, externalRef, method, amountCents });

    // Atualiza parcela quando aprovado
    if (externalRef?.startsWith("installment:") && status === "approved") {
      const instId = externalRef.replace("installment:", "");
      const { data: inst } = await supabase.from("installments")
        .select("id, enrollment_id, numero, valor_cents, paid_at").eq("id", instId).maybeSingle();
      if (inst && !inst.paid_at) {
        await supabase.from("installments").update({
          status: "pago",
          paid_at: new Date().toISOString(),
          forma_pagamento: method,
          observacoes: `MP payment ${paymentId}`,
        }).eq("id", instId);

        // Registra em finance_entries se existir
        await supabase.from("finance_entries").insert({
          kind: "receita",
          name: `Parcela ${inst.numero} — ${method} — MP ${paymentId}`,
          amount_cents: inst.valor_cents,
          paid_at: new Date().toISOString(),
          notes: `mercado_pago:${paymentId}`,
        }).then(() => {}, (e) => console.error("finance_entries insert failed", e));
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("mp-webhook error", e);
    // Sempre 200 pro MP não ficar reenviando; loga erro
    return new Response("error logged", { status: 200, headers: corsHeaders });
  }
});