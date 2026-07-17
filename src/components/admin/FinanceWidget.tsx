import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarDays,
} from "lucide-react";
import * as XLSX from "xlsx";

type Kind = "pagar" | "receber";

type Entry = {
  id: string;
  kind: Kind;
  name: string;
  amount_cents: number;
  due_date: string;
  paid_at: string | null;
  notes: string | null;
  installment_no: number | null;
  installment_total: number | null;
  series_id: string | null;
};

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const monthNames = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const parseYm = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
};
const monthLabel = (ym: string) => {
  const d = parseYm(ym);
  return `${monthNames[d.getMonth()]} / ${d.getFullYear()}`;
};
const addMonths = (isoDate: string, n: number) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

function statusOf(e: Entry): "pago" | "vencido" | "proximo" | "aberto" {
  if (e.paid_at) return "pago";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(e.due_date + "T00:00:00");
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "vencido";
  if (diffDays <= 7) return "proximo";
  return "aberto";
}

const statusStyles: Record<string, string> = {
  pago: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  vencido: "bg-destructive/10 text-destructive border-destructive/30",
  proximo: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  aberto: "bg-muted text-muted-foreground border-border",
};
const statusLabel: Record<string, string> = {
  pago: "Pago",
  vencido: "Vencido",
  proximo: "A vencer",
  aberto: "Em aberto",
};

