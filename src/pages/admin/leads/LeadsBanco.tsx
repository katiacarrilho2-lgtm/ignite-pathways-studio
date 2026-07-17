import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { STAGES, buildWhatsappLink } from "@/lib/crm";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Filter,
  History,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  SkipForward,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

const SITUACOES = [
  { v: "lista_espera", label: "Lista de espera", cls: "bg-violet-100 text-violet-800 border-violet-300" },
  { v: "aguardando_proxima_turma", label: "Aguardando próxima turma", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  { v: "desistente", label: "Desistente", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  { v: "ja_atendido", label: "Já atendido", cls: "bg-slate-100 text-slate-800 border-slate-300" },
  { v: "reengajar", label: "Reengajar", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  { v: "convertido", label: "Convertido", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { v: "arquivado", label: "Arquivado", cls: "bg-neutral-100 text-neutral-700 border-neutral-300" },
];

const STATUS = [
  { v: "disponivel", label: "Disponíveis", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { v: "em_atendimento", label: "Em atendimento", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  { v: "convertido", label: "Convertidos", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  { v: "arquivado", label: "Arquivados", cls: "bg-neutral-100 text-neutral-700 border-neutral-300" },
];

const INTERESSES = [
  { v: "eja", label: "EJA" },
  { v: "tecnico", label: "Técnico" },
  { v: "competencia", label: "Curso por Competência" },
  { v: "outro", label: "Outro" },
];

const sbank = () => supabase.from("leads_bank" as any) as any;
const scomm = () => supabase.from("leads_bank_comments" as any) as any;
const sorigins = () => supabase.from("lead_bank_origins" as any) as any;

const emptyForm = () => ({
  id: "",
  nome: "",
  whatsapp: "",
  email: "",
  cidade: "",
  estado: "",
  interesse_tipo: "outro",
  curso_interesse: "",
  situacao: "reengajar",
  origem: "manual",
  notas: "",
});

const stageLabel = (stage?: string | null) => STAGES.find(s => s.key === stage)?.label ?? stage ?? "—";
const statusMeta = (v?: string) => STATUS.find(s => s.v === v) ?? STATUS[0];
const sitMeta = (v?: string) => SITUACOES.find(s => s.v === v) ?? SITUACOES[4];
const interestLabel = (v?: string) => INTERESSES.find(i => i.v === v)?.label ?? v ?? "—";
const daysSince = (date?: string | null) => {
  if (!date) return 0;
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / 86400000));
};

export default function LeadsBanco() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sellers, byId } = useCrmSellers();
  const [rows, setRows] = useState<any[]>([]);
  const [origins, setOrigins] = useState<any[]>([]);
  const [crmStatuses, setCrmStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fSituacao, setFSituacao] = useState<string>("all");
  const [fInteresse, setFInteresse] = useState<string>("all");
  const [fOrigem, setFOrigem] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("disponivel");
  const [fSeller, setFSeller] = useState<string>("all");
  const [openEdit, setOpenEdit] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [openComments, setOpenComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [crmAlert, setCrmAlert] = useState<any>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sbank().select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as any[]) ?? [];
    // Dedup defensivo no front (por telefone/e-mail normalizado) — mantém sempre
    // o registro mais antigo para não perder histórico.
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const r of [...list].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))) {
      const key = (r.whatsapp_norm || "").trim() || (r.email_norm || "").trim().toLowerCase();
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      deduped.push(r);
    }
    deduped.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    setRows(deduped);

    const ids = deduped.map(r => r.id);
    if (ids.length) {
      const [{ data: orgData }, { data: statusData }] = await Promise.all([
        sorigins().select("*").in("lead_id", ids).order("last_seen_at", { ascending: false }),
        (supabase.rpc("lead_bank_get_crm_statuses" as any, { _lead_ids: ids }) as any),
      ]);
      setOrigins((orgData as any[]) ?? []);
      const map: Record<string, any> = {};
      ((statusData as any[]) ?? []).forEach(s => { map[s.lead_bank_id] = s; });
      setCrmStatuses(map);
    } else {
      setOrigins([]);
      setCrmStatuses({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const originsByLead = useMemo(() => {
    const map = new Map<string, any[]>();
    origins.forEach(o => {
      const arr = map.get(o.lead_id) ?? [];
      arr.push(o);
      map.set(o.lead_id, arr);
    });
    return map;
  }, [origins]);

  const originCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of origins) {
      if (!o.origem) continue;
      map.set(o.origem, (map.get(o.origem) ?? 0) + 1);
    }
    for (const r of rows) {
      if (!r.origem || originsByLead.has(r.id)) continue;
      map.set(r.origem, (map.get(r.origem) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [origins, originsByLead, rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { disponivel: 0, em_atendimento: 0, convertido: 0, arquivado: 0 };
    for (const r of rows) {
      const st = crmStatuses[r.id]?.status_atendimento ?? r.status_atendimento ?? "disponivel";
      c[st] = (c[st] ?? 0) + 1;
    }
    return c;
  }, [rows, crmStatuses]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r => {
      const crm = crmStatuses[r.id];
      const effectiveStatus = crm?.status_atendimento ?? r.status_atendimento ?? "disponivel";
      const leadOrigins = originsByLead.get(r.id) ?? [];
      if (fStatus !== "all" && effectiveStatus !== fStatus) return false;
      if (fSituacao !== "all" && r.situacao !== fSituacao) return false;
      if (fInteresse !== "all" && r.interesse_tipo !== fInteresse) return false;
      if (fSeller !== "all" && (crm?.owner_id ?? r.responsavel_id ?? "") !== fSeller) return false;
      if (fOrigem !== "all" && !leadOrigins.some(o => o.origem === fOrigem) && (r.origem ?? "") !== fOrigem) return false;
      if (!qq) return true;
      return [
        r.nome,
        r.email,
        r.whatsapp,
        r.curso_interesse,
        r.notas,
        r.origem,
        crm?.seller_name,
        crm?.crm_nome,
        ...leadOrigins.map(o => o.origem),
      ].some(v => (v ?? "").toString().toLowerCase().includes(qq));
    });
  }, [rows, q, fSituacao, fInteresse, fOrigem, fStatus, fSeller, crmStatuses, originsByLead]);

  const queue = useMemo(() => filtered.filter(r => (crmStatuses[r.id]?.status_atendimento ?? r.status_atendimento ?? "disponivel") === "disponivel"), [filtered, crmStatuses]);
  const activeLead = useMemo(() => queue.find(r => r.id === activeLeadId) ?? queue[0], [queue, activeLeadId]);

  const openNew = () => { setForm(emptyForm()); setOpenEdit(true); };
  const openEditRow = (r: any) => { setForm({ ...r }); setOpenEdit(true); };

  const save = async () => {
    if (!form.nome?.trim()) return toast.error("Informe um nome");
    const payload: any = {
      nome: form.nome,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      interesse_tipo: form.interesse_tipo || null,
      curso_interesse: form.curso_interesse || null,
      situacao: form.situacao,
      origem: form.origem || "manual",
      notas: form.notas || null,
      status_atendimento: form.status_atendimento || "disponivel",
    };
    let error;
    if (form.id) ({ error } = await sbank().update(payload).eq("id", form.id));
    else ({ error } = await sbank().insert(payload));
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpenEdit(false);
    load();
  };

  const changeSituacao = async (r: any, s: string) => {
    const patch: any = { situacao: s };
    if (s === "arquivado") patch.status_atendimento = "arquivado";
    if (s === "convertido") patch.status_atendimento = "convertido";
    const { error } = await sbank().update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const markNoInterest = async (r: any) => {
    const { error } = await sbank().update({ situacao: "ja_atendido", status_atendimento: "disponivel", ultimo_contato_em: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Contato marcado como sem interesse no momento");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir definitivamente?")) return;
    await sbank().delete().eq("id", id);
    load();
  };

  const openThread = async (r: any) => {
    setOpenComments(r);
    setNewComment("");
    const { data } = await scomm().select("*").eq("lead_id", r.id).order("created_at", { ascending: false });
    setComments((data as any[]) ?? []);
  };

  const addComment = async () => {
    if (!newComment.trim() || !openComments) return;
    const { error } = await scomm().insert({
      lead_id: openComments.id,
      texto: newComment.trim(),
      autor_id: user?.id,
    });
    if (error) return toast.error(error.message);
    await sbank().update({ ultimo_contato_em: new Date().toISOString() }).eq("id", openComments.id);
    setNewComment("");
    openThread(openComments);
    load();
  };

  const exportCsv = () => {
    const header = ["nome", "whatsapp", "email", "interesse", "curso", "situacao", "status", "vendedor", "origens", "criado_em"];
    const lines = [header.join(";")];
    for (const r of filtered) {
      const crm = crmStatuses[r.id];
      const orgs = (originsByLead.get(r.id) ?? []).map(o => o.origem).join(" | ");
      lines.push([r.nome, r.whatsapp, r.email, r.interesse_tipo, r.curso_interesse, r.situacao, crm?.status_atendimento ?? r.status_atendimento, crm?.seller_name, orgs || r.origem, r.created_at]
        .map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banco-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToCrm = async (lead: any, ownerId?: string) => {
    setSendingId(lead.id);
    const { data, error } = await (supabase.rpc("lead_bank_send_to_crm" as any, { _lead_bank_id: lead.id, _owner_id: ownerId || user?.id }) as any);
    setSendingId(null);
    if (error) return toast.error(error.message);
    const result = data as any;
    if (result?.status === "exists") {
      setCrmAlert(result);
      toast.warning("Este contato já está em atendimento no Kanban");
    } else {
      toast.success("Lead enviado ao Kanban do vendedor");
      setActiveLeadId(null);
      await load();
    }
  };

  const openCrm = (id?: string) => {
    if (!id) return;
    navigate(`/admin/crm?lead=${id}`);
  };

  const transferCrm = async (crmId: string, ownerId: string) => {
    const { error } = await supabase.from("crm_leads" as any).update({ owner_id: ownerId }).eq("id", crmId);
    if (error) return toast.error(error.message);
    toast.success("Lead transferido");
    setCrmAlert(null);
    load();
  };

  const OriginChips = ({ lead }: { lead: any }) => {
    const list = originsByLead.get(lead.id) ?? [];
    if (!list.length && !lead.origem) return <span className="text-xs text-muted-foreground">Sem origem registrada</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {(list.length ? list : [{ origem: lead.origem, occurrences: 1 }]).slice(0, 4).map((o: any) => (
          <Badge key={o.id ?? o.origem} variant="secondary" className="text-[10px]">
            <History className="size-3 mr-1" />{o.origem}{o.occurrences > 1 ? ` ×${o.occurrences}` : ""}
          </Badge>
        ))}
        {list.length > 4 && <span className="text-[10px] text-muted-foreground">+{list.length - 4}</span>}
      </div>
    );
  };

  const CrmStatusBlock = ({ lead }: { lead: any }) => {
    const crm = crmStatuses[lead.id];
    if (!crm?.crm_lead_id || crm.status_atendimento === "disponivel") return null;
    const st = statusMeta(crm.status_atendimento);
    return (
      <Alert className="bg-amber-50 border-amber-200 text-amber-950">
        <AlertTriangle className="size-4" />
        <AlertTitle>Já está em atendimento</AlertTitle>
        <AlertDescription>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span>Vendedor: <strong>{crm.seller_name}</strong></span>
            <span>Etapa: <strong>{stageLabel(crm.estagio)}</strong></span>
            <span>Parado há <strong>{daysSince(crm.stage_changed_at)} dia(s)</strong></span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openCrm(crm.crm_lead_id)}>Abrir card existente</Button>
            <Badge variant="outline" className={st.cls}>{st.label}</Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const LeadRow = ({ r }: { r: any }) => {
    const crm = crmStatuses[r.id];
    const effectiveStatus = crm?.status_atendimento ?? r.status_atendimento ?? "disponivel";
    const sm = statusMeta(effectiveStatus);
    const s = sitMeta(r.situacao);
    return (
      <div className="p-4 grid xl:grid-cols-[1fr_260px] gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="font-semibold text-primary text-left hover:underline" onClick={() => setActiveLeadId(r.id)}>{r.nome}</button>
            <Badge variant="outline" className={sm.cls}>{sm.label}</Badge>
            <Badge variant="outline" className={s.cls}>{s.label}</Badge>
            {r.interesse_tipo && <Badge variant="secondary" className="text-[10px]">{interestLabel(r.interesse_tipo)}</Badge>}
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
            {r.whatsapp && <a href={buildWhatsappLink(r.whatsapp, "Olá!")} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Phone className="size-3" />{r.whatsapp}</a>}
            {r.email && <span className="flex items-center gap-1"><Mail className="size-3" />{r.email}</span>}
            {r.curso_interesse && <span>{r.curso_interesse}</span>}
          </div>
          <OriginChips lead={r} />
          {crm?.crm_lead_id && effectiveStatus !== "disponivel" && (
            <p className="text-xs text-amber-700">No Kanban com {crm.seller_name} · {stageLabel(crm.estagio)} · parado há {daysSince(crm.stage_changed_at)} dia(s)</p>
          )}
          {r.notas && <p className="text-sm whitespace-pre-wrap line-clamp-2">{r.notas}</p>}
          <p className="text-[11px] text-muted-foreground">Criado {new Date(r.created_at).toLocaleString("pt-BR")}{r.ultimo_contato_em && ` · último contato ${new Date(r.ultimo_contato_em).toLocaleDateString("pt-BR")}`}</p>
        </div>
        <div className="flex flex-col xl:items-end gap-2">
          <Select value={r.situacao} onValueChange={v => changeSituacao(r, v)}>
            <SelectTrigger className="h-8 text-xs w-full xl:w-[230px]"><SelectValue /></SelectTrigger>
            <SelectContent>{SITUACOES.map(x => <SelectItem key={x.v} value={x.v}>{x.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex flex-wrap justify-end gap-1">
            {effectiveStatus === "disponivel" ? (
              <Button size="sm" onClick={() => sendToCrm(r)} disabled={sendingId === r.id}><Send className="size-4 mr-1" />Kanban</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => openCrm(crm?.crm_lead_id)}><UserCheck className="size-4 mr-1" />Abrir</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openThread(r)} title="Comentários"><MessageSquarePlus className="size-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => openEditRow(r)} title="Editar"><Pencil className="size-4" /></Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)} title="Excluir"><Trash2 className="size-4" /></Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Banco de Leads</h2>
          <p className="text-sm text-muted-foreground">Fila de contatos por grupo, sem duplicar números e sem perder histórico.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="size-4 mr-1" />Exportar</Button>
          <Button onClick={openNew}><Plus className="size-4 mr-1" />Novo lead</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {STATUS.map(s => (
          <button key={s.v} onClick={() => setFStatus(fStatus === s.v ? "all" : s.v)} className={`border rounded-lg p-3 text-left transition ${fStatus === s.v ? `${s.cls} ring-2 ring-primary/30` : "bg-card hover:bg-secondary"}`}>
            <span className="block text-sm font-semibold">{s.label}</span>
            <span className="text-2xl font-bold">{counts[s.v] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="grid lg:grid-cols-[1fr_190px_190px_220px] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar nome, telefone, e-mail, curso, grupo ou vendedor…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fInteresse} onValueChange={setFInteresse}>
            <SelectTrigger><Filter className="size-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos interesses</SelectItem>{INTERESSES.map(i => <SelectItem key={i.v} value={i.v}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fSituacao} onValueChange={setFSituacao}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas situações</SelectItem>{SITUACOES.map(i => <SelectItem key={i.v} value={i.v}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fSeller} onValueChange={setFSeller}>
            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {sellers.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {originCounts.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Grupos / origens:</span>
            <button onClick={() => setFOrigem("all")} className={`px-2.5 py-1 rounded-full border text-xs transition ${fOrigem === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
              Todas <span className="opacity-70 ml-1">{rows.length}</span>
            </button>
            {originCounts.map(([o, n]) => (
              <button key={o} onClick={() => setFOrigem(fOrigem === o ? "all" : o)} className={`px-2.5 py-1 rounded-full border text-xs transition ${fOrigem === o ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`} title={o}>
                {o.length > 44 ? o.slice(0, 44) + "…" : o} <span className="opacity-70 ml-1">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Listagem ({filtered.length})</TabsTrigger>
          <TabsTrigger value="fila">Fila um por um ({queue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="bg-card border border-border rounded-lg divide-y">
          {loading && <p className="p-8 text-center text-muted-foreground">Carregando…</p>}
          {!loading && filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum lead com esses filtros.</p>}
          {filtered.map(r => <LeadRow key={r.id} r={r} />)}
        </TabsContent>

        <TabsContent value="fila">
          {!activeLead ? (
            <div className="bg-card border border-border rounded-lg p-10 text-center text-muted-foreground">
              Nenhum contato disponível na fila atual.
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <div className="bg-card border border-border rounded-lg p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-primary">{activeLead.nome}</h3>
                    <p className="text-sm text-muted-foreground">{interestLabel(activeLead.interesse_tipo)}{activeLead.curso_interesse ? ` · ${activeLead.curso_interesse}` : ""}</p>
                  </div>
                  <Badge variant="outline" className={sitMeta(activeLead.situacao).cls}>{sitMeta(activeLead.situacao).label}</Badge>
                </div>

                <CrmStatusBlock lead={activeLead} />

                <div className="grid sm:grid-cols-2 gap-3">
                  {activeLead.whatsapp && <a href={buildWhatsappLink(activeLead.whatsapp, "Olá!")} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-border p-3 hover:bg-secondary"><Phone className="size-4" />{activeLead.whatsapp}</a>}
                  {activeLead.email && <div className="flex items-center gap-2 rounded-md border border-border p-3"><Mail className="size-4" />{activeLead.email}</div>}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de grupos/origens</p>
                  <OriginChips lead={activeLead} />
                </div>

                {activeLead.notas && <p className="text-sm whitespace-pre-wrap bg-secondary/50 rounded-md p-3">{activeLead.notas}</p>}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => sendToCrm(activeLead)} disabled={sendingId === activeLead.id}><Send className="size-4 mr-1" />Enviar para meu Kanban</Button>
                  {sellers.length > 0 && (
                    <Select onValueChange={v => sendToCrm(activeLead, v)}>
                      <SelectTrigger className="w-[240px]"><SelectValue placeholder="Enviar para vendedor" /></SelectTrigger>
                      <SelectContent>{sellers.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  <Button variant="outline" onClick={() => activeLead.whatsapp && window.open(buildWhatsappLink(activeLead.whatsapp, "Olá!"), "_blank")}><MessageCircle className="size-4 mr-1" />WhatsApp</Button>
                  <Button variant="outline" onClick={() => openThread(activeLead)}><MessageSquarePlus className="size-4 mr-1" />Comentário</Button>
                  <Button variant="ghost" onClick={() => markNoInterest(activeLead)}>Sem interesse</Button>
                  <Button variant="ghost" onClick={() => setActiveLeadId(queue.find(r => r.id !== activeLead.id)?.id ?? null)}><SkipForward className="size-4 mr-1" />Pular</Button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border font-medium text-sm">Próximos da fila</div>
                <div className="max-h-[520px] overflow-y-auto divide-y">
                  {queue.slice(0, 20).map(r => (
                    <button key={r.id} onClick={() => setActiveLeadId(r.id)} className={`w-full p-3 text-left hover:bg-secondary ${activeLead.id === r.id ? "bg-secondary" : ""}`}>
                      <span className="block text-sm font-semibold truncate">{r.nome}</span>
                      <span className="block text-xs text-muted-foreground truncate">{r.whatsapp || r.email || r.origem}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!crmAlert} onOpenChange={o => !o && setCrmAlert(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contato já está no Kanban</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Alert className="bg-amber-50 border-amber-200 text-amber-950">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não criei duplicado</AlertTitle>
              <AlertDescription>
                Este contato já está com <strong>{crmAlert?.seller_name}</strong>, na etapa <strong>{stageLabel(crmAlert?.estagio)}</strong>, parado há <strong>{daysSince(crmAlert?.stage_changed_at)} dia(s)</strong>.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openCrm(crmAlert?.crm_lead_id)}><ArrowRight className="size-4 mr-1" />Abrir card existente</Button>
              <Select onValueChange={v => transferCrm(crmAlert.crm_lead_id, v)}>
                <SelectTrigger className="w-[240px]"><SelectValue placeholder="Transferir para" /></SelectTrigger>
                <SelectContent>{sellers.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground">Nome *</label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">WhatsApp</label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Email</label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Cidade</label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Estado</label><Input maxLength={2} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
            <div>
              <label className="text-xs text-muted-foreground">Interesse</label>
              <Select value={form.interesse_tipo} onValueChange={v => setForm({ ...form, interesse_tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERESSES.map(i => <SelectItem key={i.v} value={i.v}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Curso de interesse</label><Input value={form.curso_interesse} onChange={e => setForm({ ...form, curso_interesse: e.target.value })} placeholder="Ex.: Técnico em Enfermagem" /></div>
            <div>
              <label className="text-xs text-muted-foreground">Situação</label>
              <Select value={form.situacao} onValueChange={v => setForm({ ...form, situacao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SITUACOES.map(s => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Origem principal</label><Input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} placeholder="Grupo Santa Fé - Três Lagoas" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground">Notas</label><Textarea rows={3} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openComments} onOpenChange={o => !o && setOpenComments(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Comentários — {openComments?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Textarea placeholder="Escreva um comentário…" rows={3} value={newComment} onChange={e => setNewComment(e.target.value)} />
            <div className="flex justify-end"><Button size="sm" onClick={addComment}>Adicionar</Button></div>
          </div>
          <div className="mt-4 max-h-72 overflow-auto space-y-2 border-t border-border pt-3">
            {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>}
            {comments.map(c => (
              <div key={c.id} className="text-sm bg-secondary/60 rounded-md p-2">
                <p className="whitespace-pre-wrap">{c.texto}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}