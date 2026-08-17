import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Ban, Trash2, Eye, ChevronDown, ChevronRight, UserPlus, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DOC_LABEL, signedDocUrl } from "@/lib/studentDocs";

type LinkRow = {
  id: string; token: string; label: string | null; student_name: string | null;
  student_email: string | null; student_phone: string | null; user_id: string | null;
  revoked: boolean; expires_at: string; created_at: string;
};
type DocRow = { id: string; link_id: string | null; doc_type: string; file_path: string; file_name: string | null; status: string; notes: string | null; created_at: string };

const publicUrl = (token: string) => `${window.location.origin}/documentos/${token}`;

export default function DocUploadLinksPanel() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [students, setStudents] = useState<{ user_id: string; display_name: string | null; email: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", student_name: "", student_email: "", student_phone: "", dias: 90 });

  const load = async () => {
    const [{ data: l }, { data: d }, { data: p }] = await Promise.all([
      supabase.from("document_upload_links").select("*").order("created_at", { ascending: false }),
      supabase.from("student_documents").select("*").not("link_id", "is", null).order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id,display_name,email").order("display_name"),
    ]);
    setLinks((l ?? []) as LinkRow[]);
    setDocs((d ?? []) as DocRow[]);
    setStudents((p ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const expires = new Date(Date.now() + (form.dias || 90) * 86400000).toISOString();
    const { data, error } = await supabase.from("document_upload_links").insert({
      label: form.label || null, student_name: form.student_name || null,
      student_email: form.student_email || null, student_phone: form.student_phone || null,
      expires_at: expires, created_by: user?.id ?? null,
    }).select().maybeSingle();
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ label: "", student_name: "", student_email: "", student_phone: "", dias: 90 });
    if (data) { await navigator.clipboard.writeText(publicUrl((data as any).token)).catch(() => {}); toast.success("Link criado e copiado!"); }
    load();
  };

  const copy = (t: string) => { navigator.clipboard.writeText(publicUrl(t)); toast.success("Link copiado!"); };

  const toggleRevoke = async (r: LinkRow) => {
    const { error } = await supabase.from("document_upload_links").update({ revoked: !r.revoked }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (r: LinkRow) => {
    if (!confirm("Excluir este link e os documentos enviados por ele?")) return;
    const paths = docs.filter((d) => d.link_id === r.id).map((d) => d.file_path);
    if (paths.length) await supabase.storage.from("student-docs").remove(paths);
    const { error } = await supabase.from("document_upload_links").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const attach = async (r: LinkRow, userId: string) => {
    const { error } = await supabase.from("document_upload_links").update({ user_id: userId }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("student_documents").update({ user_id: userId }).eq("link_id", r.id);
    toast.success("Documentos vinculados ao aluno — já aparecem na pasta dele.");
    load();
  };

  const setStatus = async (d: DocRow, status: string) => {
    const notes = status === "rejeitado" ? prompt("Motivo da recusa (a pessoa verá):") ?? null : null;
    const { error } = await supabase.from("student_documents").update({ status, notes, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null }).eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  const view = async (path: string) => {
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank"); else toast.error("Arquivo indisponível");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Link2 className="size-5" /> Links de envio de documentos</h2>
          <p className="text-sm text-muted-foreground">Gere um link, envie para o candidato (não precisa estar matriculado), acompanhe e aprove os documentos.</p>
        </div>
        <Button variant="hero" onClick={() => setOpen(true)}><Plus className="size-4" /> Novo link</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Candidato / rótulo</th>
              <th className="text-left p-3">Contato</th>
              <th className="text-left p-3">Docs</th>
              <th className="text-left p-3">Aluno vinculado</th>
              <th className="text-left p-3">Validade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {links.map((r) => {
              const mine = docs.filter((d) => d.link_id === r.id);
              const aprovados = mine.filter((d) => d.status === "aprovado").length;
              const isOpen = expanded === r.id;
              return (
                <>
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">
                      <button className="inline-flex items-center gap-1 font-medium" onClick={() => setExpanded(isOpen ? null : r.id)}>
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        {r.student_name || r.label || "Sem nome"}
                      </button>
                      {r.revoked && <span className="ml-2 text-[11px] rounded px-2 py-0.5 bg-destructive/15 text-destructive">revogado</span>}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.student_email || r.student_phone || "—"}</td>
                    <td className="p-3">{aprovados}/{mine.length}</td>
                    <td className="p-3">
                      {r.user_id ? (students.find((s) => s.user_id === r.user_id)?.display_name ?? "vinculado")
                        : (
                          <Select onValueChange={(v) => attach(r, v)}>
                            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Vincular aluno" /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              {students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name || s.email}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(r.expires_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" title="Copiar link" onClick={() => copy(r.token)}><Copy className="size-4" /></Button>
                      <Button size="sm" variant="ghost" title={r.revoked ? "Reativar" : "Revogar"} onClick={() => toggleRevoke(r)}><Ban className="size-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-border bg-secondary/30">
                      <td colSpan={6} className="p-3">
                        {mine.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum documento enviado ainda.</p> : (
                          <div className="grid gap-2 md:grid-cols-2">
                            {mine.map((d) => (
                              <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-card border border-border px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{DOC_LABEL(d.doc_type)}</p>
                                  <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Select value={d.status} onValueChange={(v) => setStatus(d, v)}>
                                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="enviado">enviado</SelectItem>
                                      <SelectItem value="aprovado">aprovado</SelectItem>
                                      <SelectItem value="rejeitado">recusado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" variant="ghost" onClick={() => view(d.file_path)}><Eye className="size-4" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {links.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum link criado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="size-5" /> Novo link de documentos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Rótulo (uso interno)</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: Matrícula EJA - agosto" /></div>
            <div><Label>Nome do candidato</Label><Input value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>E-mail</Label><Input value={form.student_email} onChange={(e) => setForm({ ...form, student_email: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.student_phone} onChange={(e) => setForm({ ...form, student_phone: e.target.value })} /></div>
            </div>
            <div><Label>Validade (dias)</Label><Input type="number" value={form.dias} onChange={(e) => setForm({ ...form, dias: Number(e.target.value) })} /></div>
            <Button variant="hero" className="w-full" onClick={create}>Criar e copiar link</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
