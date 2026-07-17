import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link as LinkIcon, Copy, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock, Trash2, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type DocType = "rg" | "cpf" | "reservista" | "comprovante_pagamento" | "comprovante_residencia" | "historico_escolar" | "foto_3x4";

const DOC_LABELS: Record<DocType, string> = {
  rg: "RG",
  cpf: "CPF",
  reservista: "Reservista",
  comprovante_pagamento: "Comprovante de pagamento",
  comprovante_residencia: "Comprovante de residência",
  historico_escolar: "Histórico escolar",
  foto_3x4: "Foto 3x4",
};

const DOC_ORDER: DocType[] = ["rg", "cpf", "reservista", "comprovante_residencia", "comprovante_pagamento", "historico_escolar", "foto_3x4"];

type Doc = {
  id: string; doc_type: DocType; file_path: string; file_name: string | null;
  mime: string | null; size_bytes: number | null; status: string; notes: string | null;
  reviewed_at: string | null; created_at: string;
};

type LinkRow = { id: string; token: string; expires_at: string; revoked: boolean; created_at: string };

const genToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
};

export function StudentAnexos({ userId, studentName, studentEmail, studentPhone }: { userId: string; studentName?: string; studentEmail?: string; studentPhone?: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<Doc | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: d }, { data: l }] = await Promise.all([
      supabase.from("student_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("document_upload_links").select("*").eq("user_id", userId).eq("revoked", false).order("created_at", { ascending: false }).limit(1),
    ]);
    setDocs((d ?? []) as Doc[]);
    setLink((l && l[0]) ? (l[0] as LinkRow) : null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const byType = (t: DocType) => docs.find(x => x.doc_type === t);
  const publicUrl = link ? `${window.location.origin}/documentos/${link.token}` : "";

  const createLink = async () => {
    const token = genToken();
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("document_upload_links").insert({
      token, user_id: userId, student_name: studentName ?? null, student_email: studentEmail ?? null,
      created_by: auth.user?.id ?? null,
    }).select().single();
    if (error) return toast.error(error.message);
    setLink(data as LinkRow);
    toast.success("Link criado!");
  };

  const revoke = async () => {
    if (!link) return;
    if (!confirm("Revogar link atual? Um novo poderá ser gerado.")) return;
    await supabase.from("document_upload_links").update({ revoked: true }).eq("id", link.id);
    setLink(null);
    toast.success("Link revogado");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  const openWhats = () => {
    const phone = (studentPhone || "").replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá${studentName ? ` ${studentName}` : ""}! Para completar sua matrícula, envie seus documentos por este link seguro:\n${publicUrl}`);
    window.open(phone ? `https://wa.me/55${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  };

  const openDoc = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(d.file_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const approve = async (d: Doc) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("student_documents").update({
      status: "aprovado", notes: null, reviewed_at: new Date().toISOString(), reviewed_by: auth.user?.id ?? null,
    }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Documento aprovado");
    load();
  };

  const submitReject = async () => {
    if (!rejecting) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("student_documents").update({
      status: "rejeitado", notes: rejectNote || "Documento rejeitado",
      reviewed_at: new Date().toISOString(), reviewed_by: auth.user?.id ?? null,
    }).eq("id", rejecting.id);
    if (error) return toast.error(error.message);
    toast.success("Documento rejeitado — o aluno verá a observação");
    setRejecting(null); setRejectNote(""); load();
  };

  const removeDoc = async (d: Doc) => {
    if (!confirm(`Remover o arquivo de ${DOC_LABELS[d.doc_type]}?`)) return;
    await supabase.storage.from("student-documents").remove([d.file_path]);
    await supabase.from("student_documents").delete().eq("id", d.id);
    toast.success("Removido");
    load();
  };

  const total = DOC_ORDER.length;
  const approved = DOC_ORDER.filter(t => byType(t)?.status === "aprovado").length;

  return (
    <div className="space-y-5">
      {/* Link section */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><LinkIcon className="size-4 text-primary" /> Link público de envio</h2>
            <p className="text-xs text-muted-foreground">O aluno acessa e anexa os documentos sem precisar logar. Você aprova depois nesta mesma aba.</p>
          </div>
          {!link ? (
            <Button onClick={createLink} variant="hero"><LinkIcon className="size-4" /> Gerar link</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={revoke}><RefreshCw className="size-4" /> Revogar</Button>
            </div>
          )}
        </div>

        {link && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={copy}><Copy className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank")}><ExternalLink className="size-4" /></Button>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Expira em {new Date(link.expires_at).toLocaleDateString("pt-BR")}</p>
              <Button variant="ghost" size="sm" onClick={openWhats}><MessageCircle className="size-4" /> Enviar por WhatsApp</Button>
            </div>
          </div>
        )}
      </section>

      {/* Progress */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium">Documentos aprovados</span>
            <span className="text-muted-foreground">{approved} de {total}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(approved / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/30">
          <h2 className="font-semibold text-sm">Anexos / Documentos ({docs.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline size-5 mr-2" /> Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Documento</th>
                  <th className="text-left px-4 py-2 font-medium">Arquivo</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Enviado em</th>
                  <th className="text-right px-4 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DOC_ORDER.map(t => {
                  const d = byType(t);
                  return (
                    <tr key={t} className="hover:bg-secondary/20">
                      <td className="px-4 py-3 font-medium">{DOC_LABELS[t]}</td>
                      <td className="px-4 py-3">
                        {d ? (
                          <button onClick={() => openDoc(d)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                            <ExternalLink className="size-3" />{d.file_name || "arquivo"}
                          </button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {!d && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">Pendente</span>}
                        {d?.status === "enviado" && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200"><Clock className="size-3" />Em análise</span>}
                        {d?.status === "aprovado" && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"><CheckCircle2 className="size-3" />Aprovado</span>}
                        {d?.status === "rejeitado" && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200"><XCircle className="size-3" />Rejeitado</span>
                            {d.notes && <p className="text-[11px] text-red-600 mt-1 max-w-xs">{d.notes}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d ? new Date(d.created_at).toLocaleString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {d && d.status !== "aprovado" && (
                            <Button size="sm" variant="outline" onClick={() => approve(d)} className="h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                              <CheckCircle2 className="size-3.5" /> Aprovar
                            </Button>
                          )}
                          {d && d.status !== "rejeitado" && (
                            <Button size="sm" variant="outline" onClick={() => { setRejecting(d); setRejectNote(d.notes || ""); }} className="h-8 text-red-700 border-red-200 hover:bg-red-50">
                              <XCircle className="size-3.5" /> Rejeitar
                            </Button>
                          )}
                          {d && (
                            <Button size="icon" variant="ghost" onClick={() => removeDoc(d)} title="Remover">
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={!!rejecting} onOpenChange={o => { if (!o) { setRejecting(null); setRejectNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar documento</DialogTitle>
            <DialogDescription>O aluno verá esta observação e poderá reenviar o arquivo.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} placeholder="Ex.: documento ilegível, foto cortada, arquivo vencido…" value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectNote(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={submitReject}><XCircle className="size-4" /> Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}