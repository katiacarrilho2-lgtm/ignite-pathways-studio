import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, Pencil, Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

type Questao = {
  id: string;
  course_id: string | null;
  tema: string | null;
  dificuldade: string;
  enunciado: string;
  alternativas: string[];
  correta_index: number;
  explicacao: string | null;
  ativo: boolean;
};

type Curso = { id: string; title: string };

const DIFICULDADES = [
  { v: "facil", l: "Fácil" },
  { v: "media", l: "Média" },
  { v: "dificil", l: "Difícil" },
];

const vazia = (courseId: string | null): Questao => ({
  id: "",
  course_id: courseId,
  tema: "",
  dificuldade: "media",
  enunciado: "",
  alternativas: ["", "", "", ""],
  correta_index: 0,
  explicacao: "",
  ativo: true,
});

const AdminBancoQuestoes = () => {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [rows, setRows] = useState<Questao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCurso, setFiltroCurso] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<Questao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: cs }, { data: qs }] = await Promise.all([
      supabase.from("courses").select("id, title").eq("venda_livre", true).order("title"),
      supabase.from("exam_questions_bank").select("*").order("created_at", { ascending: false }),
    ]);
    setCursos((cs ?? []) as Curso[]);
    setRows(((qs ?? []) as any[]).map((q) => ({ ...q, alternativas: (q.alternativas ?? []) as string[] })));
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const cursoNome = (id: string | null) => cursos.find((c) => c.id === id)?.title ?? "Sem curso";

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return rows.filter((q) => {
      if (filtroCurso !== "todos" && q.course_id !== filtroCurso) return false;
      if (filtroStatus === "ativos" && !q.ativo) return false;
      if (filtroStatus === "inativos" && q.ativo) return false;
      if (t && !`${q.enunciado} ${q.tema ?? ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [rows, filtroCurso, filtroStatus, busca]);

  const contagem = useMemo(() => {
    const m: Record<string, number> = {};
    rows.filter((q) => q.ativo).forEach((q) => { const k = q.course_id ?? "—"; m[k] = (m[k] ?? 0) + 1; });
    return m;
  }, [rows]);

  const salvar = async () => {
    if (!edit) return;
    const alts = edit.alternativas.map((a) => a.trim()).filter(Boolean);
    if (!edit.enunciado.trim()) return toast.error("Escreva o enunciado da pergunta.");
    if (alts.length < 2) return toast.error("Informe pelo menos duas alternativas.");
    if (edit.correta_index >= alts.length) return toast.error("Escolha qual alternativa é a correta.");
    if (!edit.course_id) return toast.error("Selecione o curso desta pergunta.");

    setSalvando(true);
    const payload = {
      course_id: edit.course_id,
      tema: edit.tema?.trim() || null,
      dificuldade: edit.dificuldade,
      enunciado: edit.enunciado.trim(),
      alternativas: alts,
      correta_index: edit.correta_index,
      explicacao: edit.explicacao?.trim() || null,
      ativo: edit.ativo,
    };
    const { error } = edit.id
      ? await supabase.from("exam_questions_bank").update(payload).eq("id", edit.id)
      : await supabase.from("exam_questions_bank").insert({ ...payload, created_by: user?.id ?? null });
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success(edit.id ? "Pergunta atualizada." : "Pergunta adicionada.");
    setEdit(null);
    carregar();
  };

  const duplicar = async (q: Questao) => {
    const { error } = await supabase.from("exam_questions_bank").insert({
      course_id: q.course_id, tema: q.tema, dificuldade: q.dificuldade,
      enunciado: `${q.enunciado} (cópia)`, alternativas: q.alternativas,
      correta_index: q.correta_index, explicacao: q.explicacao, ativo: false,
      created_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cópia criada (desativada).");
    carregar();
  };

  const alternarAtivo = async (q: Questao) => {
    const { error } = await supabase.from("exam_questions_bank").update({ ativo: !q.ativo }).eq("id", q.id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === q.id ? { ...x, ativo: !x.ativo } : x)));
  };

  const excluir = async (q: Questao) => {
    if (!confirm("Excluir esta pergunta definitivamente?")) return;
    const { error } = await supabase.from("exam_questions_bank").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("Pergunta excluída.");
    carregar();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
          <HelpCircle className="size-6" /> Banco de Questões
        </h1>
        <Button variant="hero" onClick={() => setEdit(vazia(filtroCurso !== "todos" ? filtroCurso : null))}>
          <Plus className="mr-1 size-4" /> Nova pergunta
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Curso</Label>
          <Select value={filtroCurso} onValueChange={setFiltroCurso}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cursos</SelectItem>
              {cursos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title} ({contagem[c.id] ?? 0} ativas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Situação</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="ativos">Somente ativas</SelectItem>
              <SelectItem value="inativos">Somente inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pesquisar</Label>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Enunciado ou tema…" />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Nenhuma pergunta cadastrada com esses filtros.
        </p>
      ) : (
        <div className="space-y-3">
          {filtradas.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-3xl font-medium text-foreground">{q.enunciado}</p>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => setEdit({ ...q, alternativas: [...q.alternativas] })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Duplicar" onClick={() => duplicar(q)}>
                    <Copy className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Excluir" onClick={() => excluir(q)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{cursoNome(q.course_id)}</Badge>
                {q.tema && <Badge variant="outline">{q.tema}</Badge>}
                <Badge variant="outline">{DIFICULDADES.find((d) => d.v === q.dificuldade)?.l}</Badge>
                <span>{q.alternativas.length} alternativas</span>
                <span className="ml-auto flex items-center gap-2">
                  {q.ativo ? "Ativa" : "Inativa"}
                  <Switch checked={q.ativo} onCheckedChange={() => alternarAtivo(q)} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Curso</Label>
                  <Select value={edit.course_id ?? ""} onValueChange={(v) => setEdit({ ...edit, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {cursos.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dificuldade</Label>
                  <Select value={edit.dificuldade} onValueChange={(v) => setEdit({ ...edit, dificuldade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFICULDADES.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tema (opcional)</Label>
                <Input value={edit.tema ?? ""} onChange={(e) => setEdit({ ...edit, tema: e.target.value })} />
              </div>

              <div>
                <Label>Enunciado</Label>
                <Textarea rows={3} value={edit.enunciado} onChange={(e) => setEdit({ ...edit, enunciado: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Alternativas — marque a correta</Label>
                {edit.alternativas.map((alt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="size-4 accent-primary"
                      checked={edit.correta_index === i}
                      onChange={() => setEdit({ ...edit, correta_index: i })}
                      aria-label={`Alternativa correta ${i + 1}`}
                    />
                    <Input
                      value={alt}
                      placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                      onChange={(e) => {
                        const a = [...edit.alternativas]; a[i] = e.target.value;
                        setEdit({ ...edit, alternativas: a });
                      }}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEdit({ ...edit, alternativas: [...edit.alternativas, ""] })}>
                  <Plus className="mr-1 size-3" /> Adicionar alternativa
                </Button>
              </div>

              <div>
                <Label>Explicação (mostrada ao aluno só se o curso permitir)</Label>
                <Textarea rows={2} value={edit.explicacao ?? ""} onChange={(e) => setEdit({ ...edit, explicacao: e.target.value })} />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} />
                <span className="text-sm">Pergunta ativa (entra no sorteio da prova)</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button variant="hero" disabled={salvando} onClick={salvar}>
              {salvando ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBancoQuestoes;
