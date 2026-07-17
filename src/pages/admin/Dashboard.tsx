import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Inbox, Users, MessageSquare, LifeBuoy, CheckCircle2, UserCheck, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import FinanceWidget from "@/components/admin/FinanceWidget";
import AdminTasksWidget from "@/components/admin/AdminTasksWidget";

const Dashboard = () => {
  const { user, roles, permissions, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    cursosPublicados: 0, leadsNovos: 0, usuarios: 0,
    msgsNaoRespondidas: 0, ticketsAbertos: 0,
    alunosAtivos: 0, conclusoesMes: 0,
  });
  const [leadsChart, setLeadsChart] = useState<{ d: string; n: number }[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [cursos, leads, usuarios, tickets, alunos, conclusoes, msgs, leadsHist] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("leads").select("id", { count: "exact", head: true }).gt("created_at", sevenDaysAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "fechado"),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).gte("completed_at", firstOfMonth),
        supabase.from("course_messages").select("enrollment_id, sender_id, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("leads").select("created_at").gt("created_at", thirtyDaysAgo),
      ]);

      // mensagens não respondidas: threads cuja última msg é de um aluno (sender_id = user_id da matrícula)
      const lastByThread = new Map<string, { sender_id: string }>();
      for (const m of (msgs.data as any[]) ?? []) {
        if (!lastByThread.has(m.enrollment_id)) lastByThread.set(m.enrollment_id, { sender_id: m.sender_id });
      }
      const enrIds = Array.from(lastByThread.keys());
      let naoRespondidas = 0;
      if (enrIds.length) {
        const { data: enrs } = await supabase.from("enrollments").select("id, user_id").in("id", enrIds);
        const studentMap = new Map((enrs ?? []).map((e: any) => [e.id, e.user_id]));
        for (const [eid, last] of lastByThread) {
          if (studentMap.get(eid) === last.sender_id) naoRespondidas++;
        }
      }

      // gráfico leads/dia
      const bucket = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        bucket.set(d.toISOString().slice(0, 10), 0);
      }
      for (const l of (leadsHist.data as any[]) ?? []) {
        const key = String(l.created_at).slice(0, 10);
        if (bucket.has(key)) bucket.set(key, (bucket.get(key) ?? 0) + 1);
      }
      setLeadsChart(Array.from(bucket.entries()).map(([d, n]) => ({ d: d.slice(5), n })));

      setStats({
        cursosPublicados: cursos.count ?? 0,
        leadsNovos: leads.count ?? 0,
        usuarios: usuarios.count ?? 0,
        ticketsAbertos: tickets.count ?? 0,
        alunosAtivos: alunos.count ?? 0,
        conclusoesMes: conclusoes.count ?? 0,
        msgsNaoRespondidas: naoRespondidas,
      });
    })();
  }, []);

  const cards: { label: string; value: number; icon: any; to?: string; accent?: boolean }[] = [
    { label: "Leads (7 dias)", value: stats.leadsNovos, icon: Inbox, to: "/admin/leads", accent: stats.leadsNovos > 0 },
    { label: "Mensagens p/ responder", value: stats.msgsNaoRespondidas, icon: MessageSquare, to: "/admin/mensagens", accent: stats.msgsNaoRespondidas > 0 },
    { label: "Tickets abertos", value: stats.ticketsAbertos, icon: LifeBuoy, to: "/admin/suporte", accent: stats.ticketsAbertos > 0 },
    { label: "Alunos ativos", value: stats.alunosAtivos, icon: UserCheck, to: "/admin/alunos" },
    { label: "Cursos publicados", value: stats.cursosPublicados, icon: GraduationCap, to: "/admin/cursos" },
    { label: "Conclusões no mês", value: stats.conclusoesMes, icon: CheckCircle2, to: "/admin/andamento" },
    { label: "Usuários totais", value: stats.usuarios, icon: Users, to: "/admin/usuarios" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Olá, {user?.email?.split("@")[0]}</h1>
        <p className="text-muted-foreground">Bem-vindo ao painel da Multplick.</p>
      </div>

      <AdminTasksWidget />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => {
          const inner = (
            <div className={`bg-card rounded-xl border p-5 flex items-center justify-between shadow-card-soft transition-smooth ${c.to ? "hover:shadow-elegant hover:border-primary/40 cursor-pointer" : ""} ${c.accent ? "border-primary/50" : "border-border"}`}>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className={`text-3xl font-bold mt-1 ${c.accent ? "text-primary" : "text-foreground"}`}>{c.value}</p>
              </div>
              <c.icon className={`size-9 ${c.accent ? "text-primary" : "text-primary-glow"}`} />
            </div>
          );
          return c.to ? <Link key={c.label} to={c.to}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-5 text-primary" />
          <h2 className="font-semibold text-primary">Leads recebidos (últimos 30 dias)</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="n" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-primary mb-2">Suas permissões</h2>
        <p className="text-sm text-muted-foreground mb-3">Papel: <strong>{roles.join(", ") || "—"}</strong></p>
        <div className="flex flex-wrap gap-2">
          {permissions.length === 0 && roles.includes("super_admin") && <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs">Super admin · acesso total</span>}
          {permissions.map(p => <span key={p} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">{p}</span>)}
        </div>
      </div>

      {hasPermission("manage_courses") && <FinanceWidget />}
    </div>
  );
};
export default Dashboard;
