import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Copy, UserPlus, Pencil, LogIn, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import { startImpersonation } from "@/lib/impersonate";
import { useNavigate } from "react-router-dom";

type Row = {
  user_id: string; username: string | null; display_name: string | null;
  contact_email: string | null; phone1: string | null; polo: string | null;
  status: string | null; cursos: number;
};
type Course = { id: string; title: string };

const Inner = () => {
  const { activeAccountId } = useCommercialAccounts();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [created, setCreated] = useState<{ username: string; password: string; name: string } | null>(null);

  // Copiar acesso: reseta senha e gera texto para enviar ao aluno
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessRow, setAccessRow] = useState<Row | null>(null);
  const [accessPw, setAccessPw] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);

  const rnd = () => Math.random().toString(36).slice(-6);

  const load = async () => {
    const [{ data: profs }, { data: sp }, { data: enrs }, { data: cs }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name").order("username"),
      supabase.from("student_profiles").select("user_id, contact_email, phone1, polo, status, full_name"),
      supabase.from("enrollments").select("user_id").eq("status", "active"),
      supabase.from("courses").select("id,title").eq("active", true).order("title"),
    ]);
    const spMap = new Map((sp ?? []).map((s: any) => [s.user_id, s]));
    const counts = new Map<string, number>();
    (enrs ?? []).forEach((e: any) => counts.set(e.user_id, (counts.get(e.user_id) ?? 0) + 1));
    const mapped = ((profs ?? []) as any[])
      .filter(p => p.username) // only registered students (have username)
      .map(p => ({
        user_id: p.user_id, username: p.username,
        display_name: spMap.get(p.user_id)?.full_name || p.display_name,
        contact_email: spMap.get(p.user_id)?.contact_email ?? null,
        phone1: spMap.get(p.user_id)?.phone1 ?? null,
        polo: spMap.get(p.user_id)?.polo ?? null,
        status: spMap.get(p.user_id)?.status ?? "ativo",
        cursos: counts.get(p.user_id) ?? 0,
      }));
    mapped.sort((a, b) =>
      (a.display_name ?? a.username ?? "").localeCompare(b.display_name ?? b.username ?? "", "pt-BR", { sensitivity: "base" })
    );
    setRows(mapped);
    setCourses((cs as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setFullName(""); setPassword(rnd()); setCourseId(""); setCreated(null); setOpen(true); };

  const create = async () => {
    if (!fullName.trim()) return toast.error("Informe o nome");
    if (!password || password.length < 4) return toast.error("Senha mínima de 4 caracteres");
    setSaving(true);
    try {
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
      if (!res.ok) return toast.error(out.error || "Erro ao criar aluno");
      if (courseId) {
        const { error } = await supabase.from("enrollments").insert(withAccount({ user_id: out.user_id, course_id: courseId }, activeAccountId));
        if (error) toast.error(`Aluno criado, mas matrícula falhou: ${error.message}`);
      }
      setCreated({ username: out.username, password, name: fullName });
      load();
    } finally { setSaving(false); }
  };

  const copy = () => {
    if (!created) return;
    const txt = `Acesso Multplick — ${created.name}\nUsuário: ${created.username}\nSenha: ${created.password}\n${window.location.origin}/aluno/login`;
    navigator.clipboard.writeText(txt); toast.success("Copiado!");
  };

  const impersonate = async (userId: string, name: string) => {
    try {
      await startImpersonation(userId);
      toast.success(`Entrou como ${name}`);
      nav("/aluno");
    } catch (e: any) {
      toast.error(e.message || "Falha ao entrar como aluno");
    }
  };

  const openAccess = (r: Row) => {
    setAccessRow(r);
    setAccessPw(rnd());
    setAccessOpen(true);
  };

  const accessText = (username: string, pass: string, name?: string | null) =>
    `Olá${name ? ` ${name}` : ""}! Seu acesso à Área do Aluno Multplick:\n\nLogin: ${username}\nSenha: ${pass}\n\nAcesse: ${window.location.origin}/aluno/login`;

  const saveAndCopyAccess = async () => {
    if (!accessRow) return;
    const pw = accessPw.trim();
    if (pw.length < 4) return toast.error("Senha mínima de 4 caracteres");
    setAccessBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ user_id: accessRow.user_id, password: pw }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(out.error || "Erro ao redefinir a senha");
      const txt = accessText(accessRow.username || "", pw, accessRow.display_name);
      await navigator.clipboard.writeText(txt);
      toast.success("Acesso copiado! Cole no WhatsApp ou e-mail do aluno.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar acesso");
    } finally {
      setAccessBusy(false);
    }
  };

  const sendAccessWhats = () => {
    if (!accessRow) return;
    const pw = accessPw.trim();
    const phone = (accessRow.phone1 || "").replace(/\D/g, "");
    if (!phone) return toast.error("Aluno sem telefone cadastrado");
    const msg = accessText(accessRow.username || "", pw, accessRow.display_name);
    window.open(`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = `${r.username} ${r.display_name} ${r.contact_email} ${r.phone1} ${r.polo}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Alunos</h1>
          <p className="text-muted-foreground">Cadastre, edite e gerencie os alunos. Cada aluno recebe um número de login automático.</p>
        </div>
        <Button onClick={openNew} variant="hero"><UserPlus className="size-4" /> Novo aluno</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por login, nome, telefone, polo..." className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3 w-20">Login</th>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Telefone</th>
              <th className="text-left p-3">Polo</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Cursos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.user_id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3 font-mono">{r.username}</td>
                <td className="p-3 font-medium">{r.display_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{r.phone1 ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{r.polo ?? "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${r.status === "ativo" ? "bg-green-100 text-green-800" : "bg-secondary text-muted-foreground"}`}>{r.status}</span>
                </td>
                <td className="p-3">{r.cursos}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAccess(r)}>
                      <KeyRound className="size-4" /> Copiar acesso
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => impersonate(r.user_id, r.display_name ?? r.username ?? "aluno")}>
                      <LogIn className="size-4" /> Entrar como
                    </Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/admin/alunos/${r.user_id}`}><Pencil className="size-4" /> Abrir ficha</Link></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum aluno encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copiar acesso do aluno</DialogTitle></DialogHeader>
          {accessRow && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <p><strong>Aluno:</strong> {accessRow.display_name || "—"}</p>
                <p><strong>Login:</strong> <span className="font-mono">{accessRow.username}</span></p>
              </div>
              <div>
                <Label>Senha (será redefinida ao copiar)</Label>
                <div className="flex gap-2">
                  <Input value={accessPw} onChange={e=>setAccessPw(e.target.value)} />
                  <Button type="button" variant="outline" onClick={()=>setAccessPw(rnd())}>Gerar</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ao clicar em "Salvar e copiar", a senha do aluno será redefinida e o texto pronto (login, senha e link) será copiado para você enviar.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveAndCopyAccess} variant="hero" className="flex-1" disabled={accessBusy}>
                  <Copy className="size-4" /> {accessBusy ? "Salvando..." : "Salvar e copiar"}
                </Button>
                <Button onClick={sendAccessWhats} variant="outline" disabled={accessBusy || !accessRow.phone1}>
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{created ? "Aluno criado" : "Novo aluno"}</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-sm"><strong>Nome:</strong> {created.name}</p>
                <p className="text-sm"><strong>Login:</strong> <span className="font-mono">{created.username}</span></p>
                <p className="text-sm"><strong>Senha:</strong> <span className="font-mono">{created.password}</span></p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copy} variant="outline" className="flex-1"><Copy className="size-4" /> Copiar</Button>
                <Button onClick={() => setOpen(false)} variant="hero" className="flex-1">Concluir</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div><Label>Nome completo</Label><Input value={fullName} onChange={e=>setFullName(e.target.value)} /></div>
              <div>
                <Label>Senha</Label>
                <div className="flex gap-2">
                  <Input value={password} onChange={e=>setPassword(e.target.value)} />
                  <Button type="button" variant="outline" onClick={()=>setPassword(rnd())}>Gerar</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Login é gerado automaticamente (001, 002…).</p>
              </div>
              <div>
                <Label>Curso (opcional — você pode matricular depois)</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={create} variant="hero" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Criar aluno"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminAlunos = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminAlunos;
