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
import { ArrowLeft, Save, Sparkles, FileDown, FileText, Loader2, Plus, X, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  CONTRACT_TYPES,
  contractTypeLabel,
  ContractClause,
  ContractData,
  getDefaultClauses,
} from "@/lib/corporativo/contractTypes";
import { CLIENT_TYPES } from "@/lib/corporativo/types";
import { buildContractPdf } from "@/lib/corporativo/contractPdf";
import { exportContractDocx } from "@/lib/corporativo/contractDocx";

type SaveState = "idle" | "saving" | "saved";

const DEFAULT_CONTRATADA: Partial<ContractData> = {
  contratada_razao: "MULTPLICK EDUCAÇÃO PROFISSIONAL LTDA.",
};

export default function AdminCorpContratoEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("prestacao_servicos");
  const [status, setStatus] = useState("rascunho");
  const [vigenciaIni, setVigenciaIni] = useState<string>("");
  const [vigenciaFim, setVigenciaFim] = useState<string>("");
  const [data, setData] = useState<ContractData>({});
  const [clausulas, setClausulas] = useState<ContractClause[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirtyRef = useRef(false);
  const initialLoaded = useRef(false);

  const set = <K extends keyof ContractData>(k: K, v: ContractData[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    dirtyRef.current = true;
  };

  useEffect(() => {
    (async () => {
      const { data: row, error } = await supabase.from("corp_contracts").select("*").eq("id", id!).maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (!row) { toast.error("Contrato não encontrado"); nav("/admin/corporativo/contratos"); return; }
      setTitulo(row.titulo);
      setTipo(row.tipo);
      setStatus(row.status);
      setVigenciaIni(row.vigencia_inicio || "");
      setVigenciaFim(row.vigencia_fim || "");
      const loadedData = { ...DEFAULT_CONTRATADA, ...((row.dados as ContractData) || {}) };
      setData(loadedData);
      const loadedClauses = Array.isArray(row.clausulas) ? (row.clausulas as unknown as ContractClause[]) : [];
      setClausulas(loadedClauses.length ? loadedClauses : getDefaultClauses(row.tipo));
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

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const save = async (opts?: { silent?: boolean }) => {
    setSaveState("saving");
    const { error } = await supabase.from("corp_contracts").update({
      titulo: titulo || "Sem título",
      tipo,
      status,
      vigencia_inicio: vigenciaIni || null,
      vigencia_fim: vigenciaFim || null,
      dados: data as any,
      clausulas: clausulas as any,
    }).eq("id", id!);
    if (error) { setSaveState("idle"); toast.error(error.message); return; }
    dirtyRef.current = false;
    setSaveState("saved");
    if (!opts?.silent) toast.success("Contrato salvo");
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2500);
  };

  const resetClauses = () => {
    if (clausulas.length && !confirm("Substituir as cláusulas atuais pelas cláusulas padrão deste tipo?")) return;
    setClausulas(getDefaultClauses(tipo));
    dirtyRef.current = true;
    toast.success("Cláusulas padrão carregadas");
  };

  const moveClause = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= clausulas.length) return;
    const arr = [...clausulas];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setClausulas(arr);
    dirtyRef.current = true;
  };

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("generate-corporate-contract", {
        body: {
          tipo,
          contratante_razao: data.contratante_razao,
          contratada_razao: data.contratada_razao,
          objeto: data.objeto,
          valor_texto: data.valor_texto,
          forma_pagamento: data.forma_pagamento,
          comissao: data.comissao,
          territorio: data.territorio,
          exclusividade: data.exclusividade,
          prazo_meses: data.prazo_meses,
          observacoes: data.observacoes,
          base_clauses: clausulas,
        },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      const r = res as any;
      if (r.objeto) set("objeto", r.objeto);
      if (Array.isArray(r.clausulas) && r.clausulas.length) {
        setClausulas(r.clausulas);
        dirtyRef.current = true;
      }
      toast.success("Minuta gerada pela IA. Revise antes de exportar.");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar contrato");
    } finally {
      setAiLoading(false);
    }
  };

  const downloadPdf = () => {
    const doc = buildContractPdf({
      titulo: titulo || "Contrato",
      tipo,
      vigencia_inicio: vigenciaIni || null,
      vigencia_fim: vigenciaFim || null,
      data,
      clausulas,
    });
    doc.save(`${(titulo || "contrato").replace(/[^a-z0-9 ]/gi, "").replace(/\s+/g, "_").toLowerCase()}.pdf`);
  };

  const downloadDocx = async () => {
    await exportContractDocx({
      titulo: titulo || "Contrato",
      tipo,
      vigencia_inicio: vigenciaIni || null,
      vigencia_fim: vigenciaFim || null,
      data,
      clausulas,
    });
  };

  const saveBadge = useMemo(() => {
    if (saveState === "saving") return <Badge className="bg-amber-100 text-amber-700 border-0">● Salvando…</Badge>;
    if (saveState === "saved") return <Badge className="bg-emerald-100 text-emerald-700 border-0">● Salvo</Badge>;
    if (dirtyRef.current) return <Badge className="bg-slate-100 text-slate-700 border-0">● Alterações não salvas</Badge>;
    return null;
  }, [saveState, data, clausulas, titulo, tipo, status, vigenciaIni, vigenciaFim]);

  if (loading) return <div className="p-10 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon"><Link to="/admin/corporativo/contratos"><ArrowLeft className="size-4" /></Link></Button>
          <div className="min-w-0">
            <Input value={titulo} onChange={(e) => { setTitulo(e.target.value); dirtyRef.current = true; }} className="text-lg font-semibold h-9 w-full md:w-96" />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{contractTypeLabel(tipo)}</span>
              {saveBadge}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateAI} disabled={aiLoading} variant="outline">
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Gerar com IA
          </Button>
          <Button onClick={() => save()} variant="outline"><Save className="size-4" /> Salvar</Button>
          <Button onClick={downloadPdf}><FileDown className="size-4" /> PDF</Button>
          <Button onClick={downloadDocx} variant="outline"><FileText className="size-4" /> DOCX</Button>
        </div>
      </div>

      <Tabs defaultValue="partes" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="partes">Partes</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="clausulas">Cláusulas</TabsTrigger>
          <TabsTrigger value="foro">Foro & Obs.</TabsTrigger>
        </TabsList>

        {/* PARTES */}
        <TabsContent value="partes" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-primary">CONTRATANTE</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={(data as any).contratante_tipo || ""} onValueChange={(v) => set("contratante_tipo" as any, v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{CLIENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Razão Social / Nome</Label><Input value={data.contratante_razao || ""} onChange={(e) => set("contratante_razao", e.target.value)} /></div>
              <div><Label>CNPJ / CPF</Label><Input value={data.contratante_cnpj || ""} onChange={(e) => set("contratante_cnpj", e.target.value)} /></div>
              <div><Label>Endereço</Label><Input value={data.contratante_endereco || ""} onChange={(e) => set("contratante_endereco", e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={data.contratante_cidade || ""} onChange={(e) => set("contratante_cidade", e.target.value)} /></div>
              <div><Label>UF</Label><Input maxLength={2} value={data.contratante_uf || ""} onChange={(e) => set("contratante_uf", e.target.value.toUpperCase())} /></div>
              <div><Label>Representante legal</Label><Input value={data.contratante_representante || ""} onChange={(e) => set("contratante_representante", e.target.value)} /></div>
              <div><Label>Cargo do representante</Label><Input value={data.contratante_cargo || ""} onChange={(e) => set("contratante_cargo", e.target.value)} /></div>
              <div><Label>CPF do representante</Label><Input value={data.contratante_cpf || ""} onChange={(e) => set("contratante_cpf", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input value={data.contratante_email || ""} onChange={(e) => set("contratante_email", e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={data.contratante_telefone || ""} onChange={(e) => set("contratante_telefone", e.target.value)} /></div>
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-primary">CONTRATADA (Multplick)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Razão Social</Label><Input value={data.contratada_razao || ""} onChange={(e) => set("contratada_razao", e.target.value)} /></div>
              <div><Label>CNPJ</Label><Input value={data.contratada_cnpj || ""} onChange={(e) => set("contratada_cnpj", e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Endereço</Label><Input value={data.contratada_endereco || ""} onChange={(e) => set("contratada_endereco", e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={data.contratada_cidade || ""} onChange={(e) => set("contratada_cidade", e.target.value)} /></div>
              <div><Label>UF</Label><Input maxLength={2} value={data.contratada_uf || ""} onChange={(e) => set("contratada_uf", e.target.value.toUpperCase())} /></div>
              <div><Label>Representante legal</Label><Input value={data.contratada_representante || ""} onChange={(e) => set("contratada_representante", e.target.value)} /></div>
              <div><Label>Cargo do representante</Label><Input value={data.contratada_cargo || ""} onChange={(e) => set("contratada_cargo", e.target.value)} /></div>
            </div>
          </Card>
        </TabsContent>

        {/* CONTRATO */}
        <TabsContent value="contrato">
          <Card className="p-5 grid md:grid-cols-2 gap-4">
            <div><Label>Tipo de contrato</Label>
              <Select value={tipo} onValueChange={(v) => {
                setTipo(v); dirtyRef.current = true;
                if (!clausulas.length) setClausulas(getDefaultClauses(v));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); dirtyRef.current = true; }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="assinado">Assinado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Vigência — início</Label><Input type="date" value={vigenciaIni} onChange={(e) => { setVigenciaIni(e.target.value); dirtyRef.current = true; }} /></div>
            <div><Label>Vigência — término</Label><Input type="date" value={vigenciaFim} onChange={(e) => { setVigenciaFim(e.target.value); dirtyRef.current = true; }} /></div>
            <div><Label>Prazo (meses)</Label><Input type="number" min={0} value={data.prazo_meses ?? ""} onChange={(e) => set("prazo_meses", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="md:col-span-2"><Label>Objeto</Label>
              <Textarea rows={4} value={data.objeto || ""} onChange={(e) => set("objeto", e.target.value)} placeholder="Descrição do objeto do contrato." />
            </div>
            <div className="md:col-span-2"><Label>Escopo / detalhamento</Label>
              <Textarea rows={4} value={data.escopo || ""} onChange={(e) => set("escopo", e.target.value)} placeholder="Detalhamento do escopo, entregas, modalidades, etc." />
            </div>
          </Card>
        </TabsContent>

        {/* COMERCIAL */}
        <TabsContent value="comercial">
          <Card className="p-5 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Valor</Label>
              <Input value={data.valor_texto || ""} onChange={(e) => set("valor_texto", e.target.value)} placeholder="Ex.: R$ 24.800,00 — quatro parcelas" />
            </div>
            <div className="md:col-span-2"><Label>Forma de pagamento</Label>
              <Textarea rows={3} value={data.forma_pagamento || ""} onChange={(e) => set("forma_pagamento", e.target.value)} />
            </div>
            <div><Label>Multa rescisória</Label><Input value={data.multa_rescisoria || ""} onChange={(e) => set("multa_rescisoria", e.target.value)} placeholder="Ex.: 20% sobre o saldo" /></div>
            <div><Label>Comissão</Label><Input value={data.comissao || ""} onChange={(e) => set("comissao", e.target.value)} placeholder="Ex.: 25% líquido" /></div>
            <div><Label>Território</Label><Input value={data.territorio || ""} onChange={(e) => set("territorio", e.target.value)} placeholder="Ex.: Estado de SP" /></div>
            <div><Label>Exclusividade</Label>
              <Select value={data.exclusividade || ""} onValueChange={(v) => set("exclusividade", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim, exclusivo">Sim, exclusivo</SelectItem>
                  <SelectItem value="Não exclusivo">Não exclusivo</SelectItem>
                  <SelectItem value="Exclusividade parcial">Exclusividade parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>

        {/* CLAUSULAS */}
        <TabsContent value="clausulas" className="space-y-3">
          <Card className="p-4 flex flex-wrap items-center gap-2 justify-between bg-primary/5 border-primary/20">
            <div className="text-sm flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span><strong>{clausulas.length}</strong> cláusula(s). Edite livremente, reordene ou regenere com IA.</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetClauses}><RotateCcw className="size-4" /> Carregar padrão</Button>
              <Button size="sm" variant="outline" onClick={() => { setClausulas([...clausulas, { titulo: "NOVA CLÁUSULA", texto: "" }]); dirtyRef.current = true; }}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
          </Card>

          {clausulas.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhuma cláusula. Use <strong>Carregar padrão</strong> ou <strong>Gerar com IA</strong>.
            </Card>
          )}

          {clausulas.map((c, i) => (
            <Card key={i} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{i + 1}</Badge>
                <Input
                  value={c.titulo}
                  onChange={(e) => { const arr = [...clausulas]; arr[i] = { ...arr[i], titulo: e.target.value }; setClausulas(arr); dirtyRef.current = true; }}
                  className="font-semibold uppercase"
                  placeholder="TÍTULO DA CLÁUSULA"
                />
                <Button variant="ghost" size="icon" onClick={() => moveClause(i, -1)} disabled={i === 0}><ArrowUp className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => moveClause(i, 1)} disabled={i === clausulas.length - 1}><ArrowDown className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setClausulas(clausulas.filter((_, j) => j !== i)); dirtyRef.current = true; }}>
                  <X className="size-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                rows={6}
                value={c.texto}
                onChange={(e) => { const arr = [...clausulas]; arr[i] = { ...arr[i], texto: e.target.value }; setClausulas(arr); dirtyRef.current = true; }}
                placeholder="Texto da cláusula…"
              />
            </Card>
          ))}
        </TabsContent>

        {/* FORO + OBSERVAÇÕES */}
        <TabsContent value="foro">
          <Card className="p-5 grid md:grid-cols-2 gap-4">
            <div><Label>Foro eleito — Cidade</Label><Input value={data.foro_cidade || ""} onChange={(e) => set("foro_cidade", e.target.value)} /></div>
            <div><Label>UF</Label><Input maxLength={2} value={data.foro_uf || ""} onChange={(e) => set("foro_uf", e.target.value.toUpperCase())} /></div>
            <div className="md:col-span-2"><Label>Observações</Label>
              <Textarea rows={5} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}