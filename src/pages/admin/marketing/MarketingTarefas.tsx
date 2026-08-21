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
import { Plus, Trash2, Loader2, GripVertical, Download } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string; titulo: string; descricao: string | null; status: string; prioridade: string;
  due_date: string | null; campaign_id: string | null; ordem: number;
};
type Campaign = { id: string; nome: string };

const COLUMNS = [
  { key: "backlog", label: "Ideias / Backlog", tone: "border-t-slate-400" },
  { key: "fazendo", label: "Em produção", tone: "border-t-sky-500" },
  { key: "revisao", label: "Em revisão", tone: "border-t-amber-500" },
  { key: "concluido", label: "Concluído", tone: "border-t-emerald-500" },
];
const PRIOS: Record<string, string> = { baixa: "text-muted-foreground", media: "text-sky-600", alta: "text-destructive" };

const empty = { titulo: "", descricao: "", status: "backlog", prioridade: "media", due_date: "", campaign_id: "none" };

export default function MarketingTarefas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  async function load() {
    const [t, c] = await Promise.all([
      supabase.from("mkt_tasks").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("mkt_campaigns").select("id,nome").order("nome"),
    ]);
    setTasks((t.data as Task[]) ?? []);
    setCampaigns((c.data as Campaign[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew(status = "backlog") { setEditing(null); setForm({ ...empty, status }); setOpen(true); }
  function openEdit(t: Task) {
    setEditing(t);
    setForm({
      titulo: t.titulo, descricao: t.descricao ?? "", status: t.status, prioridade: t.prioridade,
      due_date: t.due_date ?? "", campaign_id: t.campaign_id ?? "none",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.titulo.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao || null,
      status: form.status,
      prioridade: form.prioridade,
      due_date: form.due_date || null,
      campaign_id: form.campaign_id === "none" ? null : form.campaign_id,
      done_at: form.status === "concluido" ? new Date().toISOString() : null,
    };
    const { error } = editing
      ? await supabase.from("mkt_tasks").update(payload).eq("id", editing.id)
      : await supabase.from("mkt_tasks").insert({ ...payload, created_by: auth.user?.id ?? null });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Tarefa atualizada" : "Tarefa criada");
    setOpen(false); load();
  }

  async function remove(t: Task) {
    if (!confirm(`Excluir "${t.titulo}"?`)) return;
    const { error } = await supabase.from("mkt_tasks").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function moveTo(id: string, status: string) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status === status) return;
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
    const { error } = await supabase.from("mkt_tasks")
      .update({ status, done_at: status === "concluido" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) { toast.error(error.message); load(); }
  }

  function exportCsv() {
    const head = ["Título", "Status", "Prioridade", "Prazo", "Campanha"];
    const lines = tasks.map(t => [
      t.titulo, t.status, t.prioridade, t.due_date ?? "",
      campaigns.find(c => c.id === t.campaign_id)?.nome ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    const csv = "\uFEFF" + [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `tarefas-marketing-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  if (loading) return <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Quadro de tarefas</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="size-4 mr-1" />Excel/CSV</Button>
          <Button onClick={() => openNew()}><Plus className="size-4 mr-1" />Nova tarefa</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(col => {
          const items = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragId) moveTo(dragId, col.key); setDragId(null); }}
              className={`rounded-lg bg-muted/40 border border-border border-t-4 ${col.tone} p-3 min-h-[200px] space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              {items.map(t => {
                const late = t.due_date && t.due_date < hoje && t.status !== "concluido";
                return (
                  <Card key={t.id} draggable
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => openEdit(t)}
                    className="p-3 cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <GripVertical className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium ${t.status === "concluido" ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</div>
                        {t.descricao && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.descricao}</p>}
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className={PRIOS[t.prioridade] ?? ""}>● {t.prioridade}</span>
                          {t.due_date && (
                            <span className={late ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {new Date(t.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        {t.campaign_id && (
                          <div className="mt-1 text-[11px] text-primary truncate">
                            {campaigns.find(c => c.id === t.campaign_id)?.nome}
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive"
                        onClick={e => { e.stopPropagation(); remove(t); }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => openNew(col.key)}>
                <Plus className="size-3.5 mr-1" />Adicionar
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coluna</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div>
                <Label>Campanha</Label>
                <Select value={form.campaign_id} onValueChange={v => setForm({ ...form, campaign_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem campanha</SelectItem>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
