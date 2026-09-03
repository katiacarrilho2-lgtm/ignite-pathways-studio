import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GraduationCap, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";

type Fila = {
  id: string; account_id: string; polo: string; full_name: string; course_title: string;
  course_id: string | null; status: string; network_review_status: string;
  network_review_message: string | null; network_reviewed_at: string | null;
  network_submitted_at: string; submitted_by: string | null; submitted_by_name: string | null;
  created_at: string; city: string | null; state: string | null;
  phone: string | null; email: string | null; cpf: string | null;
};
type Mat = { id: string; account_id: string; polo: string; aluno: string | null; curso: string | null; status: string | null; enrolled_at: string | null };

const NET: Record<string, { label: string; cls: string }> = {
  aguardando_analise: { label: "Aguardando análise", cls: "bg-amber-100 text-amber-900" },
  em_analise: { label: "Em análise", cls: "bg-blue-100 text-blue-900" },
  correcao_solicitada: { label: "Correção solicitada", cls: "bg-rose-100 text-rose-900" },
  aprovada: { label: "Aprovada", cls: "bg-emerald-100 text-emerald-900" },
  recusada: { label: "Recusada", cls: "bg-muted text-muted-foreground" },
  matriculada: { label: "Matriculada", cls: "bg-primary/15 text-primary" },
};

const dataBr = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

