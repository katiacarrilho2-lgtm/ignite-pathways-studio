import { supabase } from "@/integrations/supabase/client";

export type DocDef = { key: string; label: string; desc?: string; opcional?: boolean };

export const DOC_TYPES: DocDef[] = [
  { key: "certidao", label: "Certidão de nascimento ou casamento", desc: "Documento obrigatório" },
  { key: "certificado_medio", label: "Certificado do Ensino Médio", desc: "Documento opcional", opcional: true },
  { key: "comprovante_experiencia", label: "Comprovante de Experiência", desc: "Declaração assinada, CTPS ou contrato" },
  { key: "comprovante_residencia", label: "Comprovante de Residência", desc: "Últimos 90 dias" },
  { key: "cpf", label: "CPF", desc: "Documento obrigatório" },
  { key: "foto_3x4", label: "Foto 3x4", desc: "Foto recente para o certificado" },
  { key: "historico_medio", label: "Histórico do Ensino Médio", desc: "Documento obrigatório" },
  { key: "reservista", label: "Reservista", desc: "Obrigatório para candidato masculino", opcional: true },
  { key: "rg", label: "RG ou CNH", desc: "Documento obrigatório" },
  { key: "titulo_eleitor", label: "Título de Eleitor", desc: "Documento obrigatório" },
];

export const EXTRA_DOC_TYPE = "documento_adicional";

export const ALL_DOC_KEYS = [...DOC_TYPES.map((d) => d.key), EXTRA_DOC_TYPE];

export const DOC_LABEL = (key: string) =>
  key === EXTRA_DOC_TYPE ? "Documento adicional" : DOC_TYPES.find((d) => d.key === key)?.label ?? key;

export async function signedDocUrl(path: string, seconds = 3600) {
  const { data } = await supabase.storage.from("student-docs").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function uploadStudentDoc(userId: string, docType: string, file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB");
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("student-docs").upload(path, file, { upsert: true });
  if (error) throw error;
  const { error: dbErr } = await supabase.from("student_documents").insert({
    user_id: userId,
    doc_type: docType,
    file_path: path,
    file_name: file.name,
    mime: file.type,
    size_bytes: file.size,
    status: "enviado",
  });
  if (dbErr) throw dbErr;
  return path;
}
