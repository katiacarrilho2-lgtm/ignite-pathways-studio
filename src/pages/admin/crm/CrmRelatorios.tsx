import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { fmtBRL } from "@/lib/crm";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy } from "lucide-react";

type Period = "7d" | "30d" | "90d";

export default function CrmRelatorios() {
  const { user, isMaster, hasPermission } = useAuth();
  const { byId } = useCrmSellers();
  const canSeeAll = isMaster || hasPermission("manage_users");
  const [leads, setLeads] = useState<any[]>([]);
  const [paidApps, setPaidApps] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    (async () => {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const since = new Date(Date.now() - days * 86400000);
      const { data } = await supabase.from("crm_leads").select("*").gte("stage_changed_at", since.toISOString());
      setLeads(data ?? []);
      const { data: apps } = await supabase
        .from("enrollment_applications")
        .select("id, seller_id, paid_at, paid_amount_cents, status")
        .not("paid_at", "is", null)
        .gte("paid_at", since.toISOString());
      // Evita dupla contagem: se a pré-matrícula já foi efetivada, o CRM já criou o card 'matriculado' via trigger.
      setPaidApps((apps ?? []).filter((a: any) => a.status !== "matriculado"));
    })();
  }, [period]);

  // Cada matrícula do CRM = 1 venda; combos geram 1 enrollment por curso = auto contagem.
  // Pré-matrículas marcadas como pagas somam separadamente ao vendedor atribuído.
  const mineLeads = useMemo(() => leads.filter(l => l.owner_id === user?.id && l.estagio === "matriculado"), [leads, user?.id]);
  const allLeads = useMemo(() => leads.filter(l => l.estagio === "matriculado"), [leads]);
  const minePaidApps = useMemo(() => paidApps.filter(a => a.seller_id === user?.id), [paidApps, user?.id]);

  const mine = mineLeads;
  const all = allLeads;

  const myChart = useMemo(() => {
    const m: Record<string, number> = {};
    mineLeads.forEach(l => {
      const d = new Date(l.stage_changed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      m[d] = (m[d] || 0) + (l.valor_cents || 0);
    });
    minePaidApps.forEach(a => {
      const d = new Date(a.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      m[d] = (m[d] || 0) + (a.paid_amount_cents || 0);
    });
    return Object.entries(m).map(([dia, v]) => ({ dia, valor: v / 100 }));
  }, [mineLeads, minePaidApps]);

  const ranking = useMemo(() => {
    const m: Record<string, { count: number; total: number }> = {};
    allLeads.forEach(l => {
      const k = l.owner_id;
      if (!m[k]) m[k] = { count: 0, total: 0 };
      m[k].count++; m[k].total += l.valor_cents || 0;
    });
    paidApps.forEach(a => {
      if (!a.seller_id) return;
      const k = a.seller_id;
      if (!m[k]) m[k] = { count: 0, total: 0 };
      m[k].count++; m[k].total += a.paid_amount_cents || 0;
    });
    return Object.entries(m)
      .map(([id, v]) => ({ id, ...v, name: byId(id)?.display_name || id.slice(0,8), avatar: byId(id)?.avatar_url }))
      .sort((a, b) => b.total - a.total);
  }, [allLeads, paidApps, byId]);

  const myStats = useMemo(() => {
    const total = mineLeads.reduce((s, l) => s + (l.valor_cents || 0), 0)
      + minePaidApps.reduce((s, a) => s + (a.paid_amount_cents || 0), 0);
    const count = mineLeads.length + minePaidApps.length;
    return { count, total, avg: count ? total / count : 0 };
  }, [mineLeads, minePaidApps]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-2">
        {(["7d","30d","90d"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${period === p ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
            {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-bold text-primary mb-3">Meu desempenho</h2>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">Matrículas</p><p className="text-2xl font-bold">{myStats.count}</p></div>
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">Total vendido</p><p className="text-2xl font-bold text-emerald-600">{fmtBRL(myStats.total)}</p></div>
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground">Ticket médio</p><p className="text-2xl font-bold">{fmtBRL(myStats.avg)}</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 h-64">
          {myChart.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={myChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v) * 100)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground pt-20">Sem vendas no período.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2"><Trophy className="size-5 text-amber-500" />Ranking de vendedores</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {ranking.length === 0 && <p className="p-8 text-center text-muted-foreground">Sem dados no período.</p>}
          {ranking.map((r, i) => {
            const isMe = r.id === user?.id;
            const showValue = canSeeAll || isMe;
            return (
              <div key={r.id} className={`flex items-center gap-3 p-3 border-b border-border last:border-b-0 ${isMe ? "bg-primary/5" : ""}`}>
                <div className={`size-8 rounded-full grid place-items-center font-bold text-sm ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
                {r.avatar ? <img src={r.avatar} alt="" className="size-8 rounded-full object-cover" /> : <div className="size-8 rounded-full bg-primary/15 text-primary text-xs grid place-items-center font-bold">{r.name.slice(0,1).toUpperCase()}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.name}{isMe && <span className="ml-2 text-xs text-primary">(você)</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.count} matrícula(s)</p>
                </div>
                {showValue && <span className="text-sm font-bold text-emerald-600">{fmtBRL(r.total)}</span>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}