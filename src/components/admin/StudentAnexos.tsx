import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Trash2, UploadCloud, Loader2, FileText, CheckCircle2, XCircle } from "lucide-react";
import { DOC_TYPES, EXTRA_DOC_TYPE, DOC_LABEL, signedDocUrl, uploadStudentDoc } from "@/lib/studentDocs";

type Doc = {
  id: string; doc_type: string; file_path: string; file_name: string | null;
  size_bytes: number | null; status: string; created_at: string;
};

const kb = (n: number | null) => (n ? `${(n / 1024).toFixed(0)} KB` : "—");

export function StudentAnexos({ userId, studentName }: {
  userId?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string | null;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<string>(DOC_TYPES[0].key);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("student_documents")
      .select("id, doc_type, file_path, file_name, size_bytes, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs((data as Doc[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      await uploadStudentDoc(userId, docType, file);
      toast.success("Documento anexado!");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no envio");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const baixar = async (d: Doc) => {
    const url = await signedDocUrl(d.file_path, 3600);
    if (!url) return toast.error("Não foi possível gerar o link do arquivo.");
    const a = document.createElement("a");
    a.href = url;
    a.download = d.file_name || `${d.doc_type}.pdf`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const excluir = async (d: Doc) => {
    if (!confirm(`Excluir "${d.file_name || DOC_LABEL(d.doc_type)}"?`)) return;
    await supabase.storage.from("student-docs").remove([d.file_path]);
    const { error } = await supabase.from("student_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Documento removido.");
    load();
  };

  const revisar = async (d: Doc, status: "aprovado" | "recusado") => {
    const { error } = await supabase.from("student_documents")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><UploadCloud className="size-4 text-primary" /> Anexar documento{studentName ? ` — ${studentName}` : ""}</h2>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label>Tipo de documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                <SelectItem value={EXTRA_DOC_TYPE}>Documento adicional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onFile} />
            <Button className="w-full" variant="hero" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Enviar arquivo
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Prefira PDF (até 10 MB). Também aceitamos JPG, PNG e WEBP.</p>
      </section>

      <section className="bg-card rounded-xl border border-border p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><FileText className="size-4" /> Documentos do aluno ({docs.length})</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</div>
        ) : (
          <div className="divide-y divide-border">
            {docs.map((d) => (
              <div key={d.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-medium text-sm">{DOC_LABEL(d.doc_type)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.file_name || d.file_path.split("/").pop()} · {kb(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <span className={`text-[10px] uppercase px-2 py-1 rounded-full ${
                  d.status === "aprovado" ? "bg-emerald-100 text-emerald-700"
                  : d.status === "recusado" ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => baixar(d)}><Download className="size-4" /> Baixar</Button>
                  <Button size="sm" variant="outline" onClick={() => revisar(d, "aprovado")}><CheckCircle2 className="size-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => revisar(d, "recusado")}><XCircle className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => excluir(d)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentAnexos;
