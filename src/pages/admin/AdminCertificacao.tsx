import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ExternalLink, RefreshCcw, Award, Download, Ban, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { baixarCertificadoPdf, type CertificadoSnapshot } from "@/lib/certificadoPdf";

type Row = {
  id: string; user_id: string; course_id: string; numero: string;
  emitido_em: string; carga_horaria: string | null; carga_horaria_horas: number | null;
  nota_final: number | null; observacoes: string | null;
  status: string; codigo_validacao: string | null; snapshot: CertificadoSnapshot | null;
  motivo_cancelamento: string | null;
  student?: { username: string | null; display_name: string | null; email: string | null } | null;
  course?: { title: string; slug: string } | null;
};

type Settings = {
  id?: string;
  empresa: string; cnpj: string; responsavel_nome: string; responsavel_cargo: string;
  cidade: string; uf: string; texto_padrao: string; validacao_base_url: string;
  assinatura_url: string | null;
};

const genNumber = () => {
  const y = new Date().getFullYear();
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `MP-${y}-${rnd}`;
};

const Inner = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Row[]>([]);
  const [students, setStudents] = useState<{ user_id: string; label: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [form, setForm] = useState({ user_id: "", course_id: "", numero: genNumber(), carga_horaria: "", nota_final: "", observacoes: "" });
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<Settings | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: certs }, { data: profs }, { data: cs }, { data: st }] = await Promise.all([
      supabase.from("certificates").select("*, student:profiles!certificates_user_id_fkey(username,display_name,email), course:courses(title,slug)").order("emitido_em", { ascending: false }),
      supabase.from("profiles").select("user_id,username,display_name,email").order("username"),
      supabase.from("courses").select("id,title").eq("active", true).order("title"),
      supabase.from("certificate_settings").select("*").limit(1).maybeSingle(),
    ]);
    setList((certs ?? []) as any);
    setStudents((profs ?? []).map((p: any) => ({ user_id: p.user_id, label: `${p.username ?? ""} · ${p.display_name ?? p.email ?? ""}` })));
    setCourses((cs ?? []) as any);
    if (st) setCfg({
      id: (st as any).id,
      empresa: (st as any).empresa ?? "", cnpj: (st as any).cnpj ?? "",
      responsavel_nome: (st as any).responsavel_nome ?? "", responsavel_cargo: (st as any).responsavel_cargo ?? "",
      cidade: (st as any).cidade ?? "", uf: (st as any).uf ?? "",
      texto_padrao: (st as any).texto_padrao ?? "", validacao_base_url: (st as any).validacao_base_url ?? "",
      assinatura_url: (st as any).assinatura_url ?? null,
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.user_id || !form.course_id) return toast.error("Aluno e curso são obrigatórios");
    const payload: any = {
      user_id: form.user_id, course_id: form.course_id, numero: form.numero.trim() || genNumber(),
      carga_horaria: form.carga_horaria || null,
      nota_final: form.nota_final ? Number(form.nota_final) : null,
      observacoes: form.observacoes || null,
      emitido_por: user?.id ?? null,
    };
    const { error } = await supabase.from("certificates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Certificado emitido");
    setOpen(false); setForm({ user_id: "", course_id: "", numero: genNumber(), carga_horaria: "", nota_final: "", observacoes: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este certificado?")) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); load(); }
  };

  const cancelar = async (c: Row) => {
    const motivo = prompt("Motivo do cancelamento:");
    if (!motivo || !motivo.trim()) return;
    const { error } = await supabase.rpc("certificado_cancelar", { _id: c.id, _motivo: motivo.trim() });
    if (error) toast.error(error.message); else { toast.success("Certificado cancelado"); load(); }
  };

  const reativar = async (c: Row) => {
    const { error } = await supabase.rpc("certificado_reativar", { _id: c.id });
    if (error) toast.error(error.message); else { toast.success("Certificado reativado"); load(); }
  };

  const baixar = async (c: Row) => {
    try {
      await baixarCertificadoPdf({
        numero: c.numero, codigo_validacao: c.codigo_validacao, emitido_em: c.emitido_em,
        status: c.status, nota_final: c.nota_final, carga_horaria_horas: c.carga_horaria_horas,
        snapshot: (c.snapshot ?? { curso_titulo: c.course?.title, aluno_nome: c.student?.display_name ?? "" }) as CertificadoSnapshot,
      });
    } catch { toast.error("Não foi possível gerar o PDF."); }
  };

  const salvarConfig = async () => {
    if (!cfg) return;
    const { error } = await supabase.from("certificate_settings").update({
      empresa: cfg.empresa, cnpj: cfg.cnpj, responsavel_nome: cfg.responsavel_nome,
      responsavel_cargo: cfg.responsavel_cargo, cidade: cfg.cidade, uf: cfg.uf,
      texto_padrao: cfg.texto_padrao, validacao_base_url: cfg.validacao_base_url,
      assinatura_url: cfg.assinatura_url,
    } as any).eq("id", cfg.id!);
    if (error) toast.error(error.message); else toast.success("Configurações salvas");
  };

  const uploadAssinatura = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCfg((c) => (c ? { ...c, assinatura_url: String(reader.result) } : c));
    reader.readAsDataURL(file);
  };

  const termo = busca.trim().toLowerCase();
  const filtrada = list.filter((c) => {
    if (statusFiltro !== "todos" && (c.status ?? "ativo") !== statusFiltro) return false;
    if (!termo) return true;
    const alvo = [c.numero, c.codigo_validacao ?? "", c.course?.title ?? "", c.snapshot?.curso_titulo ?? "",
      c.snapshot?.aluno_nome ?? "", c.snapshot?.aluno_cpf ?? "", c.student?.display_name ?? "", c.student?.username ?? "",
      c.student?.email ?? ""].join(" ").toLowerCase();
    return alvo.includes(termo);
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Award className="size-7" /> Certificação</h1>
          <p className="text-muted-foreground">Emita, valide e gerencie certificados dos alunos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /></Button>
          <Button variant="hero" onClick={() => setOpen(true)}><Plus className="size-4" /> Emitir certificado</Button>
        </div>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Certificados</TabsTrigger>
          <TabsTrigger value="config">Configurações do certificado</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Pesquisar por aluno, CPF, curso, número ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left p-3">Número</th>
                  <th className="text-left p-3">Aluno</th>
                  <th className="text-left p-3">Curso</th>
                  <th className="text-left p-3">Nota</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Emissão</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
                {!loading && filtrada.map((c) => {
                  const cancelado = (c.status ?? "ativo") !== "ativo";
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-3 font-mono">{c.numero}</td>
                      <td className="p-3">{c.snapshot?.aluno_nome ?? (c.student ? `${c.student.username ?? ""} · ${c.student.display_name ?? c.student.email ?? ""}` : c.user_id.slice(0, 8))}</td>
                      <td className="p-3">{c.snapshot?.curso_titulo ?? c.course?.title ?? c.course_id.slice(0, 8)}</td>
                      <td className="p-3">{c.nota_final ?? "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${cancelado ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          {cancelado ? "Cancelado" : "Ativo"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(c.emitido_em).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" title="Baixar PDF" onClick={() => baixar(c)}><Download className="size-4" /></Button>
                        {c.codigo_validacao && (
                          <Button asChild size="sm" variant="ghost" title="Validação pública">
                            <Link to={`/validar-certificado/${c.codigo_validacao}`} target="_blank"><ExternalLink className="size-4" /></Link>
                          </Button>
                        )}
                        {cancelado
                          ? <Button size="sm" variant="ghost" title="Reativar" onClick={() => reativar(c)}><RotateCcw className="size-4" /></Button>
                          : <Button size="sm" variant="ghost" className="text-destructive" title="Cancelar" onClick={() => cancelar(c)}><Ban className="size-4" /></Button>}
                        <Button size="sm" variant="ghost" className="text-destructive" title="Remover" onClick={() => remove(c.id)}><Trash2 className="size-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtrada.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum certificado encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="config">
          {!cfg ? <div className="p-8 text-muted-foreground">Carregando…</div> : (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-3xl">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Empresa</Label><Input value={cfg.empresa} onChange={(e) => setCfg({ ...cfg, empresa: e.target.value })} /></div>
                <div><Label>CNPJ</Label><Input value={cfg.cnpj} onChange={(e) => setCfg({ ...cfg, cnpj: e.target.value })} /></div>
                <div><Label>Responsável</Label><Input value={cfg.responsavel_nome} onChange={(e) => setCfg({ ...cfg, responsavel_nome: e.target.value })} /></div>
                <div><Label>Cargo</Label><Input value={cfg.responsavel_cargo} onChange={(e) => setCfg({ ...cfg, responsavel_cargo: e.target.value })} /></div>
                <div><Label>Cidade</Label><Input value={cfg.cidade} onChange={(e) => setCfg({ ...cfg, cidade: e.target.value })} /></div>
                <div><Label>UF</Label><Input value={cfg.uf} onChange={(e) => setCfg({ ...cfg, uf: e.target.value })} /></div>
              </div>
              <div><Label>Endereço de validação (QR Code)</Label><Input value={cfg.validacao_base_url} onChange={(e) => setCfg({ ...cfg, validacao_base_url: e.target.value })} /></div>
              <div><Label>Texto padrão</Label><Textarea rows={3} value={cfg.texto_padrao} onChange={(e) => setCfg({ ...cfg, texto_padrao: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Assinatura digitalizada (PNG com fundo transparente)</Label>
                <Input type="file" accept="image/png" onChange={(e) => e.target.files?.[0] && uploadAssinatura(e.target.files[0])} />
                {cfg.assinatura_url
                  ? <div className="flex items-center gap-3"><img src={cfg.assinatura_url} alt="Assinatura" className="h-14 bg-white rounded border border-border p-1" /><Button variant="ghost" size="sm" onClick={() => setCfg({ ...cfg, assinatura_url: null })}>Remover</Button></div>
                  : <p className="text-xs text-muted-foreground">Sem assinatura enviada: o certificado usa a versão gráfica do nome do responsável.</p>}
              </div>
              <Button variant="hero" onClick={salvarConfig}>Salvar configurações</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Emitir certificado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Curso *</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº do certificado</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
              <div><Label>Carga horária</Label><Input placeholder="ex: 40h" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} /></div>
            </div>
            <div><Label>Nota final</Label><Input type="number" value={form.nota_final} onChange={(e) => setForm({ ...form, nota_final: e.target.value })} /></div>
            <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            <Button variant="hero" className="w-full" onClick={save}>Emitir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminCertificacao() {
  return <RequirePermission perm="manage_certification"><Inner /></RequirePermission>;
}
