import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ExternalLink, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { DOC_LABEL, signedDocUrl } from "@/lib/studentDocs";
import DocUploadLinksPanel from "@/components/admin/DocUploadLinksPanel";
import { downloadCsv, dateCsv } from "@/lib/exportCsv";
import { Download, Eye } from "lucide-react";

type Doc = {
  id: string; title: string; description: string | null; url: string;
  categoria: string | null; icon: string | null; visible_to: string;
  sort_order: number; active: boolean;
};

type StudentDoc = {
  id: string; user_id: string | null; link_id: string | null; doc_type: string; file_path: string; file_name: string | null;
  status: string; notes: string | null; created_at: string;
};

type Pessoa = { key: string; nome: string; contato: string; phone: string | null; rotulo: string | null; docs: StudentDoc[]; ultimo: string };

const StudentDocsPanel = () => {
  const [rows, setRows] = useState<StudentDoc[]>([]);
  const [profs, setProfs] = useState<Record<string, any>>({});
  const [links, setLinks] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const load = async () => {
    const [{ data }, { data: l }] = await Promise.all([
      supabase.from("student_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("document_upload_links").select("id,label,student_name,student_email,student_phone,user_id"),
    ]);
    const list = (data ?? []) as StudentDoc[];
    setRows(list);
    const lm: any = {}; (l ?? []).forEach((x: any) => { lm[x.id] = x; }); setLinks(lm);
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("user_id,display_name,email").in("user_id", ids);
      const m: any = {}; (p ?? []).forEach((x: any) => { m[x.user_id] = x; }); setProfs(m);
    }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (r: StudentDoc, status: string) => {
    const notes = status === "rejeitado" ? prompt("Motivo da rejeição (o aluno verá):") ?? null : null;
    const { error } = await supabase.from("student_documents").update({ status, notes, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const open = async (path: string) => {
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank"); else toast.error("Arquivo indisponível");
  };

  const pessoas: Pessoa[] = (() => {
    const g: Record<string, Pessoa> = {};
    rows.forEach((r) => {
      const lk = r.link_id ? links[r.link_id] : null;
      const uid = r.user_id ?? lk?.user_id ?? null;
      const key = uid ? `u:${uid}` : r.link_id ? `l:${r.link_id}` : `d:${r.id}`;
      if (!g[key]) {
        const pr = uid ? profs[uid] : null;
        const nome = pr?.display_name || lk?.student_name || lk?.label || pr?.email || "Sem nome";
        g[key] = { key, nome, contato: lk?.student_phone || lk?.student_email || pr?.email || "", phone: lk?.student_phone ?? null,
          rotulo: lk?.label ?? null, docs: [], ultimo: r.created_at };
      }
      g[key].docs.push(r);
      if (r.created_at > g[key].ultimo) g[key].ultimo = r.created_at;
    });
    return Object.values(g).sort((a, b) => b.ultimo.localeCompare(a.ultimo));
  })();

  const filtered = pessoas.filter((p) => !q || `${p.nome} ${p.contato} ${p.rotulo ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const atual = pessoas.find((p) => p.key === sel) ?? null;

  const exportar = () => downloadCsv("documentos_alunos", ["Aluno", "Contato", "Documento", "Arquivo", "Status", "Enviado em"],
    filtered.flatMap((p) => p.docs.map((r) => [p.nome, p.contato, DOC_LABEL(r.doc_type), r.file_name ?? "", r.status, dateCsv(r.created_at)])));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-primary">Documentos enviados pelos alunos</h2>
        <Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar</Button>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aluno…" className="max-w-sm" />
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {filtered.map((p) => {
          const pend = p.docs.filter((d) => d.status === "enviado" || d.status === "pendente").length;
          return (
            <button key={p.key} onClick={() => setSel(p.key)} className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-secondary/40">
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{[p.rotulo, p.contato].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm">
                <span className="text-muted-foreground hidden sm:inline">{p.docs.length} documento(s)</span>
                {pend > 0 && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-accent text-accent-foreground">{pend} para conferir</span>}
                <span className="inline-flex items-center gap-1 text-primary font-medium"><Eye className="size-4" /> Conferir</span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum documento enviado.</p>}
      </div>

      <Dialog open={!!atual} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{atual?.nome}</DialogTitle></DialogHeader>
          {atual && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{[atual.rotulo, atual.contato].filter(Boolean).join(" · ")}</p>
              {atual.phone && (
                <a href={`https://wa.me/55${atual.phone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1">Falar no WhatsApp <ExternalLink className="size-3" /></a>
              )}
              {atual.docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{DOC_LABEL(d.doc_type)}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.file_name} · {new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Select value={d.status} onValueChange={(v) => setStatus(d, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enviado">enviado</SelectItem>
                        <SelectItem value="aprovado">aprovado</SelectItem>
                        <SelectItem value="rejeitado">recusado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => open(d.file_path)}><Eye className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const empty: Partial<Doc> = { title: "", description: "", url: "", categoria: "geral", visible_to: "alunos", sort_order: 100, active: true };

const Inner = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Doc>>(empty);

  const load = async () => {
    const { data, error } = await supabase.from("doc_links").select("*").order("sort_order").order("title");
    if (error) return toast.error(error.message);
    setList((data ?? []) as Doc[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.title?.trim() || !editing.url?.trim()) return toast.error("Título e URL são obrigatórios");
    const payload: any = {
      title: editing.title!.trim(), description: editing.description ?? null, url: editing.url!.trim(),
      categoria: editing.categoria ?? "geral", icon: editing.icon ?? null,
      visible_to: editing.visible_to ?? "alunos", sort_order: editing.sort_order ?? 100,
      active: editing.active !== false,
    };
    const { error } = editing.id
      ? await supabase.from("doc_links").update(payload).eq("id", editing.id)
      : await supabase.from("doc_links").insert({ ...payload, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("doc_links").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><LinkIcon className="size-7" /> Documentos e Links</h1>
          <p className="text-muted-foreground">Biblioteca de materiais e links compartilhados com os alunos.</p>
        </div>
        <Button variant="hero" onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="size-4" /> Novo item</Button>
      </div>

      <DocUploadLinksPanel />

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Categoria</th>
              <th className="text-left p-3">Visível para</th>
              <th className="text-left p-3">URL</th>
              <th className="text-left p-3">Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="p-3 font-medium">{d.title}</td>
                <td className="p-3 text-muted-foreground">{d.categoria}</td>
                <td className="p-3">{d.visible_to}</td>
                <td className="p-3"><a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Abrir <ExternalLink className="size-3" /></a></td>
                <td className="p-3">{d.active ? "Sim" : "Não"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d.id)}><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum item.</td></tr>}
          </tbody>
        </table>
      </div>

      <StudentDocsPanel />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Editar" : "Novo"} documento/link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>URL *</Label><Input value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Descrição</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Input value={editing.categoria ?? "geral"} onChange={(e) => setEditing({ ...editing, categoria: e.target.value })} /></div>
              <div>
                <Label>Visível para</Label>
                <Select value={editing.visible_to ?? "alunos"} onValueChange={(v) => setEditing({ ...editing, visible_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alunos">Alunos e staff</SelectItem>
                    <SelectItem value="staff">Apenas staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2"><Switch checked={editing.active !== false} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><span className="text-sm">Ativo</span></label>
            </div>
            <Button variant="hero" className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminDocumentosLinks() {
  return <RequirePermission perm="manage_content"><Inner /></RequirePermission>;
}
