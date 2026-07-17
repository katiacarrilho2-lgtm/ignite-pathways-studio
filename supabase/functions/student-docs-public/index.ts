import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const DOC_TYPES = [
  "rg", "cpf", "reservista", "comprovante_pagamento", "comprovante_residencia",
  "historico_escolar", "foto_3x4", "prova_escrita", "anexo_extra",
  "diploma_certificado", "historico_tecnico", "titulo_eleitor", "quitacao_eleitoral",
];

const REQUIRED_DOCS = [
  "diploma_certificado", "historico_tecnico", "rg", "cpf",
  "titulo_eleitor", "quitacao_eleitoral", "reservista", "comprovante_residencia",
];

async function maybeNotifyCertifier(userId: string, studentName: string | null, studentEmail: string | null, forCertification: boolean) {
  try {
    if (!forCertification) return;
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("full_name, contact_email, curso_escolhido, enrollment_form_submitted_at, certifier_notified_at")
      .eq("user_id", userId).maybeSingle();
    if (!profile?.enrollment_form_submitted_at) return;
    if (profile.certifier_notified_at) return;

    const { data: docs } = await supabase
      .from("student_documents").select("doc_type").eq("user_id", userId);
    const sent = new Set((docs ?? []).map((d: any) => d.doc_type));
    if (REQUIRED_DOCS.some(d => !sent.has(d))) return;

    const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "certificadora");
    const { data: permRows } = await supabase.from("user_permissions").select("user_id").eq("permission", "manage_certification");
    const ids = Array.from(new Set([
      ...(roleRows ?? []).map((r: any) => r.user_id),
      ...(permRows ?? []).map((r: any) => r.user_id),
    ]));
    if (ids.length === 0) return;

    const { data: recipients } = await supabase.from("profiles").select("email").in("user_id", ids);
    const emails = Array.from(new Set((recipients ?? []).map((p: any) => p.email).filter(Boolean)));
    if (emails.length === 0) return;

    const panelUrl = "https://multplick-licenciado.lovable.app/admin/certificacao";
    const submittedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const name = profile.full_name || studentName || "Aluno";
    const email = profile.contact_email || studentEmail || null;
    const course = profile.curso_escolhido || null;

    await Promise.all(emails.map((to: string) =>
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "certifier-new-submission",
          recipientEmail: to,
          idempotencyKey: `cert-notify-${userId}`,
          templateData: { studentName: name, studentEmail: email, course, panelUrl, submittedAt },
        },
      }).catch((e: any) => console.error("notify certifier failed", to, e))
    ));

    await supabase.from("student_profiles")
      .update({ certifier_notified_at: new Date().toISOString() })
      .eq("user_id", userId);
  } catch (e) {
    console.error("maybeNotifyCertifier error", e);
  }
}

