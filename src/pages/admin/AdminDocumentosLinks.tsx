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
  id: string; user_id: string; doc_type: string; file_path: string; file_name: string | null;
  status: string; notes: string | null; created_at: string;
};

const StudentDocsPanel = () => {
  const [rows, setRows] = useState<StudentDoc[]>([]);
  const [profs, setProfs] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("student_documents").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as StudentDoc[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
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

  const filtered = rows.filter((r) => {
    const p = profs[r.user_id];
    return !q || `${p?.display_name ?? ""} ${p?.email ?? ""} ${DOC_LABEL(r.doc_type)}`.toLowerCase().includes(q.toLowerCase());
  });

  const exportar = () => downloadCsv("documentos_alunos", ["Aluno", "E-mail", "Documento", "Arquivo", "Status", "Enviado em"],
    filtered.map((r) => [profs[r.user_id]?.display_name ?? "", profs[r.user_id]?.email ?? "", DOC_LABEL(r.doc_type), r.file_name ?? "", r.status, dateCsv(r.created_at)]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-primary">Documentos enviados pelos alunos</h2>
        <Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar</Button>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aluno ou documento…" className="max-w-sm" />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Aluno</th>
              <th className="text-left p-3">Documento</th>
              <th className="text-left p-3">Arquivo</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Enviado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{profs[r.user_id]?.display_name ?? profs[r.user_id]?.email ?? (r.user_id ? r.user_id.slice(0, 8) : "Link público")}</td>
                <td className="p-3">{DOC_LABEL(r.doc_type)}</td>
                <td className="p-3 text-muted-foreground truncate max-w-[220px]">{r.file_name ?? "—"}</td>
                <td className="p-3">
                  <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">pendente</SelectItem>
                      <SelectItem value="enviado">enviado</SelectItem>
                      <SelectItem value="aprovado">aprovado</SelectItem>
                      <SelectItem value="rejeitado">rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => open(r.file_path)}><Eye className="size-4" /></Button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum documento enviado.</td></tr>}
          </tbody>
        </table>
      </div>
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
