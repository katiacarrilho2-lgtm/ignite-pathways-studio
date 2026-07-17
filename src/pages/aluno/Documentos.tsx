import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Upload, FileText, Trash2, Loader2, Clock, X, Plus } from "lucide-react";

type DocType = "rg" | "cpf" | "reservista" | "comprovante_pagamento" | "comprovante_residencia" | "historico_escolar" | "foto_3x4" | "anexo_extra";

const DOCS: { key: DocType; label: string; desc: string; multiple?: boolean }[] = [
  { key: "rg", label: "RG", desc: "Frente e verso" },
  { key: "cpf", label: "CPF", desc: "Documento ou comprovante" },
  { key: "reservista", label: "Reservista", desc: "Somente homens (se possuir)" },
  { key: "comprovante_pagamento", label: "Comprovante de pagamento", desc: "Matrícula ou pagamento integral" },
  { key: "comprovante_residencia", label: "Comprovante de residência", desc: "Últimos 90 dias" },
  { key: "historico_escolar", label: "Histórico escolar", desc: "Último grau concluído" },
  { key: "foto_3x4", label: "Foto 3x4", desc: "Foto recente para o certificado" },
  { key: "anexo_extra", label: "Anexo Extra", desc: "Documentos adicionais (você pode enviar vários)", multiple: true },
];

type Row = { id: string; doc_type: DocType; file_path: string; file_name: string | null; mime: string | null; status: string; notes: string | null; created_at: string };

export default function AlunoDocumentos() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("student_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const byType = (t: DocType) => rows.find(r => r.doc_type === t);
  const allByType = (t: DocType) => rows.filter(r => r.doc_type === t);

  const handleUpload = async (type: DocType, file: File, keepExisting = false) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 20MB).");
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic"];
    if (file.type && !allowed.includes(file.type)) return toast.error("Envie PDF, PNG, JPG ou WEBP.");
    setBusy(type);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-documents").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      // Remove existing of this type (keep latest only), unless multiple allowed
      if (!keepExisting) {
        const existing = byType(type);
        if (existing) {
          await supabase.storage.from("student-documents").remove([existing.file_path]);
          await supabase.from("student_documents").delete().eq("id", existing.id);
        }
      }
      const { error: insErr } = await supabase.from("student_documents").insert({
        user_id: user.id, doc_type: type, file_path: path, file_name: file.name, mime: file.type, size_bytes: file.size, status: "enviado",
      });
      if (insErr) throw insErr;
      toast.success("Documento enviado!");
      load();
    } catch (e: any) {
      toast.error(e.message || "Falha no envio");
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (r: Row) => {
    if (!confirm("Remover este documento?")) return;
    await supabase.storage.from("student-documents").remove([r.file_path]);
    await supabase.from("student_documents").delete().eq("id", r.id);
    toast.success("Removido");
    load();
  };

  const openFile = async (r: Row) => {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(r.file_path, 60 * 5);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const required = DOCS.filter(d => !d.multiple);
  const total = required.length;
  const done = required.filter(d => byType(d.key)).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Meus documentos</h1>
        <p className="text-sm text-muted-foreground">Envie os documentos necessários para finalizar sua matrícula. Formatos aceitos: PDF, PNG, JPG ou WEBP (máx 20MB).</p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium">Progresso</span>
          <span className="text-muted-foreground">{done} de {total} enviados</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground"><Loader2 className="animate-spin inline size-5 mr-2" />Carregando…</div>
      ) : (
        <div className="space-y-3">
          {DOCS.map(d => {
            const list = d.multiple ? allByType(d.key) : [];
            const r = d.multiple ? undefined : byType(d.key);
            const uploading = busy === d.key;
            return (
              <div key={d.key} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{d.label}</h3>
                      {r && r.status === "aprovado" && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-3" />Aprovado</span>}
                      {r && r.status === "rejeitado" && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700"><X className="size-3" />Rejeitado</span>}
                      {r && r.status === "enviado" && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Clock className="size-3" />Em análise</span>}
                      {!r && !d.multiple && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Pendente</span>}
                      {d.multiple && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{list.length} arquivo(s)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                    {r?.notes && <p className="text-xs text-red-600 mt-1">Obs.: {r.notes}</p>}
                    {r && (
                      <button onClick={() => openFile(r)} className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1">
                        <FileText className="size-3" />{r.file_name || "Ver arquivo"}
                      </button>
                    )}
                    {d.multiple && list.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {list.map(item => (
                          <li key={item.id} className="flex items-center gap-2 text-xs">
                            <button onClick={() => openFile(item)} className="text-primary hover:underline inline-flex items-center gap-1 flex-1 min-w-0 truncate">
                              <FileText className="size-3 shrink-0" />
                              <span className="truncate">{item.file_name || "Arquivo"}</span>
                            </button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(item)} title="Remover">
                              <Trash2 className="size-3 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/*" className="hidden"
                        disabled={uploading}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(d.key, f, !!d.multiple); e.currentTarget.value = ""; }} />
                      <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
                        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        {d.multiple ? (list.length > 0 ? "Adicionar" : "Enviar") : (r ? "Substituir" : "Enviar")}
                      </span>
                    </label>
                    {r && !d.multiple && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(r)} title="Remover">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}