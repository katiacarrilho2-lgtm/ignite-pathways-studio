import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Oc = {
  id: string; student_user_id: string | null; turma_id: string | null; tipo: string;
  titulo: string; descricao: string | null; gravidade: string; status: string; created_at: string;
};

const gravColor: Record<string, "secondary" | "default" | "destructive"> = { leve: "secondary", media: "default", grave: "destructive" };

const Inner = () => {
  const { user } = useAuth();
  const [ocs, setOcs] = useState<Oc[]>([]);
  const [alunos, setAlunos] = useState<{ user_id: string; nome: string }[]>([]);
  const [turmas, setTurmas] = useState<{ id: string; nome: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [fStatus, setFStatus] = useState("todas");

  const load = useCallback(async () => {
    const [o, p, t] = await Promise.all([
      supabase.from("pedagogic_occurrences" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id,display_name,email").order("display_name").limit(1000),
      supabase.from("turmas").select("id,nome").order("nome"),
    ]);
    setOcs((o.data ?? []) as any);
    setAlunos((p.data ?? []).map((x: any) => ({ user_id: x.user_id, nome: x.display_name || x.email })));
    setTurmas((t.data ?? []) as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const salvar = async () => {
    if (!form.titulo) return toast.error("Informe o título");
    const payload = {
      student_user_id: form.student_user_id || null, turma_id: form.turma_id || null,
      tipo: form.tipo || "ocorrencia", titulo: form.titulo, descricao: form.descricao || null,
      gravidade: form.gravidade || "leve", status: form.status || "aberta", autor_id: user?.id ?? null,
    };
    const { error } = form.id
      ? await supabase.from("pedagogic_occurrences" as any).update(payload).eq("id", form.id)
      : await supabase.from("pedagogic_occurrences" as any).insert(payload);
    if (error) return toast.error(error.message);
    logAudit("Pedagogia", form.id ? "editou ocorrência" : "registrou ocorrência", form.titulo, form.id);
    toast.success("Salvo"); setOpen(false); setForm({}); load();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir ocorrência?")) return;
    await supabase.from("pedagogic_occurrences" as any).delete().eq("id", id);
    logAudit("Pedagogia", "excluiu ocorrência", undefined, id);
    load();
  };

  const nomeAluno = (id: string | null) => alunos.find(a => a.user_id === id)?.nome ?? "—";
  const nomeTurma = (id: string | null) => turmas.find(t => t.id === id)?.nome ?? "—";
  const lista = fStatus === "todas" ? ocs : ocs.filter(o => o.status === fStatus);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="size-6" /> Pedagogia — Ocorrências</h1>
          <p className="text-sm text-muted-foreground">Registros pedagógicos, elogios e advertências</p>
        </div>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{["todas", "aberta", "em_acompanhamento", "resolvida"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => { setForm({}); setOpen(true); }}><Plus className="size-4" /> Nova ocorrência</Button>
      </div>

      <div className="grid gap-2">
        {lista.map(o => (
          <div key={o.id} className="bg-card border border-border rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{o.titulo}</span>
              <Badge variant="secondary">{o.tipo}</Badge>
              <Badge variant={gravColor[o.gravidade] ?? "secondary"}>{o.gravidade}</Badge>
              <Badge variant={o.status === "resolvida" ? "secondary" : "destructive"}>{o.status.replace("_", " ")}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aluno: {nomeAluno(o.student_user_id)} · Turma: {nomeTurma(o.turma_id)}</p>
            {o.descricao && <p className="text-sm mt-1 whitespace-pre-wrap">{o.descricao}</p>}
            <div className="flex gap-1 mt-2">
              <Button variant="ghost" size="icon" onClick={() => { setForm(o); setOpen(true); }}><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => excluir(o.id)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>}
      </div>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm({}); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ocorrência pedagógica</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo ?? ""} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Aluno</Label>
              <Select value={form.student_user_id ?? ""} onValueChange={v => setForm({ ...form, student_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent className="max-h-64">{alunos.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Turma</Label>
              <Select value={form.turma_id ?? ""} onValueChange={v => setForm({ ...form, turma_id: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Tipo</Label>
                <Select value={form.tipo ?? "ocorrencia"} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["ocorrencia", "elogio", "advertencia", "atendimento"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Gravidade</Label>
                <Select value={form.gravidade ?? "leve"} onValueChange={v => setForm({ ...form, gravidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["leve", "media", "grave"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status ?? "aberta"} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["aberta", "em_acompanhamento", "resolvida"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={4} value={form.descricao ?? ""} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminOcorrencias() {
  return <RequirePermission perm="mod_pedagogia"><Inner /></RequirePermission>;
}
