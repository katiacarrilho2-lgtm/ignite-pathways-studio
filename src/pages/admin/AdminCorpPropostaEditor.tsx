import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Sparkles, FileDown, FileText, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { CLIENT_TYPES, MODALIDADES, PROPOSAL_TYPES, ProposalData, proposalTypeLabel } from "@/lib/corporativo/types";
import { buildProposalPdf } from "@/lib/corporativo/proposalPdf";
import { exportProposalDocx } from "@/lib/corporativo/proposalDocx";
import { useAuth } from "@/hooks/useAuth";
import { CompanySettings, DEFAULT_COMPANY, formatProposalLocalDate } from "@/lib/corporativo/company";
import { History } from "lucide-react";

type SaveState = "idle" | "saving" | "saved";

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[] | undefined; onChange: (v: string[]) => void; placeholder?: string }) {
  const arr = items || [];
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {arr.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Textarea value={v} onChange={(e) => { const c = [...arr]; c[i] = e.target.value; onChange(c); }} className="min-h-[44px]" />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(arr.filter((_, j) => j !== i))}><X className="size-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...arr, ""])}><Plus className="size-4" /> Adicionar item</Button>
      {arr.length === 0 && placeholder && <p className="text-xs text-muted-foreground">{placeholder}</p>}
    </div>
  );
}

export default function AdminCorpPropostaEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { hasPermission, isSuperAdmin } = useAuth();
  const canSeeCommission = isSuperAdmin || hasPermission("view_commission");
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("capacitacao");
  const [status, setStatus] = useState("rascunho");
  const [validade, setValidade] = useState(30);
  const [numero, setNumero] = useState<string | null>(null);
  const [data, setData] = useState<ProposalData>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [versions, setVersions] = useState<Array<{ id: string; created_at: string; snapshot: any }>>([]);
  const dirtyRef = useRef(false);
  const initialLoaded = useRef(false);

  const set = <K extends keyof ProposalData>(k: K, v: ProposalData[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    dirtyRef.current = true;
  };

  useEffect(() => {
    (async () => {
      const [{ data: row, error }, { data: comp }, { data: vers }] = await Promise.all([
        supabase.from("corp_proposals").select("*").eq("id", id!).maybeSingle(),
        supabase.from("company_settings").select("*").eq("singleton", true).maybeSingle(),
        supabase.from("corp_document_versions").select("id, created_at, snapshot")
          .eq("document_type", "proposal").eq("document_id", id!).order("created_at", { ascending: false }),
      ]);
      if (error) { toast.error(error.message); return; }
      if (!row) { toast.error("Proposta não encontrada"); nav("/admin/corporativo/propostas"); return; }
      if (comp) setCompany(comp as any);
      if (vers) setVersions(vers as any);
      setTitulo(row.titulo);
      setTipo(row.tipo);
      setStatus(row.status);
      setValidade(row.validade_dias ?? 30);
      setNumero((row as any).numero ?? null);
      setData((row.dados as ProposalData) || {});
      setLoading(false);
      initialLoaded.current = true;
    })();
  }, [id, nav]);

  // Auto-save 15s
  useEffect(() => {
    if (!initialLoaded.current) return;
    const t = setInterval(() => { if (dirtyRef.current) save({ silent: true }); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beforeunload
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const save = async (opts?: { silent?: boolean }) => {
    setSaveState("saving");
    const { error } = await supabase.from("corp_proposals").update({
      titulo: titulo || "Sem título",
      tipo, status, validade_dias: validade, dados: data as any,
    }).eq("id", id!);
    if (error) { setSaveState("idle"); toast.error(error.message); return; }
    dirtyRef.current = false;
    setSaveState("saved");
    if (!opts?.silent) toast.success("Proposta salva");
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2500);
  };

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("generate-corporate-proposal", {
        body: {
          tipo,
          modalidade: data.modalidade,
          razao_social: data.razao_social,
          cliente_tipo: data.cliente_tipo,
          cidade: data.cidade,
          uf: data.uf,
          colaboradores: data.colaboradores,
          cursos: data.cursos,
          observacoes: data.observacoes,
          investimento_texto: data.investimento_texto,
        },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      const r = res as any;
      setData((d) => ({
        ...d,
        apresentacao: r.apresentacao || d.apresentacao,
        diagnostico: r.diagnostico || d.diagnostico,
        beneficios: r.beneficios?.length ? r.beneficios : d.beneficios,
        cursos_recomendados: r.cursos_recomendados?.length ? r.cursos_recomendados : d.cursos_recomendados,
        cronograma: r.cronograma?.length ? r.cronograma : d.cronograma,
      }));
      dirtyRef.current = true;
      toast.success("Conteúdo gerado pela IA. Revise antes de exportar.");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar conteúdo");
    } finally {
      setAiLoading(false);
    }
  };

  const downloadPdf = (incluir_comissoes: boolean) => {
    const doc = buildProposalPdf({
      titulo: titulo || "Proposta",
      tipo, validade_dias: validade, data,
      numero: numero ?? undefined,
      incluir_comissoes,
      company,
      local_data_assinatura: data.local_assinatura || formatProposalLocalDate(company),
      assinatura_nome: company.responsavel_nome || undefined,
      assinatura_cargo: company.responsavel_cargo
        ? `${company.responsavel_cargo} — ${company.nome_fantasia || "Multplick"}`
        : undefined,
    });
    const suffix = incluir_comissoes ? "interno" : "cliente";
    const base = (numero || titulo || "proposta").replace(/[^a-z0-9 -]/gi, "").replace(/\s+/g, "_").toLowerCase();
    doc.save(`${base}_${suffix}.pdf`);
  };
  const downloadDocx = async () => {
    await exportProposalDocx({ titulo: titulo || "Proposta", tipo, validade_dias: validade, data });
  };

  const saveVersion = async () => {
    const snapshot = { titulo, tipo, validade_dias: validade, status, dados: data };
    const { data: row, error } = await supabase.from("corp_document_versions").insert({
      document_type: "proposal",
      document_id: id!,
      snapshot: snapshot as any,
    }).select("id, created_at, snapshot").maybeSingle();
    if (error) return toast.error(error.message);
    if (row) setVersions((v) => [row as any, ...v]);
    toast.success("Versão salva no histórico");
  };

  const restoreVersion = (snap: any) => {
    if (!snap) return;
    setTitulo(snap.titulo || "");
    setTipo(snap.tipo || tipo);
    setValidade(snap.validade_dias ?? validade);
    setStatus(snap.status || status);
    setData(snap.dados || {});
    dirtyRef.current = true;
    toast.success("Versão restaurada. Salve para confirmar.");
  };

  const saveBadge = useMemo(() => {
    if (saveState === "saving") return <Badge className="bg-amber-100 text-amber-700 border-0">● Salvando…</Badge>;
    if (saveState === "saved") return <Badge className="bg-emerald-100 text-emerald-700 border-0">● Salvo</Badge>;
    if (dirtyRef.current) return <Badge className="bg-slate-100 text-slate-700 border-0">● Alterações não salvas</Badge>;
    return null;
  }, [saveState, data, titulo, tipo, validade]); // re-eval on edits

  if (loading) return <div className="p-10 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon"><Link to="/admin/corporativo/propostas"><ArrowLeft className="size-4" /></Link></Button>
          <div className="min-w-0">
            <Input value={titulo} onChange={(e) => { setTitulo(e.target.value); dirtyRef.current = true; }} className="text-lg font-semibold h-9 w-full md:w-96" />
            <div className="flex items-center gap-2 mt-1">
              {numero && <Badge className="bg-blue-100 text-blue-700 border-0 font-mono">{numero}</Badge>}
              <span className="text-xs text-muted-foreground">{proposalTypeLabel(tipo)}</span>
              {saveBadge}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateAI} disabled={aiLoading} variant="outline">
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Gerar com IA
          </Button>
          <Button onClick={() => save()} variant="outline"><Save className="size-4" /> Salvar</Button>
          <Button onClick={() => downloadPdf(false)}><FileDown className="size-4" /> PDF Cliente</Button>
          {canSeeCommission && (
            <Button onClick={() => downloadPdf(true)} variant="secondary"><FileDown className="size-4" /> PDF Interno</Button>
          )}
          <Button onClick={downloadDocx} variant="outline"><FileText className="size-4" /> DOCX</Button>
        </div>
      </div>

      <Tabs defaultValue="cliente" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="cliente">Cliente</TabsTrigger>
          <TabsTrigger value="proposta">Proposta</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="revisar">Revisar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          {!canSeeCommission && null}
        </TabsList>

        <TabsContent value="cliente">
          <Card className="p-5 grid md:grid-cols-2 gap-4">
            <div><Label>Tipo de cliente / parceiro</Label>
              <Select value={data.cliente_tipo || ""} onValueChange={(v) => set("cliente_tipo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{CLIENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Razão Social</Label><Input value={data.razao_social || ""} onChange={(e) => set("razao_social", e.target.value)} /></div>
            <div><Label>Nome Fantasia</Label><Input value={data.nome_fantasia || ""} onChange={(e) => set("nome_fantasia", e.target.value)} /></div>
            <div><Label>CNPJ / CPF</Label><Input value={data.cnpj_cpf || ""} onChange={(e) => set("cnpj_cpf", e.target.value)} /></div>
            <div><Label>Cidade</Label><Input value={data.cidade || ""} onChange={(e) => set("cidade", e.target.value)} /></div>
            <div><Label>UF</Label><Input maxLength={2} value={data.uf || ""} onChange={(e) => set("uf", e.target.value.toUpperCase())} /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} /></div>
            <div><Label>Nome do contato</Label><Input value={data.contato_nome || ""} onChange={(e) => set("contato_nome", e.target.value)} /></div>
            <div><Label>Cargo</Label><Input value={data.contato_cargo || ""} onChange={(e) => set("contato_cargo", e.target.value)} /></div>
            <div><Label>E-mail</Label><Input type="email" value={data.contato_email || ""} onChange={(e) => set("contato_email", e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={data.contato_telefone || ""} onChange={(e) => set("contato_telefone", e.target.value)} /></div>
            <div><Label>Colaboradores</Label><Input type="number" min={0} value={data.colaboradores ?? ""} onChange={(e) => set("colaboradores", e.target.value ? Number(e.target.value) : undefined)} /></div>
          </Card>
        </TabsContent>

        <TabsContent value="proposta">
          <Card className="p-5 grid md:grid-cols-2 gap-4">
            <div><Label>Tipo de proposta</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v); dirtyRef.current = true; }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPOSAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Modalidade</Label>
              <Select value={data.modalidade || ""} onValueChange={(v) => set("modalidade", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{MODALIDADES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Cursos / áreas (um por linha)</Label>
              <Textarea rows={5} value={data.cursos || ""} onChange={(e) => set("cursos", e.target.value)} placeholder="Ex.: NR-10\nNR-35\nGestão de Equipes" />
            </div>
            <div><Label>Validade (dias)</Label><Input type="number" value={validade} onChange={(e) => { setValidade(Number(e.target.value) || 30); dirtyRef.current = true; }} /></div>
            <div><Label>Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); dirtyRef.current = true; }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="aceita">Aceita</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Observações</Label>
              <Textarea rows={3} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="conteudo">
          <Card className="p-5 space-y-5">
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm flex gap-3">
              <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
              <div>Use <strong>Gerar com IA</strong> no topo para preencher apresentação, diagnóstico, benefícios, cursos recomendados e cronograma automaticamente. Você pode editar tudo livremente.</div>
            </div>
            <div><Label>Apresentação</Label><Textarea rows={5} value={data.apresentacao || ""} onChange={(e) => set("apresentacao", e.target.value)} /></div>
            <div><Label>Diagnóstico</Label><Textarea rows={5} value={data.diagnostico || ""} onChange={(e) => set("diagnostico", e.target.value)} /></div>
            <ListEditor label="Benefícios" items={data.beneficios} onChange={(v) => set("beneficios", v)} placeholder="Liste os principais benefícios da proposta." />
            <ListEditor label="Cursos recomendados" items={data.cursos_recomendados} onChange={(v) => set("cursos_recomendados", v)} placeholder="Liste os cursos que serão entregues." />
            <ListEditor label="Cronograma sugerido" items={data.cronograma} onChange={(v) => set("cronograma", v)} placeholder="Etapas e prazos sugeridos." />
          </Card>
        </TabsContent>

        <TabsContent value="comercial">
          <Card className="p-5 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Investimento</Label>
              <Input value={data.investimento_texto || ""} onChange={(e) => set("investimento_texto", e.target.value)} placeholder="Ex.: R$ 24.800,00 — 4x sem juros" />
            </div>
            <div className="md:col-span-2"><Label>Condições comerciais</Label>
              <Textarea rows={3} value={data.condicoes || ""} onChange={(e) => set("condicoes", e.target.value)} placeholder="Forma de pagamento, prazos, descontos…" />
            </div>
            {canSeeCommission && (
              <>
                <div className="md:col-span-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  🔒 <strong>Uso interno Multplick.</strong> Estes campos não aparecem no PDF enviado ao cliente.
                </div>
                <div><Label>Plano de Licenciamento</Label><Textarea rows={3} value={data.plano_licenciamento || ""} onChange={(e) => set("plano_licenciamento", e.target.value)} /></div>
                <div><Label>Plano de Revenda</Label><Textarea rows={3} value={data.plano_revenda || ""} onChange={(e) => set("plano_revenda", e.target.value)} /></div>
                <div><Label>Comissão Afiliado</Label><Input value={data.comissao_afiliado || ""} onChange={(e) => set("comissao_afiliado", e.target.value)} placeholder="Ex.: 20% sobre cada venda" /></div>
                <div><Label>Comissão Vendedor PJ</Label><Input value={data.comissao_pj || ""} onChange={(e) => set("comissao_pj", e.target.value)} placeholder="Ex.: 30% + bônus por meta" /></div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="revisar">
          <Card className="p-5 space-y-5">
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
              Confira todos os campos abaixo antes de gerar o PDF. <strong>Os dados da empresa</strong> (cabeçalho, rodapé e local de assinatura) vêm das <Link className="underline" to="/admin/corporativo/configuracoes">Configurações da Empresa</Link>.
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Emitente (Multplick)</div>
                <div className="font-medium">{company.razao_social || company.nome_fantasia}</div>
                <div className="text-muted-foreground">{[company.cidade, company.uf].filter(Boolean).join("/")}</div>
                <div className="text-muted-foreground">{company.cnpj && `CNPJ ${company.cnpj}`}</div>
                <div className="text-muted-foreground">{[company.email, company.telefone].filter(Boolean).join(" • ")}</div>
              </div>
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Destinatário (Cliente)</div>
                <div className="font-medium">{data.razao_social || "—"}</div>
                <div className="text-muted-foreground">{[data.cidade, data.uf].filter(Boolean).join("/")}</div>
                <div className="text-muted-foreground">{data.cnpj_cpf && `CNPJ ${data.cnpj_cpf}`}</div>
                <div className="text-muted-foreground">{[data.contato_email, data.contato_telefone].filter(Boolean).join(" • ")}</div>
              </div>
            </div>

            <div>
              <Label>Local e data da assinatura</Label>
              <Input
                value={data.local_assinatura || formatProposalLocalDate(company)}
                onChange={(e) => set("local_assinatura", e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Por padrão usa a cidade da Multplick ({company.cidade}/{company.uf}). Edite manualmente se necessário.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <Button onClick={() => downloadPdf(false)}><FileDown className="size-4" /> Gerar PDF Cliente</Button>
              {canSeeCommission && (
                <Button onClick={() => downloadPdf(true)} variant="secondary"><FileDown className="size-4" /> Gerar PDF Interno</Button>
              )}
              <Button onClick={saveVersion} variant="outline"><History className="size-4" /> Salvar versão atual</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Histórico de versões</h3>
                <p className="text-xs text-muted-foreground">Cada snapshot salvo pode ser restaurado para revisão.</p>
              </div>
              <Button onClick={saveVersion} size="sm" variant="outline"><History className="size-4" /> Salvar versão</Button>
            </div>
            {versions.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma versão salva ainda.</p>}
            <div className="space-y-2">
              {versions.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="font-medium text-sm">Versão {versions.length - i}</div>
                    <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreVersion(v.snapshot)}>Restaurar</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}