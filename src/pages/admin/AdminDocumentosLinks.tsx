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

type Doc = {
  id: string; title: string; description: string | null; url: string;
  categoria: string | null; icon: string | null; visible_to: string;
  sort_order: number; active: boolean;
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