export default function AdminRedeMatriculas() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { setActiveAccountId } = useCommercialAccounts();
  const [pre, setPre] = useState<Fila[]>([]);
  const [mat, setMat] = useState<Mat[]>([]);
  const [polo, setPolo] = useState("todos");
  const [situacao, setSituacao] = useState("todas");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Fila | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p, error }, { data: m }] = await Promise.all([
      supabase.rpc("rede_fila_pre_matriculas"),
      supabase.rpc("rede_matriculas"),
    ]);
    if (error) toast.error(error.message);
    setPre((p ?? []) as any);
    setMat((m ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Notificação da Matriz abre direto a ficha
  const ficha = params.get("ficha");
  useEffect(() => {
    if (!ficha || !pre.length) return;
    const found = pre.find((r) => r.id === ficha);
    if (found) setViewing(found);
  }, [ficha, pre]);

  const polos = useMemo(() => {
    const map = new Map<string, string>();
    [...pre, ...mat].forEach((r: any) => map.set(r.account_id, r.polo));
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pre, mat]);

  const term = q.trim().toLowerCase();
  const matchPolo = (r: any) => polo === "todos" || r.account_id === polo;
  const fPre = pre.filter((r) => matchPolo(r)
    && (situacao === "todas" || r.network_review_status === situacao)
    && (!term || [r.full_name, r.course_title, r.polo, r.submitted_by_name].some((v) => (v ?? "").toLowerCase().includes(term))));
  const fMat = mat.filter((r) => matchPolo(r) && (!term || [r.aluno, r.curso, r.polo].some((v) => (v ?? "").toLowerCase().includes(term))));
  const fila = pre.filter((r) => r.network_review_status === "aguardando_analise");

  const act = async (action: string) => {
    if (!viewing) return;
    if (action === "correcao" && !msg.trim()) return toast.error("Informe o que precisa ser corrigido.");
    setSaving(true);
    const { error } = await supabase.rpc("rede_review_pre_matricula", {
      _id: viewing.id, _action: action, _message: msg.trim() || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Análise atualizada");
    setMsg("");
    setViewing(null);
    setParams({});
    load();
  };

  /** Matricular reutiliza o fluxo da Matriz em /admin/pre-matriculas, no contexto do Polo. */
  const matricular = async () => {
    if (!viewing) return;
    if (viewing.network_review_status !== "aprovada") {
      return toast.error("Aprove a ficha antes de matricular.");
    }
    await setActiveAccountId(viewing.account_id);
    toast.info(`Contexto alterado para ${viewing.polo}. Conclua a matrícula na ficha.`);
    navigate("/admin/pre-matriculas");
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
      <Button asChild variant="ghost" size="sm"><Link to="/admin/licenciados"><ArrowLeft className="size-4" /> Rede Multplick</Link></Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><GraduationCap className="size-7 text-primary" /> Matrículas da Rede</h1>
        <p className="text-muted-foreground">Somente Polos e Revendedores. As fichas da Matriz ficam em Pré-matrículas.</p>
      </header>

      {fila.length > 0 && (
        <Card className="border-amber-400 bg-amber-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">
              {fila.length} pré-matrícula{fila.length > 1 ? "s" : ""} aguardando análise
            </CardTitle>
            <CardDescription className="text-amber-900/80">Assuma a análise para sinalizar aos Polos que a Multplick já está avaliando.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {fila.slice(0, 8).map((r) => (
              <button key={r.id} onClick={() => setViewing(r)}
                className="text-left rounded-lg border border-amber-300 bg-background px-3 py-2 text-xs hover:bg-amber-100">
                <div className="font-semibold">{r.full_name}</div>
                <div className="text-muted-foreground">{r.polo} · {r.course_title}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar aluno, curso, polo ou responsável" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={polo} onValueChange={setPolo}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Polos</SelectItem>
            {polos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={situacao} onValueChange={setSituacao}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as situações</SelectItem>
            {Object.entries(NET).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pre">
        <TabsList>
          <TabsTrigger value="pre">Pré-matrículas ({fPre.length})</TabsTrigger>
          <TabsTrigger value="mat">Matrículas ({fMat.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pre">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Fichas recebidas nos Polos</CardTitle>
              <CardDescription>Aprovar analisa os dados; matricular continua sendo ação exclusiva da Matriz.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Data</th><th className="pr-3">Polo</th><th className="pr-3">Aluno</th><th className="pr-3">Curso</th>
                  <th className="pr-3">Enviado por</th><th className="pr-3">Status</th><th className="text-right">Ações</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>}
                  {!loading && fPre.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma pré-matrícula na Rede.</td></tr>}
                  {fPre.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">{dataBr(r.network_submitted_at)}</td>
                      <td className="pr-3">{r.polo}</td>
                      <td className="pr-3 font-medium">{r.full_name}</td>
                      <td className="pr-3 text-muted-foreground">{r.course_title}</td>
                      <td className="pr-3 text-xs">{r.submitted_by_name ?? "—"}</td>
                      <td className="pr-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${NET[r.network_review_status]?.cls ?? "bg-muted"}`}>
                          {NET[r.network_review_status]?.label ?? r.network_review_status}
                        </span>
                      </td>
                      <td className="text-right">
                        <Button size="sm" variant="outline" onClick={() => { setViewing(r); setMsg(""); }}>Analisar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mat">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Matrículas efetivadas nos Polos</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Data</th><th className="pr-3">Polo</th><th className="pr-3">Aluno</th><th className="pr-3">Curso</th><th>Status</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>}
                  {!loading && fMat.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma matrícula na Rede.</td></tr>}
                  {fMat.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">{dataBr(r.enrolled_at)}</td>
                      <td className="pr-3">{r.polo}</td>
                      <td className="pr-3 font-medium">{r.aluno ?? "—"}</td>
                      <td className="pr-3 text-muted-foreground">{r.curso ?? "—"}</td>
                      <td className="text-xs">{r.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); setParams({}); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ficha da Rede</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="font-semibold text-base">{viewing.full_name}</div>
                <div className="text-muted-foreground">{viewing.course_title}</div>
                <div className="text-xs text-muted-foreground">
                  {viewing.polo} · enviada por {viewing.submitted_by_name ?? "—"} em {dataBr(viewing.network_submitted_at)}
                </div>
                <div className="text-xs">{viewing.email} · {viewing.phone ?? "—"} · {viewing.city ? `${viewing.city}/${viewing.state ?? ""}` : "—"}</div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${NET[viewing.network_review_status]?.cls ?? "bg-muted"}`}>
                  {NET[viewing.network_review_status]?.label ?? viewing.network_review_status}
                </span>
                {viewing.network_review_message && (
                  <p className="text-xs text-muted-foreground">Último parecer: {viewing.network_review_message}</p>
                )}
              </div>

              <Textarea placeholder="Mensagem para o Polo (obrigatória ao solicitar correção)" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} />

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={saving} onClick={() => act("assumir")}>Assumir análise</Button>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => act("correcao")}>Solicitar correção</Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={saving} onClick={() => act("recusar")}>Recusar</Button>
                <Button size="sm" disabled={saving} onClick={() => act("aprovar")}>Aprovar</Button>
                <Button size="sm" variant="hero" disabled={saving || viewing.network_review_status !== "aprovada"} onClick={matricular}>
                  <UserPlus className="size-4" /> Matricular
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Aprovar não matricula. A matrícula abre a ficha no fluxo padrão da Matriz, já no contexto do Polo.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