function EntryDialog({
  kind, entry, open, onOpenChange, onSaved,
}: {
  kind: Kind;
  entry: Entry | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { activeAccountId } = useCommercialAccounts();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [instNo, setInstNo] = useState("1");
  const [instTotal, setInstTotal] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(entry?.name ?? "");
      setAmount(entry ? ((entry.amount_cents || 0) / 100).toFixed(2) : "");
      setDueDate(entry?.due_date ?? new Date().toISOString().slice(0, 10));
      setNotes(entry?.notes ?? "");
      setInstNo(String(entry?.installment_no ?? 1));
      setInstTotal(String(entry?.installment_total ?? 1));
    }
  }, [open, entry]);

  const save = async () => {
    if (!name.trim() || !dueDate) { toast.error("Preencha nome e vencimento"); return; }
    const cents = Math.round(parseFloat(amount.replace(",", ".") || "0") * 100);
    if (Number.isNaN(cents) || cents < 0) { toast.error("Valor inválido"); return; }
    const nStart = Math.max(1, parseInt(instNo || "1", 10) || 1);
    const nTotal = Math.max(1, parseInt(instTotal || "1", 10) || 1);
    if (nStart > nTotal) { toast.error("Parcela inicial maior que o total"); return; }
    setSaving(true);

    if (entry) {
      const { error } = await supabase.from("finance_entries").update({
        kind, name: name.trim(), amount_cents: cents, due_date: dueDate,
        notes: notes.trim() || null,
        installment_no: nTotal > 1 ? nStart : null,
        installment_total: nTotal > 1 ? nTotal : null,
      }).eq("id", entry.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Atualizado");
    } else {
      const remaining = nTotal - nStart + 1;
      const seriesId = remaining > 1 ? crypto.randomUUID() : null;
      const rows = Array.from({ length: remaining }, (_, i) => {
        const parcela = nStart + i;
        return withAccount({
          kind, name: name.trim(), amount_cents: cents,
          due_date: addMonths(dueDate, i),
          notes: notes.trim() || null,
          installment_no: nTotal > 1 ? parcela : null,
          installment_total: nTotal > 1 ? nTotal : null,
          series_id: seriesId,
        }, activeAccountId);
      });
      const { error } = await supabase.from("finance_entries").insert(rows);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success(remaining > 1 ? `${remaining} parcelas criadas` : "Criado");
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Editar" : "Nova"} conta {kind === "pagar" ? "a pagar" : "a receber"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aluguel / Érica" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Vencimento (1ª parcela)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parcela inicial</Label>
              <Input type="number" min="1" value={instNo} onChange={(e) => setInstNo(e.target.value)} disabled={!!entry} />
            </div>
            <div>
              <Label>Total de parcelas</Label>
              <Input type="number" min="1" value={instTotal} onChange={(e) => setInstTotal(e.target.value)} disabled={!!entry} />
            </div>
          </div>
          {!entry && parseInt(instTotal || "1", 10) > 1 && (
            <p className="text-xs text-muted-foreground">
              Serão criadas {Math.max(1, parseInt(instTotal || "1", 10) - parseInt(instNo || "1", 10) + 1)} parcelas, uma por mês, começando em {new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR")}. Ex: 2/10, 3/10, 4/10…
            </p>
          )}
          <div>
            <Label>Observação</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KindCard({ kind, entries, reload, ym }: { kind: Kind; entries: Entry[]; reload: () => void; ym: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  const list = entries.filter((e) => e.kind === kind && e.due_date.slice(0, 7) === ym);
  const aberto = list.filter((e) => !e.paid_at && statusOf(e) !== "vencido").reduce((s, e) => s + e.amount_cents, 0);
  const vencido = list.filter((e) => statusOf(e) === "vencido").reduce((s, e) => s + e.amount_cents, 0);
  const pagoMes = list.filter((e) => !!e.paid_at).reduce((s, e) => s + e.amount_cents, 0);

  const sorted = [...list].sort((a, b) => {
    if (!!a.paid_at !== !!b.paid_at) return a.paid_at ? 1 : -1;
    return a.due_date.localeCompare(b.due_date);
  });

  const togglePaid = async (e: Entry) => {
    const { error } = await supabase
      .from("finance_entries")
      .update({ paid_at: e.paid_at ? null : new Date().toISOString() })
      .eq("id", e.id);
    if (error) return toast.error(error.message);
    reload();
  };

  const remove = async (e: Entry) => {
    const msg = e.series_id
      ? `"${e.name}" faz parte de uma série de parcelas.\n\nExcluir SOMENTE esta parcela?`
      : `Excluir "${e.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("finance_entries").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    reload();
  };

  const isPagar = kind === "pagar";
  const Icon = isPagar ? ArrowDownCircle : ArrowUpCircle;
  const accentColor = isPagar ? "text-destructive" : "text-emerald-600";

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-card-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`size-5 ${accentColor}`} />
          <h3 className="font-semibold text-foreground">Contas a {isPagar ? "Pagar" : "Receber"}</h3>
        </div>
        <Dialog open={dialogOpen && !editing} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="size-4 mr-1" /> Nova
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="bg-muted rounded-lg p-2">
          <p className="text-muted-foreground">Em aberto</p>
          <p className="font-semibold text-foreground">{brl(aberto)}</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-2">
          <p className="text-destructive">Vencido</p>
          <p className="font-semibold text-destructive">{brl(vencido)}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-2">
          <p className="text-emerald-700">Pago</p>
          <p className="font-semibold text-emerald-700">{brl(pagoMes)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-2">Descrição</th>
              <th className="text-center p-2">Parc.</th>
              <th className="text-right p-2">Valor</th>
              <th className="text-left p-2">Venc.</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2 w-[110px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum lançamento neste mês.</td></tr>
            )}
            {sorted.map((e) => {
              const st = statusOf(e);
              return (
                <tr key={e.id} className="border-t border-border hover:bg-muted/40">
                  <td className="p-2">
                    <p className="font-medium text-foreground truncate max-w-[220px]">{e.name}</p>
                    {e.notes && <p className="text-xs text-muted-foreground truncate max-w-[220px]">{e.notes}</p>}
                  </td>
                  <td className="p-2 text-center text-xs">
                    {e.installment_total && e.installment_no ? (
                      <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                        {e.installment_no}/{e.installment_total}
                      </span>
                    ) : (<span className="text-muted-foreground">—</span>)}
                  </td>
                  <td className="p-2 text-right font-semibold whitespace-nowrap">{brl(e.amount_cents)}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(e.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td className="p-2">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-md border ${statusStyles[st]}`}>{statusLabel[st]}</span>
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-7" title={e.paid_at ? "Reabrir" : "Baixar"} onClick={() => togglePaid(e)}>
                        {e.paid_at ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(e); setDialogOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => remove(e)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EntryDialog
        kind={kind}
        entry={editing}
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        onSaved={reload}
      />
    </div>
  );
}

export default function FinanceWidget() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ym, setYm] = useState<string>(ymOf(new Date()));

  const load = async () => {
    const { data, error } = await supabase
      .from("finance_entries")
      .select("*")
      .order("due_date", { ascending: true });
    if (error) { toast.error("Erro ao carregar contas: " + error.message); return; }
    setEntries((data ?? []) as Entry[]);
  };

  useEffect(() => { load(); }, []);

  const changeMonth = (delta: number) => {
    const d = parseYm(ym);
    d.setMonth(d.getMonth() + delta);
    setYm(ymOf(d));
  };

  const isCurrent = ym === ymOf(new Date());

  const exportExcel = () => {
    const monthRows = entries.filter((e) => e.due_date.slice(0, 7) === ym);
    if (monthRows.length === 0) { toast.error("Nada para exportar neste mês"); return; }
    const data = monthRows.map((e) => ({
      Tipo: e.kind === "pagar" ? "A pagar" : "A receber",
      Descrição: e.name,
      Parcela: e.installment_no && e.installment_total ? `${e.installment_no}/${e.installment_total}` : "",
      "Valor (R$)": (e.amount_cents || 0) / 100,
      Vencimento: new Date(e.due_date + "T00:00:00").toLocaleDateString("pt-BR"),
      Status: e.paid_at ? "Pago" : statusOf(e) === "vencido" ? "Vencido" : "Em aberto",
      "Pago em": e.paid_at ? new Date(e.paid_at).toLocaleDateString("pt-BR") : "",
      Observação: e.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 10 }, { wch: 32 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel(ym).replace("/", "-").slice(0, 31));
    XLSX.writeFile(wb, `contas_${ym}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="icon" variant="outline" onClick={() => changeMonth(-1)} title="Mês anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary">
            <CalendarDays className="size-4" />
            <span className="font-semibold capitalize">{monthLabel(ym)}</span>
            {!isCurrent && <span className="text-xs opacity-70">(histórico)</span>}
          </div>
          <Button size="icon" variant="outline" onClick={() => changeMonth(1)} title="Próximo mês">
            <ChevronRight className="size-4" />
          </Button>
          <Input
            type="month"
            value={ym}
            onChange={(e) => e.target.value && setYm(e.target.value)}
            className="w-[170px]"
          />
          {!isCurrent && (
            <Button size="sm" variant="ghost" onClick={() => setYm(ymOf(new Date()))}>Voltar para hoje</Button>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={exportExcel}>
          <Download className="size-4 mr-1" /> Exportar Excel
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <KindCard kind="pagar" entries={entries} reload={load} ym={ym} />
        <KindCard kind="receber" entries={entries} reload={load} ym={ym} />
      </div>
    </div>
  );
}