import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, parseBRLToCents } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Check, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Scope = "dia" | "semana" | "mes";
const LABELS: Record<Scope, string> = { dia: "Hoje", semana: "Semana", mes: "Mês" };

function startOf(scope: Scope): Date {
  const d = new Date();
  if (scope === "dia") { d.setHours(0,0,0,0); return d; }
  if (scope === "semana") { const day = d.getDay(); d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d; }
  d.setDate(1); d.setHours(0,0,0,0); return d;
}

export default function CrmGoalsBar() {
  const { isMaster, hasPermission } = useAuth();
  const canEdit = isMaster || hasPermission("manage_users");
  const [goals, setGoals] = useState<Record<Scope, number>>({ dia: 0, semana: 0, mes: 0 });
  const [progress, setProgress] = useState<Record<Scope, number>>({ dia: 0, semana: 0, mes: 0 });
  const [editing, setEditing] = useState<Scope | null>(null);
  const [draft, setDraft] = useState("");

  const load = async () => {
    const { data } = await supabase.from("crm_goals").select("escopo, valor_cents");
    const g: any = { dia: 0, semana: 0, mes: 0 };
    (data ?? []).forEach((r: any) => g[r.escopo] = r.valor_cents);
    setGoals(g);

    const since = startOf("mes");
    // Soma apenas parcelas efetivamente recebidas (status = 'pago') no período
    const { data: paidInst } = await supabase
      .from("installments")
      .select("valor_cents, valor_final_cents, paid_at, status")
      .eq("status", "pago")
      .gte("paid_at", since.toISOString());
    // Também soma pré-matrículas marcadas como pagas (recebimento avulso)
    const { data: paidApps } = await supabase
      .from("enrollment_applications")
      .select("paid_amount_cents, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", since.toISOString());
    const p: any = { dia: 0, semana: 0, mes: 0 };
    const sDay = startOf("dia").getTime();
    const sWeek = startOf("semana").getTime();
    (paidInst ?? []).forEach((i: any) => {
      if (!i.paid_at) return;
      const t = new Date(i.paid_at).getTime();
      const v = i.valor_final_cents ?? i.valor_cents ?? 0;
      p.mes += v;
      if (t >= sWeek) p.semana += v;
      if (t >= sDay) p.dia += v;
    });
    (paidApps ?? []).forEach((a: any) => {
      if (!a.paid_at) return;
      const t = new Date(a.paid_at).getTime();
      const v = a.paid_amount_cents ?? 0;
      p.mes += v;
      if (t >= sWeek) p.semana += v;
      if (t >= sDay) p.dia += v;
    });
    setProgress(p);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("crm-goals-bar")
      .on("postgres_changes", { event: "*", schema: "public", table: "installments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollment_applications" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_goals" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const save = async (scope: Scope) => {
    const cents = parseBRLToCents(draft);
    const { error } = await supabase.from("crm_goals").update({ valor_cents: cents, updated_at: new Date().toISOString() }).eq("escopo", scope);
    if (error) return toast.error(error.message);
    toast.success("Meta atualizada");
    setEditing(null); load();
  };

  return (
    <div className="grid md:grid-cols-3 gap-3 p-6">
      {(["dia","semana","mes"] as Scope[]).map(s => {
        const goal = goals[s]; const cur = progress[s];
        const pct = goal > 0 ? Math.min(100, (cur / goal) * 100) : 0;
        const reached = goal > 0 && cur >= goal;
        return (
          <div key={s} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className={`size-4 ${reached ? "text-emerald-600" : "text-primary"}`} />
                <span className="text-sm font-semibold text-foreground">Meta {LABELS[s]}</span>
              </div>
              {canEdit && editing !== s && (
                <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(s); setDraft(((goal||0)/100).toFixed(2).replace(".",",")); }}>
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
            {editing === s ? (
              <div className="flex gap-2">
                <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="0,00" className="h-8" autoFocus />
                <Button size="icon" variant="default" className="size-8" onClick={() => save(s)}><Check className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(null)}><X className="size-4" /></Button>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className={`text-xl font-bold ${reached ? "text-emerald-600" : "text-foreground"}`}>{fmtBRL(cur)}</span>
                  <span className="text-xs text-muted-foreground">de {fmtBRL(goal)}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${reached ? "bg-emerald-600" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% atingido</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}