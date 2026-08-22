import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, KeyRound, Trash2, RefreshCcw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, permLabel } from "@/lib/permissions";

type Profile = { user_id: string; email: string | null; display_name: string | null; username: string | null };
type RoleRow = { user_id: string; role: string };
type PermRow = { user_id: string; permission: string };
type RoleDef = { key: string; label: string; description: string | null; base_role: string; permissions: string[]; is_system: boolean; sort_order: number };

const ALL_PERMS = ALL_PERMISSIONS;

const Inner = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string[]>>({});
  const [permsMap, setPermsMap] = useState<Record<string, string[]>>({});
  const [roleDefs, setRoleDefs] = useState<RoleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "editor" as string });
  const [saving, setSaving] = useState(false);

  const [editUid, setEditUid] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }, { data: up }, { data: rd }] = await Promise.all([
      supabase.from("profiles").select("user_id,email,display_name,username").order("username", { nullsFirst: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("user_permissions").select("user_id,permission"),
      (supabase as any).from("role_definitions").select("*").order("sort_order").order("label"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    const rm: Record<string, string[]> = {};
    ((r ?? []) as RoleRow[]).forEach((x) => { (rm[x.user_id] ||= []).push(x.role); });
    setRolesMap(rm);
    const pm: Record<string, string[]> = {};
    ((up ?? []) as PermRow[]).forEach((x) => { (pm[x.user_id] ||= []).push(x.permission); });
    setPermsMap(pm);
    setRoleDefs((rd ?? []) as RoleDef[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!form.password || form.password.length < 4) return toast.error("Senha mínima de 4 caracteres");
    const def = roleDefs.find(r => r.key === form.role);
    const baseRole = def && ["admin","editor","viewer","certificadora"].includes(def.base_role) ? def.base_role : "viewer";
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          password: form.password,
          full_name: form.full_name,
          email: form.email || undefined,
          role: baseRole,
          username_prefix: def?.key === "marketing" ? "M" : undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const uid = (data as any)?.user_id;
      if (uid && def?.permissions?.length) {
        await supabase.from("user_permissions").insert(
          def.permissions.map(p => ({ user_id: uid, permission: p as any })),
        );
      }
      toast.success(`Usuário criado (login: ${(data as any)?.username ?? "-"})`);
      setOpenNew(false); setForm({ full_name: "", email: "", password: "", role: form.role });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const resetPassword = async (uid: string) => {
    const pw = prompt("Nova senha (mínimo 4 caracteres):");
    if (!pw || pw.length < 4) return;
    const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { user_id: uid, password: pw } });
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error);
    toast.success("Senha atualizada");
  };

  const removeUser = async (uid: string, label: string) => {
    if (!confirm(`Excluir usuário ${label}? Esta ação é irreversível.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: uid } });
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error);
    toast.success("Usuário excluído"); load();
  };

  const openEdit = (uid: string) => {
    setEditUid(uid);
    setEditRoles([...(rolesMap[uid] ?? [])]);
    setEditPerms([...(permsMap[uid] ?? [])]);
  };

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const applyRoleTemplate = (key: string) => {
    const def = roleDefs.find(r => r.key === key);
    if (!def) return;
    // Base_role de sistema vai para user_roles; qualquer permissão vai para user_permissions.
    const systemRole = ["super_admin","admin","editor","viewer","certificadora"].includes(def.base_role) ? def.base_role : "viewer";
    setEditRoles(prev => Array.from(new Set([...prev, systemRole])));
    setEditPerms(prev => Array.from(new Set([...prev, ...def.permissions])));
    toast.success(`Cargo "${def.label}" aplicado — revise e salve.`);
  };

  const saveEdit = async () => {
    if (!editUid) return;
    setSavingEdit(true);
    try {
      // Roles diff
      const currentRoles = rolesMap[editUid] ?? [];
      const toAddRoles = editRoles.filter(r => !currentRoles.includes(r));
      const toDelRoles = currentRoles.filter(r => !editRoles.includes(r));
      for (const r of toDelRoles) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", editUid).eq("role", r as any);
        if (error) throw error;
      }
      if (toAddRoles.length) {
        const { error } = await supabase.from("user_roles").insert(toAddRoles.map(r => ({ user_id: editUid, role: r as any })));
        if (error) throw error;
      }
      // Perms diff
      const currentPerms = permsMap[editUid] ?? [];
      const toAddPerms = editPerms.filter(p => !currentPerms.includes(p));
      const toDelPerms = currentPerms.filter(p => !editPerms.includes(p));
      for (const p of toDelPerms) {
        const { error } = await supabase.from("user_permissions").delete().eq("user_id", editUid).eq("permission", p as any);
        if (error) throw error;
      }
      if (toAddPerms.length) {
        const { error } = await supabase.from("user_permissions").insert(toAddPerms.map(p => ({ user_id: editUid, permission: p as any })));
        if (error) throw error;
      }
      toast.success("Permissões atualizadas");
      setEditUid(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSavingEdit(false); }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Usuários e permissões</h1>
          <p className="text-muted-foreground">Gerencie o acesso da equipe interna à plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /> Recarregar</Button>
          <Button variant="hero" onClick={() => setOpenNew(true)}><Plus className="size-4" /> Novo usuário</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Login</th>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">E-mail</th>
              <th className="text-left p-3">Papéis / Permissões</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
            {!loading && profiles.map((p) => (
              <tr key={p.user_id} className="border-t border-border align-top">
                <td className="p-3 font-mono text-primary">{p.username ?? "—"}</td>
                <td className="p-3">{p.display_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.email ?? "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(rolesMap[p.user_id] ?? []).map(r => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
                    {(permsMap[p.user_id] ?? []).map(pm => <Badge key={pm} variant="outline" className="text-[10px]">{permLabel(pm)}</Badge>)}
                    {(rolesMap[p.user_id] ?? []).length === 0 && (permsMap[p.user_id] ?? []).length === 0 && (
                      <span className="text-xs text-muted-foreground italic">sem acesso</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p.user_id)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => resetPassword(p.user_id)}><KeyRound className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeUser(p.user_id, p.username ?? p.email ?? p.user_id)}><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {!loading && profiles.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>E-mail (opcional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Senha *</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>Cargo inicial</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleDefs.filter(r => ["super_admin","admin","editor","viewer","certificadora"].includes(r.base_role)).map((r) =>
                    <SelectItem key={r.key} value={r.base_role}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Após criar, use ✏️ para aplicar cargos personalizados (ex.: vendedor) e permissões finas.</p>
            </div>
            <p className="text-xs text-muted-foreground">O login numérico (001, 002, …) é gerado automaticamente.</p>
            <Button variant="hero" className="w-full" disabled={saving} onClick={createUser}>{saving ? "Criando…" : "Criar usuário"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUid} onOpenChange={(o) => !o && setEditUid(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar acesso do usuário</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Aplicar cargo pronto</Label>
              <div className="flex flex-wrap gap-2">
                {roleDefs.map(rd => (
                  <button key={rd.key} type="button" onClick={() => applyRoleTemplate(rd.key)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary/60 hover:bg-secondary/40 transition">
                    {rd.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Aplicar um cargo adiciona o papel base e as permissões — você pode ajustar abaixo.</p>
            </div>

            <div>
              <Label className="mb-2 block">Papéis do sistema</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {["super_admin","admin","editor","viewer","certificadora"].map(r => (
                  <label key={r} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-secondary/40 cursor-pointer">
                    <Checkbox checked={editRoles.includes(r)} onCheckedChange={() => setEditRoles(prev => toggle(prev, r))} />
                    <span className="text-sm font-mono">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissões individuais (pastas e ações)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditPerms(ALL_PERMS.map(p => p.id))}>Marcar tudo</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditPerms([])}>Limpar</Button>
                </div>
              </div>
              {PERMISSION_GROUPS.map(g => {
                const ids = g.items.map(i => i.id);
                const allOn = ids.every(id => editPerms.includes(id));
                return (
                  <div key={g.group} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">{g.group}</span>
                      <button type="button" className="text-[11px] text-muted-foreground hover:text-primary"
                        onClick={() => setEditPerms(prev => allOn ? prev.filter(p => !ids.includes(p)) : Array.from(new Set([...prev, ...ids])))}>
                        {allOn ? "desmarcar grupo" : "marcar grupo"}
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {g.items.map(p => (
                        <label key={p.id} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-secondary/40 cursor-pointer">
                          <Checkbox checked={editPerms.includes(p.id)} onCheckedChange={() => setEditPerms(prev => toggle(prev, p.id))} />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditUid(null)}>Cancelar</Button>
              <Button variant="hero" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Salvando…" : "Salvar acesso"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminUsuarios() {
  return <RequirePermission perm="manage_users"><Inner /></RequirePermission>;
}
