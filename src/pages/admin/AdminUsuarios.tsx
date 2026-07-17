import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, Permission, Role } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, Copy, UserPlus, KeyRound, UserCheck, Link2, Check, X, Power, Shield } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

const PERMS: { id: Permission; label: string; desc: string }[] = [
  { id: "manage_courses", label: "Gerenciar cursos", desc: "Criar, editar, excluir cursos e imagens" },
  { id: "manage_users", label: "Gerenciar usuários", desc: "Convidar, alterar permissões, remover" },
  { id: "manage_leads", label: "Gerenciar leads", desc: "Ver e responder contatos do site" },
  { id: "manage_content", label: "Editar conteúdo", desc: "Blog, textos do site" },
  { id: "view_analytics", label: "Ver relatórios", desc: "Estatísticas e métricas" },
];
const ROLES: { id: Role; label: string }[] = [
  { id: "viewer", label: "Visualizador" },
  { id: "certificadora", label: "Certificadora" },
  { id: "editor", label: "Editor" },
  { id: "admin", label: "Administrador" },
];

type RoleDef = {
  key: string; label: string; description: string | null;
  base_role: Role; permissions: Permission[]; is_system: boolean; sort_order: number;
};

const AdminUsuariosInner = () => {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [roleDefs, setRoleDefs] = useState<RoleDef[]>([]);
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [search, setSearch] = useState("");
  const [appBusyId, setAppBusyId] = useState<string | null>(null);
  const [credsDialog, setCredsDialog] = useState<{ username: string; password: string; code: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [perms, setPerms] = useState<Permission[]>([]);

  // Novo cadastro direto
  const [createOpen, setCreateOpen] = useState(false);
  const [nextUsername, setNextUsername] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    full_name: "", phone1: "", phone2: "", email: "",
    cpf: "", rg: "", cep: "", street: "", neighborhood: "", city: "",
    state: "", address_number: "", birth_date: "", password: "",
    role_key: "viewer" as string,
    responsible_name: "", responsible_rg: "", responsible_cpf: "",
    sex: "", polo: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setF = (k: keyof typeof emptyForm, v: string) => setForm(s => ({ ...s, [k]: v }));

  const idade = (() => {
    if (!form.birth_date) return "";
    const d = new Date(form.birth_date);
    if (isNaN(d.getTime())) return "";
    const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a >= 0 ? String(a) : "";
  })();

  // Detalhes / edição de um usuário existente
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const setD = (k: string, v: any) => setDetail((s: any) => ({ ...s, [k]: v }));
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Copiar acesso (reseta senha e gera texto pronto)
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessRow, setAccessRow] = useState<any | null>(null);
  const [accessPw, setAccessPw] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const rndPw = () => Math.random().toString(36).slice(-6);
  const openAccess = (u: any) => { setAccessRow(u); setAccessPw(rndPw()); setAccessOpen(true); };
  const accessText = (username: string, pass: string, name?: string | null) =>
    `Olá${name ? ` ${name}` : ""}! Seu acesso à Área do Aluno Multplick:\n\nLogin: ${username}\nSenha: ${pass}\n\nAcesse: ${window.location.origin}/aluno/login`;
  const saveAndCopyAccess = async () => {
    if (!accessRow) return;
    const pw = accessPw.trim();
    if (pw.length < 4) return toast.error("Senha mínima de 4 caracteres");
    setAccessBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: accessRow.user_id, password: pw },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const uname = (data as any)?.username || accessRow.username || "";
      const txt = accessText(uname, pw, accessRow.display_name);
      await navigator.clipboard.writeText(txt);
      toast.success("Acesso copiado! Cole no WhatsApp ou e-mail do usuário.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar acesso");
    } finally {
      setAccessBusy(false);
    }
  };
  const sendAccessWhats = () => {
    if (!accessRow) return;
    const phone = (accessRow.phone1 || "").replace(/\D/g, "");
    if (!phone) return toast.error("Usuário sem telefone cadastrado");
    const msg = accessText(accessRow.username || "", accessPw.trim(), accessRow.display_name);
    window.open(`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const detailIdade = (() => {
    if (!detail?.birth_date) return "";
    const d = new Date(detail.birth_date);
    if (isNaN(d.getTime())) return "";
    const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a >= 0 ? String(a) : "";
  })();
  const openDetail = (u: any) => { setDetail({ ...u }); setNewPassword(""); setDetailOpen(true); };
  const saveDetail = async () => {
    if (!detail) return;
    setDetailSaving(true);
    try {
      const fields = ["display_name","phone1","phone2","cpf","rg","cep","street","address_number","neighborhood","city","state","birth_date","responsible_name","responsible_rg","responsible_cpf","sex","polo","notes"];
      const patch: any = {};
      fields.forEach(f => { patch[f] = detail[f] ?? null; });
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", detail.user_id);
      if (error) throw error;
      toast.success("Dados atualizados!");
      setDetailOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setDetailSaving(false);
    }
  };
  const resetPassword = async () => {
    if (!detail) return;
    const cleanPassword = newPassword.trim();
    if (!cleanPassword || cleanPassword.length < 4) return toast.error("Senha deve ter ao menos 4 caracteres");
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: detail.user_id, password: cleanPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Senha redefinida! Login: ${(data as any)?.username || detail.username}`);
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao redefinir senha");
    } finally {
      setResetting(false);
    }
  };

  const loadNextUsername = async () => {
    const { data } = await supabase.rpc("next_username");
    setNextUsername((data as string) ?? "");
  };

  const openCreate = () => {
    setForm(emptyForm);
    loadNextUsername();
    setCreateOpen(true);
  };

  const createUser = async () => {
    if (!form.full_name.trim()) return toast.error("Informe o nome");
    if (!form.password || form.password.length < 4) return toast.error("Senha deve ter ao menos 4 caracteres");
    setSaving(true);
    try {
      const def = roleDefs.find(r => r.key === form.role_key);
      const base_role = def?.base_role ?? "viewer";
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { ...form, role: ["admin","editor","viewer","certificadora"].includes(base_role) ? base_role : "viewer" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const newUid = (data as any).user_id as string;
      if (newUid && def) {
        // Aplica cargo completo (base_role + permissões + role_key)
        await supabase.from("user_roles").delete().eq("user_id", newUid);
        await supabase.from("user_roles").insert({ user_id: newUid, role: def.base_role });
        await supabase.from("user_permissions").delete().eq("user_id", newUid);
        if (def.permissions.length) {
          await supabase.from("user_permissions").insert(
            def.permissions.map((p) => ({ user_id: newUid, permission: p as Permission }))
          );
        }
        await (supabase as any).from("profiles").update({ role_key: def.key }).eq("user_id", newUid);
      }
      toast.success(`Usuário ${(data as any).username} criado!`);
      setCreateOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar usuário");
    } finally {
      setSaving(false);
    }
  };

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: permissions } = await supabase.from("user_permissions").select("*");
    const { data: defs } = await (supabase as any).from("role_definitions").select("*").order("sort_order");
    setRoleDefs((defs ?? []) as RoleDef[]);
    const merged = (profiles ?? []).map((p: any) => ({
      ...p,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      permissions: (permissions ?? []).filter((x: any) => x.user_id === p.user_id).map((x: any) => x.permission),
    }));
    setUsers(merged);
    const { data: inv } = await supabase.from("invitations").select("*").is("accepted_at", null).order("created_at", { ascending: false });
    setInvites(inv ?? []);
    const { data: apps } = await supabase
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApplications(apps ?? []);
  };
  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!email) return toast.error("Informe o e-mail");
    const { error } = await supabase.from("invitations").insert({ email: email.trim().toLowerCase(), role, permissions: perms });
    if (error) return toast.error(error.message);
    toast.success("Convite criado!");
    setOpen(false); setEmail(""); setPerms([]); setRole("editor"); load();
  };

  const togglePerm = async (userId: string, perm: Permission, has: boolean) => {
    if (has) {
      await supabase.from("user_permissions").delete().eq("user_id", userId).eq("permission", perm);
    } else {
      await supabase.from("user_permissions").insert({ user_id: userId, permission: perm });
    }
    load();
  };
  const applyRoleKey = async (userId: string, key: string) => {
    if (!isSuperAdmin) return toast.error("Apenas super admin pode alterar papéis");
    const def = roleDefs.find(r => r.key === key);
    if (!def) return toast.error("Cargo não encontrado");
    // Substitui role e permissões pelo definido no cargo
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: def.base_role });
    await supabase.from("user_permissions").delete().eq("user_id", userId);
    if (def.permissions.length) {
      await supabase.from("user_permissions").insert(def.permissions.map((p) => ({ user_id: userId, permission: p as Permission })));
    }
    await (supabase as any).from("profiles").update({ role_key: key }).eq("user_id", userId);
    toast.success(`Cargo "${def.label}" aplicado`);
    load();
  };
  const toggleStatus = async (u: any) => {
    const next = u.status === "inativo" ? "ativo" : "inativo";
    await (supabase as any).from("profiles").update({ status: next }).eq("user_id", u.user_id);
    toast.success(next === "ativo" ? "Membro reativado" : "Membro inativado");
    load();
  };
  const removeUser = async (userId: string) => {
    if (!confirm("Remover acesso (papéis e permissões) deste usuário?")) return;
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_permissions").delete().eq("user_id", userId);
    await (supabase as any).from("profiles").update({ role_key: null }).eq("user_id", userId);
    toast.success("Acesso removido"); load();
  };
  const deleteUser = async (userId: string) => {
    if (!confirm("EXCLUIR PERMANENTEMENTE este usuário? Esta ação não pode ser desfeita.")) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Usuário excluído");
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };
  const removeInvite = async (id: string) => { await supabase.from("invitations").delete().eq("id", id); load(); };
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/auth?invite=${token}`);
    toast.success("Link copiado!");
  };

  const copySellerLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/seja-vendedor`);
    toast.success("Link público copiado!");
  };

  const approveApplication = async (id: string) => {
    const pct = prompt("% de comissão para este vendedor:", "10");
    if (pct === null) return;
    const commission_pct = parseFloat(pct);
    if (isNaN(commission_pct) || commission_pct < 0 || commission_pct > 100) return toast.error("% inválida");
    const make_member = confirm(
      "Tornar este vendedor um MEMBRO do sistema?\n\n" +
      "OK = Sim, criar acesso ao painel (login + permissão de leads).\n" +
      "Cancelar = Não, apenas registrar como afiliado/vendedor externo (sem acesso ao painel)."
    );
    setAppBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-seller-application", {
        body: { application_id: id, commission_pct, make_member },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCredsDialog({
        username: (data as any).username,
        password: (data as any).password,
        code: (data as any).code,
      });
      toast.success("Vendedor aprovado!");
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao aprovar");
    } finally {
      setAppBusyId(null);
    }
  };

  const rejectApplication = async (id: string) => {
    const notes = prompt("Motivo da rejeição (opcional):") ?? "";
    if (!confirm("Rejeitar esta candidatura?")) return;
    const { error } = await supabase.from("seller_applications").update({
      status: "rejeitado", review_notes: notes || null, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Candidatura rejeitada");
    load();
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Excluir esta candidatura?")) return;
    await supabase.from("seller_applications").delete().eq("id", id);
    load();
  };

  const makeMember = async (userId: string) => {
    if (!userId) return toast.error("Candidatura sem usuário vinculado");
    if (!confirm("Tornar este vendedor um MEMBRO do sistema (login + permissão de leads)?")) return;
    try {
      await supabase.from("user_roles").insert({ user_id: userId, role: "viewer" });
      await supabase.from("user_permissions").insert({ user_id: userId, permission: "manage_leads" });
      toast.success("Agora é membro do sistema!");
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao tornar membro");
    }
  };

  const pendingApps = applications.filter(a => a.status === "pendente");
  const reviewedApps = applications.filter(a => a.status !== "pendente").slice(0, 10);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary">Usuários & permissões</h1><p className="text-muted-foreground">Convide pessoas e personalize o que cada uma pode fazer</p></div>
        <div className="flex gap-2">
          <Button onClick={openCreate} variant="hero"><UserPlus className="size-4" /> Novo usuário</Button>
          <Button onClick={()=>setOpen(true)} variant="outline"><Mail className="size-4" /> Convidar por e-mail</Button>
        </div>
      </div>

      {/* Candidaturas de vendedor */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <UserCheck className="size-5" /> Candidaturas a vendedor
            {pendingApps.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingApps.length}
              </span>
            )}
          </h2>
          <Button size="sm" variant="outline" onClick={copySellerLink}>
            <Link2 className="size-4" /> Copiar link público
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Link para divulgar: <span className="font-mono">{window.location.origin}/seja-vendedor</span>
        </p>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {pendingApps.length === 0 && reviewedApps.length === 0 && (
            <p className="p-6 text-center text-muted-foreground text-sm">Nenhuma candidatura recebida ainda.</p>
          )}
          {pendingApps.map(a => (
            <div key={a.id} className="p-4 grid md:grid-cols-[1fr_auto] gap-3 items-start">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-primary">{a.full_name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">pendente</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.email} · {a.whatsapp}
                  {a.city && <> · {a.city}{a.state ? `/${a.state}` : ""}</>}
                  {a.instagram && <> · IG: {a.instagram}</>}
                </p>
                {a.pix_key && <p className="text-xs text-muted-foreground mt-1">Pix: <span className="font-mono">{a.pix_key}</span></p>}
                {a.motivation && <p className="text-sm mt-2"><strong>Motivação:</strong> {a.motivation}</p>}
                {a.experience && <p className="text-sm mt-1"><strong>Experiência:</strong> {a.experience}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">Recebida em {new Date(a.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex gap-2 md:flex-col">
                <Button size="sm" variant="hero" onClick={() => approveApplication(a.id)} disabled={appBusyId === a.id}>
                  <Check className="size-4" /> {appBusyId === a.id ? "Aprovando…" : "Aprovar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectApplication(a.id)}>
                  <X className="size-4" /> Rejeitar
                </Button>
              </div>
            </div>
          ))}
          {reviewedApps.map(a => (
            <div key={a.id} className="p-3 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${a.status === "aprovado" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{a.status}</span>
                <span className="font-medium">{a.full_name}</span>
                <span className="text-xs text-muted-foreground">{a.email}</span>
                {a.status === "aprovado" && a.approved_user_id && (() => {
                  const u = users.find(x => x.user_id === a.approved_user_id);
                  const isMember = !!u && (u.roles?.length ?? 0) > 0;
                  return isMember
                    ? <Badge variant="secondary" className="text-[10px]">membro</Badge>
                    : <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">não-membro</Badge>;
                })()}
              </div>
              <div className="flex items-center gap-1">
                {a.status === "aprovado" && a.approved_user_id && (() => {
                  const u = users.find(x => x.user_id === a.approved_user_id);
                  const isMember = !!u && (u.roles?.length ?? 0) > 0;
                  if (isMember) return null;
                  return (
                    <Button size="sm" variant="hero" onClick={() => makeMember(a.approved_user_id)}>
                      <UserCheck className="size-4" /> Tornar membro
                    </Button>
                  );
                })()}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteApplication(a.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-primary">Membros</h2>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar nome, email, nº…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-56" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {users
            .filter(u => u.roles.length > 0)
            .filter(u => statusFilter === "todos" ? true : (u.status || "ativo") === statusFilter)
            .filter(u => {
              if (!search.trim()) return true;
              const q = search.toLowerCase();
              return (u.display_name || "").toLowerCase().includes(q)
                || (u.email || "").toLowerCase().includes(q)
                || (u.username || "").toLowerCase().includes(q);
            })
            .map(u => (
            <div key={u.id} className={`p-4 grid md:grid-cols-[1fr_200px_auto] gap-4 items-start ${u.status === "inativo" ? "opacity-60" : ""}`}>
              <div className="cursor-pointer" onClick={()=>openDetail(u)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-semibold">nº {u.username || "—"}</span>
                  <p className="font-medium text-primary hover:underline">{u.display_name || u.email}</p>
                  {u.role_key && (() => {
                    const def = roleDefs.find(r => r.key === u.role_key);
                    return def ? <Badge variant="secondary" className="text-[10px]">{def.label}</Badge> : null;
                  })()}
                  {u.status === "inativo" && <Badge variant="outline" className="text-[10px] border-destructive text-destructive">inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>Login: <span className="font-mono">{u.email}</span></span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openAccess(u); }}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    title="Copiar acesso"
                  >
                    <Copy className="size-3" /> Copiar acesso
                  </button>
                  {u.phone1 && <span>· {u.phone1}</span>}
                  {u.city && <span>· {u.city}{u.state ? `/${u.state}` : ""}</span>}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {PERMS.map(p => {
                    const has = u.permissions.includes(p.id) || u.roles.includes("super_admin");
                    const locked = u.roles.includes("super_admin");
                    return (
                      <label key={p.id} title={p.desc} onClick={(e)=>e.stopPropagation()} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${has ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"} ${locked ? "opacity-60" : "cursor-pointer"}`}>
                        <Checkbox checked={has} disabled={locked} onCheckedChange={()=>togglePerm(u.user_id, p.id, has)} />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div onClick={(e)=>e.stopPropagation()}>
                <Select
                  value={u.role_key || (u.roles.includes("super_admin") ? "super_admin" : (u.roles[0] === "admin" ? "admin" : u.roles[0] === "editor" ? "editor" : "viewer"))}
                  onValueChange={(v) => applyRoleKey(u.user_id, v)}
                  disabled={!isSuperAdmin || u.roles.includes("super_admin")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleDefs.map(r => (
                      <SelectItem key={r.key} value={r.key} disabled={r.key === "super_admin" && !u.roles.includes("super_admin")}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1" onClick={(e)=>e.stopPropagation()}>
                <Button size="sm" variant="ghost" title={u.status === "inativo" ? "Reativar" : "Inativar"} onClick={() => toggleStatus(u)} disabled={u.roles.includes("super_admin")}>
                  <Power className={`size-4 ${u.status === "inativo" ? "text-muted-foreground" : "text-emerald-600"}`} />
                </Button>
                <Button size="sm" variant="ghost" title="Remover acesso" className="text-amber-600" onClick={()=>removeUser(u.user_id)} disabled={u.roles.includes("super_admin")}>
                  <Shield className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" title="Excluir permanente" className="text-destructive" onClick={()=>deleteUser(u.user_id)} disabled={u.roles.includes("super_admin")}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {users.filter(u=>u.roles.length>0).length===0 && <p className="p-6 text-center text-muted-foreground">Nenhum membro ainda.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-primary mb-3">Convites pendentes</h2>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {invites.map(i => (
            <div key={i.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{i.email}</p>
                <p className="text-xs text-muted-foreground">{i.role} · {(i.permissions ?? []).length} permissões · expira {new Date(i.expires_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>copyLink(i.token)}><Copy className="size-4" /> Link</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={()=>removeInvite(i.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
          {invites.length===0 && <p className="p-6 text-center text-muted-foreground">Sem convites pendentes.</p>}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="pessoa@empresa.com" /></div>
            <div>
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v)=>setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Permissões específicas</Label>
              <div className="space-y-2">
                {PERMS.map(p => (
                  <label key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/40 cursor-pointer">
                    <Checkbox checked={perms.includes(p.id)} onCheckedChange={(v)=>setPerms(v ? [...perms, p.id] : perms.filter(x=>x!==p.id))} />
                    <div><p className="font-medium text-sm">{p.label}</p><p className="text-xs text-muted-foreground">{p.desc}</p></div>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground flex gap-2"><Mail className="size-4 shrink-0 mt-0.5" /> Ao criar conta com este e-mail, o usuário receberá automaticamente as permissões marcadas.</div>
            <Button onClick={invite} variant="hero" className="w-full">Criar convite</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Novo usuário (cadastro completo) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Novo usuário {nextUsername && <span className="text-muted-foreground font-normal text-base">· nº {nextUsername}</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-[2fr_1fr_1fr_1.5fr] gap-3">
              <div><Label>Nome <span className="text-destructive">*</span></Label><Input value={form.full_name} onChange={e=>setF("full_name", e.target.value)} /></div>
              <div><Label>Fone 1</Label><Input value={form.phone1} onChange={e=>setF("phone1", e.target.value)} /></div>
              <div><Label>Fone 2</Label><Input value={form.phone2} onChange={e=>setF("phone2", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e=>setF("email", e.target.value)} /></div>
            </div>

            <div className="grid md:grid-cols-6 gap-3">
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e=>setF("cpf", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={form.rg} onChange={e=>setF("rg", e.target.value)} /></div>
              <div><Label>CEP</Label><Input value={form.cep} onChange={e=>setF("cep", e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Rua</Label><Input value={form.street} onChange={e=>setF("street", e.target.value)} /></div>
              <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={e=>setF("neighborhood", e.target.value)} /></div>
            </div>

            <div className="grid md:grid-cols-6 gap-3">
              <div className="md:col-span-2"><Label>Cidade</Label><Input value={form.city} onChange={e=>setF("city", e.target.value)} /></div>
              <div><Label>Estado</Label><Input maxLength={2} value={form.state} onChange={e=>setF("state", e.target.value.toUpperCase())} /></div>
              <div><Label>Número</Label><Input value={form.address_number} onChange={e=>setF("address_number", e.target.value)} /></div>
              <div><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={e=>setF("birth_date", e.target.value)} /></div>
              <div><Label>Idade</Label><Input value={idade} readOnly className="bg-muted" /></div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div><Label>Senha <span className="text-destructive">*</span></Label><Input type="text" value={form.password} onChange={e=>setF("password", e.target.value)} placeholder="mín. 4 caracteres" /></div>
              <div>
                <Label>Tipo de acesso <span className="text-destructive">*</span></Label>
                <Select value={form.role_key} onValueChange={(v)=>setF("role_key", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleDefs.filter(r => r.key !== "super_admin").map(r => (
                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Responsável</Label><Input value={form.responsible_name} onChange={e=>setF("responsible_name", e.target.value)} /></div>
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              <div><Label>RG Responsável</Label><Input value={form.responsible_rg} onChange={e=>setF("responsible_rg", e.target.value)} /></div>
              <div><Label>CPF Responsável</Label><Input value={form.responsible_cpf} onChange={e=>setF("responsible_cpf", e.target.value)} /></div>
              <div>
                <Label>Sexo</Label>
                <Select value={form.sex || undefined} onValueChange={(v)=>setF("sex", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Polo</Label><Input value={form.polo} onChange={e=>setF("polo", e.target.value)} placeholder="Ex: Multplick Business - SP" /></div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={e=>setF("notes", e.target.value)} placeholder="Observações..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setCreateOpen(false)}>Cancelar</Button>
              <Button variant="hero" onClick={createUser} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhes do usuário */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do usuário
              {detail?.username && <span className="text-muted-foreground font-normal text-base"> · nº {detail.username}</span>}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                <strong>Login:</strong> <span className="font-mono">{detail.email}</span> · use este e-mail e a senha cadastrada para entrar.
              </div>

              <div className="grid md:grid-cols-[2fr_1fr_1fr_1.5fr] gap-3">
                <div><Label>Nome</Label><Input value={detail.display_name || ""} onChange={e=>setD("display_name", e.target.value)} /></div>
                <div><Label>Fone 1</Label><Input value={detail.phone1 || ""} onChange={e=>setD("phone1", e.target.value)} /></div>
                <div><Label>Fone 2</Label><Input value={detail.phone2 || ""} onChange={e=>setD("phone2", e.target.value)} /></div>
                <div><Label>nº usuário</Label><Input value={detail.username || ""} readOnly className="bg-muted font-mono" /></div>
              </div>

              <div className="grid md:grid-cols-6 gap-3">
                <div><Label>CPF</Label><Input value={detail.cpf || ""} onChange={e=>setD("cpf", e.target.value)} /></div>
                <div><Label>RG</Label><Input value={detail.rg || ""} onChange={e=>setD("rg", e.target.value)} /></div>
                <div><Label>CEP</Label><Input value={detail.cep || ""} onChange={e=>setD("cep", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Rua</Label><Input value={detail.street || ""} onChange={e=>setD("street", e.target.value)} /></div>
                <div><Label>Bairro</Label><Input value={detail.neighborhood || ""} onChange={e=>setD("neighborhood", e.target.value)} /></div>
              </div>

              <div className="grid md:grid-cols-6 gap-3">
                <div className="md:col-span-2"><Label>Cidade</Label><Input value={detail.city || ""} onChange={e=>setD("city", e.target.value)} /></div>
                <div><Label>Estado</Label><Input maxLength={2} value={detail.state || ""} onChange={e=>setD("state", e.target.value.toUpperCase())} /></div>
                <div><Label>Número</Label><Input value={detail.address_number || ""} onChange={e=>setD("address_number", e.target.value)} /></div>
                <div><Label>Data nasc.</Label><Input type="date" value={detail.birth_date || ""} onChange={e=>setD("birth_date", e.target.value)} /></div>
                <div><Label>Idade</Label><Input value={detailIdade} readOnly className="bg-muted" /></div>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <div><Label>Responsável</Label><Input value={detail.responsible_name || ""} onChange={e=>setD("responsible_name", e.target.value)} /></div>
                <div><Label>RG Resp.</Label><Input value={detail.responsible_rg || ""} onChange={e=>setD("responsible_rg", e.target.value)} /></div>
                <div><Label>CPF Resp.</Label><Input value={detail.responsible_cpf || ""} onChange={e=>setD("responsible_cpf", e.target.value)} /></div>
                <div>
                  <Label>Sexo</Label>
                  <Select value={detail.sex || undefined} onValueChange={(v)=>setD("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Polo</Label><Input value={detail.polo || ""} onChange={e=>setD("polo", e.target.value)} /></div>
                <div><Label>Tipo de acesso</Label><Input value={detail.roles?.[0] || "viewer"} readOnly className="bg-muted" /></div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea rows={3} value={detail.notes || ""} onChange={e=>setD("notes", e.target.value)} />
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/30">
                <Label className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" /> Alterar senha</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 4 caracteres)"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={resetPassword} disabled={resetting || newPassword.length < 4}>
                    {resetting ? "Salvando…" : "Redefinir senha"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">A nova senha substitui a atual imediatamente. Informe ao usuário.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={()=>setDetailOpen(false)}>Fechar</Button>
                  <Button variant="hero" onClick={saveDetail} disabled={detailSaving}>{detailSaving ? "Salvando…" : "Salvar"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credenciais geradas após aprovação */}
      <Dialog open={!!credsDialog} onOpenChange={(v) => !v && setCredsDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vendedor aprovado!</DialogTitle></DialogHeader>
          {credsDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Envie estas credenciais ao novo vendedor (ele entra em <span className="font-mono">/aluno/login</span>):
              </p>
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2 font-mono text-sm">
                <div><strong>Usuário:</strong> {credsDialog.username}</div>
                <div><strong>Senha:</strong> {credsDialog.password}</div>
                <div><strong>Código de afiliado:</strong> {credsDialog.code}</div>
              </div>
              <Button
                variant="hero"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Bem-vindo à Multplick! 🎉\n\nSeu acesso de vendedor:\nUsuário: ${credsDialog.username}\nSenha: ${credsDialog.password}\nSeu código: ${credsDialog.code}\n\nEntre em ${window.location.origin}/aluno/login`,
                  );
                  toast.success("Mensagem copiada!");
                }}
              >
                <Copy className="size-4" /> Copiar mensagem para WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Copiar acesso */}
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copiar acesso do usuário</DialogTitle></DialogHeader>
          {accessRow && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <p><strong>Usuário:</strong> {accessRow.display_name || "—"}</p>
                <p><strong>Login:</strong> <span className="font-mono">{accessRow.username}</span></p>
              </div>
              <div>
                <Label>Senha (será redefinida ao copiar)</Label>
                <div className="flex gap-2">
                  <Input value={accessPw} onChange={e=>setAccessPw(e.target.value)} />
                  <Button type="button" variant="outline" onClick={()=>setAccessPw(rndPw())}>Gerar</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ao clicar em "Salvar e copiar", a senha será redefinida e o texto pronto (login, senha e link) será copiado.
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
    </div>
  );
};
const AdminUsuarios = () => <RequirePermission perm="manage_users"><AdminUsuariosInner /></RequirePermission>;
export default AdminUsuarios;
