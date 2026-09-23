import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { formatBRL } from "@/lib/cursoLivre";
import { Search, RefreshCcw, ShoppingCart, CreditCard, Users, ClipboardCheck, Award } from "lucide-react";

type Order = {
  id: string; numero_pedido: string | null; user_id: string | null; course_id: string | null;
  nome: string | null; email: string | null; cpf: string | null;
  valor_final_cents: number | null; valor_cents: number | null;
  status: string; created_at: string; paid_at: string | null;
  course?: { title: string } | null;
};
type Payment = {
  id: string; order_id: string; provider: string | null; external_id: string | null;
  metodo: string | null; valor_cents: number | null; status: string;
  paid_at: string | null; created_at: string;
};
type Attempt = {
  id: string; user_id: string; course_id: string; tentativa: number; status: string;
  nota: number | null; acertos: number | null; total_questoes: number | null;
  aprovado: boolean | null; iniciado_em: string; finalizado_em: string | null;
  course?: { title: string } | null;
};
type Cert = { id: string; user_id: string; course_id: string; numero: string; status: string; emitido_em: string; course?: { title: string } | null };

const fmtData = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const maskCpf = (v?: string | null) => {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 11 ? `***.***.***-${d.slice(-2)}` : "—";
};
const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const statusPedido: Record<string, { label: string; cls: string }> = {
  aguardando: { label: "Aguardando pagamento", cls: "bg-amber-100 text-amber-800" },
  pago: { label: "Pago", cls: "bg-emerald-100 text-emerald-800" },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
  reembolsado: { label: "Reembolsado", cls: "bg-rose-100 text-rose-800" },
  expirado: { label: "Expirado", cls: "bg-muted text-muted-foreground" },
};
const statusPgto: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  recusado: "bg-rose-100 text-rose-800",
  cancelado: "bg-muted text-muted-foreground",
  estornado: "bg-rose-100 text-rose-800",
};

const Metric = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) => (
  <Card>
    <CardContent className="p-4 flex items-start gap-3">
      <div className="rounded-lg bg-primary/10 text-primary p-2"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold leading-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </CardContent>
  </Card>
);

