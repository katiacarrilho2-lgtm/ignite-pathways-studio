import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Gera boleto PRONTO (com linha digitável e PDF) via Mercado Pago /v1/payments.
// Como o admin fornece todos os dados do pagador, não precisamos do Checkout Pro.
// Body: { installment_id?, course_id?, amount_cents?, description?, due_date?, payer: { name, email, cpf, address? } }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { installment_id, course_id, amount_cents: amountIn, description: descIn, payer, due_date: dueDateIn } = body ?? {};

    if (!payer?.name || !payer?.email || !payer?.cpf) {
      return json({ error: "Nome, e-mail e CPF do aluno são obrigatórios." }, 400);
    }
    const cpfDigits = String(payer.cpf).replace(/\D/g, "");
    if (cpfDigits.length !== 11) return json({ error: "CPF inválido" }, 400);
    const emailStr = String(payer.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return json({ error: "E-mail do aluno inválido." }, 400);
    }
    const addr = payer.address ?? {};
    const zip = String(addr.zip_code ?? "").replace(/\D/g, "");
    const federalUnit = normalizeFederalUnit(addr.federal_unit);
    if (zip.length !== 8 || !addr.street_name || !addr.street_number || !addr.neighborhood || !addr.city || !federalUnit) {
      return json({ error: "Endereço do aluno incompleto: CEP, rua, bairro, cidade e UF são obrigatórios para gerar boleto." }, 400);
    }

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token) return json({ error: "MP token ausente" }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let amount = amountIn ?? 0;
    let description = descIn ?? "Pagamento Multplick";
    let externalRef: string | null = null;

    let installmentDueDate: string | null = null;

    if (installment_id) {
      const { data: inst } = await supabase.from("installments").select("id, numero, valor_cents, vencimento, enrollment_id").eq("id", installment_id).maybeSingle();
      if (!inst) return json({ error: "Parcela não encontrada" }, 404);
      amount = inst.valor_cents;
      description = `Parcela ${inst.numero} - Multplick`;
      externalRef = `installment:${inst.id}`;
      installmentDueDate = inst.vencimento ?? null;
    } else if (course_id) {
      const { data: course } = await supabase.from("courses").select("id, title, price_cents").eq("id", course_id).maybeSingle();
      if (!course) return json({ error: "Curso não encontrado" }, 404);
      amount = course.price_cents ?? 0;
      description = course.title;
      externalRef = `course:${course.id}`;
    }

    if (!amount || amount < 100) return json({ error: "Valor inválido" }, 400);

    const [firstName, ...rest] = String(payer.name).trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    // Vencimento: usa o informado pela tela; se não vier, usa o vencimento salvo na parcela.
    // Evita new Date(string) para não trocar mês/dia por ambiguidade ou fuso horário.
    const parsedDueDate = parseDueDate(dueDateIn) ?? parseDueDate(installmentDueDate) ?? fallbackDueDate();
    if (!parsedDueDate) return json({ error: "Data de vencimento inválida" }, 400);
    const expiration = `${parsedDueDate}T23:59:00.000-03:00`;

    const streetNumberRaw = String(addr.street_number ?? "").trim();
    const streetNumber = streetNumberRaw.replace(/\D/g, "") || "S/N";

    const paymentBody: Record<string, unknown> = {
      transaction_amount: Number((amount / 100).toFixed(2)),
      description,
      payment_method_id: "bolbradesco",
      date_of_expiration: expiration,
      external_reference: externalRef,
      statement_descriptor: "MULTPLICK",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      payer: {
        email: emailStr,
        first_name: firstName,
        last_name: lastName,
        identification: { type: "CPF", number: cpfDigits },
        address: {
          zip_code: zip,
          street_name: cleanText(addr.street_name),
          street_number: streetNumber,
          neighborhood: cleanText(addr.neighborhood),
          city: cleanText(addr.city),
          federal_unit: federalUnit,
        },
      },
    };

    const idemKey = externalRef ? `mp-boleto-${externalRef}-${Date.now()}` : crypto.randomUUID();
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idemKey,
      },
      body: JSON.stringify(paymentBody),
    });
    const pay = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP payment error", mpRes.status, JSON.stringify(pay));
      const rawMsg = pay?.message || pay?.cause?.[0]?.description || "Erro Mercado Pago";
      const code = pay?.cause?.[0]?.code;
      let msg = rawMsg;
      if (code === 7522 || /expiration date can not be greater than 29 days/i.test(rawMsg)) {
        const maxDate = new Date();
        maxDate.setUTCDate(maxDate.getUTCDate() + 29);
        const maxStr = maxDate.toISOString().slice(0, 10).split("-").reverse().join("/");
        msg = `O Mercado Pago só permite boleto com vencimento em até 29 dias (máx: ${maxStr}). Para parcelas com vencimento mais distante, aguarde a data se aproximar antes de gerar o boleto.`;
      }
      return json({ error: msg, details: pay }, 500);
    }

    const td = pay?.transaction_details ?? {};
    const barcode = pay?.barcode?.content ?? null;

    return json({
      id: pay.id,
      pdf_url: td.external_resource_url ?? null,
      digitable_line: td.digitable_line ?? barcode,
      barcode,
      due_date: parsedDueDate,
      date_of_expiration: pay.date_of_expiration ?? expiration,
      amount_cents: amount,
      status: pay.status ?? "pending",
    });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function parseDueDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (isoDate) return validDate(+isoDate[1], +isoDate[2], +isoDate[3]);

  const brDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (brDate) {
    const year = +brDate[3] < 100 ? 2000 + +brDate[3] : +brDate[3];
    return validDate(year, +brDate[2], +brDate[1]);
  }

  return null;
}

function validDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 2020 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fallbackDueDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

function cleanText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeFederalUnit(value: unknown) {
  const raw = cleanText(value);
  const noAccent = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const states: Record<string, string> = {
    AC: "AC", ACRE: "AC",
    AL: "AL", ALAGOAS: "AL",
    AP: "AP", AMAPA: "AP",
    AM: "AM", AMAZONAS: "AM",
    BA: "BA", BAHIA: "BA",
    CE: "CE", CEARA: "CE",
    DF: "DF", DISTRITO_FEDERAL: "DF", "DISTRITO FEDERAL": "DF",
    ES: "ES", ESPIRITO_SANTO: "ES", "ESPIRITO SANTO": "ES",
    GO: "GO", GOIAS: "GO",
    MA: "MA", MARANHAO: "MA",
    MT: "MT", MATO_GROSSO: "MT", "MATO GROSSO": "MT",
    MS: "MS", MATO_GROSSO_DO_SUL: "MS", "MATO GROSSO DO SUL": "MS",
    MG: "MG", MINAS_GERAIS: "MG", "MINAS GERAIS": "MG",
    PA: "PA", PARA: "PA",
    PB: "PB", PARAIBA: "PB",
    PR: "PR", PARANA: "PR",
    PE: "PE", PERNAMBUCO: "PE",
    PI: "PI", PIAUI: "PI",
    RJ: "RJ", RIO_DE_JANEIRO: "RJ", "RIO DE JANEIRO": "RJ",
    RN: "RN", RIO_GRANDE_DO_NORTE: "RN", "RIO GRANDE DO NORTE": "RN",
    RS: "RS", RIO_GRANDE_DO_SUL: "RS", "RIO GRANDE DO SUL": "RS",
    RO: "RO", RONDONIA: "RO",
    RR: "RR", RORAIMA: "RR",
    SC: "SC", SANTA_CATARINA: "SC", "SANTA CATARINA": "SC",
    SP: "SP", SAO_PAULO: "SP", "SAO PAULO": "SP",
    SE: "SE", SERGIPE: "SE",
    TO: "TO", TOCANTINS: "TO",
  };
  return states[noAccent] ?? states[noAccent.replace(/\s+/g, "_")] ?? null;
}