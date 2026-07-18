import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Receipt, Barcode, Copy, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string; enrollment_id: string; numero: number; valor_cents: number;
  vencimento: string | null; status: string; paid_at: string | null;
  course_title: string | null;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusColor: Record<string, string> = {
  aberto: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pago: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  atrasado: "bg-destructive/15 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

const AlunoFinanceiro = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [boletoOpen, setBoletoOpen] = useState(false);
  const [boletoRow, setBoletoRow] = useState<Row | null>(null);
  const [boletoData, setBoletoData] = useState<any>(null);
  const [boletoLoading, setBoletoLoading] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerCpf, setPayerCpf] = useState("");
  const [addrCep, setAddrCep] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [addrNeighborhood, setAddrNeighborhood] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("student_profiles")
        .select("full_name, cpf, cep, rua, numero, bairro, cidade, estado")
        .eq("user_id", user.id).maybeSingle();
      setPayerName(p?.full_name ?? user.user_metadata?.full_name ?? "");
      setPayerCpf(p?.cpf ?? "");
      setPayerEmail(user.email ?? "");
      setAddrCep(p?.cep ?? "");
      setAddrStreet(p?.rua ?? "");
      setAddrNumber(p?.numero ?? "");
      setAddrNeighborhood(p?.bairro ?? "");
      setAddrCity(p?.cidade ?? "");
      setAddrState(p?.estado ?? "");
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: enrs } = await supabase.from("enrollments").select("id, course_id").eq("user_id", user.id);
      const enrIds = (enrs ?? []).map((e: any) => e.id);
      if (enrIds.length === 0) { setRows([]); return; }
      const [{ data: inst }, { data: cs }] = await Promise.all([
        supabase.from("installments").select("id, enrollment_id, numero, valor_cents, vencimento, status, paid_at")
          .in("enrollment_id", enrIds).order("vencimento"),
        supabase.from("courses").select("id, title").in("id", (enrs ?? []).map((e: any) => e.course_id)),
      ]);
      const eMap = new Map((enrs ?? []).map((e: any) => [e.id, e.course_id]));
      const cMap = new Map((cs ?? []).map((c: any) => [c.id, c.title]));
      setRows((inst ?? []).map((i: any) => {
        const isAtrasado = i.status === "aberto" && i.vencimento && new Date(i.vencimento) < new Date();
        return { ...i, status: isAtrasado ? "atrasado" : i.status, course_title: cMap.get(eMap.get(i.enrollment_id)) ?? null };
      }));
    })();
  }, [user]);

  const pagar = async (r: Row) => {
    setPaying(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { installment_id: r.id, amount_cents: r.valor_cents, description: `Parcela ${r.numero} - ${r.course_title}` },
      });
      if (error) throw error;
      if (data?.init_point) window.location.href = data.init_point;
      else toast.success("Pagamento iniciado");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao iniciar pagamento");
    } finally { setPaying(null); }
  };

  const abrirBoleto = (r: Row) => {
    setBoletoRow(r);
    setBoletoData(null);
    // default: vencimento da parcela, ou 3 dias a partir de hoje
    const def = r.vencimento ? r.vencimento.slice(0, 10) : (() => {
      const d = new Date(); d.setDate(d.getDate() + 3);
      return d.toISOString().slice(0, 10);
    })();
    setDueDate(def);
    setBoletoOpen(true);
  };

  const gerarBoleto = async () => {
    if (!boletoRow) return;
    if (!payerName || !payerEmail || !payerCpf) {
      toast.error("Preencha nome, e-mail e CPF");
      return;
    }
    if (!addrCep || !addrStreet || !addrNumber || !addrNeighborhood || !addrCity || !addrState) {
      toast.error("Preencha o endereço completo (obrigatório para boleto)");
      return;
    }
    if (!dueDate) { toast.error("Escolha a data de vencimento"); return; }
    const today = new Date(); today.setHours(0,0,0,0);
    const dd = new Date(dueDate + "T00:00:00");
    if (dd < today) { toast.error("Vencimento não pode ser no passado"); return; }
    setBoletoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-boleto", {
        body: {
          installment_id: boletoRow.id,
          due_date: dueDate,
          payer: {
            name: payerName, email: payerEmail, cpf: payerCpf,
            address: {
              zip_code: addrCep,
              street_name: addrStreet,
              street_number: addrNumber,
              neighborhood: addrNeighborhood,
              city: addrCity,
              federal_unit: addrState,
            },
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBoletoData(data);
      toast.success("Boleto gerado!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar boleto");
    } finally { setBoletoLoading(false); }
  };

  const copiar = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copiado!"); };

  const aberto = rows.filter(r => r.status !== "pago" && r.status !== "cancelado").reduce((s, r) => s + r.valor_cents, 0);
  const pago = rows.filter(r => r.status === "pago").reduce((s, r) => s + r.valor_cents, 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Financeiro</h1>
        <p className="text-muted-foreground">Suas parcelas e pagamentos.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">Em aberto</p><DollarSign className="size-5 text-amber-600" /></div>
          <p className="text-2xl font-bold mt-1">{brl(aberto)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">Já pago</p><Receipt className="size-5 text-emerald-600" /></div>
          <p className="text-2xl font-bold mt-1">{brl(pago)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Você não tem parcelas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase">
                <tr><th className="text-left p-3">Curso</th><th className="p-3">Parc.</th><th className="text-right p-3">Valor</th><th className="text-left p-3">Vencimento</th><th className="p-3">Status</th><th className="text-right p-3">Ação</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">{r.course_title ?? "—"}</td>
                    <td className="p-3 text-center">{r.numero}</td>
                    <td className="p-3 text-right font-medium">{brl(r.valor_cents)}</td>
                    <td className="p-3">{r.vencimento ? new Date(r.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3 text-center"><Badge className={statusColor[r.status] ?? ""} variant="secondary">{r.status}</Badge></td>
                    <td className="p-3 text-right">
                      {(r.status === "aberto" || r.status === "atrasado") && (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => abrirBoleto(r)}>
                            <Barcode className="size-3.5 mr-1" /> Boleto
                          </Button>
                          <Button size="sm" variant="hero" onClick={() => pagar(r)} disabled={paying === r.id}>{paying === r.id ? "Aguarde…" : "Pagar agora"}</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={boletoOpen} onOpenChange={setBoletoOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Barcode className="size-5" /> Gerar boleto bancário</DialogTitle>
          </DialogHeader>
          {!boletoData ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Parcela {boletoRow?.numero} — <strong>{boletoRow ? brl(boletoRow.valor_cents) : ""}</strong>. Vencimento em 3 dias.
              </p>
              <div><Label>Data de vencimento *</Label><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></div>
              <div><Label>Nome completo *</Label><Input value={payerName} onChange={e=>setPayerName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>E-mail *</Label><Input type="email" value={payerEmail} onChange={e=>setPayerEmail(e.target.value)} /></div>
                <div><Label>CPF *</Label><Input value={payerCpf} onChange={e=>setPayerCpf(e.target.value)} placeholder="000.000.000-00" /></div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Endereço do pagador (obrigatório)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>CEP *</Label><Input value={addrCep} onChange={e=>setAddrCep(e.target.value)} placeholder="00000-000" /></div>
                  <div className="col-span-2"><Label>Rua *</Label><Input value={addrStreet} onChange={e=>setAddrStreet(e.target.value)} /></div>
                  <div><Label>Número *</Label><Input value={addrNumber} onChange={e=>setAddrNumber(e.target.value)} /></div>
                  <div className="col-span-2"><Label>Bairro *</Label><Input value={addrNeighborhood} onChange={e=>setAddrNeighborhood(e.target.value)} /></div>
                  <div className="col-span-2"><Label>Cidade *</Label><Input value={addrCity} onChange={e=>setAddrCity(e.target.value)} /></div>
                  <div><Label>UF *</Label><Input value={addrState} onChange={e=>setAddrState(e.target.value.toUpperCase())} maxLength={2} placeholder="SP" /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setBoletoOpen(false)}>Cancelar</Button>
                <Button variant="hero" onClick={gerarBoleto} disabled={boletoLoading}>
                  {boletoLoading ? "Gerando…" : "Gerar boleto"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                Link de pagamento gerado! Clique abaixo para abrir a página do Mercado Pago e escolher <strong>Boleto</strong> ou <strong>Pix</strong>. Vence em {boletoData.due_date ? new Date(boletoData.due_date).toLocaleDateString("pt-BR") : "—"}.
              </div>
              {boletoData.digitable_line && (
                <div>
                  <Label className="text-xs">Linha digitável</Label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={boletoData.digitable_line} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={()=>copiar(boletoData.digitable_line)}><Copy className="size-4" /></Button>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {boletoData.pdf_url && (
                  <Button asChild variant="hero" className="flex-1">
                    <a href={boletoData.pdf_url} target="_blank" rel="noreferrer"><FileText className="size-4 mr-1" /> Abrir página de pagamento</a>
                  </Button>
                )}
                {boletoData.pdf_url && (
                  <Button asChild variant="outline">
                    <a href={boletoData.pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Após o pagamento, o boleto pode levar até 2 dias úteis para ser confirmado.</p>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setBoletoOpen(false)}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AlunoFinanceiro;