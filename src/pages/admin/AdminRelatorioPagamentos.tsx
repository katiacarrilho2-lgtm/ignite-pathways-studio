import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { downloadCsv, brlCsv, dateCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type AlunoStats = {
  user_id: string; nome: string; email: string;
  pago_cents: number; aberto_cents: number; atrasado_cents: number; ultima_paga: string | null;
};

const Inner = () => {
  const [stats, setStats] = useState<AlunoStats[]>([]);
  const [monthly, setMonthly] = useState<{ mes: string; recebido: number }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: inst } = await supabase.from("installments")
        .select("enrollment_id, valor_cents, status, vencimento, paid_at");
      const enrIds = Array.from(new Set((inst ?? []).map((i: any) => i.enrollment_id)));
      if (enrIds.length === 0) { setStats([]); setMonthly([]); setLoading(false); return; }
      const { data: enrs } = await supabase.from("enrollments").select("id, user_id").in("id", enrIds);
      const userIds = Array.from(new Set((enrs ?? []).map((e: any) => e.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
      const eMap = new Map((enrs ?? []).map((e: any) => [e.id, e.user_id]));
      const pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const byUser = new Map<string, AlunoStats>();
      const byMonth = new Map<string, number>();
      for (const i of (inst ?? []) as any[]) {
        const uid = eMap.get(i.enrollment_id); if (!uid) continue;
        if (!byUser.has(uid)) {
          const p: any = pMap.get(uid);
          byUser.set(uid, { user_id: uid, nome: p?.display_name ?? "—", email: p?.email ?? "", pago_cents: 0, aberto_cents: 0, atrasado_cents: 0, ultima_paga: null });
        }
        const s = byUser.get(uid)!;
        const isAtrasado = i.status === "aberto" && i.vencimento && new Date(i.vencimento) < new Date();
        if (i.status === "pago") {
          s.pago_cents += i.valor_cents;
          if (!s.ultima_paga || (i.paid_at && i.paid_at > s.ultima_paga)) s.ultima_paga = i.paid_at;
          if (i.paid_at) {
            const mes = String(i.paid_at).slice(0, 7);
            byMonth.set(mes, (byMonth.get(mes) ?? 0) + i.valor_cents);
          }
        } else if (isAtrasado) s.atrasado_cents += i.valor_cents;
        else if (i.status === "aberto") s.aberto_cents += i.valor_cents;
      }
      setStats(Array.from(byUser.values()).sort((a, b) => b.pago_cents - a.pago_cents));
      setMonthly(Array.from(byMonth.entries()).sort().slice(-12).map(([mes, recebido]) => ({ mes, recebido: recebido / 100 })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => stats.filter(s => !search
    || s.nome.toLowerCase().includes(search.toLowerCase())
    || s.email.toLowerCase().includes(search.toLowerCase())), [stats, search]);

  const exportCSV = () => {
    const header = ["Aluno", "E-mail", "Pago", "Em aberto", "Atrasado", "Última paga"];
    const lines = filtered.map(s => [s.nome, s.email, brl(s.pago_cents), brl(s.aberto_cents), brl(s.atrasado_cents),
      s.ultima_paga ? new Date(s.ultima_paga).toLocaleDateString("pt-BR") : ""].join(";"));
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pagamentos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Relatório completo: uma linha por parcela, com dados do aluno e do curso.
  const exportDetalhado = async () => {
    const { data: inst } = await supabase.from("installments")
      .select("enrollment_id, numero, valor_cents, valor_final_cents, desconto_cents, vencimento, status, paid_at, forma_pagamento")
      .order("vencimento");
    if (!inst || inst.length === 0) return toast.error("Nenhuma parcela encontrada");
    const enrIds = Array.from(new Set(inst.map((i: any) => i.enrollment_id)));
    const { data: enrs } = await supabase.from("enrollments").select("id, user_id, course:courses(title)").in("id", enrIds);
    const userIds = Array.from(new Set((enrs ?? []).map((e: any) => e.user_id)));
    const [{ data: profs }, { data: sps }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds),
      supabase.from("student_profiles").select("user_id, full_name, phone, phone1, contact_email, cidade, estado").in("user_id", userIds),
    ]);
    const eMap = new Map((enrs ?? []).map((e: any) => [e.id, e]));
    const pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const sMap = new Map((sps ?? []).map((s: any) => [s.user_id, s]));
    const hoje = new Date();
    const rows = inst.map((i: any) => {
      const e: any = eMap.get(i.enrollment_id);
      const p: any = e ? pMap.get(e.user_id) : null;
      const s: any = e ? sMap.get(e.user_id) : null;
      const atrasado = i.status !== "pago" && i.vencimento && new Date(i.vencimento) < hoje;
      return [
        s?.full_name ?? p?.display_name ?? "—",
        s?.phone1 ?? s?.phone ?? "",
        p?.email ?? s?.contact_email ?? "",
        `${s?.cidade ?? ""}${s?.estado ? "/" + s.estado : ""}`,
        e?.course?.title ?? "—",
        i.numero,
        brlCsv(i.valor_cents),
        brlCsv(i.desconto_cents),
        brlCsv(i.valor_final_cents ?? i.valor_cents),
        dateCsv(i.vencimento),
        i.status === "pago" ? "pago" : atrasado ? "atrasado" : "pendente",
        dateCsv(i.paid_at),
        i.forma_pagamento ?? "",
      ];
    });
    downloadCsv("relatorio_financeiro_completo",
      ["Aluno", "Telefone", "E-mail", "Cidade/UF", "Curso", "Parcela", "Valor", "Desconto", "Valor final", "Vencimento", "Situação", "Pago em", "Forma"],
      rows);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Relatório de pagamentos</h1>
          <p className="text-muted-foreground">Resumo por aluno e receita mensal.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline"><Download className="size-4" /> Resumo por aluno</Button>
          <Button onClick={exportDetalhado} variant="hero"><Download className="size-4" /> Relatório completo (parcelas)</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="size-5 text-primary" /><h2 className="font-semibold text-primary">Receita mensal (últimos 12 meses)</h2></div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$ ${v}`} />
              <Tooltip formatter={(v: any) => brl(Number(v) * 100)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="recebido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Input placeholder="Buscar aluno…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase">
              <tr><th className="text-left p-3">Aluno</th><th className="text-right p-3">Pago</th><th className="text-right p-3">Em aberto</th><th className="text-right p-3">Atrasado</th><th className="text-left p-3">Última paga</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum dado.</td></tr>}
              {filtered.map(s => (
                <tr key={s.user_id} className="border-t border-border">
                  <td className="p-3"><p className="font-medium">{s.nome}</p><p className="text-xs text-muted-foreground">{s.email}</p></td>
                  <td className="p-3 text-right font-medium text-emerald-700 dark:text-emerald-400">{brl(s.pago_cents)}</td>
                  <td className="p-3 text-right text-amber-700 dark:text-amber-400">{brl(s.aberto_cents)}</td>
                  <td className="p-3 text-right text-destructive">{brl(s.atrasado_cents)}</td>
                  <td className="p-3">{s.ultima_paga ? new Date(s.ultima_paga).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminRelatorioPagamentos = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminRelatorioPagamentos;