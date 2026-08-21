import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { brl } from "./MarketingDashboard";

type Campaign = {
  id: string; nome: string; objetivo: string | null; canal: string; status: string;
  budget_cents: number; gasto_cents: number; leads: number; vendas: number; receita_cents: number;
  inicio: string | null; fim: string | null; observacoes: string | null;
};

const CANAIS = ["instagram", "facebook", "google", "whatsapp", "email", "tiktok", "offline", "indicacao"];
const STATUS = ["planejada", "ativa", "pausada", "encerrada"];

const empty = {
  nome: "", objetivo: "", canal: "instagram", status: "planejada",
  budget: "", gasto: "", leads: "", vendas: "", receita: "",
  inicio: "", fim: "", observacoes: "",
};

export default function MarketingCampanhas() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("mkt_campaigns").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Campaign[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...empty }); setOpen(true); }
  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      nome: c.nome, objetivo: c.objetivo ?? "", canal: c.canal, status: c.status,
      budget: String((c.budget_cents / 100) || ""), gasto: String((c.gasto_cents / 100) || ""),
      leads: String(c.leads || ""), vendas: String(c.vendas || ""), receita: String((c.receita_cents / 100) || ""),
      inicio: c.inicio ?? "", fim: c.fim ?? "", observacoes: c.observacoes ?? "",
    });
    setOpen(true);
  }

  const money = (v: string) => Math.round((parseFloat(v.replace(",", ".")) || 0) * 100);

  async function save() {
    if (!form.nome.trim()) { toast.error("Informe o nome da campanha"); return; }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      nome: form.nome.trim(),
      objetivo: form.objetivo || null,
      canal: form.canal,
      status: form.status,
      budget_cents: money(form.budget),
      gasto_cents: money(form.gasto),
      receita_cents: money(form.receita),
      leads: parseInt(form.leads) || 0,
      vendas: parseInt(form.vendas) || 0,
      inicio: form.inicio || null,
      fim: form.fim || null,
      observacoes: form.observacoes || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("mkt_campaigns").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("mkt_campaigns").insert({ ...payload, created_by: auth.user?.id ?? null }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Campanha atualizada" : "Campanha criada");
    setOpen(false); load();
  }

  async function remove(c: Campaign) {
    if (!confirm(`Excluir a campanha "${c.nome}"?`)) return;
    const { error } = await supabase.from("mkt_campaigns").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha excluída"); load();
  }

  function exportCsv() {
    const head = ["Nome", "Canal", "Status", "Início", "Fim", "Verba", "Gasto", "Leads", "Vendas", "Receita", "CPL", "ROI %"];
    const lines = rows.map(c => {
      const cpl = c.leads ? c.gasto_cents / c.leads / 100 : 0;
      const roi = c.gasto_cents ? ((c.receita_cents - c.gasto_cents) / c.gasto_cents) * 100 : 0;
      return [c.nome, c.canal, c.status, c.inicio ?? "", c.fim ?? "",
        (c.budget_cents / 100).toFixed(2), (c.gasto_cents / 100).toFixed(2),
        c.leads, c.vendas, (c.receita_cents / 100).toFixed(2), cpl.toFixed(2), roi.toFixed(0)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
    });
    const csv = "\uFEFF" + [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `campanhas-marketing-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Campanhas ({rows.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="size-4 mr-1" />Excel/CSV</Button>
          <Button onClick={openNew}><Plus className="size-4 mr-1" />Nova campanha</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhuma campanha cadastrada. Clique em "Nova campanha".</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(c => {
            const roi = c.gasto_cents ? ((c.receita_cents - c.gasto_cents) / c.gasto_cents) * 100 : 0;
            return (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground capitalize">{c.canal}</div>
                  </div>
                  <Badge variant={c.status === "ativa" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                </div>
                {c.objetivo && <p className="text-sm text-muted-foreground line-clamp-2">{c.objetivo}</p>}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Verba:</span> {brl(c.budget_cents)}</div>
                  <div><span className="text-muted-foreground">Gasto:</span> {brl(c.gasto_cents)}</div>
                  <div><span className="text-muted-foreground">Leads:</span> {c.leads}</div>
                  <div><span className="text-muted-foreground">Vendas:</span> {c.vendas}</div>
                  <div><span className="text-muted-foreground">Receita:</span> {brl(c.receita_cents)}</div>
                  <div className={roi >= 0 ? "text-emerald-600" : "text-destructive"}>ROI: {roi.toFixed(0)}%</div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="size-3.5 mr-1" />Editar</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c)}><Trash2 className="size-3.5" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar campanha" : "Nova campanha"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Captação NR-35 Setembro" />
            </div>
            <div className="sm:col-span-2">
              <Label>Objetivo</Label>
              <Textarea rows={2} value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} />
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={form.canal} onValueChange={v => setForm({ ...form, canal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Início</Label><Input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} /></div>
            <div><Label>Fim</Label><Input type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} /></div>
            <div><Label>Verba (R$)</Label><Input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0,00" /></div>
            <div><Label>Gasto (R$)</Label><Input value={form.gasto} onChange={e => setForm({ ...form, gasto: e.target.value })} placeholder="0,00" /></div>
            <div><Label>Leads gerados</Label><Input value={form.leads} onChange={e => setForm({ ...form, leads: e.target.value })} placeholder="0" /></div>
            <div><Label>Vendas</Label><Input value={form.vendas} onChange={e => setForm({ ...form, vendas: e.target.value })} placeholder="0" /></div>
            <div className="sm:col-span-2"><Label>Receita atribuída (R$)</Label><Input value={form.receita} onChange={e => setForm({ ...form, receita: e.target.value })} placeholder="0,00" /></div>
            <div className="sm:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 mr-1 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
