import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, KeyRound, Trash2, ShieldCheck, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

type Profile = { user_id: string; email: string | null; display_name: string | null; username: string | null };
type RoleRow = { user_id: string; role: string };

const ROLES = ["super_admin", "admin", "editor", "viewer", "certificadora"] as const;

const Inner = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "editor" as string });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("user_id,email,display_name,username").order("username", { nullsFirst: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    const map: Record<string, string[]> = {};
    ((r ?? []) as RoleRow[]).forEach((x) => { (map[x.user_id] ||= []).push(x.role); });
    setRolesMap(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!form.password || form.password.length < 4) return toast.error("Senha mínima de 4 caracteres");
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          password: form.password,
          full_name: form.full_name,
          email: form.email || undefined,
          role: form.role,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Usuário criado (login: ${(data as any)?.username ?? "-"})`);
      setOpenNew(false); setForm({ full_name: "", email: "", password: "", role: "editor" });
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

  const toggleRole = async (uid: string, role: string) => {
    const has = (rolesMap[uid] ?? []).includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role as any);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: role as any });
      if (error) return toast.error(error.message);
    }
    load();
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
              <th className="text-left p-3">Papéis</th>
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
                    {ROLES.map((r) => {
                      const active = (rolesMap[p.user_id] ?? []).includes(r);
                      return (
                        <button key={r} onClick={() => toggleRole(p.user_id, r)}
                          className={`text-[11px] px-2 py-1 rounded-full border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/40"}`}>
                          {active && <ShieldCheck className="inline size-3 mr-1" />} {r}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
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
              <Label>Papel inicial</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">O login numérico (001, 002, …) é gerado automaticamente.</p>
            <Button variant="hero" className="w-full" disabled={saving} onClick={createUser}>{saving ? "Criando…" : "Criar usuário"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminUsuarios() {
  return <RequirePermission perm="manage_users"><Inner /></RequirePermission>;
}
