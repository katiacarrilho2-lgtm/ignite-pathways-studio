import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertCircle, Calculator, Download, MessageCircle } from "lucide-react";
import { RequirePermission } from "@/components/admin/AdminLayout";
import PoloComercialResumo from "@/components/admin/PoloComercialResumo";
import useCommercialAccounts from "@/hooks/useCommercialAccounts";
import { ROOT_ACCOUNT_ID } from "@/lib/multiAccount";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import logoUrl from "@/assets/multplick-logo.png";

type Row = {
  id: string; enrollment_id: string; numero: number; valor_cents: number;
  vencimento: string | null; status: string; paid_at: string | null;
  student_name: string | null; student_email: string | null; course_title: string | null;
  forma_pagamento: string | null; desconto_cents: number; valor_final_cents: number | null;
};

const safeCents = (value: number | null | undefined) => Number.isFinite(Number(value)) ? Number(value) : 0;
const brl = (c: number | null | undefined) => (safeCents(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusColor: Record<string, string> = {
  aberto: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pago: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  atrasado: "bg-destructive/15 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

const Inner = () => {
  const { hasPermission, isSuperAdmin } = useAuth();
  const { activeAccountId } = useCommercialAccounts();
  const isPolo = !!activeAccountId && activeAccountId !== ROOT_ACCOUNT_ID;
  const canSettle = isSuperAdmin || hasPermission("settle_boletos") || hasPermission("manage_courses");
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: inst, error } = await supabase.from("installments")
      .select("id, enrollment_id, numero, valor_cents, vencimento, status, paid_at, forma_pagamento, desconto_cents, valor_final_cents")
      .order("vencimento", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const enrIds = Array.from(new Set((inst ?? []).map((i: any) => i.enrollment_id).filter(Boolean)));
    if (enrIds.length === 0) { setRows([]); setLoading(false); return; }
    const { data: enrs } = await supabase.from("enrollments").select("id, user_id, course_id").in("id", enrIds);
    const userIds = Array.from(new Set((enrs ?? []).map((e: any) => e.user_id).filter(Boolean)));
    const courseIds = Array.from(new Set((enrs ?? []).map((e: any) => e.course_id).filter(Boolean)));
    const [{ data: profs }, { data: cs }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds) : Promise.resolve({ data: [] }),
      courseIds.length ? supabase.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    ]);
    const eMap = new Map((enrs ?? []).map((e: any) => [e.id, e]));
    const pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const cMap = new Map((cs ?? []).map((c: any) => [c.id, c]));
    setRows((inst ?? []).map((i: any) => {
      const e: any = eMap.get(i.enrollment_id);
      const p: any = e ? pMap.get(e.user_id) : null;
      const c: any = e ? cMap.get(e.course_id) : null;
      const isAtrasado = i.status === "aberto" && i.vencimento && new Date(i.vencimento) < new Date();
      return { ...i,
        numero: safeCents(i.numero),
        valor_cents: safeCents(i.valor_cents),
        forma_pagamento: i.forma_pagamento ?? null,
        desconto_cents: safeCents(i.desconto_cents),
        valor_final_cents: i.valor_final_cents == null ? null : safeCents(i.valor_final_cents),
        status: isAtrasado ? "atrasado" : (i.status ?? "aberto"),
        student_name: p?.display_name ?? null, student_email: p?.email ?? null, course_title: c?.title ?? null };
    }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (status !== "todos" && r.status !== status) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.student_name ?? "").toLowerCase().includes(q)
      || (r.student_email ?? "").toLowerCase().includes(q)
      || (r.course_title ?? "").toLowerCase().includes(q);
  }), [rows, status, search]);

  const kpis = useMemo(() => {
    const now = new Date(); const month0 = new Date(now.getFullYear(), now.getMonth(), 1);
    const aReceber = rows.filter(r => r.status === "aberto" || r.status === "atrasado").reduce((s, r) => s + safeCents(r.valor_cents), 0);
    const recebidoMes = rows.filter(r => r.status === "pago" && r.paid_at && new Date(r.paid_at) >= month0).reduce((s, r) => s + safeCents(r.valor_final_cents ?? r.valor_cents), 0);
    const atrasadas = rows.filter(r => r.status === "atrasado").length;
    const total = rows.length || 1;
    const inadimplencia = ((atrasadas / total) * 100).toFixed(1);
    return { aReceber, recebidoMes, inadimplencia, atrasadas };
  }, [rows]);

  const marcarPago = async (id: string) => {
    const { error } = await supabase.from("installments").update({ status: "pago", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pagamento registrado"); load();
  };

  const loadLogoDataUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const baixarRecibo = async (r: Row) => {
    const NAVY = [10, 36, 78] as const;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Header band
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, W, 110, "F");

    const logo = await loadLogoDataUrl();
    if (logo) {
      try { doc.addImage(logo, "PNG", W / 2 - 60, 22, 120, 60, undefined, "FAST"); } catch {}
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("MULTPLICK", W / 2, 60, { align: "center" });
    }

    // Company
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Multplick Formação Profissional", W / 2, 140, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text("CNPJ: 37.541.371/0001-90", W / 2, 156, { align: "center" });

    // Title
    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setLineWidth(1);
    doc.line(60, 180, W - 60, 180);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("RECIBO DE PAGAMENTO", W / 2, 215, { align: "center" });
    doc.line(60, 235, W - 60, 235);

    // Recibo nº / valor destaque
    const reciboNumero = `${String(r.numero ?? 0).padStart(3, "0")}/${new Date().getFullYear()}`;
    const valorRecebido = safeCents(r.valor_final_cents ?? r.valor_cents);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Recibo nº ${reciboNumero}`, 60, 260);
    doc.text(`Valor: ${brl(valorRecebido)}`, W - 60, 260, { align: "right" });

    // Body
    const dataPag = r.paid_at ? new Date(r.paid_at) : new Date();
    const valorExtenso = brl(valorRecebido);
    const bodyY = 300;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    const body = `Recebemos de ${r.student_name ?? "—"} a importância de ${valorExtenso}, referente à parcela ${r.numero} do curso "${r.course_title ?? "—"}", pago em ${dataPag.toLocaleDateString("pt-BR")}.`;
    const lines = doc.splitTextToSize(body, W - 120);
    doc.text(lines, 60, bodyY, { lineHeightFactor: 1.6 });

    // Details table
    const detailY = bodyY + lines.length * 20 + 30;
    const rows: [string, string][] = [
      ["Aluno", r.student_name ?? "—"],
      ["E-mail", r.student_email ?? "—"],
      ["Curso", r.course_title ?? "—"],
      ["Parcela", String(r.numero ?? "—")],
      ["Valor original", brl(r.valor_cents)],
      ["Desconto", brl(r.desconto_cents ?? 0)],
      ["Valor recebido", brl(valorRecebido)],
      ["Forma de pagamento", r.forma_pagamento ?? "—"],
      ["Data do pagamento", dataPag.toLocaleDateString("pt-BR")],
    ];
    doc.setFontSize(11);
    rows.forEach((row, idx) => {
      const y = detailY + idx * 22;
      doc.setFillColor(idx % 2 === 0 ? 245 : 255, idx % 2 === 0 ? 247 : 255, idx % 2 === 0 ? 250 : 255);
      doc.rect(60, y - 14, W - 120, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(row[0], 72, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(row[1], 220, y);
    });

    // Footer
    const footerY = H - 130;
    try {
      const { SIGNATURE_PNG } = await import("@/lib/corporativo/signatureImage");
      doc.addImage(SIGNATURE_PNG, "PNG", W / 2 - 55, footerY - 55, 110, 55, undefined, "FAST");
    } catch { /* ignore */ }
    doc.setDrawColor(180, 180, 180);
    doc.line(W / 2 - 130, footerY, W / 2 + 130, footerY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text("Assinatura — Multplick Formação Profissional", W / 2, footerY + 14, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Recibo referente à prestação de serviços educacionais.", W / 2, H - 70, { align: "center" });

    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, H - 40, W, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, W / 2, H - 16, { align: "center" });

    const safe = (s: string | null | undefined) => (s ?? "aluno").replace(/[^a-z0-9]+/gi, "_");
    doc.save(`recibo_${safe(r.student_name)}_parc${r.numero}.pdf`);
  };

  const enviarWhats = (r: Row) => {
    const msg = `Olá ${r.student_name ?? ""}, segue em anexo o recibo de pagamento do curso ${r.course_title ?? ""}. Atenciosamente, equipe Multplick.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe parcelas, pagamentos e inadimplência.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "A receber", v: brl(kpis.aReceber), i: DollarSign, c: "text-primary" },
          { l: "Recebido no mês", v: brl(kpis.recebidoMes), i: TrendingUp, c: "text-emerald-600" },
          { l: "Parcelas atrasadas", v: String(kpis.atrasadas), i: AlertCircle, c: "text-destructive" },
          { l: "Inadimplência", v: `${kpis.inadimplencia}%`, i: Calculator, c: "text-amber-600" },
        ].map(k => (
          <div key={k.l} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">{k.l}</p><k.i className={`size-5 ${k.c}`} /></div>
            <p className="text-2xl font-bold mt-1">{k.v}</p>
          </div>
        ))}
      </div>

      {isPolo && <PoloComercialResumo />}

      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Buscar aluno, e-mail ou curso…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberto">Em aberto</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} parcela(s)</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Aluno</th>
                <th className="text-left p-3">Curso</th>
                <th className="text-center p-3">Parc.</th>
                <th className="text-right p-3">Valor</th>
                <th className="text-left p-3">Vencimento</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3 min-w-56">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma parcela encontrada.</td></tr>}
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3"><p className="font-medium">{r.student_name ?? "—"}</p><p className="text-xs text-muted-foreground">{r.student_email}</p></td>
                  <td className="p-3">{r.course_title ?? "—"}</td>
                  <td className="p-3 text-center">{r.numero ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{brl(r.valor_cents)}</td>
                  <td className="p-3">{r.vencimento ? new Date(r.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3"><Badge className={statusColor[r.status] ?? ""} variant="secondary">{r.status}</Badge></td>
                  <td className="p-3 text-right min-w-56">
                    <div className="flex justify-end gap-2 flex-wrap" key={`${r.id}-${r.status}-${r.paid_at ?? "sem-pagamento"}`}>
                      {r.status !== "pago" && r.status !== "cancelado" && canSettle && (
                        <Button size="sm" variant="outline" onClick={() => marcarPago(r.id)}>Marcar como pago</Button>
                      )}
                      {r.status === "pago" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => baixarRecibo(r)} title="Baixar recibo em PDF" aria-label={`Baixar recibo de ${r.student_name ?? "aluno"}`}>
                            <Download className="size-4 mr-1" /> Recibo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => enviarWhats(r)}
                            title="Enviar via WhatsApp"
                            aria-label={`Enviar recibo de ${r.student_name ?? "aluno"} via WhatsApp`}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle className="size-4 mr-1" /> WhatsApp
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminFinanceiro = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminFinanceiro;