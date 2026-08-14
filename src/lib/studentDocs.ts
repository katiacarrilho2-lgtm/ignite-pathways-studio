import { supabase } from "@/integrations/supabase/client";

export const DOC_TYPES = [
  { key: "rg", label: "RG" },
  { key: "cpf", label: "CPF" },
  { key: "comprovante_residencia", label: "Comprovante de residência" },
  { key: "reservista", label: "Reservista" },
  { key: "certidao", label: "Certidão de nascimento ou casamento" },
  { key: "foto_3x4", label: "Foto 3x4" },
  { key: "historico_escolar", label: "Histórico escolar" },
  { key: "diploma_medio", label: "Diploma do Ensino Médio (para faculdade)" },
  { key: "outros", label: "Outros" },
];

export const DOC_LABEL = (key: string) => DOC_TYPES.find((d) => d.key === key)?.label ?? key;

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