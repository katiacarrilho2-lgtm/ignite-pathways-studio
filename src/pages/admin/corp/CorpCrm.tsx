import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { downloadCsv, brlCsv, dateCsv } from "@/lib/exportCsv";
import { Building2, CalendarCheck, FileText, ScrollText, Wallet, Plus, Download, Pencil, Trash2 } from "lucide-react";

const db = supabase as any;

const brl = (c?: number | null) => ((c ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toCents = (v: string) => Math.round(parseFloat((v || "0").replace(/\./g, "").replace(",", ".")) * 100) || 0;
const fromCents = (c?: number | null) => (((c ?? 0) / 100).toFixed(2)).replace(".", ",");
const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

const ESTAGIOS = ["prospeccao", "contato", "reuniao", "proposta", "negociacao", "fechado", "perdido"];
const ESTAGIO_LABEL: Record<string, string> = {
  prospeccao: "Prospecção", contato: "Contato feito", reuniao: "Reunião marcada",
  proposta: "Proposta enviada", negociacao: "Em negociação", fechado: "Fechado", perdido: "Perdido",
};
const RESULTADOS = ["agendada", "realizada", "no_show", "avancou", "perdida"];
const RESULTADO_LABEL: Record<string, string> = {
  agendada: "Agendada", realizada: "Realizada", no_show: "No-show", avancou: "Avançou", perdida: "Perdida",
};
const PROP_STATUS = ["aberta", "enviada", "ganha", "perdida"];
const CONTRATO_STATUS = ["ativo", "encerrado", "cancelado"];

type Row = Record<string, any>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options, labels }: { value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{labels?.[o] ?? o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export default function CorpCrm() {
  const [empresas, setEmpresas] = useState<Row[]>([]);
  const [reunioes, setReunioes] = useState<Row[]>([]);
  const [propostas, setPropostas] = useState<Row[]>([]);
  const [contratos, setContratos] = useState<Row[]>([]);
  const [faturas, setFaturas] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [dlg, setDlg] = useState<{ table: string; row: Row } | null>(null);

  const load = async () => {
    setLoading(true);
    const [e, r, p, c, f] = await Promise.all([
      db.from("corp_empresas").select("*").order("created_at", { ascending: false }),
      db.from("corp_reunioes").select("*").order("scheduled_at", { ascending: false }),
      db.from("corp_propostas").select("*").order("created_at", { ascending: false }),
      db.from("corp_contratos").select("*").order("created_at", { ascending: false }),
      db.from("corp_faturamento").select("*").order("vencimento", { ascending: true }),
    ]);
    setEmpresas(e.data || []); setReunioes(r.data || []); setPropostas(p.data || []);
    setContratos(c.data || []); setFaturas(f.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const empNome = (id?: string | null) => empresas.find((x) => x.id === id)?.razao_social || "—";

  const kpis = useMemo(() => {
    const now = new Date();
    const mesIni = new Date(now.getFullYear(), now.getMonth(), 1);
    const negociacao = empresas
      .filter((e) => !["fechado", "perdido"].includes(e.estagio))
      .reduce((s, e) => s + (e.valor_negociacao_cents || 0), 0)
      + propostas.filter((p) => ["aberta", "enviada"].includes(p.status)).reduce((s, p) => s + (p.valor_cents || 0), 0);
    const fatMes = faturas.filter((f) => f.pago_em && new Date(f.pago_em) >= mesIni).reduce((s, f) => s + (f.valor_cents || 0), 0);
    const aReceber = faturas.filter((f) => f.status !== "pago").reduce((s, f) => s + (f.valor_cents || 0), 0);
    return {
      empresas: empresas.length,
      reunioesMes: reunioes.filter((r) => new Date(r.scheduled_at) >= mesIni).length,
      reunioesGanhas: reunioes.filter((r) => r.resultado === "avancou").length,
      propostasAbertas: propostas.filter((p) => ["aberta", "enviada"].includes(p.status)).length,
      negociacao,
      contratosAtivos: contratos.filter((c) => c.status === "ativo").length,
      fatMes,
      aReceber,
    };
  }, [empresas, reunioes, propostas, contratos, faturas]);

  const save = async () => {
    if (!dlg) return;
    const { table, row } = dlg;
    const payload = { ...row };
    delete payload.created_at; delete payload.updated_at;
    const id = payload.id; delete payload.id;
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    const res = id
      ? await db.from(table).update(payload).eq("id", id)
      : await db.from(table).insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo");
    setDlg(null);
    load();
  };

  const remove = async (table: string, id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído"); load();
  };

  const set = (k: string, v: any) => setDlg((p) => (p ? { ...p, row: { ...p.row, [k]: v } } : p));

  const empresaSelect = (value: string) => (
    <Select value={value || "none"} onValueChange={(v) => set("empresa_id", v === "none" ? null : v)}>
      <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— sem empresa —</SelectItem>
        {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Corporativo</h1>
          <p className="text-sm text-muted-foreground">Empresas, reuniões, propostas, contratos e faturamento B2B</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Empresas prospectadas", value: kpis.empresas, icon: Building2 },
          { label: "Reuniões no mês", value: `${kpis.reunioesMes} (${kpis.reunioesGanhas} avançaram)`, icon: CalendarCheck },
          { label: "Propostas abertas", value: kpis.propostasAbertas, icon: FileText },
          { label: "Valor em negociação", value: brl(kpis.negociacao), icon: Wallet },
          { label: "Contratos ativos", value: kpis.contratosAtivos, icon: ScrollText },
          { label: "Faturamento do mês", value: brl(kpis.fatMes), icon: Wallet },
          { label: "A receber", value: brl(kpis.aReceber), icon: Wallet },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-xl font-bold">{k.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="empresas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
        </TabsList>

        {/* EMPRESAS */}
        <TabsContent value="empresas" className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => downloadCsv("empresas_corporativo",
              ["Razão social", "CNPJ", "Segmento", "Cidade", "UF", "Contato", "Telefone", "E-mail", "Estágio", "Valor negociação", "Próxima ação"],
              empresas.map((e) => [e.razao_social, e.cnpj, e.segmento, e.cidade, e.uf, e.contato_nome, e.contato_telefone, e.contato_email, ESTAGIO_LABEL[e.estagio] || e.estagio, brlCsv(e.valor_negociacao_cents), dateCsv(e.proxima_acao_em)]))}>
              <Download className="size-4" /> Exportar
            </Button>
            <Button onClick={() => setDlg({ table: "corp_empresas", row: { estagio: "prospeccao", valor_negociacao_cents: 0 } })}><Plus className="size-4" /> Nova empresa</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Empresa</TableHead><TableHead>Contato</TableHead><TableHead>Cidade</TableHead>
                <TableHead>Estágio</TableHead><TableHead>Negociação</TableHead><TableHead>Próx. ação</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {empresas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.razao_social}<div className="text-xs text-muted-foreground">{e.segmento || "—"}</div></TableCell>
                    <TableCell>{e.contato_nome || "—"}<div className="text-xs text-muted-foreground">{e.contato_telefone || e.contato_email || ""}</div></TableCell>
                    <TableCell>{[e.cidade, e.uf].filter(Boolean).join("/") || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{ESTAGIO_LABEL[e.estagio] || e.estagio}</Badge></TableCell>
                    <TableCell>{brl(e.valor_negociacao_cents)}</TableCell>
                    <TableCell>{d(e.proxima_acao_em)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setDlg({ table: "corp_empresas", row: e })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove("corp_empresas", e.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && empresas.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma empresa cadastrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* REUNIOES */}
        <TabsContent value="reunioes" className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => downloadCsv("reunioes_corporativo",
              ["Data", "Empresa", "Título", "Tipo", "Participantes", "Resultado", "Próxima ação", "Data próx. ação"],
              reunioes.map((r) => [dateCsv(r.scheduled_at), empNome(r.empresa_id), r.titulo, r.tipo, r.participantes, RESULTADO_LABEL[r.resultado] || r.resultado, r.proxima_acao, dateCsv(r.proxima_acao_em)]))}>
              <Download className="size-4" /> Exportar
            </Button>
            <Button onClick={() => setDlg({ table: "corp_reunioes", row: { tipo: "online", resultado: "agendada", scheduled_at: new Date().toISOString().slice(0, 16) } })}><Plus className="size-4" /> Nova reunião</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Empresa</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Resultado</TableHead><TableHead>Próxima ação</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {reunioes.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                    <TableCell>{empNome(r.empresa_id)}</TableCell>
                    <TableCell className="font-medium">{r.titulo}</TableCell>
                    <TableCell>{r.tipo}</TableCell>
                    <TableCell><Badge variant={r.resultado === "avancou" ? "default" : r.resultado === "perdida" || r.resultado === "no_show" ? "destructive" : "secondary"}>{RESULTADO_LABEL[r.resultado] || r.resultado}</Badge></TableCell>
                    <TableCell>{r.proxima_acao || "—"}<div className="text-xs text-muted-foreground">{r.proxima_acao_em ? d(r.proxima_acao_em) : ""}</div></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setDlg({ table: "corp_reunioes", row: { ...r, scheduled_at: String(r.scheduled_at).slice(0, 16) } })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove("corp_reunioes", r.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && reunioes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma reunião registrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* PROPOSTAS */}
        <TabsContent value="propostas" className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => downloadCsv("propostas_corporativo",
              ["Empresa", "Título", "Tipo", "Valor", "Status", "Enviada em", "Validade"],
              propostas.map((p) => [empNome(p.empresa_id), p.titulo, p.tipo, brlCsv(p.valor_cents), p.status, dateCsv(p.enviada_em), dateCsv(p.validade_em)]))}>
              <Download className="size-4" /> Exportar
            </Button>
            <Button onClick={() => setDlg({ table: "corp_propostas", row: { status: "aberta", valor_cents: 0 } })}><Plus className="size-4" /> Nova proposta</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Título</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Enviada</TableHead><TableHead>Validade</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {propostas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{empNome(p.empresa_id)}</TableCell>
                    <TableCell className="font-medium">{p.titulo}<div className="text-xs text-muted-foreground">{p.tipo || ""}</div></TableCell>
                    <TableCell>{brl(p.valor_cents)}</TableCell>
                    <TableCell><Badge variant={p.status === "ganha" ? "default" : p.status === "perdida" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>{d(p.enviada_em)}</TableCell>
                    <TableCell>{d(p.validade_em)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setDlg({ table: "corp_propostas", row: p })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove("corp_propostas", p.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && propostas.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma proposta registrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* CONTRATOS */}
        <TabsContent value="contratos" className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => downloadCsv("contratos_corporativo",
              ["Empresa", "Título", "Tipo", "Valor", "Status", "Início", "Fim"],
              contratos.map((c) => [empNome(c.empresa_id), c.titulo, c.tipo, brlCsv(c.valor_cents), c.status, dateCsv(c.inicio_em), dateCsv(c.fim_em)]))}>
              <Download className="size-4" /> Exportar
            </Button>
            <Button onClick={() => setDlg({ table: "corp_contratos", row: { status: "ativo", valor_cents: 0 } })}><Plus className="size-4" /> Novo contrato</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Título</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Vigência</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {contratos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{empNome(c.empresa_id)}</TableCell>
                    <TableCell className="font-medium">{c.titulo}<div className="text-xs text-muted-foreground">{c.tipo || ""}</div></TableCell>
                    <TableCell>{brl(c.valor_cents)}</TableCell>
                    <TableCell><Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell>{d(c.inicio_em)} → {d(c.fim_em)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setDlg({ table: "corp_contratos", row: c })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove("corp_contratos", c.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && contratos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum contrato registrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* FATURAMENTO */}
        <TabsContent value="faturamento" className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => downloadCsv("faturamento_corporativo",
              ["Empresa", "Descrição", "Valor", "Vencimento", "Situação", "Pago em", "NF"],
              faturas.map((f) => [empNome(f.empresa_id), f.descricao, brlCsv(f.valor_cents), dateCsv(f.vencimento), f.status, dateCsv(f.pago_em), f.nota_fiscal]))}>
              <Download className="size-4" /> Exportar
            </Button>
            <Button onClick={() => setDlg({ table: "corp_faturamento", row: { status: "pendente", valor_cents: 0 } })}><Plus className="size-4" /> Novo lançamento</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {faturas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{empNome(f.empresa_id)}</TableCell>
                    <TableCell className="font-medium">{f.descricao || "—"}</TableCell>
                    <TableCell>{brl(f.valor_cents)}</TableCell>
                    <TableCell>{d(f.vencimento)}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "pago" ? "default" : "secondary"}>{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {f.status !== "pago" && (
                        <Button size="sm" variant="outline" className="mr-2" onClick={async () => {
                          const { error } = await db.from("corp_faturamento").update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", f.id);
                          if (error) toast.error(error.message); else { toast.success("Baixa registrada"); load(); }
                        }}>Dar baixa</Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setDlg({ table: "corp_faturamento", row: f })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove("corp_faturamento", f.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && faturas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dlg?.row?.id ? "Editar" : "Novo registro"}</DialogTitle></DialogHeader>

          {dlg?.table === "corp_empresas" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Razão social"><Input value={dlg.row.razao_social || ""} onChange={(e) => set("razao_social", e.target.value)} /></Field>
              <Field label="Nome fantasia"><Input value={dlg.row.nome_fantasia || ""} onChange={(e) => set("nome_fantasia", e.target.value)} /></Field>
              <Field label="CNPJ"><Input value={dlg.row.cnpj || ""} onChange={(e) => set("cnpj", e.target.value)} /></Field>
              <Field label="Segmento"><Input value={dlg.row.segmento || ""} onChange={(e) => set("segmento", e.target.value)} /></Field>
              <Field label="Cidade"><Input value={dlg.row.cidade || ""} onChange={(e) => set("cidade", e.target.value)} /></Field>
              <Field label="UF"><Input value={dlg.row.uf || ""} onChange={(e) => set("uf", e.target.value)} /></Field>
              <Field label="Contato"><Input value={dlg.row.contato_nome || ""} onChange={(e) => set("contato_nome", e.target.value)} /></Field>
              <Field label="Cargo"><Input value={dlg.row.contato_cargo || ""} onChange={(e) => set("contato_cargo", e.target.value)} /></Field>
              <Field label="Telefone"><Input value={dlg.row.contato_telefone || ""} onChange={(e) => set("contato_telefone", e.target.value)} /></Field>
              <Field label="E-mail"><Input value={dlg.row.contato_email || ""} onChange={(e) => set("contato_email", e.target.value)} /></Field>
              <Field label="Colaboradores"><Input type="number" value={dlg.row.colaboradores ?? ""} onChange={(e) => set("colaboradores", e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Estágio"><Sel value={dlg.row.estagio || "prospeccao"} onChange={(v) => set("estagio", v)} options={ESTAGIOS} labels={ESTAGIO_LABEL} /></Field>
              <Field label="Valor em negociação (R$)"><Input value={fromCents(dlg.row.valor_negociacao_cents)} onChange={(e) => set("valor_negociacao_cents", toCents(e.target.value))} /></Field>
              <Field label="Próxima ação em"><Input type="date" value={dlg.row.proxima_acao_em || ""} onChange={(e) => set("proxima_acao_em", e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Observações"><Textarea value={dlg.row.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} /></Field></div>
            </div>
          )}

          {dlg?.table === "corp_reunioes" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa">{empresaSelect(dlg.row.empresa_id || "")}</Field>
              <Field label="Título"><Input value={dlg.row.titulo || ""} onChange={(e) => set("titulo", e.target.value)} /></Field>
              <Field label="Data e hora"><Input type="datetime-local" value={dlg.row.scheduled_at || ""} onChange={(e) => set("scheduled_at", e.target.value)} /></Field>
              <Field label="Tipo"><Sel value={dlg.row.tipo || "online"} onChange={(v) => set("tipo", v)} options={["online", "presencial", "telefone"]} /></Field>
              <Field label="Participantes"><Input value={dlg.row.participantes || ""} onChange={(e) => set("participantes", e.target.value)} /></Field>
              <Field label="Resultado"><Sel value={dlg.row.resultado || "agendada"} onChange={(v) => set("resultado", v)} options={RESULTADOS} labels={RESULTADO_LABEL} /></Field>
              <Field label="Próxima ação"><Input value={dlg.row.proxima_acao || ""} onChange={(e) => set("proxima_acao", e.target.value)} /></Field>
              <Field label="Data da próxima ação"><Input type="date" value={dlg.row.proxima_acao_em || ""} onChange={(e) => set("proxima_acao_em", e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Notas"><Textarea value={dlg.row.notas || ""} onChange={(e) => set("notas", e.target.value)} /></Field></div>
            </div>
          )}

          {dlg?.table === "corp_propostas" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa">{empresaSelect(dlg.row.empresa_id || "")}</Field>
              <Field label="Título"><Input value={dlg.row.titulo || ""} onChange={(e) => set("titulo", e.target.value)} /></Field>
              <Field label="Tipo"><Input value={dlg.row.tipo || ""} onChange={(e) => set("tipo", e.target.value)} /></Field>
              <Field label="Valor (R$)"><Input value={fromCents(dlg.row.valor_cents)} onChange={(e) => set("valor_cents", toCents(e.target.value))} /></Field>
              <Field label="Status"><Sel value={dlg.row.status || "aberta"} onChange={(v) => set("status", v)} options={PROP_STATUS} /></Field>
              <Field label="Enviada em"><Input type="date" value={dlg.row.enviada_em || ""} onChange={(e) => set("enviada_em", e.target.value)} /></Field>
              <Field label="Validade"><Input type="date" value={dlg.row.validade_em || ""} onChange={(e) => set("validade_em", e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Observações"><Textarea value={dlg.row.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} /></Field></div>
            </div>
          )}

          {dlg?.table === "corp_contratos" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa">{empresaSelect(dlg.row.empresa_id || "")}</Field>
              <Field label="Título"><Input value={dlg.row.titulo || ""} onChange={(e) => set("titulo", e.target.value)} /></Field>
              <Field label="Tipo"><Input value={dlg.row.tipo || ""} onChange={(e) => set("tipo", e.target.value)} /></Field>
              <Field label="Valor (R$)"><Input value={fromCents(dlg.row.valor_cents)} onChange={(e) => set("valor_cents", toCents(e.target.value))} /></Field>
              <Field label="Status"><Sel value={dlg.row.status || "ativo"} onChange={(v) => set("status", v)} options={CONTRATO_STATUS} /></Field>
              <Field label="Início"><Input type="date" value={dlg.row.inicio_em || ""} onChange={(e) => set("inicio_em", e.target.value)} /></Field>
              <Field label="Fim"><Input type="date" value={dlg.row.fim_em || ""} onChange={(e) => set("fim_em", e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Observações"><Textarea value={dlg.row.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} /></Field></div>
            </div>
          )}

          {dlg?.table === "corp_faturamento" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa">{empresaSelect(dlg.row.empresa_id || "")}</Field>
              <Field label="Contrato">
                <Select value={dlg.row.contrato_id || "none"} onValueChange={(v) => set("contrato_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Contrato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— sem contrato —</SelectItem>
                    {contratos.map((c) => <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Descrição"><Input value={dlg.row.descricao || ""} onChange={(e) => set("descricao", e.target.value)} /></Field>
              <Field label="Valor (R$)"><Input value={fromCents(dlg.row.valor_cents)} onChange={(e) => set("valor_cents", toCents(e.target.value))} /></Field>
              <Field label="Vencimento"><Input type="date" value={dlg.row.vencimento || ""} onChange={(e) => set("vencimento", e.target.value)} /></Field>
              <Field label="Situação"><Sel value={dlg.row.status || "pendente"} onChange={(v) => set("status", v)} options={["pendente", "pago", "vencido", "cancelado"]} /></Field>
              <Field label="Nota fiscal"><Input value={dlg.row.nota_fiscal || ""} onChange={(e) => set("nota_fiscal", e.target.value)} /></Field>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
