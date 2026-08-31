import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AlarmClock, Check, Clock, Flame, ListChecks, CalendarClock, Inbox, LifeBuoy } from "lucide-react";

type Kind = "lead" | "tarefa" | "agenda" | "solicitacao" | "suporte";

type Item = {
  id: string;
  kind: Kind;
  title: string;
  subtitle?: string;
  when?: string;
  link: string;
  late?: boolean;
  completable?: boolean;
};

const KIND_META: Record<Kind, { label: string; icon: typeof Flame }> = {
  lead: { label: "Leads urgentes", icon: Flame },
  tarefa: { label: "Tarefas", icon: ListChecks },
  agenda: { label: "Agenda de hoje", icon: CalendarClock },
  solicitacao: { label: "Solicitações internas", icon: Inbox },
  suporte: { label: "Chamados de suporte", icon: LifeBuoy },
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SNOOZE_KEY = "urgency:snoozed";
const OPENED_KEY = "urgency:openedOn";

const readSnoozed = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}"); } catch { return {}; }
};

export default function UrgencyCenter() {
  const { user, isMaster, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canSeeAll = isMaster || hasPermission("manage_users");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [snoozed, setSnoozed] = useState<Record<string, number>>(readSnoozed);
  const [pulse, setPulse] = useState(false);
  const autoOpened = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    const today = todayIso();
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);

    const qLeads = canSeeAll
      ? supabase.from("crm_leads").select("id, nome, telefone, urgente_marcado_em").eq("urgente", true)
      : supabase.from("crm_leads").select("id, nome, telefone, urgente_marcado_em").eq("urgente", true).eq("owner_id", user.id);

    const qTasks = canSeeAll
      ? supabase.from("admin_tasks").select("id, title, notes, due_date, due_time, done").eq("done", false).lte("due_date", today)
      : supabase.from("admin_tasks").select("id, title, notes, due_date, due_time, done").eq("done", false).lte("due_date", today).eq("owner_id", user.id);

    const qAppts = canSeeAll
      ? supabase.from("crm_appointments").select("id, title, scheduled_at, notes, done").eq("done", false).gte("scheduled_at", dayStart.toISOString()).lte("scheduled_at", dayEnd.toISOString())
      : supabase.from("crm_appointments").select("id, title, scheduled_at, notes, done").eq("done", false).gte("scheduled_at", dayStart.toISOString()).lte("scheduled_at", dayEnd.toISOString()).eq("owner_id", user.id);

    const [leads, tasks, appts, reqs, tickets] = await Promise.all([
      qLeads,
      qTasks,
      qAppts,
      supabase.from("internal_requests").select("id, numero, titulo, prioridade, status, prazo").not("status", "in", '("concluida","cancelada","fechada")').order("created_at", { ascending: true }),
      supabase.from("support_tickets").select("id, assunto, prioridade, status, created_at").not("status", "in", '("fechado","resolvido")').order("created_at", { ascending: true }),
    ]);

    const list: Item[] = [];

    (leads.data ?? []).forEach((l: any) => list.push({
      id: `lead:${l.id}`, kind: "lead", title: l.nome || "Lead",
      subtitle: l.telefone || undefined, link: "/admin/crm", late: true,
    }));

    (tasks.data ?? []).forEach((t: any) => list.push({
      id: `tarefa:${t.id}`, kind: "tarefa", title: t.title,
      subtitle: t.notes || undefined,
      when: t.due_time ? String(t.due_time).slice(0, 5) : undefined,
      link: "/admin", late: !!t.due_date && t.due_date < today, completable: true,
    }));

    (appts.data ?? []).forEach((a: any) => list.push({
      id: `agenda:${a.id}`, kind: "agenda", title: a.title || "Compromisso",
      subtitle: a.notes || undefined,
      when: new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      link: "/admin/crm", late: new Date(a.scheduled_at) < new Date(), completable: true,
    }));

    (reqs.data ?? []).forEach((r: any) => list.push({
      id: `solicitacao:${r.id}`, kind: "solicitacao", title: `#${r.numero} ${r.titulo}`,
      subtitle: r.prioridade ? `Prioridade: ${r.prioridade}` : undefined,
      link: `/admin/solicitacoes?r=${r.id}`,
      late: !!r.prazo && new Date(r.prazo) < new Date(),
    }));

    (tickets.data ?? []).forEach((s: any) => list.push({
      id: `suporte:${s.id}`, kind: "suporte", title: s.assunto || "Chamado",
      subtitle: s.prioridade ? `Prioridade: ${s.prioridade}` : undefined,
      link: "/admin/suporte",
    }));

    setItems(list);
  }, [user, canSeeAll]);

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel("urgency-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_leads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_appointments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, load)
      .subscribe();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [user, load]);

  const visible = useMemo(() => {
    const now = Date.now();
    return items.filter((i) => !(snoozed[i.id] && snoozed[i.id] > now));
  }, [items, snoozed]);

  const count = visible.length;

  // Abre sozinho no primeiro acesso do dia, se houver urgências
  useEffect(() => {
    if (autoOpened.current || count === 0) return;
    if (localStorage.getItem(OPENED_KEY) === todayIso()) { autoOpened.current = true; return; }
    autoOpened.current = true;
    localStorage.setItem(OPENED_KEY, todayIso());
    setOpen(true);
  }, [count]);

  // Lembrete visual a cada 10 minutos
  useEffect(() => {
    if (count === 0) return;
    const t = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 8000);
    }, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [count]);

  const snooze = (id: string, minutes = 60) => {
    const next = { ...readSnoozed(), [id]: Date.now() + minutes * 60 * 1000 };
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
    setSnoozed(next);
    toast.success(`Lembrar novamente em ${minutes} min`);
  };

  const complete = async (item: Item) => {
    const [kind, rawId] = item.id.split(":");
    if (kind === "tarefa") {
      const { error } = await supabase.from("admin_tasks").update({ done: true, done_at: new Date().toISOString() }).eq("id", rawId);
      if (error) return toast.error(error.message);
    } else if (kind === "agenda") {
      const { error } = await supabase.from("crm_appointments").update({ done: true }).eq("id", rawId);
      if (error) return toast.error(error.message);
    }
    toast.success("Concluído!");
    load();
  };

  const grouped = useMemo(() => {
    const order: Kind[] = ["lead", "tarefa", "agenda", "solicitacao", "suporte"];
    return order
      .map((k) => ({ kind: k, list: visible.filter((i) => i.kind === k) }))
      .filter((g) => g.list.length > 0);
  }, [visible]);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={count > 0 ? "default" : "ghost"}
          size="sm"
          aria-label="Urgências de atendimento"
          className={`relative gap-1.5 ${count > 0 ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} ${pulse ? "animate-pulse" : ""}`}
        >
          <AlarmClock className="size-4" />
          <span className="hidden sm:inline text-xs font-semibold">Urgências</span>
          {count > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-background text-destructive text-[10px] font-bold grid place-items-center">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Urgências de atendimento</span>
          <span className="text-xs text-muted-foreground">{count} pendente{count === 1 ? "" : "s"}</span>
        </div>
        <ScrollArea className="max-h-96">
          {count === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Tudo em dia por aqui. 🎉</p>
          )}
          {grouped.map((g) => {
            const Icon = KIND_META[g.kind].icon;
            return (
              <div key={g.kind}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="size-3.5" /> {KIND_META[g.kind].label} ({g.list.length})
                </div>
                {g.list.map((i) => (
                  <div key={i.id} className="px-3 py-2 border-b border-border/60 hover:bg-secondary/50 transition-smooth">
                    <button
                      type="button"
                      onClick={() => { setOpen(false); navigate(i.link); }}
                      className="w-full text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`block text-sm font-medium truncate ${i.late ? "text-destructive" : ""}`}>{i.title}</span>
                        {i.when && <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{i.when}</span>}
                      </span>
                      {i.subtitle && <span className="block text-xs text-muted-foreground truncate">{i.subtitle}</span>}
                    </button>
                    <div className="flex gap-1 mt-1">
                      {i.completable && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => complete(i)}>
                          <Check className="size-3" /> Concluir
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => snooze(i.id, 60)}>
                        <Clock className="size-3" /> Adiar 1h
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
