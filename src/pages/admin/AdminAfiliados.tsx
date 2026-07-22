import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RefreshCcw, Users } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

type Aff = {
  id: string; user_id: string; code: string; commission_pct: number; status: string; pix_key: string | null; notes: string | null;
  profile?: { username: string | null; display_name: string | null; email: string | null } | null;
};
type Ref = {
  id: string; affiliate_id: string; valor_cents: number; commission_cents: number; status: string; paid_at: string | null; created_at: string;
};

const Inner = () => {
  const [list, setList] = useState<Aff[]>([]);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [students, setStudents] = useState<{ user_id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", code: "", commission_pct: 10, pix_key: "" });

  const load = async () => {
    const [{ data: a }, { data: r }, { data: p }] = await Promise.all([
      supabase.from("affiliates").select("*, profile:profiles!affiliates_user_id_fkey(username,display_name,email)").order("created_at", { ascending: false }),
      supabase.from("affiliate_referrals").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id,username,display_name,email").order("username"),
    ]);
    setList((a ?? []) as any);
    setRefs((r ?? []) as any);
    setStudents((p ?? []).map((x: any) => ({ user_id: x.user_id, label: `${x.username ?? ""} · ${x.display_name ?? x.email ?? ""}` })));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.user_id || !form.code.trim()) return toast.error("Usuário e código obrigatórios");
    const { error } = await supabase.from("affiliates").insert({
      user_id: form.user_id, code: form.code.trim(), commission_pct: form.commission_pct, pix_key: form.pix_key || null, status: "ativo",
    });
    if (error) return toast.error(error.message);
    toast.success("Afiliado criado"); setOpen(false); setForm({ user_id: "", code: "", commission_pct: 10, pix_key: "" }); load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("affiliates").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover afiliado?")) return;
    const { error } = await supabase.from("affiliates").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const totalPend = refs.filter((r) => r.status === "pendente").reduce((s, r) => s + (r.commission_cents ?? 0), 0);
  const totalPago = refs.filter((r) => r.status === "pago").reduce((s, r) => s + (r.commission_cents ?? 0), 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Users className="size-7" /> Afiliados</h1>
          <p className="text-muted-foreground">Programa de indicações — códigos, comissões e pagamentos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /></Button>
          <Button variant="hero" onClick={() => setOpen(true)}><Plus className="size-4" /> Novo afiliado</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Afiliados ativos</div><div className="text-2xl font-bold text-primary">{list.filter((a) => a.status === "ativo").length}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Comissões pendentes</div><div className="text-2xl font-bold text-amber-600">R$ {(totalPend / 100).toFixed(2)}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Comissões pagas</div><div className="text-2xl font-bold text-emerald-600">R$ {(totalPago / 100).toFixed(2)}</div></div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Afiliado</th>
              <th className="text-left p-3">Código</th>
              <th className="text-left p-3">%</th>
              <th className="text-left p-3">PIX</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">{a.profile ? `${a.profile.username ?? ""} · ${a.profile.display_name ?? a.profile.email ?? ""}` : a.user_id.slice(0, 8)}</td>
                <td className="p-3 font-mono">{a.code}</td>
                <td className="p-3">{a.commission_pct}%</td>
                <td className="p-3 text-muted-foreground">{a.pix_key ?? "—"}</td>
                <td className="p-3">
                  <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">ativo</SelectItem>
                      <SelectItem value="pausado">pausado</SelectItem>
                      <SelectItem value="bloqueado">bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}><Trash2 className="size-4" /></Button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum afiliado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo afiliado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Usuário *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: MARIA10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Comissão (%)</Label><Input type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })} /></div>
              <div><Label>Chave PIX</Label><Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} /></div>
            </div>
            <Button variant="hero" className="w-full" onClick={create}>Criar afiliado</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminAfiliados() {
  return <RequirePermission perm="manage_affiliates"><Inner /></RequirePermission>;
}

