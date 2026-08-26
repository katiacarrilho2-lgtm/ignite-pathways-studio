import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, HandCoins, CheckCircle2 } from "lucide-react";

export type RepasseParceiro = {
  id: string; nome: string; percentual: number;
  dia_fechamento: number; dia_pagamento: number; ativo: boolean;
};
export type RepasseContrato = {
  id: string; enrollment_id: string; parceiro_id: string; percentual: number; ativo: boolean;
};
export type RepasseParcela = {
  id: string; contrato_id: string; installment_id: string; numero: number;
  valor_aluno_cents: number; valor_repasse_cents: number; previsao: string | null;
  status: string; recebido_em: string | null; valor_recebido_cents: number | null;
  comprovante_path?: string | null;
};

export const abrirComprovante = async (path: string) => {
  const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o comprovante");
  window.open(data.signedUrl, "_blank");
};


export const brlCents = (c: number | null | undefined) =>
  ((Number(c) || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateBr = (d?: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");

export const STATUS_LABEL: Record<string, string> = {
  a_receber: "A receber",
  recebido: "Recebido",
  divergencia: "Divergência",
  cancelado: "Cancelado",
};
export const statusClass = (s: string) =>
  s === "recebido" ? "bg-green-100 text-green-800"
  : s === "divergencia" ? "bg-amber-100 text-amber-800"
  : s === "cancelado" ? "bg-muted text-muted-foreground"
  : "bg-sky-100 text-sky-800";

export const loadParceiros = async (): Promise<RepasseParceiro[]> => {
  const { data } = await supabase.from("repasse_parceiros" as any).select("*").order("nome");
  return (data ?? []) as unknown as RepasseParceiro[];
};

/** Dialog de baixa de repasse (marcar como recebido) */
export function BaixaRepasseDialog({
  parcela, onClose, onSaved,
}: { parcela: RepasseParcela | null; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!parcela) return;
    setData(parcela.recebido_em ?? new Date().toISOString().slice(0, 10));
    setValor(((parcela.valor_recebido_cents ?? parcela.valor_repasse_cents) / 100).toFixed(2).replace(".", ","));
  }, [parcela]);

  if (!parcela) return null;
  const recebidoCents = Math.round(Number(valor.replace(/\./g, "").replace(",", ".")) * 100) || 0;
  const diff = recebidoCents - parcela.valor_repasse_cents;

  const salvar = async () => {
    setSaving(true);
    const { error } = await supabase.from("repasse_parcelas" as any).update({
      status: diff === 0 ? "recebido" : "divergencia",
      recebido_em: data || null,
      valor_recebido_cents: recebidoCents,
    }).eq("id", parcela.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(diff === 0 ? "Repasse recebido!" : "Registrado com divergência");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Marcar repasse como recebido</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Parcela {parcela.numero} · Previsto <strong className="text-foreground">{brlCents(parcela.valor_repasse_cents)}</strong>
          </div>
          <div><Label>Data recebida</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
          <div><Label>Valor recebido (R$)</Label><Input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" /></div>
          {diff !== 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
              <p className="font-semibold">DIVERGÊNCIA</p>
              <p>Previsto: {brlCents(parcela.valor_repasse_cents)}</p>
              <p>Recebido: {brlCents(recebidoCents)}</p>
              <p>Diferença: {brlCents(Math.abs(diff))} {diff < 0 ? "a menos" : "a mais"}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={salvar} variant="hero" className="flex-1" disabled={saving}>
              <CheckCircle2 className="size-4" /> {saving ? "Salvando…" : "Confirmar recebimento"}
            </Button>
            {parcela.status !== "a_receber" && (
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.from("repasse_parcelas" as any)
                    .update({ status: "a_receber", recebido_em: null, valor_recebido_cents: null })
                    .eq("id", parcela.id);
                  toast.success("Voltou para 'a receber'");
                  onSaved(); onClose();
                }}
              >Desfazer</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Escolha (ou cadastro rápido) da faculdade parceira ao marcar SIM */
function EscolherParceiroDialog({
  open, parceiros, onClose, onPick, onCreated,
}: {
  open: boolean;
  parceiros: RepasseParceiro[];
  onClose: () => void;
  onPick: (parceiroId: string) => void;
  onCreated: () => Promise<void>;
}) {
  const ativos = parceiros.filter(p => p.ativo);
  const [sel, setSel] = useState("");
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [pct, setPct] = useState("50");
  const [fech, setFech] = useState("27");
  const [pag, setPag] = useState("15");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSel(ativos[0]?.id ?? "");
    setNovo(ativos.length === 0);
  }, [open, ativos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const criar = async () => {
    if (!nome.trim()) return toast.error("Informe o nome da faculdade/parceiro");
    setSaving(true);
    const { data, error } = await supabase.from("repasse_parceiros" as any).insert({
      nome: nome.trim(),
      percentual: Number(pct) || 0,
      dia_fechamento: Number(fech) || 27,
      dia_pagamento: Number(pag) || 15,
      ativo: true,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    await onCreated();
    onPick((data as any).id);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Faculdade/parceiro do repasse</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!novo ? (
            <>
              <div>
                <Label>Faculdade/parceiro</Label>
                <Select value={sel} onValueChange={setSel}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ativos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} · {p.percentual}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="hero" className="flex-1" disabled={!sel} onClick={() => onPick(sel)}>Ativar repasse</Button>
                <Button variant="outline" onClick={() => setNovo(true)}>Nova faculdade</Button>
              </div>
            </>
          ) : (
            <>
              <div><Label>Nome da faculdade/parceiro</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Faculdade XYZ" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>% repasse</Label><Input value={pct} onChange={e => setPct(e.target.value)} inputMode="decimal" /></div>
                <div><Label>Dia fechamento</Label><Input value={fech} onChange={e => setFech(e.target.value)} inputMode="numeric" /></div>
                <div><Label>Dia pagamento</Label><Input value={pag} onChange={e => setPag(e.target.value)} inputMode="numeric" /></div>
              </div>
              <div className="flex gap-2">
                <Button variant="hero" className="flex-1" onClick={criar} disabled={saving}>{saving ? "Salvando…" : "Cadastrar e ativar"}</Button>
                {ativos.length > 0 && <Button variant="outline" onClick={() => setNovo(false)}>Voltar</Button>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  enrollments: { id: string; courses?: { title: string } | null }[];
  /** apenas para exibir a quantidade de parcelas existentes */
  installmentsCount: (enrollmentId: string) => number;
};

/** Seção REPASSE dentro da ficha do aluno/matrícula */
export default function RepasseSection({ enrollments, installmentsCount }: Props) {
  const [parceiros, setParceiros] = useState<RepasseParceiro[]>([]);
  const [contratos, setContratos] = useState<RepasseContrato[]>([]);
  const [parcelas, setParcelas] = useState<RepasseParcela[]>([]);
  const [baixa, setBaixa] = useState<RepasseParcela | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [escolher, setEscolher] = useState<string | null>(null);

  const enrIds = useMemo(() => enrollments.map(e => e.id), [enrollments]);

  const load = useCallback(async () => {
    setParceiros(await loadParceiros());
    if (!enrIds.length) { setContratos([]); setParcelas([]); return; }
    const { data: cts } = await supabase.from("repasse_contratos" as any).select("*").in("enrollment_id", enrIds);
    const list = (cts ?? []) as unknown as RepasseContrato[];
    setContratos(list);
    if (!list.length) { setParcelas([]); return; }
    const { data: ps } = await supabase.from("repasse_parcelas" as any)
      .select("*").in("contrato_id", list.map(c => c.id)).order("numero");
    setParcelas((ps ?? []) as unknown as RepasseParcela[]);
  }, [enrIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const ativar = async (enrollmentId: string, parceiroId: string) => {
    const p = parceiros.find(x => x.id === parceiroId);
    if (!p) return;
    setBusy(enrollmentId);
    const { error } = await supabase.from("repasse_contratos" as any)
      .insert({ enrollment_id: enrollmentId, parceiro_id: p.id, percentual: p.percentual });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Repasse gerado para todas as parcelas desta matrícula");
    load();
  };

  const atualizarContrato = async (id: string, patch: Partial<RepasseContrato>) => {
    const { error } = await supabase.from("repasse_contratos" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const desativar = async (id: string) => {
    if (!confirm("Remover o controle de repasse desta matrícula? As baixas registradas serão perdidas.")) return;
    const { error } = await supabase.from("repasse_contratos" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Repasse removido"); load();
  };

  if (!enrollments.length) {
    return <p className="text-sm text-muted-foreground">Matricule o aluno em um curso para configurar o repasse.</p>;
  }

  return (
    <div className="space-y-6">
      {parceiros.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm">
          Nenhuma faculdade/parceiro cadastrada ainda — clique em <strong>SIM</strong> abaixo para cadastrar na hora, ou use <strong>Financeiro › Repasses › Parceiros</strong>.
        </div>
      )}

      {enrollments.map(enr => {
        const contrato = contratos.find(c => c.enrollment_id === enr.id);
        const parceiro = parceiros.find(p => p.id === contrato?.parceiro_id);
        const rows = parcelas.filter(p => p.contrato_id === contrato?.id).sort((a, b) => a.numero - b.numero);
        const totalVendido = rows.reduce((s, r) => s + r.valor_aluno_cents, 0);
        const totalRepasse = rows.reduce((s, r) => s + r.valor_repasse_cents, 0);
        const recebido = rows.filter(r => r.status === "recebido" || r.status === "divergencia")
          .reduce((s, r) => s + (r.valor_recebido_cents ?? 0), 0);

        return (
          <section key={enr.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/40 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-primary flex items-center gap-2">
                  <HandCoins className="size-4" /> {enr.courses?.title ?? "Matrícula"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {installmentsCount(enr.id)} parcela(s) nesta matrícula
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Esta matrícula gera repasse para a Multplick?</span>
                <Button
                  type="button" size="sm"
                  variant={!contrato ? "hero" : "outline"}
                  disabled={busy === enr.id}
                  onClick={() => { if (contrato) desativar(contrato.id); }}
                >NÃO</Button>
                <Button
                  type="button" size="sm"
                  variant={contrato ? "hero" : "outline"}
                  disabled={busy === enr.id}
                  onClick={() => { if (!contrato) setEscolher(enr.id); }}
                >SIM</Button>
              </div>
            </div>

            {contrato && (
              <div className="p-4 space-y-4">
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <Label>Faculdade/parceiro</Label>
                    <Select
                      value={contrato.parceiro_id}
                      onValueChange={(v) => {
                        const p = parceiros.find(x => x.id === v);
                        atualizarContrato(contrato.id, { parceiro_id: v, percentual: p?.percentual ?? contrato.percentual });
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {parceiros.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Percentual de repasse (%)</Label>
                    <Input
                      type="number" step="0.01" defaultValue={contrato.percentual}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(contrato.percentual)) atualizarContrato(contrato.id, { percentual: v });
                      }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground self-end pb-2">
                    <Building2 className="size-3.5 inline mr-1" />
                    Fechamento dia {parceiro?.dia_fechamento ?? "—"} · Pagamento dia {parceiro?.dia_pagamento ?? "—"}
                  </div>
                  <div className="self-end pb-1">
                    <Button variant="outline" size="sm" onClick={load}>Recalcular previsões</Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-secondary/60">
                      <tr>
                        <th className="text-left p-3">Parcela</th>
                        <th className="text-left p-3">Valor aluno</th>
                        <th className="text-left p-3">Repasse Multplick</th>
                        <th className="text-left p-3">Previsão</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="p-3">{r.numero}/{rows.length}</td>
                          <td className="p-3">{brlCents(r.valor_aluno_cents)}</td>
                          <td className="p-3 font-medium">{brlCents(r.valor_repasse_cents)}</td>
                          <td className="p-3">{dateBr(r.previsao)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${statusClass(r.status)}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                            {r.status === "divergencia" && (
                              <span className="block text-[11px] text-amber-700 mt-1">
                                Recebido {brlCents(r.valor_recebido_cents)} · dif. {brlCents((r.valor_recebido_cents ?? 0) - r.valor_repasse_cents)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => setBaixa(r)}>
                              <CheckCircle2 className="size-4 mr-1" /> {r.status === "a_receber" ? "Marcar recebido" : "Editar baixa"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Esta matrícula ainda não tem parcelas cadastradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground text-xs">Total vendido</p><p className="font-bold">{brlCents(totalVendido)}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground text-xs">Total de repasse</p><p className="font-bold text-primary">{brlCents(totalRepasse)}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground text-xs">Já recebido</p><p className="font-bold text-green-700">{brlCents(recebido)}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-muted-foreground text-xs">Falta receber</p><p className="font-bold text-amber-700">{brlCents(Math.max(totalRepasse - recebido, 0))}</p></div>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <BaixaRepasseDialog parcela={baixa} onClose={() => setBaixa(null)} onSaved={load} />
      <EscolherParceiroDialog
        open={!!escolher}
        parceiros={parceiros}
        onClose={() => setEscolher(null)}
        onPick={async (id) => { const e = escolher; setEscolher(null); if (e) await ativar(e, id); }}
        onCreated={async () => { setParceiros(await loadParceiros()); }}
      />
    </div>
  );
}
