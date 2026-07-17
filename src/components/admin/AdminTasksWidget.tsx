import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, Link2, ListChecks, Loader2, Plus, Trash2, X, ChevronDown, ChevronUp,
  AlertTriangle, User as UserIcon, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type LinkedType = "aluno" | "lead" | "matricula" | "pre_matricula" | null;

type Task = {
  id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  due_at: string | null;
  priority: number;
  linked_type: LinkedType;
  linked_id: string | null;
  linked_label: string | null;
  position: number;
  created_at: string;
};

type LinkOption = {
  type: Exclude<LinkedType, null>;
  id: string;
  label: string;
  href: string;
  sub?: string;
};

const fmtDue = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + 86400000);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Hoje ${time}`;
  if (isTomorrow) return `Amanhã ${time}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + time;
};

const hrefFor = (type: Exclude<LinkedType, null>, id: string): string => {
  switch (type) {
    case "aluno": return `/admin/alunos/${id}`;
    case "lead": return `/admin/crm`;
    case "matricula": return `/admin/matriculas`;
    case "pre_matricula": return `/admin/pre-matriculas`;
  }
};

const LinkSearch = ({ onPick }: { onPick: (opt: LinkOption) => void }) => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LinkOption[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let active = true;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const like = `%${term}%`;
      const [alunos, leads, apps] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, email").or(`display_name.ilike.${like},email.ilike.${like}`).limit(5),
        supabase.from("crm_leads").select("id, nome, telefone, email").or(`nome.ilike.${like},email.ilike.${like},telefone.ilike.${like}`).limit(5),
        supabase.from("enrollment_applications").select("id, full_name, course_title").or(`full_name.ilike.${like},email.ilike.${like}`).limit(5),
      ]);
      if (!active) return;
      const out: LinkOption[] = [];
      for (const p of (alunos.data as any[]) ?? []) {
        out.push({ type: "aluno", id: p.user_id, label: p.display_name || p.email || "Aluno", sub: p.email ?? undefined, href: hrefFor("aluno", p.user_id) });
      }
      for (const l of (leads.data as any[]) ?? []) {
        out.push({ type: "lead", id: l.id, label: l.nome || l.email || l.telefone || "Lead", sub: l.telefone || l.email || undefined, href: hrefFor("lead", l.id) });
      }
      for (const a of (apps.data as any[]) ?? []) {
        out.push({ type: "pre_matricula", id: a.id, label: a.full_name, sub: a.course_title ?? undefined, href: hrefFor("pre_matricula", a.id) });
      }
      setResults(out);
      setLoading(false);
    }, 250);
    return () => { active = false; window.clearTimeout(t); };
  }, [q]);

  return (
    <div className="w-72 space-y-2">
      <Input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar aluno, lead ou pré-matrícula..." />
      <div className="max-h-64 overflow-auto -mx-1">
        {loading && <div className="p-2 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> Buscando...</div>}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <div className="p-2 text-xs text-muted-foreground">Nada encontrado.</div>
        )}
        {results.map(r => (
          <button
            key={`${r.type}-${r.id}`}
            type="button"
            onClick={() => onPick(r)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2"
          >
            <span className={cn(
              "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
              r.type === "aluno" && "bg-emerald-100 text-emerald-700",
              r.type === "lead" && "bg-amber-100 text-amber-700",
              r.type === "pre_matricula" && "bg-blue-100 text-blue-700",
              r.type === "matricula" && "bg-purple-100 text-purple-700",
            )}>
              {r.type === "pre_matricula" ? "Pré-matr." : r.type}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm">{r.label}</span>
              {r.sub && <span className="block truncate text-[11px] text-muted-foreground">{r.sub}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const AdminTasksWidget = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const [linked, setLinked] = useState<LinkOption | null>(null);
  const [showDone, setShowDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("done", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error("Não consegui carregar suas tarefas");
    setTasks((data as Task[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const { open, done } = useMemo(() => {
    const o: Task[] = []; const d: Task[] = [];
    for (const t of tasks) (t.done ? d : o).push(t);
    // ordenar abertas: vencidas primeiro, depois com data futura, depois sem data
    const now = Date.now();
    o.sort((a, b) => {
      const aOver = a.due_at && new Date(a.due_at).getTime() < now ? 0 : 1;
      const bOver = b.due_at && new Date(b.due_at).getTime() < now ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return a.position - b.position || (b.created_at.localeCompare(a.created_at));
    });
    return { open: o, done: d };
  }, [tasks]);

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return open.filter(t => t.due_at && new Date(t.due_at).getTime() < now).length;
  }, [open]);

  const add = async () => {
    if (!user) return;
    const clean = title.trim();
    if (!clean) return;
    setSaving(true);
    const { data, error } = await supabase.from("admin_tasks").insert({
      user_id: user.id,
      title: clean,
      due_at: dueAt ? dueAt.toISOString() : null,
      linked_type: linked?.type ?? null,
      linked_id: linked?.id ?? null,
      linked_label: linked?.label ?? null,
      position: -Date.now(), // novos ficam no topo por padrão
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setTasks(t => [data as Task, ...t]);
    setTitle(""); setDueAt(undefined); setLinked(null);
    inputRef.current?.focus();
  };

  const toggle = async (t: Task) => {
    const next = !t.done;
    setTasks(list => list.map(x => x.id === t.id ? { ...x, done: next, done_at: next ? new Date().toISOString() : null } : x));
    const { error } = await supabase.from("admin_tasks").update({
      done: next, done_at: next ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) { toast.error("Falha ao atualizar"); load(); }
  };

  const remove = async (t: Task) => {
    setTasks(list => list.filter(x => x.id !== t.id));
    const { error } = await supabase.from("admin_tasks").delete().eq("id", t.id);
    if (error) { toast.error("Falha ao excluir"); load(); }
  };

  const move = async (t: Task, dir: -1 | 1) => {
    const idx = open.findIndex(x => x.id === t.id);
    const swap = open[idx + dir];
    if (!swap) return;
    const a = { ...t, position: swap.position };
    const b = { ...swap, position: t.position };
    setTasks(list => list.map(x => x.id === a.id ? a : x.id === b.id ? b : x));
    await Promise.all([
      supabase.from("admin_tasks").update({ position: a.position }).eq("id", a.id),
      supabase.from("admin_tasks").update({ position: b.position }).eq("id", b.id),
    ]);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-primary" />
          <h2 className="font-semibold text-primary">Minhas tarefas</h2>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="size-3" /> {overdueCount} vencida{overdueCount>1?"s":""}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {open.length} pendente{open.length !== 1 ? "s" : ""} · {done.length} concluída{done.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Adicionar */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            ref={inputRef}
            value={title}
            onChange={e=>setTitle(e.target.value)}
            onKeyDown={e=>{ if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Ex.: Cobrar documento do Franci Júnior"
            className="flex-1"
          />
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={cn("gap-1", dueAt && "border-primary text-primary")}>
                  <CalendarIcon className="size-4" />
                  {dueAt ? dueAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dueAt}
                  onSelect={(d) => {
                    if (!d) { setDueAt(undefined); return; }
                    // hora padrão: 09:00
                    const withTime = new Date(d);
                    withTime.setHours(9, 0, 0, 0);
                    setDueAt(withTime);
                  }}
                  className={cn("p-3 pointer-events-auto")}
                  initialFocus
                />
                {dueAt && (
                  <div className="p-2 border-t flex items-center gap-2">
                    <Input
                      type="time"
                      value={`${String(dueAt.getHours()).padStart(2,"0")}:${String(dueAt.getMinutes()).padStart(2,"0")}`}
                      onChange={e => {
                        const [h,m] = e.target.value.split(":").map(Number);
                        const nd = new Date(dueAt);
                        nd.setHours(h||0, m||0, 0, 0);
                        setDueAt(nd);
                      }}
                      className="h-8"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={()=>setDueAt(undefined)}>Limpar</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={cn("gap-1", linked && "border-primary text-primary")}>
                  <Link2 className="size-4" />
                  {linked ? linked.label.split(" ")[0] : "Vincular"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-2">
                <LinkSearch onPick={(opt) => setLinked(opt)} />
                {linked && (
                  <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
                    <span className="truncate">Vinculado: <strong>{linked.label}</strong></span>
                    <Button type="button" variant="ghost" size="sm" onClick={()=>setLinked(null)}><X className="size-3" /></Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Button type="button" onClick={add} disabled={saving || !title.trim()} size="sm" className="gap-1">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista pendentes */}
      {loading ? (
        <div className="py-6 text-center text-muted-foreground text-sm"><Loader2 className="size-4 animate-spin inline mr-2" />Carregando...</div>
      ) : open.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
          Nenhuma tarefa pendente. Aproveita e adiciona a próxima cobrança acima ✨
        </div>
      ) : (
        <ul className="space-y-1.5">
          {open.map((t, i) => {
            const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now();
            return (
              <li key={t.id} className={cn(
                "group flex items-start gap-2 px-3 py-2 rounded-lg border transition-colors",
                overdue ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-secondary/40"
              )}>
                <Checkbox checked={t.done} onCheckedChange={()=>toggle(t)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug break-words">{t.title}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {t.due_at && (
                      <span className={cn("inline-flex items-center gap-1 text-[11px]", overdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                        <CalendarIcon className="size-3" /> {fmtDue(t.due_at)}
                      </span>
                    )}
                    {t.linked_label && t.linked_id && t.linked_type && (
                      <Link
                        to={hrefFor(t.linked_type as Exclude<LinkedType,null>, t.linked_id)}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <UserIcon className="size-3" /> {t.linked_label} <ChevronRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button type="button" variant="ghost" size="sm" className="size-7 p-0" disabled={i===0} onClick={()=>move(t,-1)}><ChevronUp className="size-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="size-7 p-0" disabled={i===open.length-1} onClick={()=>move(t,1)}><ChevronDown className="size-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="size-7 p-0 text-destructive hover:text-destructive" onClick={()=>remove(t)}><Trash2 className="size-3.5" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Concluídas */}
      {done.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <button type="button" onClick={()=>setShowDone(v=>!v)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {showDone ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Concluídas ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1">
              {done.slice(0, 20).map(t => (
                <li key={t.id} className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                  <Checkbox checked onCheckedChange={()=>toggle(t)} />
                  <span className="line-through flex-1 truncate">{t.title}</span>
                  <Button type="button" variant="ghost" size="sm" className="size-6 p-0 text-destructive" onClick={()=>remove(t)}><Trash2 className="size-3" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTasksWidget;