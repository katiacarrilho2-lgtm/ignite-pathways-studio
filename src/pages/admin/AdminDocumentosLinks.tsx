import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link as LinkIcon, Copy, ExternalLink, Loader2, Plus, RefreshCw, MessageCircle, Search, User, FolderOpen, Trash2, Link2 } from "lucide-react";

type LinkRow = {
  id: string;
  token: string;
  label: string | null;
  student_name: string | null;
  student_email: string | null;
  user_id: string | null;
  expires_at: string;
  revoked: boolean;
  created_at: string;
  for_certification: boolean;
};

type Student = { user_id: string; display_name: string | null; username: string | null; email: string | null };

const genToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
};

export default function AdminDocumentosLinks() {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  // create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // link-to-student modal
  const [linking, setLinking] = useState<LinkRow | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentQ, setStudentQ] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [linkingBusy, setLinkingBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_upload_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data ?? []) as any as LinkRow[];
    setRows(list);
    // count uploaded docs by holder id (= user_id or link.id)
    const holders = list.map(l => l.user_id || l.id);
    if (holders.length) {
      const { data: docs } = await supabase
        .from("student_documents")
        .select("user_id")
        .in("user_id", holders);
      const counts: Record<string, number> = {};
      (docs ?? []).forEach((d: any) => { counts[d.user_id] = (counts[d.user_id] || 0) + 1; });
      setDocCounts(counts);
    } else setDocCounts({});
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(r => {
      if (!showAll && r.revoked) return false;
      if (!s) return true;
      return [r.label, r.student_name, r.student_email].some(v => (v || "").toLowerCase().includes(s));
    });
  }, [rows, q, showAll]);

  const publicUrl = (token: string) => `${window.location.origin}/documentos/${token}`;

  const createLink = async () => {
    if (!newLabel.trim() && !newName.trim()) return toast.error("Informe pelo menos um rótulo ou nome");
    setCreating(true);
    try {
      const token = genToken();
      const { data: auth } = await supabase.auth.getUser();
      const payload: any = {
        token,
        user_id: null,
        label: newLabel.trim() || null,
        student_name: newName.trim() || null,
        student_email: newEmail.trim() || null,
        created_by: auth.user?.id ?? null,
      };
      const { data, error } = await supabase.from("document_upload_links").insert(payload).select().single();
      if (error) throw error;
      toast.success("Link criado!");
      setOpenCreate(false);
      setNewLabel(""); setNewName(""); setNewEmail(""); setNewPhone("");
      await load();
      // auto-copy
      try { await navigator.clipboard.writeText(publicUrl((data as any).token)); toast.info("Link copiado para a área de transferência"); } catch {}
    } catch (e: any) {
      toast.error(e.message || "Falha ao criar link");
    } finally { setCreating(false); }
  };

  const revoke = async (r: LinkRow) => {
    if (!confirm(`Revogar o link "${r.label || r.student_name || r.token.slice(0,8)}"?`)) return;
    const { error } = await supabase.from("document_upload_links").update({ revoked: true }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Link revogado");
    load();
  };

  const reactivate = async (r: LinkRow) => {
    const { error } = await supabase.from("document_upload_links")
      .update({ revoked: false, expires_at: new Date(Date.now() + 30 * 86400_000).toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Link reativado por mais 30 dias");
    load();
  };

  const remove = async (r: LinkRow) => {
    if (!confirm("Excluir este link definitivamente? Os documentos já enviados NÃO serão removidos.")) return;
    const { error } = await supabase.from("document_upload_links").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Link excluído");
    load();
  };

  const copyUrl = async (r: LinkRow) => {
    await navigator.clipboard.writeText(publicUrl(r.token));
    toast.success("Link copiado!");
  };

  const shareWhats = (r: LinkRow) => {
    const msg = encodeURIComponent(`Olá${r.student_name ? ` ${r.student_name}` : ""}! Envie seus documentos por este link seguro:\n${publicUrl(r.token)}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const openLinking = async (r: LinkRow) => {
    setLinking(r);
    setSelectedStudent(null);
    setStudentQ("");
    if (students.length === 0) {
      const { data } = await supabase.from("profiles").select("user_id, display_name, username, email").order("display_name").limit(1000);
      setStudents((data ?? []) as Student[]);
    }
  };

  const confirmLink = async () => {
    if (!linking || !selectedStudent) return;
    setLinkingBusy(true);
    try {
      const holderId = linking.user_id || linking.id;
      // migrate documents from placeholder holder to the real student
      if (holderId !== selectedStudent.user_id) {
        const { error: e1 } = await supabase
          .from("student_documents")
          .update({ user_id: selectedStudent.user_id })
          .eq("user_id", holderId);
        if (e1) throw e1;
      }
      const { error: e2 } = await supabase.from("document_upload_links").update({
        user_id: selectedStudent.user_id,
        student_name: linking.student_name || selectedStudent.display_name,
        student_email: linking.student_email || selectedStudent.email,
      }).eq("id", linking.id);
      if (e2) throw e2;
      toast.success("Link vinculado ao aluno!");
      setLinking(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao vincular");
    } finally { setLinkingBusy(false); }
  };

  const filteredStudents = useMemo(() => {
    const s = studentQ.trim().toLowerCase();
    if (!s) return students.slice(0, 50);
    return students.filter(x => [x.display_name, x.username, x.email].some(v => (v || "").toLowerCase().includes(s))).slice(0, 50);
  }, [students, studentQ]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <LinkIcon className="size-6 text-primary" /> Links de Documentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crie um link de envio de documentos independente. Você pode compartilhar com o aluno, entrar no próprio link para anexar arquivos por ele, e depois vincular a um aluno cadastrado.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} variant="hero"><Plus className="size-4" /> Novo link</Button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por rótulo, nome ou email…" className="pl-9" />
        </div>
        <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Mostrar revogados
        </label>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="animate-spin inline size-5 mr-2" /> Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum link encontrado. Clique em "Novo link" para criar o primeiro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Rótulo / Aluno</th>
                  <th className="text-left px-4 py-2 font-medium">Vinculado</th>
                  <th className="text-left px-4 py-2 font-medium">Arquivos</th>
                  <th className="text-left px-4 py-2 font-medium">Expira</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => {
                  const holder = r.user_id || r.id;
                  const count = docCounts[holder] || 0;
                  const expired = new Date(r.expires_at) < new Date();
                  return (
                    <tr key={r.id} className="hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.label || r.student_name || <span className="text-muted-foreground italic">Sem rótulo</span>}</div>
                        {(r.student_name && r.label) && <div className="text-xs text-muted-foreground">{r.student_name}</div>}
                        {r.student_email && <div className="text-xs text-muted-foreground">{r.student_email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {r.user_id ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"><User className="size-3" />Aluno vinculado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Avulso</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                          <FolderOpen className="size-3.5 text-muted-foreground" />{count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.expires_at).toLocaleDateString("pt-BR")}
                        {expired && !r.revoked && <div className="text-[11px] text-amber-600">expirado</div>}
                      </td>
                      <td className="px-4 py-3">
                        {r.revoked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Revogado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Ativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => copyUrl(r)} title="Copiar link"><Copy className="size-3.5" /></Button>
                          <Button variant="outline" size="sm" onClick={() => window.open(publicUrl(r.token), "_blank")} title="Abrir para anexar"><ExternalLink className="size-3.5" /></Button>
                          <Button variant="outline" size="sm" onClick={() => shareWhats(r)} title="Enviar por WhatsApp"><MessageCircle className="size-3.5" /></Button>
                          {!r.user_id && !r.revoked && (
                            <Button variant="outline" size="sm" onClick={() => openLinking(r)} title="Vincular a um aluno" className="text-primary border-primary/40">
                              <Link2 className="size-3.5" /> Vincular
                            </Button>
                          )}
                          {r.revoked ? (
                            <Button variant="outline" size="sm" onClick={() => reactivate(r)} title="Reativar"><RefreshCw className="size-3.5" /></Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => revoke(r)} title="Revogar" className="text-amber-600 hover:text-amber-700"><RefreshCw className="size-3.5" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => remove(r)} title="Excluir"><Trash2 className="size-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo link de documentos</DialogTitle>
            <DialogDescription>Crie um link que aceita anexos sem cadastro. Você pode vincular a um aluno depois.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Rótulo / identificação interna</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex.: João da Silva - Matrícula NR35" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do candidato (opcional)</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">E-mail (opcional)</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">O link expira em 30 dias por padrão. Você pode reativá-lo depois.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={createLink} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link-to-student dialog */}
      <Dialog open={!!linking} onOpenChange={o => { if (!o) setLinking(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Vincular link a um aluno</DialogTitle>
            <DialogDescription>Os documentos já enviados por este link serão transferidos para o aluno selecionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={studentQ} onChange={e => setStudentQ(e.target.value)} placeholder="Buscar aluno por nome, usuário ou email…" className="pl-9" />
            </div>
            <div className="max-h-72 overflow-auto border border-border rounded-md divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum aluno encontrado</div>
              ) : filteredStudents.map(s => (
                <button
                  key={s.user_id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full text-left px-3 py-2 hover:bg-secondary/40 flex items-center justify-between ${selectedStudent?.user_id === s.user_id ? "bg-primary/10" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.display_name || s.username || s.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.email} {s.username && `· @${s.username}`}</div>
                  </div>
                  {selectedStudent?.user_id === s.user_id && <span className="text-xs text-primary font-medium">Selecionado</span>}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinking(null)}>Cancelar</Button>
            <Button onClick={confirmLink} disabled={!selectedStudent || linkingBusy}>
              {linkingBusy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}