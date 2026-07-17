import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Copy, Tag } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";

type Coupon = {
  id: string; code: string; discount_type: "percent" | "fixed"; discount_value: number;
  max_uses: number | null; uses: number; valid_until: string | null;
  course_id: string | null; active: boolean;
};

const empty: Partial<Coupon> = { code: "", discount_type: "percent", discount_value: 10, active: true };

const AdminCuponsInner = () => {
  const { activeAccountId } = useCommercialAccounts();
  const [list, setList] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon>>(empty);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);

  const load = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Coupon[]);
    const { data: cs } = await supabase.from("courses").select("id,title").eq("active", true).order("title");
    setCourses(cs ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.code) return toast.error("Código obrigatório");
    if (!editing.discount_value || editing.discount_value <= 0) return toast.error("Valor de desconto inválido");
    setSaving(true);
    try {
      const payload: any = {
        code: editing.code!.toUpperCase().trim(),
        discount_type: editing.discount_type,
        discount_value: editing.discount_value,
        max_uses: editing.max_uses || null,
        valid_until: editing.valid_until || null,
        course_id: editing.course_id || null,
        active: editing.active !== false,
      };
      const { error } = editing.id
        ? await supabase.from("coupons").update(payload).eq("id", editing.id)
        : await supabase.from("coupons").insert(withAccount(payload, activeAccountId));
      if (error) throw error;
      toast.success("Cupom salvo!");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Excluir cupom "${c.code}"?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const shareLink = (c: Coupon) => {
    const origin = window.location.origin;
    const url = `${origin}/cursos?cupom=${c.code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2"><Tag className="size-7" /> Cupons de desconto</h1>
          <p className="text-muted-foreground text-sm">Crie códigos para aplicar desconto no checkout dos cursos</p>
        </div>
        <Button onClick={()=>{setEditing(empty); setOpen(true);}} variant="hero"><Plus className="size-4" /> Novo cupom</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Código</th>
              <th className="text-left p-3">Desconto</th>
              <th className="text-left p-3">Usos</th>
              <th className="text-left p-3">Validade</th>
              <th className="text-left p-3">Curso</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3 font-mono font-bold text-primary">{c.code}</td>
                <td className="p-3">{c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${c.discount_value}`}</td>
                <td className="p-3 text-muted-foreground">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                <td className="p-3 text-muted-foreground text-xs">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "sem validade"}</td>
                <td className="p-3 text-muted-foreground text-xs">{c.course_id ? courses.find(x=>x.id===c.course_id)?.title ?? "—" : "Todos"}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${c.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{c.active ? "Ativo" : "Inativo"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => shareLink(c)} title="Copiar link"><Copy className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => {setEditing(c); setOpen(true);}}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c)} className="text-destructive"><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum cupom ainda. Crie o primeiro!</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Código *</Label><Input value={editing.code ?? ""} onChange={e=>setEditing({...editing, code: e.target.value.toUpperCase()})} placeholder="BLACKFRIDAY10" className="font-mono uppercase" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={editing.discount_type ?? "percent"} onValueChange={(v: any)=>setEditing({...editing, discount_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor *</Label><Input type="number" value={editing.discount_value ?? ""} onChange={e=>setEditing({...editing, discount_value: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Limite de usos</Label><Input type="number" value={editing.max_uses ?? ""} onChange={e=>setEditing({...editing, max_uses: e.target.value ? Number(e.target.value) : null})} placeholder="vazio = ilimitado" /></div>
              <div><Label>Válido até</Label><Input type="date" value={editing.valid_until ? editing.valid_until.split("T")[0] : ""} onChange={e=>setEditing({...editing, valid_until: e.target.value || null})} /></div>
            </div>
            <div>
              <Label>Curso específico (opcional)</Label>
              <Select value={editing.course_id ?? "all"} onValueChange={v=>setEditing({...editing, course_id: v === "all" ? null : v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cursos</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2"><Switch checked={editing.active !== false} onCheckedChange={v=>setEditing({...editing, active: v})} /> <span className="text-sm">Ativo</span></label>
            <Button onClick={save} variant="hero" className="w-full" disabled={saving}>{saving?"Salvando...":"Salvar cupom"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminCupons = () => <RequirePermission perm="manage_courses"><AdminCuponsInner /></RequirePermission>;
export default AdminCupons;