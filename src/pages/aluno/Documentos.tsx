import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FolderOpen, Upload, FileCheck2, Eye, Trash2, ExternalLink } from "lucide-react";
import { DOC_TYPES, uploadStudentDoc, signedDocUrl } from "@/lib/studentDocs";

type Doc = { id: string; doc_type: string; file_path: string; file_name: string | null; status: string; notes: string | null; created_at: string };
type Link = { id: string; title: string; url: string; description: string | null };

const statusColor: Record<string, string> = {
  enviado: "bg-amber-100 text-amber-700",
  aprovado: "bg-emerald-100 text-emerald-700",
  rejeitado: "bg-destructive/15 text-destructive",
};

export default function Documentos() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: d }, { data: l }] = await Promise.all([
      supabase.from("student_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("doc_links").select("id,title,url,description").eq("active", true).eq("visible_to", "alunos").order("sort_order"),
    ]);
    setDocs((d ?? []) as Doc[]);
    setLinks((l ?? []) as Link[]);
  };
  useEffect(() => { load(); }, [user]);

  const send = async (docType: string, file: File) => {
    if (!user) return;
    setBusy(docType);
    try {
      await uploadStudentDoc(user.id, docType, file);
      toast.success("Documento enviado!");
      load();
    } catch (e: any) { toast.error(e.message ?? "Falha no envio"); }
    finally { setBusy(null); }
  };

  const view = async (path: string) => {
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank"); else toast.error("Não foi possível abrir o arquivo");
  };

  const remove = async (d: Doc) => {
    if (!confirm("Excluir este envio?")) return;
    await supabase.storage.from("student-docs").remove([d.file_path]);
    await supabase.from("student_documents").delete().eq("id", d.id);
    load();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><FolderOpen className="size-7" /> Meus documentos</h1>
        <p className="text-muted-foreground">Envie a documentação exigida pela faculdade. Nós encaminhamos para a instituição.</p>
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
        <p className="font-semibold mb-1">Como enviar</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
          <li>Envie <b>de preferência em PDF</b> — a faculdade autoriza mais rápido.</li>
          <li>Fotos são aceitas (JPG/PNG), desde que estejam legíveis e sem cortes.</li>
          <li>Tamanho máximo: 10 MB por arquivo.</li>
        </ul>
      </div>

      <div className="grid gap-3">
        {DOC_TYPES.map((t) => {
          const enviados = docs.filter((d) => d.doc_type === t.key);
          return (
            <div key={t.key} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-semibold flex items-center gap-2">
                  {enviados.length > 0 && <FileCheck2 className="size-4 text-emerald-600" />} {t.label}
                </p>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-dashed px-3 py-1.5 hover:bg-secondary/60">
                  <Upload className="size-4" /> {busy === t.key ? "Enviando…" : "Anexar arquivo"}
                  <input type="file" accept=".pdf,image/*" className="hidden" disabled={busy === t.key}
                    onChange={(e) => e.target.files?.[0] && send(t.key, e.target.files[0])} />
                </label>
              </div>
              {enviados.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="truncate">{d.file_name ?? "arquivo"}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] rounded px-2 py-0.5 ${statusColor[d.status] ?? "bg-secondary"}`}>{d.status}</span>
                    <Button size="sm" variant="ghost" onClick={() => view(d.file_path)}><Eye className="size-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
              {enviados.some((d) => d.status === "rejeitado" && d.notes) && (
                <p className="text-xs text-destructive">Observação da escola: {enviados.find((d) => d.status === "rejeitado")?.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {links.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-primary">Links e materiais da escola</h2>
          {links.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/50">
              <div>
                <p className="text-sm font-medium">{l.title}</p>
                {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
