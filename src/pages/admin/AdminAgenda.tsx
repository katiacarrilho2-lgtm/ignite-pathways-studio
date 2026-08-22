import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Ev = { id: string; titulo: string; descricao: string | null; tipo: string; department_id: string | null; inicio: string; fim: string | null; local: string | null };

const TIPOS = ["reuniao", "evento", "aula", "prova", "feriado", "visita", "outro"];
const tipoCor: Record<string, string> = {
  reuniao: "bg-primary/15 text-primary", evento: "bg-accent/20 text-accent-foreground",
  aula: "bg-secondary text-secondary-foreground", prova: "bg-destructive/15 text-destructive",
  feriado: "bg-muted text-muted-foreground", visita: "bg-primary/10 text-primary", outro: "bg-muted text-muted-foreground",
};
const dtLocal = (iso: string) => {
  const d = new Date(iso); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const Inner = () => {
  const { user } = useAuth();
  const [evs, setEvs] = useState<Ev[]>([]);
  const [depts, setDepts] = useState<{ id: string; nome: string }[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    const ini = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString();
    const fim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).toISOString();
    const [e, d] = await Promise.all([
      supabase.from("agenda_events" as any).select("*").gte("inicio", ini).lt("inicio", fim).order("inicio"),
      supabase.from("departments" as any).select("id,nome").eq("ativo", true).order("sort_order"),
    ]);
    setEvs((e.data ?? []) as any); setDepts((d.data ?? []) as any);
  }, [cursor]);
  useEffect(() => { load(); }, [load]);

  const dias = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const evsDoDia = (d: Date) => evs.filter(e => new Date(e.inicio).toDateString() === d.toDateString());

  const salvar = async () => {
    if (!form.titulo || !form.inicio) return toast.error("Informe título e início");
    const payload = {
      titulo: form.titulo, descricao: form.descricao || null, tipo: form.tipo || "reuniao",
      department_id: form.department_id || null, inicio: new Date(form.inicio).toISOString(),
      fim: form.fim ? new Date(form.fim).toISOString() : null, local: form.local || null,
      responsavel_id: user?.id ?? null, created_by: user?.id ?? null,
    };
    const { error } = form.id
      ? await supabase.from("agenda_events" as any).update(payload).eq("id", form.id)
      : await supabase.from("agenda_events" as any).insert(payload);
    if (error) return toast.error(error.message);
    logAudit("Agenda", form.id ? "editou evento" : "criou evento", form.titulo, form.id);
    toast.success("Salvo"); setOpen(false); setForm({}); load();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir evento?")) return;
    await supabase.from("agenda_events" as any).delete().eq("id", id);
    logAudit("Agenda", "excluiu evento", undefined, id);
    load();
  };

  const mesLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mover = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="size-6" /> Agenda Geral</h1>
          <p className="text-sm text-muted-foreground">Reuniões, eventos e compromissos da Multplick</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => mover(-1)}><ChevronLeft className="size-4" /></Button>
          <span className="px-2 text-sm font-medium capitalize w-40 text-center">{mesLabel}</span>
          <Button variant="outline" size="icon" onClick={() => mover(1)}><ChevronRight className="size-4" /></Button>
        </div>
        <Button onClick={() => { setForm({ inicio: new Date().toISOString() }); setOpen(true); }}><Plus className="size-4" /> Novo evento</Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground bg-secondary/50">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => <div key={d} className="p-2 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d, i) => {
            const outro = d.getMonth() !== cursor.getMonth();
            const hoje = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`min-h-[92px] border-t border-l border-border p-1 space-y-1 ${outro ? "bg-muted/30" : ""}`}>
                <div className={`text-[11px] font-medium ${hoje ? "bg-primary text-primary-foreground rounded-full w-5 h-5 grid place-items-center" : "text-muted-foreground"}`}>{d.getDate()}</div>
                {evsDoDia(d).map(e => (
                  <button key={e.id} onClick={() => { setForm(e); setOpen(true); }}
                    className={`w-full text-left text-[11px] px-1 py-0.5 rounded truncate ${tipoCor[e.tipo] ?? tipoCor.outro}`}
                    title={e.titulo}>
                    {new Date(e.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {e.titulo}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Eventos do mês</h2>
        {evs.map(e => (
          <div key={e.id} className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{e.tipo}</Badge>
            <span className="font-medium text-sm">{e.titulo}</span>
            <span className="text-xs text-muted-foreground">{new Date(e.inicio).toLocaleString("pt-BR")}{e.local ? ` · ${e.local}` : ""}</span>
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setForm(e); setOpen(true); }}><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => excluir(e.id)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        ))}
        {evs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento neste mês.</p>}
      </div>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm({}); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Evento da agenda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo ?? ""} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Tipo</Label>
                <Select value={form.tipo ?? "reuniao"} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Departamento</Label>
                <Select value={form.department_id ?? ""} onValueChange={v => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="datetime-local" value={form.inicio ? dtLocal(form.inicio) : ""} onChange={e => setForm({ ...form, inicio: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="datetime-local" value={form.fim ? dtLocal(form.fim) : ""} onChange={e => setForm({ ...form, fim: e.target.value })} /></div>
            </div>
            <div><Label>Local</Label><Input value={form.local ?? ""} onChange={e => setForm({ ...form, local: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={form.descricao ?? ""} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminAgenda() {
  return <RequirePermission perm="mod_agenda"><Inner /></RequirePermission>;
}
