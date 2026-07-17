import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

type Category = { id: string; name: string; slug: string; sort_order: number; active: boolean };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const empty: Partial<Category> = { name: "", slug: "", sort_order: 100, active: true };

const AdminCategoriasInner = () => {
  const [list, setList] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("course_categories").select("*").order("sort_order");
    if (error) return toast.error(error.message);
    setList((data ?? []) as Category[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(empty); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setOpen(true); };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        slug: (editing.slug?.trim() || slugify(editing.name)),
        sort_order: editing.sort_order ?? 100,
        active: editing.active !== false,
      };
      const { error } = editing.id
        ? await supabase.from("course_categories").update(payload).eq("id", editing.id)
        : await supabase.from("course_categories").insert(payload);
      if (error) throw error;
      toast.success("Categoria salva!");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Excluir categoria "${c.name}"? Os cursos existentes manterão o nome dela como texto.`)) return;
    const { error } = await supabase.from("course_categories").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Categorias de cursos</h1>
          <p className="text-muted-foreground">Gerencie as categorias usadas no catálogo do site.</p>
        </div>
        <Button onClick={openNew} variant="hero"><Plus className="size-4" /> Nova categoria</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Ordem</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3 font-medium text-primary">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.slug}</td>
                <td className="p-3 text-muted-foreground">{c.sort_order}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${c.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                    {c.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c)} className="text-destructive"><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma categoria cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
            </div>
            <div>
              <Label>Slug (identificador)</Label>
              <Input value={editing.slug ?? ""} onChange={e => setEditing({ ...editing, slug: slugify(e.target.value) })} placeholder="ex: tecnicos" />
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input type="number" value={editing.sort_order ?? 100} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2">
              <Switch checked={editing.active !== false} onCheckedChange={v => setEditing({ ...editing, active: v })} />
              <span className="text-sm">Ativa no site</span>
            </label>
            <Button onClick={save} variant="hero" className="w-full" disabled={saving}>{saving ? "Salvando..." : "Salvar categoria"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminCategorias = () => <RequirePermission perm="manage_courses"><AdminCategoriasInner /></RequirePermission>;
export default AdminCategorias;