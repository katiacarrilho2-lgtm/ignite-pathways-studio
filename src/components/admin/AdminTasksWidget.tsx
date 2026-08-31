import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildICS, downloadICS } from "@/lib/crm";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Download, ListChecks, Star } from "lucide-react";

const StarBox = ({ done, onToggle }: { done: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={done ? "Marcar como pendente" : "Concluir tarefa"}
    className={`mt-0.5 size-5 shrink-0 rounded-md border grid place-items-center transition
      ${done ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/40 hover:border-primary"}`}
  >
    {done && <Star className="size-3.5 fill-current" />}
  </button>
);

type Task = {
  id: string; title: string; notes: string | null; due_date: string | null;
  due_time: string | null; priority: string; done: boolean; done_at: string | null;
};
type Appt = { id: string; title: string; scheduled_at: string; notes: string | null; done: boolean };

const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const iso = (d: Date) => `${ymOf(d)}-${String(d.getDate()).padStart(2, "0")}`;
const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AdminTasksWidget() {
  const [ref, setRef] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [selected, setSelected] = useState<string>(iso(new Date()));
  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", due_date: iso(new Date()), due_time: "", notes: "" });


  const load = async () => {
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from("admin_tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("crm_appointments").select("id, title, scheduled_at, notes, done").order("scheduled_at"),
    ]);
    setTasks((t ?? []) as Task[]);
    setAppts((a ?? []) as Appt[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("dash-agenda")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_appointments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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
    tasks: tasks.filter((t) => t.due_date === day),
    appts: appts.filter((a) => iso(new Date(a.scheduled_at)) === day),
  });

  const selDay = dayItems(selected);
  const pending = tasks.filter((t) => !t.done);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", due_date: selected, due_time: "", notes: "" });
    setDlg(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      title: t.title,
      due_date: t.due_date ?? "",
      due_time: t.due_time ? t.due_time.slice(0, 5) : "",
      notes: t.notes ?? "",
    });
    setDlg(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return toast.error("Informe o título");
    const payload = {
      title: form.title.trim(),
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("admin_tasks").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Tarefa atualizada");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("admin_tasks").insert({
        ...payload,
        created_by: user?.id ?? null,
        owner_id: user?.id ?? null,
      });
      if (error) return toast.error(error.message);
      toast.success("Tarefa criada");
    }
    setDlg(false);
    setEditing(null);
    setForm({ title: "", due_date: selected, due_time: "", notes: "" });
    load();
  };


  const toggle = async (t: Task) => {
    const { error } = await supabase.from("admin_tasks")
      .update({ done: !t.done, done_at: t.done ? null : new Date().toISOString() })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };

  const removeTask = async (id: string) => {
    if (!confirm("Excluir tarefa?")) return;
    await supabase.from("admin_tasks").delete().eq("id", id);
    load();
  };

  const exportIcs = () => {
    const items = [
      ...tasks.filter((t) => t.due_date && !t.done).map((t) => ({
        title: t.title, when: new Date(`${t.due_date}T${t.due_time ?? "09:00"}`), notes: t.notes ?? "",
      })),
      ...appts.filter((a) => !a.done).map((a) => ({ title: a.title, when: new Date(a.scheduled_at), notes: a.notes ?? "" })),
    ];
    if (items.length === 0) return toast.error("Nada para exportar");
    const events = items
      .map((i) => buildICS(i.title, i.when, i.notes)
        .split("\r\n")
        .filter((l) => !["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Multplick CRM//PT-BR", "END:VCALENDAR"].includes(l))
        .join("\r\n"))
      .join("\r\n");
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Multplick//PT-BR", events, "END:VCALENDAR"].join("\r\n");
    downloadICS("agenda-multplick.ics", body);
    toast.success("Arquivo .ics baixado — importe no Google Agenda");
  };

  const todayIso = iso(new Date());

  return (
    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
              <CalendarDays className="size-4" />{monthNames[ref.getMonth()]} / {ref.getFullYear()}
            </div>
            <Button size="icon" variant="outline" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportIcs}><Download className="size-4 mr-1" />Google (.ics)</Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4 mr-1" />Tarefa
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
          {weekDays.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const key = iso(d);
            const inMonth = d.getMonth() === ref.getMonth();
            const items = dayItems(key);
            const total = items.tasks.length + items.appts.length;
            const hasLate = items.tasks.some((t) => !t.done && key < todayIso);
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`min-h-[68px] rounded-lg border p-1.5 text-left transition
                  ${selected === key ? "border-primary ring-1 ring-primary" : "border-border"}
                  ${inMonth ? "bg-background" : "bg-muted/40 opacity-60"}
                  ${key === todayIso ? "bg-primary/5" : ""} hover:bg-muted/60`}
              >
                <span className={`text-xs font-semibold ${key === todayIso ? "text-primary" : "text-foreground"}`}>{d.getDate()}</span>
                <div className="mt-1 space-y-0.5">
                  {items.appts.slice(0, 2).map((a) => (
                    <div key={a.id} className="truncate text-[10px] rounded px-1 bg-sky-500/15 text-sky-700">{a.title}</div>
                  ))}
                  {items.tasks.slice(0, 2).map((t) => (
                    <div key={t.id} className={`truncate text-[10px] rounded px-1 ${t.done ? "bg-emerald-500/15 text-emerald-700 line-through" : hasLate && !t.done ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700"}`}>
                      {t.title}
                    </div>
                  ))}
                  {total > 4 && <div className="text-[10px] text-muted-foreground">+{total - 4}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <CalendarDays className="size-4 text-primary" />
            {new Date(selected + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </h3>
          {selDay.appts.length === 0 && selDay.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>
          )}
          <div className="space-y-1.5">
            {selDay.appts.map((a) => (
              <div key={a.id} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-sm">
                <span className="font-medium">{new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> · {a.title}
              </div>
            ))}
            {selDay.tasks.map((t) => {
              const late = !t.done && t.due_date && t.due_date < todayIso;
              return (
                <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm
                  ${t.done ? "border-emerald-500/50 bg-emerald-500/15" : late ? "border-destructive/50 bg-destructive/15" : "border-sky-500/40 bg-sky-500/10"}`}>
                  <StarBox done={t.done} onToggle={() => toggle(t)} />
                  <span className={`min-w-0 flex-1 ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  {t.due_time && <span className="text-xs text-muted-foreground">{t.due_time.slice(0, 5)}</span>}
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(t)} aria-label={`Editar tarefa ${t.title}`}>
                    <Pencil className="size-3.5" />
                  </Button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <ListChecks className="size-4 text-primary" />Checklist ({pending.length} pendente{pending.length === 1 ? "" : "s"})
          </h3>
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>}
            {[...tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due_date ?? "").localeCompare(b.due_date ?? "")).map((t) => {
              const late = !t.done && t.due_date && t.due_date < todayIso;
              return (
                <div key={t.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-sm
                  ${t.done ? "border-emerald-500/50 bg-emerald-500/15" : late ? "border-destructive/50 bg-destructive/15" : "border-sky-500/40 bg-sky-500/10"}`}>
                  <StarBox done={t.done} onToggle={() => toggle(t)} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                    {t.due_date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}{t.due_time ? ` · ${t.due_time.slice(0, 5)}` : ""}
                      </p>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => removeTask(t.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={dlg} onOpenChange={(o) => { setDlg(o); if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>Hora</Label><Input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} /></div>
            </div>
            <div><Label>Anotação</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDlg(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={saveTask}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
