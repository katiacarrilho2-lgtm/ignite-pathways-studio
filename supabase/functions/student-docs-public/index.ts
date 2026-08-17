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
  "certidao", "certificado_medio", "comprovante_experiencia", "comprovante_residencia",
  "cpf", "foto_3x4", "historico_medio", "reservista", "rg", "titulo_eleitor",
  "documento_adicional",
];

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

    if (action === "info") {
      const { data: docs } = await supabase
        .from("student_documents")
        .select("id, doc_type, file_name, mime, status, notes, created_at")
        .eq("link_id", link.id)
        .order("created_at", { ascending: false });
      return json({
        student: { name: link.student_name, email: link.student_email, phone: link.student_phone },
        label: link.label ?? null,
        expires_at: link.expires_at,
        documents: docs ?? [],
      });
    }

    if (action === "identify" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const update: Record<string, unknown> = {};
      if (typeof body.name === "string") update.student_name = body.name || null;
      if (typeof body.email === "string") update.student_email = body.email || null;
      if (typeof body.phone === "string") update.student_phone = body.phone || null;
      if (Object.keys(update).length) {
        const { error: e } = await supabase.from("document_upload_links").update(update).eq("id", link.id);
        if (e) return json({ error: e.message }, 500);
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
      if (!allowed.includes(file.type)) return json({ error: "Formato não aceito (PDF, JPG ou PNG)" }, 400);

      if (docType !== "documento_adicional") {
        const { data: existing } = await supabase
          .from("student_documents").select("id, file_path, status")
          .eq("link_id", link.id).eq("doc_type", docType);
        const removable = (existing ?? []).filter((e: any) => e.status !== "aprovado");
        if (removable.length) {
          await supabase.storage.from("student-docs").remove(removable.map((e: any) => e.file_path));
          await supabase.from("student_documents").delete().in("id", removable.map((e: any) => e.id));
        }
      }

      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const holder = link.user_id ?? link.id;
      const path = `${holder}/${docType}-${Date.now()}.${ext}`;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const { error: upErr } = await supabase.storage.from("student-docs").upload(path, buffer, {
        contentType: file.type, upsert: false,
      });
      if (upErr) return json({ error: upErr.message }, 500);

      const { error: insErr } = await supabase.from("student_documents").insert({
        link_id: link.id, user_id: link.user_id ?? null, doc_type: docType, file_path: path,
        file_name: file.name, mime: file.type, size_bytes: file.size, status: "enviado",
      });
      if (insErr) return json({ error: insErr.message }, 500);
      return json({ ok: true });
    }

    if (action === "delete" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id ?? "");
      const { data: row } = await supabase
        .from("student_documents").select("id, file_path, status")
        .eq("id", id).eq("link_id", link.id).maybeSingle();
      if (!row) return json({ error: "Documento não encontrado" }, 404);
      if (row.status === "aprovado") return json({ error: "Documento já aprovado" }, 400);
      await supabase.storage.from("student-docs").remove([row.file_path]);
      await supabase.from("student_documents").delete().eq("id", row.id);
      return json({ ok: true });
    }

    if (action === "download") {
      const docId = url.searchParams.get("id") ?? "";
      if (!docId) return json({ error: "id obrigatório" }, 400);
      const { data: row } = await supabase
        .from("student_documents").select("file_path, file_name")
        .eq("id", docId).eq("link_id", link.id).maybeSingle();
      if (!row) return json({ error: "Documento não encontrado" }, 404);
      const { data: signed, error: sErr } = await supabase.storage
        .from("student-docs")
        .createSignedUrl(row.file_path, 300, { download: row.file_name ?? undefined });
      if (sErr) return json({ error: sErr.message }, 500);
      return json({ url: signed.signedUrl, file_name: row.file_name });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
