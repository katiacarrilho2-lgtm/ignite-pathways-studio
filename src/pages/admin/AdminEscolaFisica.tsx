import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, DoorOpen, CalendarClock, Package, Wrench } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Sala = { id: string; nome: string; capacidade: number; tipo: string; localizacao: string | null; status: string; observacoes: string | null };
type Reserva = { id: string; classroom_id: string; titulo: string; finalidade: string; inicio: string; fim: string; department_id: string | null; responsavel_id: string | null; observacoes: string | null };
type Bem = { id: string; codigo: string | null; nome: string; categoria: string | null; numero_patrimonio: string | null; classroom_id: string | null; localizacao: string | null; estado: string; status: string; data_aquisicao: string | null; valor_cents: number; observacoes: string | null };
type Chamado = { id: string; tipo: string; problema: string; local: string | null; classroom_id: string | null; prioridade: string; status: string; solucao: string | null; custo_cents: number; data: string };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dtLocal = (iso: string) => new Date(iso).toISOString().slice(0, 16);

const Inner = () => {
  const { user } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [bens, setBens] = useState<Bem[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [depts, setDepts] = useState<{ id: string; nome: string }[]>([]);
  const [dlg, setDlg] = useState<null | "sala" | "reserva" | "bem" | "chamado">(null);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    const [s, r, b, c, d] = await Promise.all([
      supabase.from("classrooms" as any).select("*").order("nome"),
      supabase.from("room_reservations" as any).select("*").order("inicio", { ascending: false }).limit(100),
      supabase.from("patrimonio" as any).select("*").order("nome"),
      supabase.from("maintenance_requests" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("departments" as any).select("id,nome").eq("ativo", true).order("sort_order"),
    ]);
    setSalas((s.data ?? []) as any); setReservas((r.data ?? []) as any); setBens((b.data ?? []) as any);
    setChamados((c.data ?? []) as any); setDepts((d.data ?? []) as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const abrir = (tipo: typeof dlg, dados: any = {}) => { setForm(dados); setDlg(tipo); };

  const salvar = async () => {
    let table = "", payload: any = {};
    if (dlg === "sala") {
      if (!form.nome) return toast.error("Informe o nome da sala");
      table = "classrooms";
      payload = { nome: form.nome, capacidade: Number(form.capacidade) || 0, tipo: form.tipo || "sala", localizacao: form.localizacao || null, status: form.status || "disponivel", observacoes: form.observacoes || null };
    } else if (dlg === "reserva") {
      if (!form.classroom_id || !form.titulo || !form.inicio || !form.fim) return toast.error("Preencha sala, título e horários");
      table = "room_reservations";
      payload = { classroom_id: form.classroom_id, titulo: form.titulo, finalidade: form.finalidade || "aula", inicio: new Date(form.inicio).toISOString(), fim: new Date(form.fim).toISOString(), department_id: form.department_id || null, responsavel_id: user?.id ?? null, observacoes: form.observacoes || null };
    } else if (dlg === "bem") {
      if (!form.nome) return toast.error("Informe o nome do bem");
      table = "patrimonio";
      payload = { codigo: form.codigo || null, nome: form.nome, categoria: form.categoria || null, numero_patrimonio: form.numero_patrimonio || null, classroom_id: form.classroom_id || null, localizacao: form.localizacao || null, estado: form.estado || "bom", status: form.status || "em_uso", data_aquisicao: form.data_aquisicao || null, valor_cents: Math.round(Number(form.valor || 0) * 100), observacoes: form.observacoes || null };
    } else if (dlg === "chamado") {
      if (!form.problema) return toast.error("Descreva o problema");
      table = "maintenance_requests";
      payload = { tipo: form.tipo || "outros", problema: form.problema, local: form.local || null, classroom_id: form.classroom_id || null, prioridade: form.prioridade || "normal", status: form.status || "aberto", solucao: form.solucao || null, custo_cents: Math.round(Number(form.custo || 0) * 100), created_by: user?.id ?? null };
    }
    const { error } = form.id
      ? await supabase.from(table as any).update(payload).eq("id", form.id)
      : await supabase.from(table as any).insert(payload);
    if (error) return toast.error(error.message);
    logAudit("Escola Física", form.id ? `editou ${dlg}` : `criou ${dlg}`, payload.nome || payload.titulo || payload.problema);
    toast.success("Salvo"); setDlg(null); setForm({}); load();
  };

  const excluir = async (table: string, id: string) => {
    if (!confirm("Excluir registro?")) return;
    await supabase.from(table as any).delete().eq("id", id);
    logAudit("Escola Física", "excluiu registro", table, id);
    load();
  };

  const salaNome = (id: string | null) => salas.find(s => s.id === id)?.nome ?? "—";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Escola Física</h1>
        <p className="text-sm text-muted-foreground">Salas, reservas, patrimônio e manutenção</p>
      </div>

      <Tabs defaultValue="salas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="salas"><DoorOpen className="size-4 mr-1" />Salas</TabsTrigger>
          <TabsTrigger value="reservas"><CalendarClock className="size-4 mr-1" />Reservas</TabsTrigger>
          <TabsTrigger value="patrimonio"><Package className="size-4 mr-1" />Patrimônio</TabsTrigger>
          <TabsTrigger value="manutencao"><Wrench className="size-4 mr-1" />Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="salas" className="space-y-3">
          <Button onClick={() => abrir("sala")}><Plus className="size-4" /> Nova sala</Button>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {salas.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">{s.tipo} · {s.capacidade} lugares · {s.localizacao ?? "—"}</p>
                  </div>
                  <Badge variant={s.status === "disponivel" ? "secondary" : "destructive"}>{s.status}</Badge>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button variant="ghost" size="icon" onClick={() => abrir("sala", s)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir("classrooms", s.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
            {salas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada.</p>}
          </div>
        </TabsContent>

        <TabsContent value="reservas" className="space-y-3">
          <Button onClick={() => abrir("reserva")}><Plus className="size-4" /> Nova reserva</Button>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Sala</th><th className="text-left p-2">Título</th><th className="text-left p-2">Finalidade</th><th className="text-left p-2">Início</th><th className="text-left p-2">Fim</th><th /></tr>
              </thead>
              <tbody>
                {reservas.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{salaNome(r.classroom_id)}</td>
                    <td className="p-2 font-medium">{r.titulo}</td>
                    <td className="p-2">{r.finalidade}</td>
                    <td className="p-2">{new Date(r.inicio).toLocaleString("pt-BR")}</td>
                    <td className="p-2">{new Date(r.fim).toLocaleString("pt-BR")}</td>
                    <td className="p-2 text-right"><Button variant="ghost" size="icon" onClick={() => excluir("room_reservations", r.id)}><Trash2 className="size-4" /></Button></td>
                  </tr>
                ))}
                {reservas.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma reserva.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="patrimonio" className="space-y-3">
          <Button onClick={() => abrir("bem")}><Plus className="size-4" /> Novo patrimônio</Button>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Nº</th><th className="text-left p-2">Nome</th><th className="text-left p-2">Categoria</th><th className="text-left p-2">Local</th><th className="text-left p-2">Status</th><th className="text-right p-2">Valor</th><th /></tr>
              </thead>
              <tbody>
                {bens.map(b => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2">{b.numero_patrimonio ?? b.codigo ?? "—"}</td>
                    <td className="p-2 font-medium">{b.nome}</td>
                    <td className="p-2">{b.categoria ?? "—"}</td>
                    <td className="p-2">{b.classroom_id ? salaNome(b.classroom_id) : (b.localizacao ?? "—")}</td>
                    <td className="p-2"><Badge variant={b.status === "em_uso" ? "secondary" : "destructive"}>{b.status}</Badge></td>
                    <td className="p-2 text-right">{brl(b.valor_cents)}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => abrir("bem", { ...b, valor: b.valor_cents / 100 })}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => excluir("patrimonio", b.id)}><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
                {bens.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum bem cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="manutencao" className="space-y-3">
          <Button onClick={() => abrir("chamado")}><Plus className="size-4" /> Novo chamado</Button>
          <div className="grid gap-2">
            {chamados.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{c.problema}</span>
                  <Badge variant="secondary">{c.tipo}</Badge>
                  <Badge variant={c.status === "concluido" ? "secondary" : "destructive"}>{c.status}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")} · {brl(c.custo_cents)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.local ?? salaNome(c.classroom_id)} · prioridade {c.prioridade}</p>
                {c.solucao && <p className="text-xs mt-1">Solução: {c.solucao}</p>}
                <div className="flex gap-1 mt-2">
                  <Button variant="ghost" size="icon" onClick={() => abrir("chamado", { ...c, custo: c.custo_cents / 100 })}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir("maintenance_requests", c.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
            {chamados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum chamado aberto.</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dlg} onOpenChange={o => { if (!o) { setDlg(null); setForm({}); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>
            {dlg === "sala" ? "Sala" : dlg === "reserva" ? "Reserva de sala" : dlg === "bem" ? "Patrimônio" : "Chamado de manutenção"}
          </DialogTitle></DialogHeader>

          {dlg === "sala" && (
            <div className="space-y-3">
              <div><Label>Nome / número</Label><Input value={form.nome ?? ""} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Capacidade</Label><Input type="number" value={form.capacidade ?? 0} onChange={e => setForm({ ...form, capacidade: e.target.value })} /></div>
                <div><Label>Tipo</Label><Input value={form.tipo ?? "sala"} onChange={e => setForm({ ...form, tipo: e.target.value })} /></div>
              </div>
              <div><Label>Localização</Label><Input value={form.localizacao ?? ""} onChange={e => setForm({ ...form, localizacao: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status ?? "disponivel"} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["disponivel", "ocupada", "manutencao", "inativa"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {dlg === "reserva" && (
            <div className="space-y-3">
              <div><Label>Sala</Label>
                <Select value={form.classroom_id ?? ""} onValueChange={v => setForm({ ...form, classroom_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Título</Label><Input value={form.titulo ?? ""} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><Label>Finalidade</Label>
                <Select value={form.finalidade ?? "aula"} onValueChange={v => setForm({ ...form, finalidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["aula", "reuniao", "evento", "atendimento"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Início</Label><Input type="datetime-local" value={form.inicio ? dtLocal(form.inicio) : ""} onChange={e => setForm({ ...form, inicio: e.target.value })} /></div>
                <div><Label>Fim</Label><Input type="datetime-local" value={form.fim ? dtLocal(form.fim) : ""} onChange={e => setForm({ ...form, fim: e.target.value })} /></div>
              </div>
              <div><Label>Departamento</Label>
                <Select value={form.department_id ?? ""} onValueChange={v => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {dlg === "bem" && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome ?? ""} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nº patrimônio</Label><Input value={form.numero_patrimonio ?? ""} onChange={e => setForm({ ...form, numero_patrimonio: e.target.value })} /></div>
                <div><Label>Categoria</Label><Input value={form.categoria ?? ""} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div>
              </div>
              <div><Label>Sala</Label>
                <Select value={form.classroom_id ?? ""} onValueChange={v => setForm({ ...form, classroom_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Estado</Label><Input value={form.estado ?? "bom"} onChange={e => setForm({ ...form, estado: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status ?? "em_uso"} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["em_uso", "manutencao", "danificado", "baixado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Aquisição</Label><Input type="date" value={form.data_aquisicao ?? ""} onChange={e => setForm({ ...form, data_aquisicao: e.target.value })} /></div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor ?? 0} onChange={e => setForm({ ...form, valor: e.target.value })} /></div>
              </div>
            </div>
          )}

          {dlg === "chamado" && (
            <div className="space-y-3">
              <div><Label>Tipo</Label>
                <Select value={form.tipo ?? "outros"} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["ar_condicionado", "computador", "impressora", "projetor", "sala", "eletrica", "hidraulica", "outros"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Problema</Label><Textarea rows={2} value={form.problema ?? ""} onChange={e => setForm({ ...form, problema: e.target.value })} /></div>
              <div><Label>Local</Label><Input value={form.local ?? ""} onChange={e => setForm({ ...form, local: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Prioridade</Label>
                  <Select value={form.prioridade ?? "normal"} onValueChange={v => setForm({ ...form, prioridade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["baixa", "normal", "alta", "urgente"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status ?? "aberto"} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["aberto", "em_andamento", "concluido", "cancelado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Solução</Label><Textarea rows={2} value={form.solucao ?? ""} onChange={e => setForm({ ...form, solucao: e.target.value })} /></div>
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo ?? 0} onChange={e => setForm({ ...form, custo: e.target.value })} /></div>
            </div>
          )}

          <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminEscolaFisica() {
  return <RequirePermission perm="mod_escola_fisica"><Inner /></RequirePermission>;
}
