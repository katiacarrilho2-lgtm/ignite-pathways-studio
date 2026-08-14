import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import { downloadCsv, dateCsv } from "@/lib/exportCsv";
import { Download } from "lucide-react";

type Enr = {
  id: string; user_id: string; course_id: string; progress: number; status: string; enrolled_at: string;
  courses: { title: string } | null;
};
type Student = { user_id: string; username: string | null; full_name: string | null; email: string | null };
type Course = { id: string; title: string };

const Inner = () => {
  const { activeAccountId } = useCommercialAccounts();
  const [list, setList] = useState<Enr[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ username: string; password: string; name: string } | null>(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  // form
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [existingUserId, setExistingUserId] = useState<string>("");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [refCode, setRefCode] = useState("");

  const randomPassword = () => Math.random().toString(36).slice(-6);

  const load = async () => {
    const [{ data: enrs }, { data: profs }, { data: cs }] = await Promise.all([
      supabase.from("enrollments")
        .select("id,user_id,course_id,progress,status,enrolled_at, courses(title)")
        .order("enrolled_at", { ascending: false }),
      supabase.from("profiles").select("user_id, username, display_name, email").order("username"),
      supabase.from("courses").select("id,title").eq("active", true).order("title"),
    ]);
    setList((enrs as any) ?? []);
    setStudents(((profs ?? []) as any[]).map(p => ({
      user_id: p.user_id, username: p.username, full_name: p.display_name, email: p.email,
    })));
    setCourses((cs as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setMode("new"); setFullName(""); setPassword(randomPassword());
    setCourseId(""); setExistingUserId(""); setCreatedInfo(null); setRefCode("");
    setOpen(true);
  };

  const studentLabel = (uid: string) => {
    const s = students.find(x => x.user_id === uid);
    if (!s) return uid;
    const num = s.username ? `${s.username} · ` : "";
    return `${num}${s.full_name ?? s.email ?? uid}`;
  };

  const create = async () => {
    if (!courseId) return toast.error("Selecione um curso");
    setSaving(true);
    try {
      let userId = existingUserId;
      let info: typeof createdInfo = null;

      if (mode === "new") {
        if (!fullName.trim()) { setSaving(false); return toast.error("Informe o nome do aluno"); }
        if (!password || password.length < 4) { setSaving(false); return toast.error("Senha mínima de 4 caracteres"); }

        // Call edge function to create auth user with next sequential username
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ full_name: fullName, password }),
        });
        const out = await res.json();
        if (!res.ok) { setSaving(false); return toast.error(out.error || "Erro ao criar aluno"); }
        userId = out.user_id;
        info = { username: out.username, password, name: fullName };
      }

      if (!userId) { setSaving(false); return toast.error("Selecione um aluno"); }

      const { data: enrIns, error } = await supabase
        .from("enrollments")
        .insert(withAccount({ user_id: userId, course_id: courseId }, activeAccountId))
        .select("id")
        .single();
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }

      // Vínculo de afiliado (opcional)
      const code = refCode.trim().toUpperCase();
      if (code && enrIns?.id) {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id, commission_pct")
          .eq("code", code)
          .eq("status", "ativo")
          .maybeSingle();
        if (aff) {
          const { data: course } = await supabase
            .from("courses").select("price_cents").eq("id", courseId).maybeSingle();
          const valor = course?.price_cents ?? 0;
          const commission = Math.round((valor * Number(aff.commission_pct ?? 0)) / 100);
          await supabase.from("affiliate_referrals").insert({
            affiliate_id: aff.id,
            enrollment_id: enrIns.id,
            valor_cents: valor,
            commission_cents: commission,
            status: "pendente",
          });
        } else {
          toast.warning(`Código de afiliado "${code}" não encontrado — matrícula criada sem vínculo.`);
        }
      }

      toast.success("Matrícula criada!");
      setCreatedInfo(info);
      if (!info) setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const copyAccess = () => {
    if (!createdInfo) return;
    const txt = `Acesso Multplick — ${createdInfo.name}\nUsuário: ${createdInfo.username}\nSenha: ${createdInfo.password}\nÁrea do aluno: ${window.location.origin}/aluno/login`;
    navigator.clipboard.writeText(txt);
    toast.success("Dados copiados!");
  };

  const remove = async (id: string) => {
    if (!confirm("Cancelar esta matrícula?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Matrícula removida"); load();
  };

  const filtered = list.filter(e => {
    if (!q) return true;
    const s = studentLabel(e.user_id).toLowerCase();
    return s.includes(q.toLowerCase()) || (e.courses?.title ?? "").toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Matrículas</h1>
          <p className="text-muted-foreground">Cadastre alunos e vincule a cursos. O número de usuário é gerado automaticamente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("matriculas",
            ["Aluno", "Curso", "Status", "Progresso", "Matriculado em"],
            filtered.map(e => [studentLabel(e.user_id), e.courses?.title ?? "", e.status, `${e.progress}%`, dateCsv(e.enrolled_at)]))}>
            <Download className="size-4" /> Exportar
          </Button>
          <Button onClick={openNew} variant="hero"><UserPlus className="size-4" /> Nova matrícula</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por aluno, usuário ou curso..." className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Aluno</th>
              <th className="text-left p-3">Curso</th>
              <th className="text-left p-3">Progresso</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3 font-medium">{studentLabel(e.user_id)}</td>
                <td className="p-3 text-muted-foreground">{e.courses?.title}</td>
                <td className="p-3">{e.progress}%</td>
                <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">{e.status}</span></td>
                <td className="p-3 text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(e.id)} className="text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma matrícula. Clique em "Nova matrícula".</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{createdInfo ? "Aluno criado e matriculado" : "Nova matrícula"}</DialogTitle></DialogHeader>

          {createdInfo ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-sm"><strong>Nome:</strong> {createdInfo.name}</p>
                <p className="text-sm"><strong>Usuário:</strong> <span className="font-mono text-base">{createdInfo.username}</span></p>
                <p className="text-sm"><strong>Senha:</strong> <span className="font-mono text-base">{createdInfo.password}</span></p>
                <p className="text-xs text-muted-foreground pt-2">Compartilhe estes dados com o aluno. Ele acessa em <span className="font-mono">{window.location.origin}/aluno/login</span></p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyAccess} variant="outline" className="flex-1"><Copy className="size-4" /> Copiar dados</Button>
                <Button onClick={() => setOpen(false)} variant="hero" className="flex-1">Concluir</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={mode === "new" ? "hero" : "outline"} onClick={() => setMode("new")}>
                  <UserPlus className="size-4" /> Novo aluno
                </Button>
                <Button type="button" size="sm" variant={mode === "existing" ? "hero" : "outline"} onClick={() => setMode("existing")}>
                  <Plus className="size-4" /> Aluno existente
                </Button>
              </div>

              {mode === "new" ? (
                <>
                  <div>
                    <Label>Nome completo do aluno</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: João da Silva" />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <div className="flex gap-2">
                      <Input value={password} onChange={e => setPassword(e.target.value)} />
                      <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())}>Gerar</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">O usuário será gerado automaticamente (001, 002, 003…).</p>
                  </div>
                </>
              ) : (
                <div>
                  <Label>Aluno</Label>
                  <Select value={existingUserId} onValueChange={setExistingUserId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {(s.username ? `${s.username} · ` : "") + (s.full_name ?? s.email ?? s.user_id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Curso</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Código de afiliado (opcional)</Label>
                <Input
                  value={refCode}
                  onChange={e => setRefCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se preenchido, gera um registro de comissão para o afiliado.
                </p>
              </div>

              <Button onClick={create} variant="hero" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : (mode === "new" ? "Criar aluno e matricular" : "Matricular")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminMatriculas = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminMatriculas;
