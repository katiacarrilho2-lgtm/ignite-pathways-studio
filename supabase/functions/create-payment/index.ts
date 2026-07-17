import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Etapa C6.2 — Multi-Conta blindado
// Conta raiz Multplick Oficial (fallback universal, alinhado ao backfill C4.x/C5.x)
const ROOT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000001";
const resolveAccountId = (id?: string | null) => id ?? ROOT_ACCOUNT_ID;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { course_id, installment_id, payer, coupon_code, description } = await req.json();
    if (!course_id && !installment_id) return json({ error: "course_id ou installment_id obrigatório" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token) return json({ error: "MP token ausente" }, 500);
    const origin = req.headers.get("origin") ?? "https://multplick.com.br";

    // ===== Fluxo A: pagamento de PARCELA (área do aluno) =====
    if (installment_id) {
      const { data: inst, error: iErr } = await supabase
        .from("installments")
        .select("id, numero, valor_cents, valor_final_cents, status, enrollment_id")
        .eq("id", installment_id)
        .maybeSingle();
      if (iErr || !inst) return json({ error: "Parcela não encontrada" }, 404);
      if (inst.status === "pago") return json({ error: "Parcela já foi paga" }, 400);
      const cents = inst.valor_final_cents ?? inst.valor_cents ?? 0;
      if (cents <= 0) return json({ error: "Parcela sem valor configurado" }, 400);

      let courseTitle = "Parcela";
      if (inst.enrollment_id) {
        const { data: enr } = await supabase.from("enrollments").select("course_id").eq("id", inst.enrollment_id).maybeSingle();
        if (enr?.course_id) {
          const { data: c } = await supabase.from("courses").select("title,slug").eq("id", enr.course_id).maybeSingle();
          if (c?.title) courseTitle = c.title;
        }
      }

      const title = `Parcela ${inst.numero} — ${courseTitle}`;
      const body = {
        items: [{
          id: inst.id,
          title,
          description: (description ?? title).slice(0, 250),
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number((cents / 100).toFixed(2)),
        }],
        payer: payer?.email ? { email: payer.email, name: payer.name } : undefined,
        back_urls: {
          success: `${origin}/aluno/financeiro?status=sucesso`,
          failure: `${origin}/aluno/financeiro?status=falha`,
          pending: `${origin}/aluno/financeiro?status=pendente`,
        },
        auto_return: "approved",
        statement_descriptor: "MULTPLICK",
        external_reference: `installment:${inst.id}`,
      };
      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const pref = await mpRes.json();
      if (!mpRes.ok) return json({ error: pref?.message ?? "Erro Mercado Pago", details: pref }, 500);
      return json({
        init_point: pref.init_point,
        sandbox_init_point: pref.sandbox_init_point,
        id: pref.id,
        final_cents: cents,
      });
    }

    // ===== Fluxo B: compra de curso (checkout público) =====
    const { data: course, error } = await supabase.from("courses").select("id,title,description,price_cents,slug").eq("id", course_id).eq("active", true).maybeSingle();
    if (error || !course) return json({ error: "Curso não encontrado" }, 404);
    if (!course.price_cents || course.price_cents <= 0) return json({ error: "Curso sem preço configurado" }, 400);

    // Apply coupon if provided
    let finalCents = course.price_cents;
    let appliedCoupon: any = null;
    if (coupon_code) {
      const { data: coupon } = await supabase.from("coupons").select("*").eq("code", coupon_code.toUpperCase()).eq("active", true).maybeSingle();
      if (!coupon) return json({ error: "Cupom inválido" }, 400);
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return json({ error: "Cupom expirado" }, 400);
      if (coupon.max_uses && coupon.uses >= coupon.max_uses) return json({ error: "Cupom esgotado" }, 400);
      if (coupon.course_id && coupon.course_id !== course.id) return json({ error: "Cupom não vale para este curso" }, 400);
      if (coupon.discount_type === "percent") {
        finalCents = Math.max(100, Math.round(course.price_cents * (1 - coupon.discount_value / 100)));
      } else {
        finalCents = Math.max(100, course.price_cents - coupon.discount_value * 100);
      }
      appliedCoupon = coupon;
    }

    const body = {
      items: [{
        id: course.id,
        title: appliedCoupon ? `${course.title} (cupom ${appliedCoupon.code})` : course.title,
        description: (course.description ?? "").slice(0, 250) || course.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number((finalCents / 100).toFixed(2)),
      }],
      payer: payer?.email ? { email: payer.email, name: payer.name } : undefined,
      back_urls: {
        success: `${origin}/pagamento/sucesso?curso=${course.slug}`,
        failure: `${origin}/pagamento/falha?curso=${course.slug}`,
        pending: `${origin}/pagamento/pendente?curso=${course.slug}`,
      },
      auto_return: "approved",
      statement_descriptor: "MULTPLICK",
      external_reference: course.id,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const pref = await mpRes.json();
    if (!mpRes.ok) return json({ error: pref?.message ?? "Erro Mercado Pago", details: pref }, 500);

    if (appliedCoupon) {
      await supabase.from("coupons").update({ uses: appliedCoupon.uses + 1 }).eq("id", appliedCoupon.id);
      await supabase.from("coupon_redemptions").insert({
        coupon_id: appliedCoupon.id,
        course_id: course.id,
        email: payer?.email ?? null,
        amount_paid_cents: finalCents,
        external_reference: pref.id,
        // C6.2: deriva account_id do cupom-pai; fallback para conta raiz
        account_id: resolveAccountId(appliedCoupon.account_id),
      });
    }

    // log lead
    if (payer?.email || payer?.name) {
      await supabase.from("leads").insert({
        name: payer?.name ?? "Checkout MP",
        email: payer?.email ?? null,
        phone: payer?.phone ?? null,
        message: `Iniciou checkout: ${course.title}${appliedCoupon ? ` (cupom ${appliedCoupon.code})` : ""}`,
        source: "mercado_pago",
      });
    }

    return json({
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
      id: pref.id,
      final_cents: finalCents,
      original_cents: course.price_cents,
    });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}