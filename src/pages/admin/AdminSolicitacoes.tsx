import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Dept = { id: string; nome: string; cor: string };
type Req = {
  id: string; numero: number; titulo: string; descricao: string | null;
  from_department_id: string | null; to_department_id: string | null;
  solicitante_id: string | null; responsavel_id: string | null;
  prioridade: string; status: string; prazo: string | null; created_at: string;
};
type Ev = { id: string; request_id: string; autor_id: string | null; tipo: string; descricao: string | null; created_at: string };

const STATUS = [
  { v: "aberta", l: "Aberta" }, { v: "em_analise", l: "Em análise" }, { v: "em_andamento", l: "Em andamento" },
  { v: "aguardando", l: "Aguardando" }, { v: "concluida", l: "Concluída" }, { v: "cancelada", l: "Cancelada" },
];
const PRIOS = [{ v: "baixa", l: "Baixa" }, { v: "normal", l: "Normal" }, { v: "alta", l: "Alta" }, { v: "urgente", l: "Urgente" }];
const corStatus = (s: string) => ({ aberta: "bg-blue-500", em_analise: "bg-amber-500", em_andamento: "bg-violet-500", aguardando: "bg-slate-400", concluida: "bg-green-600", cancelada: "bg-destructive" } as any)[s] ?? "bg-slate-400";

const Inner = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [list, setList] = useState<Req[]>([]);
  const [people, setPeople] = useState<{ user_id: string; display_name: string | null; email: string | null; department_id: string | null }[]>([]);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<Req | null>(null);
  const [eventos, setEventos] = useState<Ev[]>([]);
  const [comentario, setComentario] = useState("");
  const [form, setForm] = useState<any>({ titulo: "", descricao: "", to_department_id: "", prioridade: "normal", prazo: "" });

  const nome = (uid: string | null) => people.find(p => p.user_id === uid)?.display_name || people.find(p => p.user_id === uid)?.email || "—";
  const dep = (id: string | null) => depts.find(d => d.id === id)?.nome ?? "—";

  const load = useCallback(async () => {
    const [{ data: d }, { data: r }, { data: pf }] = await Promise.all([
      supabase.from("departments" as any).select("id,nome,cor").eq("ativo", true).order("sort_order"),
      supabase.from("internal_requests" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("profiles" as any).select("user_id,display_name,email,department_id"),
    ]);
    setDepts((d ?? []) as any); setList((r ?? []) as any); setPeople((pf ?? []) as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = params.get("r");
    if (id && list.length) { const r = list.find(x => x.id === id); if (r) abrir(r); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, list.length]);

  const abrir = async (r: Req) => {
    setDetalhe(r);
    const { data } = await supabase.from("internal_request_events" as any).select("*").eq("request_id", r.id).order("created_at");
    setEventos((data ?? []) as any);
  };

  const criar = async () => {
    if (!form.titulo || !form.to_department_id) return toast.error("Informe título e setor responsável");
    const minhaDep = people.find(p => p.user_id === user?.id)?.department_id ?? null;
    const { error } = await supabase.from("internal_requests" as any).insert({
      titulo: form.titulo, descricao: form.descricao || null, to_department_id: form.to_department_id,
      from_department_id: minhaDep, solicitante_id: user?.id ?? null,
      prioridade: form.prioridade, prazo: form.prazo || null,
    } as any);
    if (error) return toast.error(error.message);
    logAudit("Solicitações", "criou solicitação", form.titulo);
    toast.success("Solicitação aberta");
    setOpen(false); setForm({ titulo: "", descricao: "", to_department_id: "", prioridade: "normal", prazo: "" });
    load();
  };

  const mudarStatus = async (r: Req, status: string) => {
    await supabase.from("internal_requests" as any).update({ status } as any).eq("id", r.id);
    await supabase.from("internal_request_events" as any).insert({ request_id: r.id, autor_id: user?.id, tipo: "status", descricao: `Status alterado para ${STATUS.find(s => s.v === status)?.l}` } as any);
    logAudit("Solicitações", "alterou status", `#${r.numero} → ${status}`, r.id);
    load(); if (detalhe?.id === r.id) abrir({ ...r, status });
  };

  const comentar = async () => {
    if (!detalhe || !comentario.trim()) return;
    await supabase.from("internal_request_events" as any).insert({ request_id: detalhe.id, autor_id: user?.id, tipo: "comentario", descricao: comentario.trim() } as any);
    setComentario(""); abrir(detalhe);
  };

  const filtradas = useMemo(() => list.filter(r =>
    (fStatus === "todos" || r.status === fStatus) &&
    (!busca || r.titulo.toLowerCase().includes(busca.toLowerCase()) || String(r.numero).includes(busca))
  ), [list, fStatus, busca]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Solicitações internas</h1>
          <p className="text-sm text-muted-foreground">Pedidos entre setores da Multplick</p>
        </div>
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" /> Nova solicitação</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título ou número" className="pl-8" />
        </div>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os status</SelectItem>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {filtradas.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma solicitação.</p>}
        {filtradas.map(r => (
          <button key={r.id} onClick={() => abrir(r)} className="text-left bg-card border border-border rounded-lg p-3 hover:shadow-card-soft transition-smooth">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`size-2.5 rounded-full ${corStatus(r.status)}`} />
              <span className="font-semibold text-sm">#{r.numero} · {r.titulo}</span>
              <Badge variant="secondary">{PRIOS.find(p => p.v === r.prioridade)?.l}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{dep(r.from_department_id)} → {dep(r.to_department_id)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.descricao}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Aberta em {new Date(r.created_at).toLocaleDateString("pt-BR")}{r.prazo ? ` · prazo ${new Date(r.prazo + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova solicitação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} /></div>
            <div><Label>Setor responsável</Label>
              <Select value={form.to_department_id} onValueChange={v => setForm({ ...form, to_department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIOS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={criar}>Abrir solicitação</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          {detalhe && (
            <>
              <DialogHeader><DialogTitle>#{detalhe.numero} · {detalhe.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{detalhe.descricao}</p>
                <div className="text-xs text-muted-foreground">
                  {dep(detalhe.from_department_id)} → {dep(detalhe.to_department_id)} · solicitante {nome(detalhe.solicitante_id)}
                </div>
                <div><Label>Status</Label>
                  <Select value={detalhe.status} onValueChange={v => mudarStatus(detalhe, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="border-t border-border pt-2 space-y-2 max-h-56 overflow-y-auto">
                  {eventos.map(e => (
                    <div key={e.id} className="text-xs">
                      <span className="font-medium">{nome(e.autor_id)}</span>
                      <span className="text-muted-foreground"> · {new Date(e.created_at).toLocaleString("pt-BR")}</span>
                      <p>{e.descricao}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Comentar…" onKeyDown={e => e.key === "Enter" && comentar()} />
                  <Button onClick={comentar}>Enviar</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminSolicitacoes() {
  return <RequirePermission perm="mod_solicitacoes"><Inner /></RequirePermission>;
}
