import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, ListChecks, Check } from "lucide-react";

type Task = { id: string; titulo: string; descricao: string | null; status: string; prioridade: string; due_date: string | null };
type Event = { id: string; titulo: string; descricao: string | null; inicio: string; local: string | null };

const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const iso = (d: Date) => `${ymOf(d)}-${String(d.getDate()).padStart(2, "0")}`;
const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function MarketingAgendaWidget() {
  const [ref, setRef] = useState(new Date());
  const [selected, setSelected] = useState(iso(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [taskDlg, setTaskDlg] = useState(false);
  const [evDlg, setEvDlg] = useState(false);
  const [taskForm, setTaskForm] = useState({ titulo: "", due_date: iso(new Date()), descricao: "" });
  const [evForm, setEvForm] = useState({ titulo: "", data: iso(new Date()), hora: "09:00", local: "", descricao: "" });

  const load = async () => {
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from("mkt_tasks").select("id,titulo,descricao,status,prioridade,due_date").order("due_date", { ascending: true }),
      supabase.from("agenda_events").select("id,titulo,descricao,inicio,local").eq("tipo", "marketing").order("inicio", { ascending: true }),
    ]);
    setTasks((t ?? []) as Task[]);
    setEvents((e ?? []) as Event[]);
  };

  useEffect(() => { load(); }, []);

  const grid = useMemo(() => {
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [ref]);

  const dayItems = (day: string) => ({
    tasks: tasks.filter(t => t.due_date === day),
    events: events.filter(e => iso(new Date(e.inicio)) === day),
  });

  const selDay = dayItems(selected);
  const pending = tasks.filter(t => t.status !== "concluido");

  const saveTask = async () => {
    if (!taskForm.titulo.trim()) return toast.error("Informe o título");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("mkt_tasks").insert({
      titulo: taskForm.titulo.trim(),
      descricao: taskForm.descricao.trim() || null,
      due_date: taskForm.due_date || null,
      status: "backlog",
      prioridade: "media",
      created_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada");
    setTaskDlg(false);
    setTaskForm({ titulo: "", due_date: selected, descricao: "" });
    load();
  };

  const saveEvent = async () => {
    if (!evForm.titulo.trim()) return toast.error("Informe o título");
    const { data: { user } } = await supabase.auth.getUser();
    const inicio = new Date(`${evForm.data}T${evForm.hora || "09:00"}:00`);
    const { error } = await supabase.from("agenda_events").insert({
      titulo: evForm.titulo.trim(),
      descricao: evForm.descricao.trim() || null,
      tipo: "marketing",
      local: evForm.local.trim() || null,
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + 3600000).toISOString(),
      created_by: user?.id ?? null,
      responsavel_id: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Evento criado");
    setEvDlg(false);
    setEvForm({ titulo: "", data: selected, hora: "09:00", local: "", descricao: "" });
    load();
  };

  const toggleTask = async (t: Task) => {
    const done = t.status === "concluido";
    const { error } = await supabase.from("mkt_tasks")
      .update({ status: done ? "backlog" : "concluido", done_at: done ? null : new Date().toISOString() })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };

  const removeEvent = async (id: string) => {
    if (!confirm("Excluir evento?")) return;
    await supabase.from("agenda_events").delete().eq("id", id);
    load();
  };

  const removeTask = async (id: string) => {
    if (!confirm("Excluir tarefa?")) return;
    await supabase.from("mkt_tasks").delete().eq("id", id);
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Agenda do Marketing</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">{monthNames[ref.getMonth()]} {ref.getFullYear()}</span>
            <Button variant="ghost" size="icon" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
          {weekDays.map(w => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const key = iso(d);
            const items = dayItems(key);
            const outside = d.getMonth() !== ref.getMonth();
            const isToday = key === iso(new Date());
            const count = items.tasks.length + items.events.length;
            return (
              <button key={i} onClick={() => setSelected(key)}
                className={`aspect-square rounded-md text-xs grid place-items-center relative transition
                  ${outside ? "text-muted-foreground/40" : "text-foreground"}
                  ${selected === key ? "bg-primary text-primary-foreground" : isToday ? "bg-secondary" : "hover:bg-secondary"}`}>
                {d.getDate()}
                {count > 0 && <span className="absolute bottom-1 size-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">{new Date(selected + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEvForm({ ...evForm, data: selected }); setEvDlg(true); }}><Plus className="size-4" />Evento</Button>
            <Button size="sm" onClick={() => { setTaskForm({ ...taskForm, due_date: selected }); setTaskDlg(true); }}><Plus className="size-4" />Tarefa</Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {selDay.events.length === 0 && selDay.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento ou tarefa neste dia.</p>
          )}
          {selDay.events.map(e => (
            <div key={e.id} className="flex items-start gap-2 rounded-md border border-border p-2">
              <CalendarDays className="size-4 mt-0.5 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{e.titulo}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {e.local ? ` · ${e.local}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeEvent(e.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          {selDay.tasks.map(t => (
            <div key={t.id} className="flex items-start gap-2 rounded-md border border-border p-2">
              <ListChecks className="size-4 mt-0.5 text-sky-500" />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium truncate ${t.status === "concluido" ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</div>
                <div className="text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => toggleTask(t)}><Check className="size-4" /></Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><ListChecks className="size-4 text-primary" />Checklist do Marketing</h2>
          <Badge variant="secondary">{pending.length} pendente(s)</Badge>
        </div>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente. Crie a primeira ao lado.</p>}
        <div className="space-y-2">
          {pending.map(t => {
            const late = t.due_date && t.due_date < iso(new Date());
            return (
              <div key={t.id} className="flex items-start gap-2 rounded-md border border-border p-2">
                <button onClick={() => toggleTask(t)} aria-label="Concluir tarefa"
                  className="mt-0.5 size-5 shrink-0 rounded-md border border-muted-foreground/40 hover:border-primary grid place-items-center" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{t.titulo}</div>
                  <div className={`text-xs ${late ? "text-destructive" : "text-muted-foreground"}`}>
                    {t.due_date ? new Date(t.due_date + "T12:00:00").toLocaleDateString("pt-BR") : "sem prazo"}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeTask(t.id)}><Trash2 className="size-4" /></Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={taskDlg} onOpenChange={setTaskDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova tarefa de marketing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={taskForm.titulo} onChange={e => setTaskForm({ ...taskForm, titulo: e.target.value })} /></div>
            <div><Label>Prazo</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={taskForm.descricao} onChange={e => setTaskForm({ ...taskForm, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveTask}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evDlg} onOpenChange={setEvDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo evento de marketing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={evForm.titulo} onChange={e => setEvForm({ ...evForm, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={evForm.data} onChange={e => setEvForm({ ...evForm, data: e.target.value })} /></div>
              <div><Label>Hora</Label><Input type="time" value={evForm.hora} onChange={e => setEvForm({ ...evForm, hora: e.target.value })} /></div>
            </div>
            <div><Label>Local</Label><Input value={evForm.local} onChange={e => setEvForm({ ...evForm, local: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={evForm.descricao} onChange={e => setEvForm({ ...evForm, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveEvent}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
