import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { STAGES, Stage, TEMP_META, fmtBRL, playBells, fireConfetti } from "@/lib/crm";
import CrmGoalsBar from "./CrmGoalsBar";
import CrmLeadDialog from "./CrmLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, MessageCircle, Phone, Search, Clock, Flame, CheckCircle2, ClipboardList, FileSignature, PenLine, FolderCheck, Award, UserPlus, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";

type Lead = any;

type Progress = { pre: boolean; mat: boolean; contrato: boolean; assinado: boolean; docs: boolean; cert: boolean; docsCount: number };

const STEPS: { key: keyof Omit<Progress,"docsCount">; label: string; icon: any; manual?: boolean }[] = [
  { key: "pre", label: "Pré-matrícula", icon: ClipboardList },
  { key: "mat", label: "Matriculado", icon: UserPlus },
  { key: "contrato", label: "Contrato enviado", icon: FileSignature, manual: true },
  { key: "assinado", label: "Contrato assinado + pagamento", icon: PenLine, manual: true },
  { key: "docs", label: "Documentos enviados", icon: FolderCheck },
  { key: "cert", label: "Certificado", icon: Award, manual: true },
];

function ChecklistStrip({ progress, onToggle }: { progress: Progress; onToggle: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-1 py-1 pr-1 border-l border-border/60 pl-2 ml-2" onPointerDown={e => e.stopPropagation()}>
      {STEPS.map(s => {
        const done = progress[s.key];
        const Icon = s.icon;
        const cls = done ? "bg-emerald-500 text-white border-emerald-500" : "bg-secondary text-muted-foreground border-border";
        const clickable = s.manual;
        return (
          <button
            key={s.key}
            type="button"
            title={`${s.label}${clickable ? " (clique para alternar)" : done ? " ✓" : " — pendente"}`}
            disabled={!clickable}
            onClick={() => clickable && onToggle(s.key)}
            className={`size-5 rounded-full border grid place-items-center transition ${cls} ${clickable ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
          >
            {done ? <CheckCircle2 className="size-3" /> : <Icon className="size-2.5" />}
          </button>
        );
      })}
    </div>
  );
}

function LeadCard({ lead, onClick, sellerName, sellerAvatar, canResolve, onToggleUrgent, onResolveUrgent, progress, onToggleStep, canDelete, onDelete }: { lead: Lead; onClick: () => void; sellerName?: string; sellerAvatar?: string | null; canResolve: boolean; onToggleUrgent: (l: Lead) => void; onResolveUrgent: (l: Lead) => void; progress: Progress; onToggleStep: (l: Lead, key: string) => void; canDelete: boolean; onDelete: (l: Lead) => void; }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  const t = TEMP_META[lead.etiqueta as keyof typeof TEMP_META];
  const since = new Date(lead.stage_changed_at);
  const days = Math.floor((Date.now() - since.getTime()) / 86400000);
  const isUrgent = !!lead.urgente;
  const isResolved = !!lead.urgente_resolvido_em && !isUrgent;
  const urgentCls = isUrgent
    ? "bg-orange-50 border-orange-400 ring-2 ring-orange-300 animate-pulse"
    : isResolved
      ? "bg-emerald-50 border-emerald-400"
      : "bg-card border-border";
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`${urgentCls} border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors ${isDragging ? "opacity-50" : ""}`}>
      {isUrgent && (
        <div className="flex items-center justify-between gap-2 mb-2 -mt-1 -mx-1 px-2 py-1 rounded bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wide">
          <span className="flex items-center gap-1"><Flame className="size-3" /> Urgente</span>
          {canResolve && (
            <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => onResolveUrgent(lead)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-1.5 py-0.5">
              <CheckCircle2 className="size-3" /> Resolver
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <button type="button" onPointerDown={e => e.stopPropagation()} onClick={onClick} className="text-left font-semibold text-sm text-foreground hover:text-primary truncate flex-1">{lead.nome}</button>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.cls}`}>
              <span className={`size-1.5 rounded-full ${t.dot}`} />{t.label}
            </span>
          </div>
          {lead.telefone && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Phone className="size-3" />{lead.telefone}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-emerald-700">{fmtBRL(lead.valor_cents)}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{days}d</span>
          </div>
        </div>
        <ChecklistStrip progress={progress} onToggle={(k) => onToggleStep(lead, k)} />
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/60">
        {sellerAvatar
          ? <img src={sellerAvatar} alt="" className="size-5 rounded-full object-cover" />
          : <div className="size-5 rounded-full bg-primary/15 text-primary text-[10px] grid place-items-center font-bold">{(sellerName || "?").slice(0,1).toUpperCase()}</div>}
        <span className="text-xs text-muted-foreground truncate flex-1">{sellerName || "—"}</span>
        {lead.atendimentos > 0 && <span className="text-[10px] bg-secondary text-foreground/70 px-1.5 py-0.5 rounded"><MessageCircle className="size-3 inline mr-0.5" />{lead.atendimentos}</span>}
        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => onToggleUrgent(lead)}
          title={isUrgent ? "Cancelar urgência" : "Marcar como venda urgente"}
          className={`shrink-0 rounded p-1 border transition-colors ${isUrgent ? "bg-orange-100 border-orange-300 text-orange-700" : "border-transparent text-muted-foreground hover:text-orange-600 hover:bg-orange-50"}`}>
          <Flame className="size-3.5" />
        </button>
        {canDelete && (
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => onDelete(lead)}
            title="Excluir card"
            className="shrink-0 rounded p-1 border border-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Column({ stage, leads, onCardClick, sellerOf, canResolve, onToggleUrgent, onResolveUrgent, progressOf, onToggleStep, canDelete, onDelete }: { stage: typeof STAGES[number]; leads: Lead[]; onCardClick: (l: Lead) => void; sellerOf: (id: string) => any; canResolve: boolean; onToggleUrgent: (l: Lead) => void; onResolveUrgent: (l: Lead) => void; progressOf: (l: Lead) => Progress; onToggleStep: (l: Lead, k: string) => void; canDelete: boolean; onDelete: (l: Lead) => void; }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const total = leads.reduce((s, l) => s + (l.valor_cents || 0), 0);
  return (
    <div ref={setNodeRef} className={`flex flex-col bg-secondary/40 rounded-xl border ${isOver ? "border-primary ring-2 ring-primary/30" : "border-border"} min-w-[280px] w-[280px]`}>
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <span className={`size-2 rounded-full ${stage.color}`} />
          <h3 className="text-sm font-bold text-foreground">{stage.label}</h3>
          <span className="ml-auto text-xs bg-card border border-border px-1.5 py-0.5 rounded font-medium">{leads.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">{fmtBRL(total)}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-360px)]">
        {leads.map(l => {
          const s = sellerOf(l.owner_id);
          return <LeadCard key={l.id} lead={l} onClick={() => onCardClick(l)} sellerName={s?.display_name} sellerAvatar={s?.avatar_url} canResolve={canResolve} onToggleUrgent={onToggleUrgent} onResolveUrgent={onResolveUrgent} progress={progressOf(l)} onToggleStep={onToggleStep} canDelete={canDelete} onDelete={onDelete} />;
        })}
        {leads.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>}
      </div>
    </div>
  );
}

export default function CrmKanban() {
  const { user, isMaster } = useAuth();
  const { byId, sellers: allSellers } = useCrmSellers();
  const { activeAccountId } = useCommercialAccounts();
  const canSeeAll = isMaster;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOwner, setFilterOwner] = useState<string>(searchParams.get("owner") || "all");
  const [dialog, setDialog] = useState<{ open: boolean; lead?: Lead }>({ open: false });

  useEffect(() => {
    const o = searchParams.get("owner");
    if (o && o !== filterOwner) setFilterOwner(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (!leadId || leads.length === 0) return;
    const found = leads.find(l => l.id === leadId);
    if (found) setDialog({ open: true, lead: found });
  }, [searchParams, leads]);

  const changeFilter = (v: string) => {
    setFilterOwner(v);
    const next = new URLSearchParams(searchParams);
    if (v === "all") next.delete("owner"); else next.set("owner", v);
    setSearchParams(next, { replace: true });
  };

  // Modals for cancel/proximo_mes
  const [pending, setPending] = useState<{ lead: Lead; target: Stage } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [nextNote, setNextNote] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    let q = supabase.from("crm_leads").select("*").order("updated_at", { ascending: false });
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    setLeads(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("crm-leads-kanban")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_leads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => leads.filter(l => {
    if (!canSeeAll && l.owner_id !== user?.id) return false;
    if (filterOwner !== "all" && l.owner_id !== filterOwner) return false;
    if (search && !`${l.nome} ${l.telefone || ""} ${l.email || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [leads, canSeeAll, user?.id, filterOwner, search]);

  const grouped = useMemo(() => {
    const map: Record<Stage, Lead[]> = { novo: [], lead: [], fechamento: [], matriculado: [], cancelado: [], proximo_mes: [] };
    filtered.forEach(l => { if (map[l.estagio as Stage]) map[l.estagio as Stage].push(l); });
    return map;
  }, [filtered]);

  // ---------- Checklist auto-detection ----------
  const [preEmails, setPreEmails] = useState<Set<string>>(new Set());
  const [profileByEmail, setProfileByEmail] = useState<Map<string, string>>(new Map()); // email -> user_id
  const [docsByUser, setDocsByUser] = useState<Map<string, number>>(new Map());
  const [completedByUser, setCompletedByUser] = useState<Set<string>>(new Set());

  useEffect(() => {
    const emails = Array.from(new Set(leads.map(l => (l.email || "").toLowerCase()).filter(Boolean)));
    if (!emails.length) { setPreEmails(new Set()); setProfileByEmail(new Map()); setDocsByUser(new Map()); setCompletedByUser(new Set()); return; }
    (async () => {
      const [pre, profs] = await Promise.all([
        supabase.from("enrollment_applications").select("email").in("email", emails),
        supabase.from("profiles").select("user_id,email").in("email", emails),
      ]);
      const preSet = new Set<string>((pre.data ?? []).map((r: any) => (r.email || "").toLowerCase()));
      const pMap = new Map<string, string>();
      (profs.data ?? []).forEach((r: any) => { if (r.email) pMap.set(r.email.toLowerCase(), r.user_id); });
      setPreEmails(preSet);
      setProfileByEmail(pMap);
      const userIds = Array.from(new Set(Array.from(pMap.values())));
      if (userIds.length) {
        const [docs, enr] = await Promise.all([
          supabase.from("student_documents").select("user_id").in("user_id", userIds),
          supabase.from("enrollments").select("user_id,completed_at").in("user_id", userIds).not("completed_at", "is", null),
        ]);
        const d = new Map<string, number>();
        (docs.data ?? []).forEach((r: any) => d.set(r.user_id, (d.get(r.user_id) || 0) + 1));
        setDocsByUser(d);
        setCompletedByUser(new Set((enr.data ?? []).map((r: any) => r.user_id)));
      } else {
        setDocsByUser(new Map()); setCompletedByUser(new Set());
      }
    })();
  }, [leads]);

  const progressOf = (l: Lead): Progress => {
    const email = (l.email || "").toLowerCase();
    const uid = email ? profileByEmail.get(email) : undefined;
    const cl = (l.checklist || {}) as any;
    const docsCount = uid ? (docsByUser.get(uid) || 0) : 0;
    return {
      pre: !!email && preEmails.has(email),
      mat: l.estagio === "matriculado" || !!uid,
      contrato: !!cl.contrato,
      assinado: !!cl.assinado,
      docs: docsCount >= 7 || !!cl.docs,
      cert: (uid ? completedByUser.has(uid) : false) || !!cl.cert,
      docsCount,
    };
  };

  const toggleStep = async (lead: Lead, key: string) => {
    const cl = { ...(lead.checklist || {}) };
    cl[key] = !cl[key];
    const { error } = await supabase.from("crm_leads").update({ checklist: cl }).eq("id", lead.id);
    if (error) return toast.error(error.message);
    setLeads(prev => prev.map(x => x.id === lead.id ? { ...x, checklist: cl } : x));
  };
  // ----------------------------------------------

  const moveTo = async (lead: Lead, target: Stage, extra: any = {}) => {
    const { error } = await supabase.from("crm_leads").update({ estagio: target, ...extra }).eq("id", lead.id);
    if (error) return toast.error(error.message);
    if (target === "matriculado") { playBells(); fireConfetti(); toast.success(`🔔 ${lead.nome} matriculado! +${fmtBRL(lead.valor_cents)}`); }
    load();
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const overId = e.over?.id as Stage | undefined;
    if (!overId) return;
    const lead = leads.find(l => l.id === e.active.id);
    if (!lead || lead.estagio === overId) return;
    if (overId === "cancelado") { setCancelReason(""); setPending({ lead, target: overId }); return; }
    if (overId === "proximo_mes") { setNextDate(""); setNextNote(""); setPending({ lead, target: overId }); return; }
    moveTo(lead, overId);
  };

  const confirmCancel = async () => {
    if (!pending) return;
    await moveTo(pending.lead, "cancelado", { motivo_cancelamento: cancelReason || null, data_cancelamento: new Date().toISOString().slice(0,10) });
    setPending(null);
  };

  const confirmNext = async () => {
    if (!pending || !nextDate || !user) return;
    await moveTo(pending.lead, "proximo_mes");
    await supabase.from("crm_appointments").insert(withAccount({
      lead_id: pending.lead.id, owner_id: pending.lead.owner_id,
      scheduled_at: new Date(nextDate).toISOString(),
      title: `Retomar contato: ${pending.lead.nome}`,
      notes: nextNote || null,
    }, activeAccountId));
    toast.success("Compromisso criado na agenda");
    setPending(null);
  };

  const toggleUrgent = async (lead: Lead) => {
    const next = !lead.urgente;
    const patch: any = { urgente: next };
    if (next) { patch.urgente_marcado_em = new Date().toISOString(); patch.urgente_resolvido_em = null; }
    const { error } = await supabase.from("crm_leads").update(patch).eq("id", lead.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "🚨 Marcado como URGENTE para a master" : "Urgência removida");
    load();
  };

  const resolveUrgent = async (lead: Lead) => {
    const { error } = await supabase.from("crm_leads").update({ urgente: false, urgente_resolvido_em: new Date().toISOString() }).eq("id", lead.id);
    if (error) return toast.error(error.message);
    toast.success("Urgência resolvida ✅");
    load();
  };

  const deleteLead = async (lead: Lead) => {
    if (!isMaster) return toast.error("Apenas o admin pode excluir cards");
    if (!confirm(`Excluir o card de "${lead.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("crm_leads").delete().eq("id", lead.id);
    if (error) return toast.error(error.message);
    toast.success("Card excluído");
    setLeads(prev => prev.filter(x => x.id !== lead.id));
  };

  const sellers = useMemo(() => {
    const ids = new Set<string>(allSellers.map(s => s.user_id));
    leads.forEach(l => { if (l.owner_id) ids.add(l.owner_id); });
    return Array.from(ids)
      .map(id => ({ id, name: byId(id)?.display_name || id.slice(0, 8) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [leads, byId, allSellers]);

  return (
    <div>
      <CrmGoalsBar />
      <div className="px-6 pb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, telefone, e-mail..." className="pl-9" />
        </div>
        {canSeeAll && (
          <select value={filterOwner} onChange={e => changeFilter(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
            <option value="all">Todos os vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <Button onClick={() => setDialog({ open: true })}><Plus className="size-4" />Novo lead</Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="px-6 pb-6 flex gap-3 overflow-x-auto">
          {STAGES.map(s => (
            <Column key={s.key} stage={s} leads={grouped[s.key]} onCardClick={(l) => setDialog({ open: true, lead: l })} sellerOf={byId} canResolve={canSeeAll} onToggleUrgent={toggleUrgent} onResolveUrgent={resolveUrgent} progressOf={progressOf} onToggleStep={toggleStep} canDelete={isMaster} onDelete={deleteLead} />
          ))}
        </div>
      </DndContext>

      <CrmLeadDialog open={dialog.open} onOpenChange={(b) => setDialog({ open: b, lead: b ? dialog.lead : undefined })} lead={dialog.lead} onSaved={load} />

      <Dialog open={!!pending && pending.target === "cancelado"} onOpenChange={(b) => !b && setPending(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar lead</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Por que foi cancelado?</Label>
            <Textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Sem orçamento, mudou de ideia, sem retorno..." />
            <p className="text-xs text-muted-foreground">Data: {new Date().toLocaleDateString("pt-BR")}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>Voltar</Button>
            <Button variant="destructive" onClick={confirmCancel}>Confirmar cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pending && pending.target === "proximo_mes"} onOpenChange={(b) => !b && setPending(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar retomada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data e hora combinadas *</Label><Input type="datetime-local" value={nextDate} onChange={e => setNextDate(e.target.value)} /></div>
            <div><Label>Anotação</Label><Textarea rows={2} value={nextNote} onChange={e => setNextNote(e.target.value)} placeholder="Ex: matrícula prevista para 10/06" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>Voltar</Button>
            <Button onClick={confirmNext}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}