const Inner = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("todos");

  const load = async () => {
    setLoading(true);
    const [o, p, a, c] = await Promise.all([
      supabase.from("livre_orders").select("*, course:courses(title)").order("created_at", { ascending: false }).limit(500),
      supabase.from("livre_order_payments").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("exam_attempts").select("*, course:courses(title)").order("iniciado_em", { ascending: false }).limit(500),
      supabase.from("certificates").select("id,user_id,course_id,numero,status,emitido_em, course:courses(title)").order("emitido_em", { ascending: false }).limit(500),
    ]);
    setOrders((o.data ?? []) as unknown as Order[]);
    setPayments((p.data ?? []) as unknown as Payment[]);
    setAttempts((a.data ?? []) as unknown as Attempt[]);
    setCerts((c.data ?? []) as unknown as Cert[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const resumo = useMemo(() => {
    const pagos = orders.filter((o) => o.status === "pago");
    const receita = pagos.reduce((s, o) => s + (o.valor_final_cents ?? o.valor_cents ?? 0), 0);
    const finalizadas = attempts.filter((a) => a.status === "finalizada");
    const aprovadas = finalizadas.filter((a) => a.aprovado);
    const alunos = new Set(orders.map((o) => o.user_id).filter(Boolean)).size;
    return {
      pedidos: orders.length,
      aguardando: orders.filter((o) => o.status === "aguardando").length,
      pagos: pagos.length,
      receita,
      alunos,
      provas: finalizadas.length,
      aprovacao: finalizadas.length ? Math.round((aprovadas.length / finalizadas.length) * 100) : 0,
      certificados: certs.filter((c) => c.status !== "cancelado").length,
    };
  }, [orders, attempts, certs]);

  const pedidosFiltrados = useMemo(() => {
    const q = norm(busca.trim());
    return orders.filter((o) => {
      if (fStatus !== "todos" && o.status !== fStatus) return false;
      if (!q) return true;
      return [o.numero_pedido, o.nome, o.email, o.course?.title].some((v) => v && norm(String(v)).includes(q));
    });
  }, [orders, busca, fStatus]);

  const porAluno = useMemo(() => {
    const map = new Map<string, { nome: string; email: string; cpf: string | null; pedidos: number; pagos: number; total: number; provas: number; certificados: number; user_id: string | null }>();
    for (const o of orders) {
      const key = o.user_id ?? o.email ?? o.id;
      const cur = map.get(key) ?? { nome: o.nome ?? "—", email: o.email ?? "—", cpf: o.cpf ?? null, pedidos: 0, pagos: 0, total: 0, provas: 0, certificados: 0, user_id: o.user_id };
      cur.pedidos += 1;
      if (o.status === "pago") { cur.pagos += 1; cur.total += o.valor_final_cents ?? o.valor_cents ?? 0; }
      map.set(key, cur);
    }
    for (const a of attempts) { const e = a.user_id && map.get(a.user_id); if (e) e.provas += 1; }
    for (const c of certs) { const e = map.get(c.user_id); if (e && c.status !== "cancelado") e.certificados += 1; }
    const q = norm(busca.trim());
    return [...map.values()].filter((r) => !q || norm(`${r.nome} ${r.email}`).includes(q));
  }, [orders, attempts, certs, busca]);

  const orderLabel = (id: string) => {
    const o = orders.find((x) => x.id === id);
    return o ? `${o.numero_pedido ?? "—"} · ${o.nome ?? ""}` : "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cursos Livres · Certificações</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de pedidos, pagamentos, alunos, avaliações e certificados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />Atualizar
          </Button>
          <Button asChild size="sm" variant="outline"><Link to="/admin/questoes">Banco de Questões</Link></Button>
          <Button asChild size="sm"><Link to="/admin/certificacao">Certificados</Link></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={ShoppingCart} label="Pedidos" value={String(resumo.pedidos)} hint={`${resumo.aguardando} aguardando · ${resumo.pagos} pagos`} />
        <Metric icon={CreditCard} label="Recebido" value={formatBRL(resumo.receita)} hint="Somente pedidos pagos" />
        <Metric icon={ClipboardCheck} label="Provas finalizadas" value={String(resumo.provas)} hint={`${resumo.aprovacao}% de aprovação`} />
        <Metric icon={Award} label="Certificados ativos" value={String(resumo.certificados)} />
      </div>

      <Tabs defaultValue="pedidos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2 my-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por aluno, e-mail, curso ou número do pedido..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aguardando">Aguardando pagamento</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="reembolsado">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="pedidos">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pedidos ({pedidosFiltrados.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {pedidosFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">{loading ? "Carregando..." : "Nenhum pedido registrado ainda."}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">Pedido</th><th className="py-2 pr-3">Aluno</th><th className="py-2 pr-3">Curso</th>
                      <th className="py-2 pr-3">Valor</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Criado</th><th className="py-2">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.map((o) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">{o.numero_pedido ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{o.nome ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{o.email ?? "—"} · {maskCpf(o.cpf)}</div>
                        </td>
                        <td className="py-2 pr-3">{o.course?.title ?? "—"}</td>
                        <td className="py-2 pr-3">{formatBRL(o.valor_final_cents ?? o.valor_cents)}</td>
                        <td className="py-2 pr-3"><Badge className={statusPedido[o.status]?.cls ?? ""} variant="secondary">{statusPedido[o.status]?.label ?? o.status}</Badge></td>
                        <td className="py-2 pr-3 text-xs">{fmtData(o.created_at)}</td>
                        <td className="py-2 text-xs">{fmtData(o.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pagamentos ({payments.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">{loading ? "Carregando..." : "Nenhum pagamento registrado ainda."}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">Pedido</th><th className="py-2 pr-3">Meio</th><th className="py-2 pr-3">Identificação</th>
                      <th className="py-2 pr-3">Valor</th><th className="py-2 pr-3">Situação</th><th className="py-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-xs">{orderLabel(p.order_id)}</td>
                        <td className="py-2 pr-3">{p.metodo ?? p.provider ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{p.external_id ?? "—"}</td>
                        <td className="py-2 pr-3">{formatBRL(p.valor_cents)}</td>
                        <td className="py-2 pr-3"><Badge className={statusPgto[p.status] ?? ""} variant="secondary">{p.status}</Badge></td>
                        <td className="py-2 text-xs">{fmtData(p.paid_at ?? p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alunos">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Alunos ({porAluno.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {porAluno.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">{loading ? "Carregando..." : "Nenhum aluno com pedido de curso livre."}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">Aluno</th><th className="py-2 pr-3">CPF</th><th className="py-2 pr-3">Pedidos</th>
                      <th className="py-2 pr-3">Pagos</th><th className="py-2 pr-3">Total</th><th className="py-2 pr-3">Provas</th><th className="py-2">Certificados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porAluno.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{r.nome}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                        </td>
                        <td className="py-2 pr-3">{maskCpf(r.cpf)}</td>
                        <td className="py-2 pr-3">{r.pedidos}</td>
                        <td className="py-2 pr-3">{r.pagos}</td>
                        <td className="py-2 pr-3">{formatBRL(r.total)}</td>
                        <td className="py-2 pr-3">{r.provas}</td>
                        <td className="py-2">{r.certificados}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avaliacoes">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Avaliações ({attempts.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">{loading ? "Carregando..." : "Nenhuma avaliação realizada ainda."}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">Curso</th><th className="py-2 pr-3">Tentativa</th><th className="py-2 pr-3">Situação</th>
                      <th className="py-2 pr-3">Nota</th><th className="py-2 pr-3">Acertos</th><th className="py-2">Finalizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{a.course?.title ?? "—"}</td>
                        <td className="py-2 pr-3">{a.tentativa}ª</td>
                        <td className="py-2 pr-3">
                          {a.status === "finalizada"
                            ? <Badge variant="secondary" className={a.aprovado ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>{a.aprovado ? "Aprovado" : "Reprovado"}</Badge>
                            : <Badge variant="secondary">{a.status === "em_andamento" ? "Em andamento" : a.status}</Badge>}
                        </td>
                        <td className="py-2 pr-3">{a.nota != null ? Number(a.nota).toFixed(1) : "—"}</td>
                        <td className="py-2 pr-3">{a.acertos != null ? `${a.acertos}/${a.total_questoes ?? "—"}` : "—"}</td>
                        <td className="py-2 text-xs">{fmtData(a.finalizado_em)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AdminCursosLivres = () => (
  <RequirePermission perm="manage_courses">
    <Inner />
  </RequirePermission>
);

export default AdminCursosLivres;
