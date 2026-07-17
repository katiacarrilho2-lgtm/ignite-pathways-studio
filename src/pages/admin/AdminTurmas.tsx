import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users2, Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";

type Turma = { id: string; nome: string; course_id: string | null; data_inicio: string | null; data_fim: string | null; capacidade: number; courses: { title: string } | null; alunos: number };
type Course = { id: string; title: string };

const Inner = () => {
  const { activeAccountId } = useCommercialAccounts();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [capacidade, setCapacidade] = useState("30");

  const [alunosOpen, setAlunosOpen] = useState(false);
  const [alunosTurma, setAlunosTurma] = useState<Turma | null>(null);
  const [alunosLista, setAlunosLista] = useState<Array<{ id: string; user_id: string; nome: string; email: string | null }>>([]);
  const [candidatos, setCandidatos] = useState<Array<{ user_id: string; nome: string; email: string | null }>>([]);
  const [novoAlunoId, setNovoAlunoId] = useState<string>("");
  const [buscaAluno, setBuscaAluno] = useState("");

  const load = async () => {
    const [{ data: ts }, { data: cs }, { data: tas }] = await Promise.all([
      supabase.from("turmas").select("id,nome,course_id,data_inicio,data_fim,capacidade, courses(title)").order("created_at", { ascending: false }),
      supabase.from("courses").select("id,title").eq("active", true).order("title"),
      supabase.from("turma_alunos").select("turma_id"),
    ]);
    const counts = new Map<string, number>();
    (tas ?? []).forEach((t: any) => counts.set(t.turma_id, (counts.get(t.turma_id) ?? 0) + 1));
    setTurmas(((ts ?? []) as any[]).map(t => ({ ...t, alunos: counts.get(t.id) ?? 0 })));
    setCourses((cs as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const loadAlunos = async (turma: Turma) => {
    const { data: vinculos } = await supabase
      .from("turma_alunos")
      .select("id, user_id")
      .eq("turma_id", turma.id);
    const ids = (vinculos ?? []).map((v: any) => v.user_id);
    let profs: any[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", ids);
      profs = data ?? [];
    }
    const lista = (vinculos ?? []).map((v: any) => {
      const p = profs.find((x) => x.user_id === v.user_id);
      return { id: v.id, user_id: v.user_id, nome: p?.display_name || p?.email || v.user_id, email: p?.email ?? null };
    });
    setAlunosLista(lista);

    const { data: allProfs } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .order("display_name")
      .limit(500);
    const inSet = new Set(ids);
    setCandidatos(((allProfs ?? []) as any[])
      .filter((p) => !inSet.has(p.user_id))
      .map((p) => ({ user_id: p.user_id, nome: p.display_name || p.email || p.user_id, email: p.email })));
  };

  const openAlunos = async (turma: Turma) => {
    setAlunosTurma(turma);
    setNovoAlunoId("");
    setBuscaAluno("");
    setAlunosOpen(true);
    await loadAlunos(turma);
  };

  const addAluno = async () => {
    if (!alunosTurma || !novoAlunoId) return;
    const { error } = await supabase
      .from("turma_alunos")
      .insert(withAccount({ turma_id: alunosTurma.id, user_id: novoAlunoId }, activeAccountId));
    if (error) return toast.error(error.message);
    toast.success("Aluno adicionado");
    setNovoAlunoId("");
    await loadAlunos(alunosTurma);
    load();
  };

  const removeAluno = async (id: string) => {
    if (!alunosTurma) return;
    if (!confirm("Remover este aluno da turma?")) return;
    const { error } = await supabase.from("turma_alunos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Aluno removido");
    await loadAlunos(alunosTurma);
    load();
  };

  const resetForm = () => {
    setEditingId(null); setNome(""); setCourseId("");
    setDataInicio(""); setDataFim(""); setCapacidade("30");
  };

  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (t: Turma) => {
    setEditingId(t.id);
    setNome(t.nome);
    setCourseId(t.course_id ?? "");
    setDataInicio(t.data_inicio ? t.data_inicio.slice(0, 10) : "");
    setDataFim(t.data_fim ? t.data_fim.slice(0, 10) : "");
    setCapacidade(String(t.capacidade ?? 30));
    setOpen(true);
  };

  const save = async () => {
    if (!nome.trim()) return toast.error("Informe o nome da turma");
    const payload: any = {
      nome,
      course_id: courseId || null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      capacidade: parseInt(capacidade) || 30,
    };
    const { error } = editingId
      ? await supabase.from("turmas").update(payload).eq("id", editingId)
      : await supabase.from("turmas").insert(withAccount(payload, activeAccountId));
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Turma atualizada!" : "Turma criada!");
    setOpen(false); resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta turma? Os vínculos com alunos serão removidos.")) return;
    const { error } = await supabase.from("turmas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Turma excluída"); load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Turmas</h1>
          <p className="text-muted-foreground">Crie turmas e vincule alunos pela ficha de cada um.</p>
        </div>
        <Button onClick={openNew} variant="hero"><Plus className="size-4" /> Nova turma</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {turmas.map(t => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{t.nome}</h3>
                <p className="text-sm text-muted-foreground">{t.courses?.title ?? "Sem curso"}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openAlunos(t)}>
                  <Users2 className="size-4" /> Alunos
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(t.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <div className="text-sm flex items-center gap-2 text-muted-foreground">
              <Users2 className="size-4" /> {t.alunos} / {t.capacidade} alunos
            </div>
            {(t.data_inicio || t.data_fim) && (
              <p className="text-xs text-muted-foreground">
                {t.data_inicio && `Início: ${new Date(t.data_inicio).toLocaleDateString("pt-BR")}`}
                {t.data_inicio && t.data_fim && " · "}
                {t.data_fim && `Fim: ${new Date(t.data_fim).toLocaleDateString("pt-BR")}`}
              </p>
            )}
          </div>
        ))}
        {turmas.length === 0 && <p className="text-muted-foreground col-span-full text-center p-8">Nenhuma turma criada.</p>}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar turma" : "Nova turma"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Turma A — Manhã" /></div>
            <div>
              <Label>Curso</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} /></div>
              <div><Label>Fim</Label><Input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} /></div>
            </div>
            <div><Label>Capacidade</Label><Input type="number" value={capacidade} onChange={e=>setCapacidade(e.target.value)} /></div>
            <Button onClick={save} variant="hero" className="w-full">{editingId ? "Salvar alterações" : "Criar turma"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alunosOpen} onOpenChange={setAlunosOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alunos — {alunosTurma?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Adicionar aluno</Label>
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
              />
              <div className="flex gap-2">
                <Select value={novoAlunoId} onValueChange={setNovoAlunoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {candidatos
                      .filter((c) => {
                        const q = buscaAluno.toLowerCase().trim();
                        if (!q) return true;
                        return c.nome.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
                      })
                      .slice(0, 100)
                      .map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.nome}{c.email ? ` — ${c.email}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addAluno} disabled={!novoAlunoId} variant="hero">
                  <UserPlus className="size-4" /> Adicionar
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-auto">
              {alunosLista.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">Nenhum aluno nesta turma.</p>
              )}
              {alunosLista.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-sm">{a.nome}</p>
                    {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeAluno(a.id)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {alunosLista.length} / {alunosTurma?.capacidade ?? 0} alunos
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminTurmas = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminTurmas;
