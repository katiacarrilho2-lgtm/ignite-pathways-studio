import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Megaphone, Target, TrendingUp, Users, Wallet, CheckCircle2, Loader2 } from "lucide-react";
import MarketingAgendaWidget from "@/components/admin/MarketingAgendaWidget";

type Campaign = {
  id: string; nome: string; canal: string; status: string;
  budget_cents: number; gasto_cents: number; leads: number; vendas: number; receita_cents: number;
  inicio: string | null; fim: string | null;
};
type Task = { id: string; titulo: string; status: string; due_date: string | null; prioridade: string };

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MarketingDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, t] = await Promise.all([
        supabase.from("mkt_campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("mkt_tasks").select("id,titulo,status,due_date,prioridade").order("due_date", { ascending: true }),
      ]);
      setCampaigns((c.data as Campaign[]) ?? []);
      setTasks((t.data as Task[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const ativas = campaigns.filter(c => c.status === "ativa");
    const sum = (f: (c: Campaign) => number) => campaigns.reduce((a, c) => a + (f(c) || 0), 0);
    const investido = sum(c => c.gasto_cents);
    const receita = sum(c => c.receita_cents);
    const leads = sum(c => c.leads);
    const vendas = sum(c => c.vendas);
    return {
      ativas: ativas.length,
      investido,
      receita,
      leads,
      vendas,
      cpl: leads ? investido / leads : 0,
      roi: investido ? ((receita - investido) / investido) * 100 : 0,
      conversao: leads ? (vendas / leads) * 100 : 0,
    };
  }, [campaigns]);

  const hoje = new Date().toISOString().slice(0, 10);
  const pendentes = tasks.filter(t => t.status !== "concluido");
  const atrasadas = pendentes.filter(t => t.due_date && t.due_date < hoje);

  if (loading) return <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  const cards = [
    { label: "Campanhas ativas", value: String(kpis.ativas), icon: Megaphone, tone: "text-primary" },
    { label: "Investimento", value: brl(kpis.investido), icon: Wallet, tone: "text-orange-500" },
    { label: "Receita atribuída", value: brl(kpis.receita), icon: TrendingUp, tone: "text-emerald-500" },
    { label: "Leads gerados", value: String(kpis.leads), icon: Users, tone: "text-sky-500" },
    { label: "Vendas", value: String(kpis.vendas), icon: CheckCircle2, tone: "text-emerald-500" },
    { label: "Custo por lead", value: brl(Math.round(kpis.cpl)), icon: Target, tone: "text-amber-500" },
    { label: "Conversão", value: `${kpis.conversao.toFixed(1)}%`, icon: Target, tone: "text-violet-500" },
    { label: "ROI", value: `${kpis.roi.toFixed(0)}%`, icon: TrendingUp, tone: kpis.roi >= 0 ? "text-emerald-500" : "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon className={`size-4 ${c.tone}`} />
            </div>
            <div className="mt-2 text-xl font-bold text-foreground">{c.value}</div>
          </Card>
        ))}
      </div>

      <MarketingAgendaWidget />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Campanhas recentes</h2>
            <Link to="/admin/marketing/campanhas" className="text-sm text-primary hover:underline">Ver todas</Link>
          </div>
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada ainda.</p>}
          <div className="space-y-2">
            {campaigns.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.nome}</div>
                  <div className="text-xs text-muted-foreground capitalize">{c.canal} · {c.leads} leads · {c.vendas} vendas</div>
                </div>
                <Badge variant={c.status === "ativa" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Tarefas pendentes</h2>
            <Link to="/admin/marketing/tarefas" className="text-sm text-primary hover:underline">Abrir Kanban</Link>
          </div>
          {atrasadas.length > 0 && (
            <p className="mb-2 text-sm text-destructive">{atrasadas.length} tarefa(s) atrasada(s)</p>
          )}
          {pendentes.length === 0 && <p className="text-sm text-muted-foreground">Tudo em dia por aqui.</p>}
          <div className="space-y-2">
            {pendentes.slice(0, 8).map(t => {
              const late = t.due_date && t.due_date < hoje;
              return (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.titulo}</div>
                    <div className={`text-xs ${late ? "text-destructive" : "text-muted-foreground"}`}>
                      {t.due_date ? new Date(t.due_date + "T12:00:00").toLocaleDateString("pt-BR") : "sem prazo"}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{t.prioridade}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
