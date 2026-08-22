import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { PERMISSION_GROUPS, ALL_PERMISSIONS, permLabel } from "@/lib/permissions";

const PERMS = ALL_PERMISSIONS;
const BASE_ROLES = [
  { id: "viewer", label: "Visualizador (base)" },
  { id: "certificadora", label: "Certificadora (base)" },
  { id: "editor", label: "Editor (base)" },
  { id: "admin", label: "Administrador (base)" },
];

type RoleDef = {
  key: string; label: string; description: string | null;
  base_role: "viewer" | "certificadora" | "editor" | "admin" | "super_admin";
  permissions: string[]; is_system: boolean; sort_order: number;
};

const empty: RoleDef = { key: "", label: "", description: "", base_role: "viewer", permissions: [], is_system: false, sort_order: 100 };

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const Inner = () => {
  const [list, setList] = useState<RoleDef[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDef>(empty);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("role_definitions").select("*").order("sort_order").order("label");
    setList((data ?? []) as RoleDef[]);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing({ ...empty }); setIsNew(true); setOpen(true); };
  const startEdit = (r: RoleDef) => { setEditing({ ...r }); setIsNew(false); setOpen(true); };

  const save = async () => {
    if (!editing.label.trim()) return toast.error("Informe o nome do cargo");
    const key = isNew ? (editing.key.trim() || slug(editing.label)) : editing.key;
    if (!key) return toast.error("Chave inválida");
    setSaving(true);
    try {
      const payload = {
        key, label: editing.label.trim(),
        description: editing.description?.trim() || null,
        base_role: editing.base_role,
        permissions: editing.permissions,
        sort_order: editing.sort_order || 100,
      };
      const { error } = isNew
        ? await (supabase as any).from("role_definitions").insert(payload)
        : await (supabase as any).from("role_definitions").update(payload).eq("key", key);
      if (error) throw error;
      toast.success("Cargo salvo!");
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const remove = async (r: RoleDef) => {
    if (r.is_system) return toast.error("Cargo do sistema não pode ser excluído");
    if (!confirm(`Excluir cargo "${r.label}"?`)) return;
    const { error } = await (supabase as any).from("role_definitions").delete().eq("key", r.key);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const togglePerm = (p: string) =>
    setEditing(s => ({ ...s, permissions: s.permissions.includes(p) ? s.permissions.filter(x => x !== p) : [...s.permissions, p] }));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2"><Shield /> Cargos & permissões</h1>
          <p className="text-sm text-muted-foreground">Crie cargos personalizados (vendedor, professor…) e defina o que cada um pode fazer.</p>
        </div>
        <Button variant="hero" onClick={startNew}><Plus className="size-4" /> Novo cargo</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(r => (
          <Card key={r.key} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary">{r.label}</h3>
                    {r.is_system && <Badge variant="secondary" className="text-[10px]"><Lock className="size-3" /> sistema</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{r.key}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="size-4" /></Button>
                  {!r.is_system && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="size-4" /></Button>}
                </div>
              </div>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              <div className="text-[11px] text-muted-foreground">Base: <span className="font-mono">{r.base_role}</span></div>
              <div className="flex flex-wrap gap-1">
                {r.permissions.length === 0 && <span className="text-[11px] text-muted-foreground italic">sem permissões</span>}
                {r.permissions.map(p => (
                  <Badge key={p} variant="outline" className="text-[10px]">{permLabel(p)}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "Novo cargo" : `Editar: ${editing.label}`}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Nome <span className="text-destructive">*</span></Label><Input value={editing.label} onChange={e => setEditing(s => ({ ...s, label: e.target.value }))} placeholder="Ex: Professor" /></div>
              <div>
                <Label>Chave {isNew && <span className="text-xs text-muted-foreground">(auto)</span>}</Label>
                <Input value={editing.key} onChange={e => setEditing(s => ({ ...s, key: slug(e.target.value) }))} placeholder={slug(editing.label) || "ex_professor"} disabled={!isNew || editing.is_system} className="font-mono" />
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={2} value={editing.description || ""} onChange={e => setEditing(s => ({ ...s, description: e.target.value }))} /></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Papel base</Label>
                <Select value={editing.base_role === "super_admin" ? "admin" : editing.base_role} onValueChange={(v) => setEditing(s => ({ ...s, base_role: v as any }))} disabled={editing.is_system}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BASE_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order} onChange={e => setEditing(s => ({ ...s, sort_order: parseInt(e.target.value) || 100 }))} /></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Permissões (pastas do painel e ações)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s => ({ ...s, permissions: PERMS.map(p => p.id) }))}>Marcar tudo</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s => ({ ...s, permissions: [] }))}>Limpar</Button>
                </div>
              </div>
              {PERMISSION_GROUPS.map(g => {
                const ids = g.items.map(i => i.id);
                const allOn = ids.every(id => editing.permissions.includes(id));
                return (
                  <div key={g.group} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">{g.group}</span>
                      <button type="button" className="text-[11px] text-muted-foreground hover:text-primary"
                        onClick={() => setEditing(s => ({
                          ...s,
                          permissions: allOn ? s.permissions.filter(p => !ids.includes(p)) : Array.from(new Set([...s.permissions, ...ids])),
                        }))}>
                        {allOn ? "desmarcar grupo" : "marcar grupo"}
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {g.items.map(p => (
                        <label key={p.id} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-secondary/40 cursor-pointer">
                          <Checkbox checked={editing.permissions.includes(p.id)} onCheckedChange={() => togglePerm(p.id)} />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="hero" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminCargos = () => <RequirePermission perm="manage_users"><Inner /></RequirePermission>;
export default AdminCargos;