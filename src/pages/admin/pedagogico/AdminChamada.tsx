import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, Save, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Turma = { id: string; nome: string };
type Sessao = { id: string; turma_id: string; data: string; titulo: string | null; classroom_id: string | null; observacoes: string | null };
type Aluno = { user_id: string; nome: string };

const hoje = () => new Date().toISOString().slice(0, 10);

const Inner = () => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [salas, setSalas] = useState<{ id: string; nome: string }[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [data, setData] = useState(hoje());
  const [titulo, setTitulo] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, s] = await Promise.all([
        supabase.from("turmas").select("id,nome").order("nome"),
        supabase.from("classrooms" as any).select("id,nome").order("nome"),
      ]);
      setTurmas((t.data ?? []) as any);
      setSalas((s.data ?? []) as any);
    })();
  }, []);

  const carregar = useCallback(async () => {
    if (!turmaId) return;
    const { data: ta } = await supabase.from("turma_alunos").select("user_id").eq("turma_id", turmaId);
    const ids = (ta ?? []).map((r: any) => r.user_id);
    let lista: Aluno[] = [];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,display_name,email").in("user_id", ids);
      lista = (profs ?? []).map((p: any) => ({ user_id: p.user_id, nome: p.display_name || p.email || p.user_id.slice(0, 8) }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }
    setAlunos(lista);

    const { data: sess } = await supabase.from("class_sessions" as any)
      .select("*").eq("turma_id", turmaId).eq("data", data).maybeSingle();
    setSessao((sess ?? null) as any);
    if (sess) {
      setTitulo((sess as any).titulo ?? "");
      setClassroomId((sess as any).classroom_id ?? "");
      const { data: att } = await supabase.from("attendance" as any).select("*").eq("session_id", (sess as any).id);
      const m: Record<string, boolean> = {}; const o: Record<string, string> = {};
      (att ?? []).forEach((a: any) => { m[a.student_user_id] = a.presente; o[a.student_user_id] = a.observacao ?? ""; });
      lista.forEach(a => { if (!(a.user_id in m)) m[a.user_id] = true; });
      setMarcados(m); setObs(o);
    } else {
      const m: Record<string, boolean> = {};
      lista.forEach(a => { m[a.user_id] = true; });
      setMarcados(m); setObs({});
    }
  }, [turmaId, data]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!turmaId) return toast.error("Selecione a turma");
    if (!alunos.length) return toast.error("Nenhum aluno vinculado a esta turma");
    setSaving(true);
    let sid = sessao?.id;
    if (!sid) {
      const { data: ins, error } = await supabase.from("class_sessions" as any)
        .insert({ turma_id: turmaId, data, titulo: titulo || null, classroom_id: classroomId || null, professor_id: user?.id ?? null, created_by: user?.id ?? null })
        .select("*").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      sid = (ins as any).id; setSessao(ins as any);
    } else {
      await supabase.from("class_sessions" as any).update({ titulo: titulo || null, classroom_id: classroomId || null }).eq("id", sid);
    }
    const rows = alunos.map(a => ({ session_id: sid, student_user_id: a.user_id, presente: marcados[a.user_id] ?? true, observacao: obs[a.user_id] || null, registrado_por: user?.id ?? null }));
    const { error: e2 } = await supabase.from("attendance" as any).upsert(rows, { onConflict: "session_id,student_user_id" });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    logAudit("Chamada", "registrou frequência", `${turmas.find(t => t.id === turmaId)?.nome} · ${data}`, sid);
    toast.success("Chamada registrada");
  };

  const presentes = useMemo(() => alunos.filter(a => marcados[a.user_id]).length, [alunos, marcados]);

  const exportar = () => {
    const linhas = [["Aluno", "Presente", "Observação"], ...alunos.map(a => [a.nome, marcados[a.user_id] ? "Sim" : "Não", obs[a.user_id] ?? ""])];
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `chamada-${data}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="size-6" /> Lista de Chamada</h1>
        <p className="text-sm text-muted-foreground">Frequência das aulas presenciais</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label>Turma</Label>
          <Select value={turmaId} onValueChange={setTurmaId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
        <div><Label>Aula / conteúdo</Label><Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Instalação de split" /></div>
        <div><Label>Sala</Label>
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
            <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {turmaId && (
        <div className="bg-card border border-border rounded-lg">
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
            <Badge variant="secondary">{presentes} presentes</Badge>
            <Badge variant="destructive">{alunos.length - presentes} faltas</Badge>
            {sessao && <Badge>Chamada já iniciada</Badge>}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={exportar} disabled={!alunos.length}><Download className="size-4" /> CSV</Button>
              <Button size="sm" onClick={salvar} disabled={saving}><Save className="size-4" /> {saving ? "Salvando…" : "Salvar chamada"}</Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {alunos.map(a => (
              <div key={a.user_id} className="flex flex-wrap items-center gap-3 p-3">
                <Switch checked={marcados[a.user_id] ?? true} onCheckedChange={v => setMarcados({ ...marcados, [a.user_id]: v })} />
                <span className={`flex-1 text-sm font-medium ${marcados[a.user_id] ? "" : "text-muted-foreground line-through"}`}>{a.nome}</span>
                <Input className="w-full sm:w-64" placeholder="Observação" value={obs[a.user_id] ?? ""} onChange={e => setObs({ ...obs, [a.user_id]: e.target.value })} />
              </div>
            ))}
            {alunos.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum aluno vinculado a esta turma. Adicione alunos em <strong>Turmas</strong>.
              </p>
            )}
          </div>
        </div>
      )}
      {!turmaId && <p className="text-sm text-muted-foreground">Selecione uma turma para iniciar a chamada.</p>}
    </div>
  );
};

export default function AdminChamada() {
  return <RequirePermission perm="mod_chamada"><Inner /></RequirePermission>;
}