const FORM_FIELDS: Record<string, string> = {
  nome_completo: "full_name",
  cpf: "cpf",
  data_nascimento: "birth_date",
  rg: "rg",
  orgao_emissor: "orgao_emissor",
  rg_emissao: "rg_emissao",
  naturalidade: "naturalidade",
  pai: "pai",
  mae: "mae",
  cep: "cep",
  rua: "rua",
  numero: "numero",
  bairro: "bairro",
  cidade: "cidade",
  estado: "estado",
  email: "contact_email",
  escolaridade: "escolaridade",
  ano_formacao: "ano_formacao",
  instituicao_formacao: "instituicao_formacao",
  curso_escolhido: "curso_escolhido",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function resolveLink(token: string) {
  const { data, error } = await supabase.from("document_upload_links").select("*").eq("token", token).maybeSingle();
  if (error) throw error;
  if (!data) return { error: "Link inválido" };
  if (data.revoked) return { error: "Link revogado" };
  if (new Date(data.expires_at) < new Date()) return { error: "Link expirado" };
  return { link: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "info";
    const token = url.searchParams.get("token") ?? "";
    if (!token) return json({ error: "Token obrigatório" }, 400);

    const { link, error } = await resolveLink(token);
    if (error || !link) return json({ error: error ?? "Link inválido" }, 404);

    // For standalone links (no student attached yet), use the link's own id as
    // the holder key. When the link is later vinculated to a real student, we
    // migrate rows with UPDATE ... SET user_id = <real> WHERE user_id = <link.id>.
    const holderId: string = link.user_id ?? link.id;

    if (action === "info") {
      const { data: docs } = await supabase
        .from("student_documents")
        .select("id, doc_type, file_name, mime, status, notes, created_at")
        .eq("user_id", holderId)
        .order("created_at", { ascending: false });
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("full_name, cpf, birth_date, rg, orgao_emissor, rg_emissao, naturalidade, pai, mae, cep, rua, numero, bairro, cidade, estado, contact_email, escolaridade, ano_formacao, instituicao_formacao, curso_escolhido, enrollment_form_submitted_at")
        .eq("user_id", holderId)
        .maybeSingle();
      return json({
        student: { name: link.student_name, email: link.student_email },
        label: link.label ?? null,
        linked: !!link.user_id,
        expires_at: link.expires_at,
        documents: docs ?? [],
        profile: profile ?? {},
      });
    }

    if (action === "form" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const update: Record<string, unknown> = { enrollment_form_submitted_at: new Date().toISOString() };
      for (const [k, col] of Object.entries(FORM_FIELDS)) {
        if (k in body) {
          const v = body[k];
          update[col] = v === "" ? null : v;
        }
      }
      const { data: existing } = await supabase
        .from("student_profiles").select("user_id").eq("user_id", holderId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("student_profiles").update(update).eq("user_id", holderId);
        if (error) return json({ error: error.message }, 500);
      } else {
        const { error } = await supabase.from("student_profiles").insert({ user_id: holderId, ...update });
        if (error) return json({ error: error.message }, 500);
      }
      if (link.user_id) {
        await maybeNotifyCertifier(link.user_id, link.student_name, link.student_email, !!link.for_certification);
      }
      return json({ ok: true });
    }

    if (action === "upload" && req.method === "POST") {
      const form = await req.formData();
      const docType = String(form.get("doc_type") ?? "");
      const file = form.get("file") as File | null;
      if (!DOC_TYPES.includes(docType)) return json({ error: "Tipo inválido" }, 400);
      if (!file) return json({ error: "Arquivo ausente" }, 400);
      if (file.size > 10 * 1024 * 1024) return json({ error: "Máx 10MB" }, 400);
      const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!allowed.includes(file.type)) return json({ error: "Formato não aceito" }, 400);

      // Remove previous document of same type
      const { data: existing } = await supabase
        .from("student_documents")
        .select("id, file_path")
        .eq("user_id", holderId)
        .eq("doc_type", docType);
      if (existing?.length) {
        await supabase.storage.from("student-documents").remove(existing.map((e: any) => e.file_path));
        await supabase.from("student_documents").delete().in("id", existing.map((e: any) => e.id));
      }

      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${holderId}/${docType}-${Date.now()}.${ext}`;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const { error: upErr } = await supabase.storage.from("student-documents").upload(path, buffer, {
        contentType: file.type, upsert: false,
      });
      if (upErr) return json({ error: upErr.message }, 500);

      const { error: insErr } = await supabase.from("student_documents").insert({
        user_id: holderId, doc_type: docType, file_path: path,
        file_name: file.name, mime: file.type, size_bytes: file.size, status: "enviado",
      });
      if (insErr) return json({ error: insErr.message }, 500);
      if (link.user_id) {
        await maybeNotifyCertifier(link.user_id, link.student_name, link.student_email, !!link.for_certification);
      }
      return json({ ok: true });
    }

    if (action === "delete" && req.method === "POST") {
      const body = await req.json();
      const docType = String(body.doc_type ?? "");
      if (!DOC_TYPES.includes(docType)) return json({ error: "Tipo inválido" }, 400);
      const { data: existing } = await supabase
        .from("student_documents")
        .select("id, file_path, status")
        .eq("user_id", holderId)
        .eq("doc_type", docType);
      if (existing?.length) {
        // Only allow deletion if not approved
        const removable = existing.filter((e: any) => e.status !== "aprovado");
        if (removable.length) {
          await supabase.storage.from("student-documents").remove(removable.map((e: any) => e.file_path));
          await supabase.from("student_documents").delete().in("id", removable.map((e: any) => e.id));
        }
      }
      return json({ ok: true });
    }

    if (action === "download") {
      const docId = url.searchParams.get("id") ?? "";
      if (!docId) return json({ error: "id obrigatório" }, 400);
      const { data: row, error: rowErr } = await supabase
        .from("student_documents")
        .select("file_path, file_name")
        .eq("id", docId)
        .eq("user_id", holderId)
        .maybeSingle();
      if (rowErr) return json({ error: rowErr.message }, 500);
      if (!row) return json({ error: "Documento não encontrado" }, 404);
      const { data: signed, error: sErr } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(row.file_path, 300, { download: row.file_name ?? undefined });
      if (sErr) return json({ error: sErr.message }, 500);
      return json({ url: signed.signedUrl, file_name: row.file_name });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});