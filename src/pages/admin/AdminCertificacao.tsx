import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ExternalLink, RefreshCcw, Award } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

type Row = {
  id: string; user_id: string; course_id: string; numero: string;
  emitido_em: string; carga_horaria: string | null; nota_final: number | null;
  observacoes: string | null;
  student?: { username: string | null; display_name: string | null; email: string | null } | null;
  course?: { title: string; slug: string } | null;
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
  const [form, setForm] = useState({ user_id: "", course_id: "", numero: genNumber(), carga_horaria: "", nota_final: "", observacoes: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: certs }, { data: profs }, { data: cs }] = await Promise.all([
      supabase.from("certificates").select("*, student:profiles!certificates_user_id_fkey(username,display_name,email), course:courses(title,slug)").order("emitido_em", { ascending: false }),
      supabase.from("profiles").select("user_id,username,display_name,email").order("username"),
      supabase.from("courses").select("id,title").eq("active", true).order("title"),
    ]);
    setList((certs ?? []) as any);
    setStudents((profs ?? []).map((p: any) => ({ user_id: p.user_id, label: `${p.username ?? ""} · ${p.display_name ?? p.email ?? ""}` })));
    setCourses((cs ?? []) as any);
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Award className="size-7" /> Certificação</h1>
          <p className="text-muted-foreground">Emita e gerencie certificados de conclusão dos alunos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /></Button>
          <Button variant="hero" onClick={() => setOpen(true)}><Plus className="size-4" /> Emitir certificado</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Número</th>
              <th className="text-left p-3">Aluno</th>
              <th className="text-left p-3">Curso</th>
              <th className="text-left p-3">CH</th>
              <th className="text-left p-3">Nota</th>
              <th className="text-left p-3">Emissão</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
            {!loading && list.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.numero}</td>
                <td className="p-3">{c.student ? `${c.student.username ?? ""} · ${c.student.display_name ?? c.student.email ?? ""}` : c.user_id.slice(0, 8)}</td>
                <td className="p-3">{c.course?.title ?? c.course_id.slice(0, 8)}</td>
                <td className="p-3 text-muted-foreground">{c.carga_horaria ?? "—"}</td>
                <td className="p-3">{c.nota_final ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(c.emitido_em).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button asChild size="sm" variant="ghost"><Link to={`/aluno/certificado/${c.id}`} target="_blank"><ExternalLink className="size-4" /></Link></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {!loading && list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum certificado emitido.</td></tr>}
          </tbody>
        </table>
      </div>

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
