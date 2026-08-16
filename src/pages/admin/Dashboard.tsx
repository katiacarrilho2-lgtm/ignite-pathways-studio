import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserPlus, MessageSquareWarning, GraduationCap, DollarSign,
  AlertTriangle, Users2, UserCheck, ClipboardList, Building2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Kpi = { key: string; label: string; value: string | number; icon: any; to: string; tone: string };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [k, setK] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const startLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endLocal = new Date(startLocal.getTime() + 86400000);
    const startIso = startLocal.toISOString();
    const endIso = endLocal.toISOString();
    const today = `${startLocal.getFullYear()}-${String(startLocal.getMonth() + 1).padStart(2, "0")}-${String(startLocal.getDate()).padStart(2, "0")}`;

    const cnt = (q: any) => q.then(({ count }: any) => count ?? 0).catch(() => 0);

    const [
      novosLeads, semResposta, matriculas, pagas, vencidas, turmasHoje, presencas, propostas, empresas,
    ] = await Promise.all([
      cnt(supabase.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", startIso).lt("created_at", endIso)),
      cnt(supabase.from("crm_leads").select("id", { count: "exact", head: true }).in("estagio", ["novo", "lead"]).eq("atendimentos", 0)),
      cnt(supabase.from("enrollments").select("id", { count: "exact", head: true }).gte("enrolled_at", startIso).lt("enrolled_at", endIso)),
      supabase.from("installments").select("valor_cents, valor_final_cents").gte("paid_at", startIso).lt("paid_at", endIso).then(({ data }) => data ?? [], () => []),
      cnt(supabase.from("installments").select("id", { count: "exact", head: true }).neq("status", "pago").lt("vencimento", today)),
      cnt(supabase.from("turmas").select("id", { count: "exact", head: true }).lte("data_inicio", today).gte("data_fim", today)),
      supabase.from("lesson_progress").select("user_id").gte("updated_at", startIso).lt("updated_at", endIso).then(({ data }) => data ?? [], () => []),
      cnt(supabase.from("enrollment_applications").select("id", { count: "exact", head: true }).not("status", "in", "(matriculado,cancelado,recusado)")),
      cnt(supabase.from("crm_appointments").select("id", { count: "exact", head: true }).eq("done", false).gte("scheduled_at", startIso).lt("scheduled_at", endIso)),
    ]);

    const recebimentos = (pagas as any[]).reduce((s, p) => s + (p.valor_final_cents ?? p.valor_cents ?? 0), 0);
    const presentes = new Set((presencas as any[]).map(p => p.user_id)).size;

    setK({ novosLeads, semResposta, matriculas, recebimentos, vencidas, turmasHoje, presentes, propostas, empresas });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const kpis: Kpi[] = [
    { key: "novosLeads", label: "Novos leads", value: k.novosLeads ?? 0, icon: UserPlus, to: "/admin/crm", tone: "text-primary bg-primary/10" },
    { key: "semResposta", label: "Leads sem resposta", value: k.semResposta ?? 0, icon: MessageSquareWarning, to: "/admin/crm", tone: "text-amber-600 bg-amber-500/10" },
    { key: "matriculas", label: "Matrículas", value: k.matriculas ?? 0, icon: GraduationCap, to: "/admin/alunos", tone: "text-emerald-600 bg-emerald-500/10" },
    { key: "recebimentos", label: "Recebimentos", value: brl(k.recebimentos ?? 0), icon: DollarSign, to: "/admin/financeiro", tone: "text-emerald-600 bg-emerald-500/10" },
    { key: "vencidas", label: "Parcelas vencidas", value: k.vencidas ?? 0, icon: AlertTriangle, to: "/admin/relatorios/pagamentos", tone: "text-destructive bg-destructive/10" },
    { key: "turmasHoje", label: "Turmas hoje", value: k.turmasHoje ?? 0, icon: Users2, to: "/admin/turmas", tone: "text-primary bg-primary/10" },
    { key: "presentes", label: "Alunos presentes", value: k.presentes ?? 0, icon: UserCheck, to: "/admin/andamento", tone: "text-sky-600 bg-sky-500/10" },
    { key: "propostas", label: "Propostas abertas", value: k.propostas ?? 0, icon: ClipboardList, to: "/admin/pre-matriculas", tone: "text-violet-600 bg-violet-500/10" },
    { key: "empresas", label: "Empresas para retornar", value: k.empresas ?? 0, icon: Building2, to: "/admin/crm/agenda", tone: "text-orange-600 bg-orange-500/10" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary">Hoje</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(kpi => (
          <Link key={kpi.key} to={kpi.to}>
            <Card className="hover:shadow-md transition-smooth h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`size-12 rounded-xl grid place-items-center ${kpi.tone}`}>
                  <kpi.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold truncate">{loading ? "—" : kpi.value}</div>
                  <div className="text-xs text-muted-foreground">{kpi.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
