import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  HandCoins, Building2, Plus, Pencil, Trash2, Download, RefreshCw,
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Users, Layers,
} from "lucide-react";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { downloadCsv, brlCsv, dateCsv } from "@/lib/exportCsv";
import {
  BaixaRepasseDialog, brlCents, dateBr, STATUS_LABEL, statusClass,
  type RepasseParceiro, type RepasseParcela,
} from "@/components/admin/RepasseSection";

type ContratoRow = {
  id: string; enrollment_id: string; parceiro_id: string; percentual: number;
  enrollments: {
    id: string; user_id: string; course_id: string;
    courses: { title: string } | null;
  } | null;
};

type Linha = {
  contratoId: string;
  alunoId: string;
  aluno: string;
  curso: string;
  faculdade: string;
  percentual: number;
  parcelas: RepasseParcela[];
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const hoje = new Date();

const Inner = () => {
  const [loading, setLoading] = useState(true);
  const [parceiros, setParceiros] = useState<RepasseParceiro[]>([]);
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [parcelas, setParcelas] = useState<RepasseParcela[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [baixa, setBaixa] = useState<RepasseParcela | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  // filtros
  const [mes, setMes] = useState<string>("todos");
  const [ano, setAno] = useState<string>(String(hoje.getFullYear()));
  const [fFaculdade, setFFaculdade] = useState("todas");
  const [fCurso, setFCurso] = useState("todos");
  const [fAluno, setFAluno] = useState("");
  const [fStatus, setFStatus] = useState("todos");

  // parceiros CRUD
  const [pOpen, setPOpen] = useState(false);
  const [pEdit, setPEdit] = useState<Partial<RepasseParceiro>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pd }, { data: cd }] = await Promise.all([
      supabase.from("repasse_parceiros" as any).select("*").order("nome"),
      supabase.from("repasse_contratos" as any)
        .select("id, enrollment_id, parceiro_id, percentual, enrollments(id, user_id, course_id, courses(title))"),
    ]);
    const pList = (pd ?? []) as unknown as RepasseParceiro[];
    const cList = (cd ?? []) as unknown as ContratoRow[];
    setParceiros(pList);
    setContratos(cList);

    if (cList.length) {
      const [{ data: rp }, { data: profs }] = await Promise.all([
        supabase.from("repasse_parcelas" as any).select("*").in("contrato_id", cList.map(c => c.id)),
        supabase.from("profiles").select("user_id, display_name, email, username")
          .in("user_id", Array.from(new Set(cList.map(c => c.enrollments?.user_id).filter(Boolean) as string[]))),
      ]);
      setParcelas((rp ?? []) as unknown as RepasseParcela[]);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.display_name || p.email || p.username || "Aluno"; });
      setNomes(map);
    } else { setParcelas([]); setNomes({}); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const linhas: Linha[] = useMemo(() => contratos.map(c => ({
    contratoId: c.id,
    alunoId: c.enrollments?.user_id ?? "",
    aluno: nomes[c.enrollments?.user_id ?? ""] ?? "Aluno",
    curso: c.enrollments?.courses?.title ?? "—",
    faculdade: parceiros.find(p => p.id === c.parceiro_id)?.nome ?? "—",
    percentual: Number(c.percentual),
    parcelas: parcelas.filter(p => p.contrato_id === c.id).sort((a, b) => a.numero - b.numero),
  })), [contratos, parcelas, parceiros, nomes]);

  const matchParcela = useCallback((p: RepasseParcela) => {
    if (fStatus !== "todos") {
      if (fStatus === "recebido" && !["recebido", "divergencia"].includes(p.status)) return false;
      if (fStatus === "a_receber" && p.status !== "a_receber") return false;
      if (["divergencia", "cancelado"].includes(fStatus) && p.status !== fStatus) return false;
    }
    if (!p.previsao) return mes === "todos" && ano === "todos";
    const d = new Date(`${p.previsao}T12:00:00`);
    if (ano !== "todos" && d.getFullYear() !== Number(ano)) return false;
    if (mes !== "todos" && d.getMonth() !== Number(mes)) return false;
    return true;
  }, [mes, ano, fStatus]);

  const linhasFiltradas = useMemo(() => linhas
    .filter(l => fFaculdade === "todas" || l.faculdade === fFaculdade)
    .filter(l => fCurso === "todos" || l.curso === fCurso)
    .filter(l => !fAluno.trim() || l.aluno.toLowerCase().includes(fAluno.trim().toLowerCase()))
    .map(l => ({ ...l, visiveis: l.parcelas.filter(matchParcela) }))
    .filter(l => l.visiveis.length > 0),
    [linhas, fFaculdade, fCurso, fAluno, matchParcela]);

  const kpis = useMemo(() => {
    const todas = linhasFiltradas.flatMap(l => l.visiveis);
    const vendido = todas.reduce((s, p) => s + p.valor_aluno_cents, 0);
    const repasse = todas.reduce((s, p) => s + p.valor_repasse_cents, 0);
    const recebido = todas.filter(p => ["recebido", "divergencia"].includes(p.status))
      .reduce((s, p) => s + (p.valor_recebido_cents ?? 0), 0);
    const aReceber = todas.filter(p => p.status === "a_receber").reduce((s, p) => s + p.valor_repasse_cents, 0);
    const hojeIso = new Date().toISOString().slice(0, 10);
    const atrasado = todas.filter(p => p.status === "a_receber" && p.previsao && p.previsao < hojeIso)
      .reduce((s, p) => s + p.valor_repasse_cents, 0);
    return {
      vendido, repasse, recebido, aReceber, atrasado,
      alunos: new Set(linhasFiltradas.map(l => l.alunoId)).size,
      parcelas: todas.length,
    };
  }, [linhasFiltradas]);

  const exportar = () => {
    const rows: (string | number)[][] = [];
    linhasFiltradas.forEach(l => l.visiveis.forEach(p => rows.push([
      l.aluno, l.curso, l.faculdade, `${p.numero}/${l.parcelas.length}`,
      brlCsv(p.valor_aluno_cents), `${l.percentual}%`, brlCsv(p.valor_repasse_cents),
      dateCsv(p.previsao), STATUS_LABEL[p.status] ?? p.status,
      brlCsv(p.valor_recebido_cents ?? 0), dateCsv(p.recebido_em),
    ])));
    downloadCsv("repasses", ["Aluno","Curso","Faculdade","Parcela","Valor aluno","%","Repasse","Previsão","Status","Recebido","Data recebida"], rows);
  };

  const salvarParceiro = async () => {
    if (!pEdit.nome?.trim()) return toast.error("Informe o nome do parceiro");
    const payload = {
      nome: pEdit.nome.trim(),
      percentual: Number(pEdit.percentual ?? 50),
      dia_fechamento: Number(pEdit.dia_fechamento ?? 27),
      dia_pagamento: Number(pEdit.dia_pagamento ?? 15),
      ativo: pEdit.ativo !== false,
    };
    const { error } = pEdit.id
      ? await supabase.from("repasse_parceiros" as any).update(payload).eq("id", pEdit.id)
      : await supabase.from("repasse_parceiros" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Parceiro salvo"); setPOpen(false); load();
  };

  const cursos = Array.from(new Set(linhas.map(l => l.curso))).sort();
  const anos = Array.from(new Set([hoje.getFullYear(), ...parcelas.map(p => p.previsao ? new Date(`${p.previsao}T12:00:00`).getFullYear() : hoje.getFullYear())])).sort();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
            <HandCoins className="size-6" /> Controle de Repasses
          </h1>
          <p className="text-muted-foreground text-sm">Repasses das faculdades parceiras, parcela por parcela.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
          <Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar CSV</Button>
        </div>
      </div>

      <Tabs defaultValue="repasses" className="space-y-5">
        <TabsList>
          <TabsTrigger value="repasses">Repasses</TabsTrigger>
          <TabsTrigger value="parceiros">Parceiros / Faculdades</TabsTrigger>
        </TabsList>

        <TabsContent value="repasses" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Vendas vinculadas", value: brlCents(kpis.vendido), tone: "text-primary bg-primary/10", icon: Layers },
              { label: "Repasse Multplick", value: brlCents(kpis.repasse), tone: "text-violet-600 bg-violet-500/10", icon: HandCoins },
              { label: "Já recebido", value: brlCents(kpis.recebido), tone: "text-emerald-600 bg-emerald-500/10", icon: CheckCircle2 },
              { label: "A receber", value: brlCents(kpis.aReceber), tone: "text-amber-600 bg-amber-500/10", icon: RefreshCw },
              { label: "Repasse atrasado", value: brlCents(kpis.atrasado), tone: "text-destructive bg-destructive/10", icon: AlertTriangle },
              { label: "Alunos", value: kpis.alunos, tone: "text-sky-600 bg-sky-500/10", icon: Users },
              { label: "Parcelas", value: kpis.parcelas, tone: "text-slate-600 bg-slate-500/10", icon: Layers },
            ].map(c => (
              <Card key={c.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`size-10 rounded-xl grid place-items-center ${c.tone}`}><c.icon className="size-4" /></div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate">{loading ? "—" : c.value}</div>
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-4 grid gap-3 md:grid-cols-6">
            <div>
              <Label className="text-xs">Mês</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Faculdade</Label>
              <Select value={fFaculdade} onValueChange={setFFaculdade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {parceiros.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Curso</Label>
              <Select value={fCurso} onValueChange={setFCurso}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {cursos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Aluno</Label>
              <Input value={fAluno} onChange={e => setFAluno(e.target.value)} placeholder="Buscar…" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="a_receber">A receber</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="divergencia">Divergência</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left p-3">Aluno</th>
                  <th className="text-left p-3">Curso</th>
                  <th className="text-left p-3">Faculdade</th>
                  <th className="text-left p-3">Parcelas</th>
                  <th className="text-left p-3">Valor parcela</th>
                  <th className="text-left p-3">%</th>
                  <th className="text-left p-3">Total vendido</th>
                  <th className="text-left p-3">Total repasse</th>
                  <th className="text-left p-3">Recebido</th>
                  <th className="text-left p-3">Pendente</th>
                  <th className="text-left p-3">Próximo</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map(l => {
                  const vs = l.visiveis;
                  const vendido = vs.reduce((s, p) => s + p.valor_aluno_cents, 0);
                  const repasse = vs.reduce((s, p) => s + p.valor_repasse_cents, 0);
                  const recebido = vs.filter(p => ["recebido","divergencia"].includes(p.status)).reduce((s, p) => s + (p.valor_recebido_cents ?? 0), 0);
                  const pendentes = vs.filter(p => p.status === "a_receber");
                  const proximo = pendentes.map(p => p.previsao).filter(Boolean).sort()[0] ?? null;
                  const st = pendentes.length === 0 ? "recebido" : vs.some(p => p.status === "divergencia") ? "divergencia" : "a_receber";
                  const open = aberto === l.contratoId;
                  return (
                    <>
                      <tr key={l.contratoId} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setAberto(open ? null : l.contratoId)}>
                        <td className="p-3 font-medium text-primary flex items-center gap-1">
                          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} {l.aluno}
                        </td>
                        <td className="p-3">{l.curso}</td>
                        <td className="p-3">{l.faculdade}</td>
                        <td className="p-3">{vs.length}</td>
                        <td className="p-3">{brlCents(vs[0]?.valor_aluno_cents)}</td>
                        <td className="p-3">{l.percentual}%</td>
                        <td className="p-3">{brlCents(vendido)}</td>
                        <td className="p-3 font-medium">{brlCents(repasse)}</td>
                        <td className="p-3 text-green-700">{brlCents(recebido)}</td>
                        <td className="p-3 text-amber-700">{brlCents(Math.max(repasse - recebido, 0))}</td>
                        <td className="p-3">{dateBr(proximo)}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusClass(st)}`}>{STATUS_LABEL[st]}</span></td>
                      </tr>
                      {open && (
                        <tr key={`${l.contratoId}-d`} className="border-t border-border bg-secondary/20">
                          <td colSpan={12} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-semibold text-sm">Parcelas do repasse</p>
                              {l.alunoId && (
                                <Link to={`/admin/alunos/${l.alunoId}#repasse`} className="text-xs text-primary underline">Abrir ficha do aluno</Link>
                              )}
                            </div>
                            <table className="w-full text-sm bg-card rounded-lg border border-border">
                              <thead className="bg-secondary/60">
                                <tr>
                                  <th className="text-left p-2">Parcela</th>
                                  <th className="text-left p-2">Valor aluno</th>
                                  <th className="text-left p-2">Repasse</th>
                                  <th className="text-left p-2">Previsão</th>
                                  <th className="text-left p-2">Status</th>
                                  <th className="text-right p-2">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {vs.map(p => (
                                  <tr key={p.id} className="border-t border-border">
                                    <td className="p-2">{p.numero}/{l.parcelas.length}</td>
                                    <td className="p-2">{brlCents(p.valor_aluno_cents)}</td>
                                    <td className="p-2 font-medium">{brlCents(p.valor_repasse_cents)}</td>
                                    <td className="p-2">{dateBr(p.previsao)}</td>
                                    <td className="p-2">
                                      <span className={`px-2 py-1 rounded text-xs ${statusClass(p.status)}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                                      {p.status === "divergencia" && (
                                        <span className="block text-[11px] text-amber-700 mt-1">
                                          Recebido {brlCents(p.valor_recebido_cents)} · dif. {brlCents((p.valor_recebido_cents ?? 0) - p.valor_repasse_cents)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-right">
                                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setBaixa(p); }}>
                                        <CheckCircle2 className="size-4 mr-1" /> {p.status === "a_receber" ? "Marcar recebido" : "Editar baixa"}
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {!loading && linhasFiltradas.length === 0 && (
                  <tr><td colSpan={12} className="p-8 text-center text-muted-foreground">Nenhum repasse encontrado com esses filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="parceiros" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Cadastre as faculdades e as regras de fechamento/pagamento.</p>
            <Button variant="hero" onClick={() => { setPEdit({ percentual: 50, dia_fechamento: 27, dia_pagamento: 15, ativo: true }); setPOpen(true); }}>
              <Plus className="size-4" /> Novo parceiro
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left p-3">Faculdade/parceiro</th>
                  <th className="text-left p-3">Repasse padrão</th>
                  <th className="text-left p-3">Fechamento</th>
                  <th className="text-left p-3">Pagamento</th>
                  <th className="text-left p-3">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parceiros.map(p => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium text-primary flex items-center gap-2"><Building2 className="size-4" /> {p.nome}</td>
                    <td className="p-3">{p.percentual}%</td>
                    <td className="p-3">dia {p.dia_fechamento}</td>
                    <td className="p-3">dia {p.dia_pagamento}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${p.ativo ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{p.ativo ? "Ativo" : "Inativo"}</span></td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => { setPEdit(p); setPOpen(true); }}><Pencil className="size-4" /> Editar</Button>
                      <Button size="sm" variant="ghost" className="text-destructive ml-1" onClick={async () => {
                        if (!confirm(`Excluir "${p.nome}"?`)) return;
                        const { error } = await supabase.from("repasse_parceiros" as any).delete().eq("id", p.id);
                        if (error) return toast.error("Não é possível excluir: existem matrículas usando este parceiro.");
                        toast.success("Excluído"); load();
                      }}><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
                {parceiros.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum parceiro cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{pEdit.id ? "Editar parceiro" : "Novo parceiro"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome do parceiro/faculdade *</Label><Input value={pEdit.nome ?? ""} onChange={e => setPEdit({ ...pEdit, nome: e.target.value })} placeholder="Ex.: Faculdade X" /></div>
            <div><Label>Percentual padrão de repasse (%)</Label><Input type="number" step="0.01" value={pEdit.percentual ?? 50} onChange={e => setPEdit({ ...pEdit, percentual: Number(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Dia de fechamento</Label><Input type="number" min={1} max={28} value={pEdit.dia_fechamento ?? 27} onChange={e => setPEdit({ ...pEdit, dia_fechamento: Number(e.target.value) })} /></div>
              <div><Label>Dia de pagamento</Label><Input type="number" min={1} max={28} value={pEdit.dia_pagamento ?? 15} onChange={e => setPEdit({ ...pEdit, dia_pagamento: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2"><Switch checked={pEdit.ativo !== false} onCheckedChange={v => setPEdit({ ...pEdit, ativo: v })} /> <span className="text-sm">Ativo</span></label>
            <Button variant="hero" className="w-full" onClick={salvarParceiro}>Salvar parceiro</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BaixaRepasseDialog parcela={baixa} onClose={() => setBaixa(null)} onSaved={load} />
    </div>
  );
};

export default function AdminRepasses() {
  return <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
}
