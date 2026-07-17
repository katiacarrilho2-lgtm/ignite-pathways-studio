import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, DollarSign, TrendingUp, Copy, CheckCircle2, ChevronDown, ChevronRight, BellRing } from "lucide-react";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AlunoAfiliado = () => {
  const { user } = useAuth();
  const [aff, setAff] = useState<any>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [allPayouts, setAllPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, { installments: any[]; payouts: any[] } | undefined>>({});
  const [expandLoading, setExpandLoading] = useState<Record<string, boolean>>({});
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);

  const loadReferralDetail = async (referralId: string) => {
    setExpandLoading(s => ({ ...s, [referralId]: true }));
    const [{ data: inst }, { data: payouts }] = await Promise.all([
      supabase.rpc("get_affiliate_installments", { _referral_id: referralId }),
      supabase.from("affiliate_commission_payouts")
        .select("*").eq("referral_id", referralId).order("paid_at", { ascending: false }),
    ]);
    setExpanded(s => ({ ...s, [referralId]: { installments: (inst as any) ?? [], payouts: (payouts as any) ?? [] } }));
    setExpandLoading(s => ({ ...s, [referralId]: false }));
  };

  const toggleExpand = async (referralId: string) => {
    if (expanded[referralId]) setExpanded(s => { const n = { ...s }; delete n[referralId]; return n; });
    else await loadReferralDetail(referralId);
  };

  const confirmarPayout = async (referralId: string, payoutId: string, confirmar: boolean) => {
    const { error } = await supabase.from("affiliate_commission_payouts")
      .update({ confirmed_at: confirmar ? new Date().toISOString() : null })
      .eq("id", payoutId);
    if (error) return toast.error(error.message);
    toast.success(confirmar ? "Recebimento confirmado!" : "Confirmação removida");
    await loadReferralDetail(referralId);
  };

  const reload = async () => {
    if (!user) return;
    const { data: a } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
    setAff(a);
    if (a) {
      const { data: r } = await supabase.rpc("get_my_affiliate_commissions");
      const refsData = (r as any) ?? [];
      setRefs(refsData);
      const ids = refsData.map((x: any) => x.id);
      if (ids.length) {
        const { data: pos } = await supabase.from("affiliate_commission_payouts")
          .select("*").in("referral_id", ids);
        const list = (pos as any) ?? [];
        setAllPayouts(list);
        const pend = list.filter((p: any) => !p.confirmed_at);
        setPendingPayouts(pend);
        if (pend.length > 0) {
          toast.info(`Você tem ${pend.length} repasse(s) aguardando sua confirmação de recebimento.`, { duration: 6000 });
          // auto-expandir referrals com pendências
          const refIds = Array.from(new Set(pend.map((p: any) => p.referral_id as string)));
          for (const rid of refIds) await loadReferralDetail(rid as string);
        }
      } else {
        setAllPayouts([]);
        setPendingPayouts([]);
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => { setLoading(true); await reload(); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!aff) return (
    <div className="p-8">
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">Programa de Afiliados</h1>
        <p className="text-muted-foreground">Você ainda não é um afiliado. Entre em contato com a Multplick para participar.</p>
      </div>
    </div>
  );

  const link = `${window.location.origin}/?ref=${aff.code}`;
  const totalEarned = refs.reduce((s, r) => s + (r.commission_cents ?? 0), 0);
  const pago = allPayouts.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const pendente = Math.max(0, totalEarned - pago);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Meu Programa de Afiliado</h1>
        <p className="text-muted-foreground">Indique a Multplick e ganhe comissões.</p>
      </div>

      {pendingPayouts.length > 0 && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 p-5 flex items-start gap-4 animate-pulse-slow">
          <div className="rounded-full bg-amber-400/20 p-3">
            <BellRing className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {pendingPayouts.length} repasse(s) aguardando sua confirmação
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              A Multplick registrou {pendingPayouts.length === 1 ? "um pagamento" : "pagamentos"} de comissão no total de <strong>{brl(pendingPayouts.reduce((s, p) => s + (p.amount_cents ?? 0), 0))}</strong>. Confira abaixo e clique em <strong>Confirmar</strong> em cada repasse recebido.
            </p>
          </div>
        </div>
      )}

      <div className="bg-primary-gradient text-primary-foreground rounded-xl p-6">
        <p className="text-sm opacity-80 mb-2">Seu link de indicação</p>
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
          <Link2 className="size-4 shrink-0" />
          <code className="flex-1 truncate text-sm">{link}</code>
          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copiado!"); }}>
            <Copy className="size-4" /> Copiar
          </Button>
        </div>
        <p className="text-xs opacity-80 mt-3">Comissão: <strong>{Number(aff.commission_pct).toFixed(2)}%</strong> · Código: <strong>{aff.code}</strong></p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">Comissões pagas</p><DollarSign className="size-5 text-emerald-600" /></div><p className="text-2xl font-bold mt-1">{brl(pago)}</p></div>
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">A receber</p><TrendingUp className="size-5 text-amber-600" /></div><p className="text-2xl font-bold mt-1">{brl(pendente)}</p></div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border"><h2 className="font-semibold">Minhas comissões</h2></div>
        {refs.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Nenhuma indicação ainda. Compartilhe seu link!</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Aluno</th>
                <th className="text-left p-3">Curso</th>
                <th className="text-right p-3">Venda</th>
                <th className="text-right p-3">Comissão</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3">Comissão paga</th>
                <th className="text-center p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {refs.map(r => {
                const detail = expanded[r.id];
                const paidTotal = detail ? detail.payouts.reduce((s, p: any) => s + (p.amount_cents ?? 0), 0) : null;
                const remaining = paidTotal != null ? Math.max(0, (r.commission_cents ?? 0) - paidTotal) : null;
                const pendingPayout = detail?.payouts.find((p: any) => !p.confirmed_at);
                return (
                <Fragment key={r.id}>
                <tr className="border-t border-border hover:bg-secondary/20">
                  <td className="p-3">
                    <p className="font-medium">{r.student_name ?? "—"}</p>
                    {r.student_email && <p className="text-xs text-muted-foreground">{r.student_email}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </td>
                  <td className="p-3">{r.course_title ?? "—"}</td>
                  <td className="p-3 text-right">{brl(r.valor_cents)}</td>
                  <td className="p-3 text-right font-medium text-primary">{brl(r.commission_cents)}</td>
                  <td className="p-3 text-center"><Badge variant={r.status === "pago" ? "default" : "secondary"}>{r.status}</Badge></td>
                  <td className="p-3 text-right">
                    {detail ? (
                      <div className="space-y-0.5">
                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">{brl(paidTotal!)}</p>
                        {remaining! > 0 && <p className="text-[10px] text-amber-700 dark:text-amber-400">a receber {brl(remaining!)}</p>}
                      </div>
                    ) : (
                      <button className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1" onClick={() => toggleExpand(r.id)}>
                        <ChevronRight className="size-3" /> ver
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {pendingPayout ? (
                      <Button size="sm" variant="hero" className="h-7 text-[11px]" onClick={() => confirmarPayout(r.id, pendingPayout.id, true)}>
                        <CheckCircle2 className="size-3 mr-1" /> Confirmar recebimento
                      </Button>
                    ) : (
                      <button className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1" onClick={() => toggleExpand(r.id)}>
                        {detail ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />} detalhes
                      </button>
                    )}
                  </td>
                </tr>
                {expanded[r.id] && (
                  <tr className="bg-secondary/20">
                    <td colSpan={7} className="p-4">
                      {expandLoading[r.id] ? (
                        <p className="text-center text-xs text-muted-foreground">Carregando…</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Boletos recebidos</p>
                            <table className="w-full text-xs">
                              <thead className="text-[10px] uppercase text-muted-foreground">
                                <tr><th className="text-left py-1">#</th><th className="text-left py-1">Vencto</th><th className="text-right py-1">Valor</th><th className="text-center py-1">Status</th><th className="text-right py-1">Sua comissão</th></tr>
                              </thead>
                              <tbody>
                                {expanded[r.id]!.installments.map((i: any) => (
                                  <tr key={i.id} className="border-t border-border/50">
                                    <td className="py-1">{i.numero}</td>
                                    <td className="py-1">{i.vencimento ? new Date(i.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                                    <td className="py-1 text-right">{brl(i.valor_cents)}</td>
                                    <td className="py-1 text-center"><Badge variant={i.status === "pago" ? "default" : "secondary"} className="text-[10px]">{i.status}</Badge></td>
                                    <td className="py-1 text-right font-medium text-primary">
                                      {i.status === "pago" ? brl(i.commission_cents) : <span className="text-muted-foreground">—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Meus repasses</p>
                            {expanded[r.id]!.payouts.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhum repasse registrado ainda.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead className="text-[10px] uppercase text-muted-foreground">
                                  <tr><th className="text-left py-1">Data</th><th className="text-right py-1">Valor</th><th className="text-left py-1">Obs.</th><th className="text-right py-1">Confirmação</th></tr>
                                </thead>
                                <tbody>
                                  {expanded[r.id]!.payouts.map((p: any) => (
                                    <tr key={p.id} className="border-t border-border/50">
                                      <td className="py-1">{new Date(p.paid_at).toLocaleDateString("pt-BR")}</td>
                                      <td className="py-1 text-right font-medium">{brl(p.amount_cents)}</td>
                                      <td className="py-1 italic text-muted-foreground">{p.note ?? "—"}</td>
                                      <td className="py-1 text-right">
                                        {p.confirmed_at ? (
                                          <div className="space-y-1">
                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]" variant="secondary">Confirmado</Badge>
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => confirmarPayout(r.id, p.id, false)}>Não recebi</Button>
                                          </div>
                                        ) : (
                                          <Button size="sm" variant="hero" className="h-7 text-[10px]" onClick={() => confirmarPayout(r.id, p.id, true)}>
                                            <CheckCircle2 className="size-3 mr-1" /> Confirmar
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default AlunoAfiliado;