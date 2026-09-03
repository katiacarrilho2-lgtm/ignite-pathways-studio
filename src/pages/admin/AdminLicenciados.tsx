import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useCommercialAccounts from "@/hooks/useCommercialAccounts";
import useRedeStats from "@/hooks/useRedeStats";
import { ROOT_ACCOUNT_ID } from "@/lib/multiAccount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/multplick-logo.png";
import {
  Building2, Users, Inbox, ClipboardList, GraduationCap, Search, Plus, Eye, Pencil,
  Power, ArrowRight, Network, DollarSign, FileSpreadsheet, Scale, Images, LifeBuoy, Trophy,
} from "lucide-react";

export type Unidade = {
  id: string;
  nome: string;
  slug: string | null;
  tipo_da_conta: string | null;
  status: string | null;
  nome_fantasia: string | null;
  responsavel_nome: string | null;
  responsavel_user_id: string | null;
  documento_fiscal: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  cep: string | null;
  data_ativacao: string | null;
  observacoes: string | null;
  taxa_implantacao_cents: number | null;
  nome_publico: string | null;
  email_institucional: string | null;
  logo_url: string | null;
  modelo_fachada: string | null;
  identidade_observacoes: string | null;
  criado_em: string | null;
};

export const TIPOS = [
  { value: "revendedor", label: "Revendedor Multplick", taxa: 0 },
  { value: "licenciado", label: "Licenciado / Polo Multplick", taxa: 20000 },
  { value: "matriz", label: "Matriz Multplick", taxa: 0 },
];
export const STATUS = [
  { value: "em_implantacao", label: "Em implantação", cls: "bg-amber-100 text-amber-700" },
  { value: "ativo", label: "Ativo", cls: "bg-emerald-100 text-emerald-700" },
  { value: "inativo", label: "Inativo", cls: "bg-muted text-muted-foreground" },
  { value: "bloqueado", label: "Bloqueado", cls: "bg-destructive/10 text-destructive" },
];
export const tipoLabel = (v?: string | null) => TIPOS.find((t) => t.value === v)?.label ?? (v ?? "—");
export const statusInfo = (v?: string | null) => STATUS.find((s) => s.value === v) ?? { value: v ?? "", label: v ?? "—", cls: "bg-muted text-muted-foreground" };
export const brl = (cents?: number | null) => ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBr = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

const centrais = [
  { title: "Visão Geral da Rede", desc: "Resumo e desempenho das unidades Multplick.", icon: Network, ready: true },
  { title: "Unidades e Licenciados", desc: "Cadastro e administração dos Polos e Revendedores.", icon: Building2, ready: true },
  { title: "Matrículas da Rede", desc: "Pré-matrículas e matrículas por unidade.", icon: GraduationCap, ready: true, to: "/admin/pre-matriculas" },
  { title: "Suporte da Rede", desc: "Chamados abertos pelas unidades.", icon: LifeBuoy, ready: true, to: "/admin/suporte" },
  { title: "Treinamentos", desc: "Capacitação de licenciados e equipes.", icon: Trophy, ready: true, to: "/admin/treinamentos" },
  { title: "Financeiro da Rede", desc: "Faturamento e repasses dos licenciados.", icon: DollarSign, ready: false },
  { title: "Fechamentos e NF", desc: "Fechamento mensal por unidade e notas fiscais.", icon: FileSpreadsheet, ready: false },
  { title: "Regras Comerciais", desc: "Taxas, comissões e políticas da Rede.", icon: Scale, ready: false },
  { title: "Criativos da Rede", desc: "Materiais aprovados para os Polos.", icon: Images, ready: false },
];

const emptyForm = (): Partial<Unidade> => ({
  nome: "", tipo_da_conta: "licenciado", status: "em_implantacao", taxa_implantacao_cents: 20000,
});

export default function AdminLicenciados() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const { homeAccountId, canSwitchAccount, setActiveAccountId, reload: reloadAccounts } = useCommercialAccounts();
  const { statsFor, reload: reloadStats } = useRedeStats();

  const [units, setUnits] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fUf, setFUf] = useState("todos");
  const [fCidade, setFCidade] = useState("todas");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Unidade>>(emptyForm());
  const [criarUsuario, setCriarUsuario] = useState(false);
  const [respLogin, setRespLogin] = useState({ nome: "", senha: "", cargo: "responsavel" });

  const isNetworkMaster = isSuperAdmin && homeAccountId === ROOT_ACCOUNT_ID;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("contas_comerciais").select("*").order("nome");
    if (error) toast({ title: "Erro ao carregar unidades", description: error.message, variant: "destructive" });
    setUnits((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const ufs = useMemo(() => Array.from(new Set(units.map((u) => u.estado).filter(Boolean))) as string[], [units]);
  const cidades = useMemo(
    () => Array.from(new Set(units.filter((u) => fUf === "todos" || u.estado === fUf).map((u) => u.cidade).filter(Boolean))) as string[],
    [units, fUf],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return units.filter((u) => {
      if (fTipo !== "todos" && u.tipo_da_conta !== fTipo) return false;
      if (fStatus !== "todos" && u.status !== fStatus) return false;
      if (fUf !== "todos" && u.estado !== fUf) return false;
      if (fCidade !== "todas" && u.cidade !== fCidade) return false;
      if (!term) return true;
      return [u.nome, u.nome_fantasia, u.responsavel_nome, u.cidade].some((v) => (v ?? "").toLowerCase().includes(term));
    });
  }, [units, q, fTipo, fStatus, fUf, fCidade]);

  const kpis = useMemo(() => {
    const polos = units.filter((u) => u.tipo_da_conta !== "matriz");
    const tot = (f: (u: Unidade) => boolean) => polos.filter(f).length;
    const sem = polos.filter((u) => {
      const s = statsFor(u.id);
      return s.leads === 0 && s.preMatriculas === 0 && s.matriculas === 0;
    }).length;
    const soma = (k: "usuarios" | "leads" | "preMatriculas" | "matriculas") =>
      units.reduce((acc, u) => acc + statsFor(u.id)[k], 0);
    return {
      unidades: polos.length,
      licenciados: tot((u) => u.tipo_da_conta === "licenciado"),
      revendedores: tot((u) => u.tipo_da_conta === "revendedor"),
      ativos: tot((u) => u.status === "ativo"),
      inativos: tot((u) => u.status === "inativo" || u.status === "bloqueado"),
      implantacao: tot((u) => u.status === "em_implantacao"),
      semAtividade: sem,
      usuarios: soma("usuarios"),
      leads: soma("leads"),
      pre: soma("preMatriculas"),
      matriculas: soma("matriculas"),
    };
  }, [units, statsFor]);

  const openNew = () => { setForm(emptyForm()); setCriarUsuario(false); setRespLogin({ nome: "", senha: "", cargo: "responsavel" }); setOpen(true); };
  const openEdit = (u: Unidade) => { setForm({ ...u }); setCriarUsuario(false); setOpen(true); };

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

  const save = async () => {
    if (!form.nome?.trim()) { toast({ title: "Informe o nome da unidade", variant: "destructive" }); return; }
    setSaving(true);
    const payload: any = {
      nome: form.nome.trim(),
      nome_fantasia: form.nome_fantasia || null,
      tipo_da_conta: form.tipo_da_conta || "licenciado",
      status: form.status || "em_implantacao",
      responsavel_nome: form.responsavel_nome || null,
      documento_fiscal: form.documento_fiscal || null,
      email_contato: form.email_contato || null,
      telefone_contato: form.telefone_contato || null,
      whatsapp: form.whatsapp || null,
      cidade: form.cidade || null,
      estado: form.estado ? String(form.estado).toUpperCase().slice(0, 2) : null,
      endereco: form.endereco || null,
      cep: form.cep || null,
      data_ativacao: form.data_ativacao || null,
      observacoes: form.observacoes || null,
      taxa_implantacao_cents: Number(form.taxa_implantacao_cents ?? 0),
      nome_publico: form.nome_publico || null,
      email_institucional: form.email_institucional || null,
      logo_url: form.logo_url || null,
      modelo_fachada: form.modelo_fachada || null,
      identidade_observacoes: form.identidade_observacoes || null,
    };

    let unitId = form.id;
    if (unitId) {
      const { error } = await supabase.from("contas_comerciais").update(payload).eq("id", unitId);
      if (error) { setSaving(false); toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    } else {
      payload.slug = `${slugify(payload.nome)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("contas_comerciais").insert(payload).select("id").single();
      if (error || !data) { setSaving(false); toast({ title: "Erro ao criar unidade", description: error?.message, variant: "destructive" }); return; }
      unitId = data.id;
    }

    if (criarUsuario && unitId) {
      if (!respLogin.senha || respLogin.senha.length < 4) {
        setSaving(false);
        toast({ title: "Defina uma senha para o responsável", variant: "destructive" });
        return;
      }
      const { data: res, error: fnErr } = await supabase.functions.invoke("admin-create-user", {
        body: {
          password: respLogin.senha,
          full_name: respLogin.nome || form.responsavel_nome || `Responsável ${payload.nome}`,
          role: respLogin.cargo === "vendedor" ? "viewer" : "admin",
          account_id: unitId, // validado no backend — o cliente nunca decide sozinho
          city: payload.cidade, state: payload.estado, polo: payload.nome,
        },
      });
      if (fnErr || (res as any)?.error) {
        toast({ title: "Unidade salva, mas o usuário falhou", description: fnErr?.message ?? (res as any)?.error, variant: "destructive" });
      } else {
        await supabase.from("contas_comerciais").update({ responsavel_user_id: (res as any).user_id }).eq("id", unitId);
        toast({ title: `Responsável criado: login ${(res as any).username}` });
      }
    }

    setSaving(false);
    setOpen(false);
    await Promise.all([load(), reloadStats(), reloadAccounts()]);
    toast({ title: "Unidade salva" });
  };

  const toggleStatus = async (u: Unidade) => {
    const novo = u.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase
      .from("contas_comerciais")
      .update({ status: novo, data_ativacao: novo === "ativo" && !u.data_ativacao ? new Date().toISOString().slice(0, 10) : u.data_ativacao })
      .eq("id", u.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const verComoPolo = async (u: Unidade) => {
    await setActiveAccountId(u.id);
    toast({ title: `Visualizando ${u.nome}`, description: "Use o aviso no topo para voltar à visão global." });
  };

  const kpiCards = [
    { label: "Total de Unidades", value: kpis.unidades, icon: Building2 },
    { label: "Licenciados", value: kpis.licenciados, icon: Network },
    { label: "Revendedores", value: kpis.revendedores, icon: Users },
    { label: "Ativos", value: kpis.ativos, icon: Power },
    { label: "Em implantação", value: kpis.implantacao, icon: ClipboardList },
    { label: "Inativos / bloqueados", value: kpis.inativos, icon: Power },
    { label: "Polos sem atividade", value: kpis.semAtividade, icon: Inbox },
    { label: "Usuários da Rede", value: kpis.usuarios, icon: Users },
    { label: "Leads da Rede", value: kpis.leads, icon: Inbox },
    { label: "Pré-matrículas da Rede", value: kpis.pre, icon: ClipboardList },
    { label: "Matrículas da Rede", value: kpis.matriculas, icon: GraduationCap },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <img src={logo} alt="Multplick" className="h-9 w-auto" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Rede Multplick</h1>
          <p className="text-muted-foreground max-w-2xl">Gestão de Revendedores, Licenciados e Polos Multplick.</p>
        </div>
        <Button onClick={openNew}><Plus className="size-4" /> Nova unidade</Button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-border/70">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <k.icon className="size-3.5" /> <span className="truncate">{k.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1 tabular-nums">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Filtros */}
      <section className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por unidade, responsável ou cidade" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fTipo} onValueChange={setFTipo}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fUf} onValueChange={(v) => { setFUf(v); setFCidade("todas"); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Estado</SelectItem>
            {ufs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fCidade} onValueChange={setFCidade}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Cidade</SelectItem>
            {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </section>

      {/* Listagem */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Unidades da Rede</CardTitle>
          <CardDescription>{filtered.length} unidade(s) listada(s)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Unidade</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Responsável</th>
                <th className="py-2 pr-3">Cidade/UF</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Usuários</th>
                <th className="py-2 pr-3 text-right">Leads</th>
                <th className="py-2 pr-3 text-right">Pré-mat.</th>
                <th className="py-2 pr-3 text-right">Matrículas</th>
                <th className="py-2 pr-3">Última atividade</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">Nenhuma unidade encontrada.</td></tr>
              )}
              {filtered.map((u) => {
                const s = statsFor(u.id);
                const st = statusInfo(u.status);
                return (
                  <tr key={u.id} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="py-2 pr-3 font-medium">
                      <Link to={`/admin/licenciados/${u.id}`} className="hover:underline">{u.nome}</Link>
                      {u.nome_fantasia && <span className="block text-xs text-muted-foreground">{u.nome_fantasia}</span>}
                    </td>
                    <td className="py-2 pr-3">{tipoLabel(u.tipo_da_conta)}</td>
                    <td className="py-2 pr-3">{u.responsavel_nome ?? "—"}</td>
                    <td className="py-2 pr-3">{u.cidade ? `${u.cidade}/${u.estado ?? ""}` : "—"}</td>
                    <td className="py-2 pr-3"><span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span></td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.usuarios}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.leads}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.preMatriculas}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.matriculas}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{dataBr(s.ultimaAtividade)}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" title="Ver unidade"><Link to={`/admin/licenciados/${u.id}`}><Eye className="size-4" /></Link></Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" title={u.status === "ativo" ? "Inativar" : "Ativar"} onClick={() => toggleStatus(u)}><Power className="size-4" /></Button>
                        {canSwitchAccount && u.id !== homeAccountId && (
                          <Button size="sm" variant="outline" onClick={() => verComoPolo(u)}>Visualizar como Polo</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Central da Rede */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Central da Rede</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {centrais.map((c) => (
            <Card key={c.title} className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><c.icon className="size-5" /></div>
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${c.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {c.ready ? "Disponível" : "Próxima etapa"}
                  </span>
                </div>
                <CardTitle className="mt-3 text-base">{c.title}</CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              {c.to && (
                <CardContent>
                  <Button asChild variant="outline" className="w-full"><Link to={c.to}>Abrir <ArrowRight className="size-4" /></Link></Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Cadastro */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar unidade" : "Nova unidade da Rede"}</DialogTitle></DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.tipo_da_conta ?? "licenciado"}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo_da_conta: v, taxa_implantacao_cents: f.id ? f.taxa_implantacao_cents : TIPOS.find((t) => t.value === v)?.taxa ?? 0 }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status ?? "em_implantacao"} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Nome da unidade *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Polo Três Lagoas" /></div>
            <div className="space-y-1.5"><Label>Nome fantasia</Label><Input value={form.nome_fantasia ?? ""} onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Responsável</Label><Input value={form.responsavel_nome ?? ""} onChange={(e) => setForm((f) => ({ ...f, responsavel_nome: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>CPF/CNPJ</Label><Input value={form.documento_fiscal ?? ""} onChange={(e) => setForm((f) => ({ ...f, documento_fiscal: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email_contato ?? ""} onChange={(e) => setForm((f) => ({ ...f, email_contato: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Telefone / WhatsApp</Label><Input value={form.whatsapp ?? form.telefone_contato ?? ""} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value, telefone_contato: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade ?? ""} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Estado (UF)</Label><Input maxLength={2} value={form.estado ?? ""} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase() }))} /></div>
            <div className="space-y-1.5"><Label>Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>CEP</Label><Input value={form.cep ?? ""} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Data de ativação</Label><Input type="date" value={form.data_ativacao ?? ""} onChange={(e) => setForm((f) => ({ ...f, data_ativacao: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Taxa de implantação (R$)</Label>
              <Input type="number" step="0.01" value={((form.taxa_implantacao_cents ?? 0) / 100).toString()}
                onChange={(e) => setForm((f) => ({ ...f, taxa_implantacao_cents: Math.round(Number(e.target.value || 0) * 100) }))} />
              <p className="text-xs text-muted-foreground">Sugestão: Revendedor R$ 0 · Licenciado/Polo R$ 200. Valor configurável.</p>
            </div>
            <div className="md:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="font-semibold text-sm">Identidade do Polo</h3>
            <p className="text-xs text-muted-foreground">A marca principal é sempre a <strong>Multplick</strong>. O logo abaixo é apenas complementar e não substitui a marca.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome público da unidade</Label><Input value={form.nome_publico ?? ""} onChange={(e) => setForm((f) => ({ ...f, nome_publico: e.target.value }))} placeholder="Multplick Três Lagoas" /></div>
              <div className="space-y-1.5"><Label>E-mail institucional</Label><Input value={form.email_institucional ?? ""} onChange={(e) => setForm((f) => ({ ...f, email_institucional: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Logo complementar (URL)</Label><Input value={form.logo_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Modelo de fachada</Label><Input value={form.modelo_fachada ?? ""} onChange={(e) => setForm((f) => ({ ...f, modelo_fachada: e.target.value }))} /></div>
              <div className="md:col-span-2 space-y-1.5"><Label>Observações de identidade</Label><Textarea rows={2} value={form.identidade_observacoes ?? ""} onChange={(e) => setForm((f) => ({ ...f, identidade_observacoes: e.target.value }))} /></div>
            </div>
          </div>

          {!form.id && (
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Criar usuário responsável</h3>
                  <p className="text-xs text-muted-foreground">O login é vinculado automaticamente à unidade criada.</p>
                </div>
                <Switch checked={criarUsuario} onCheckedChange={setCriarUsuario} disabled={!isNetworkMaster} />
              </div>
              {criarUsuario && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>Nome do responsável</Label><Input value={respLogin.nome} onChange={(e) => setRespLogin((r) => ({ ...r, nome: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Senha inicial</Label><Input type="text" value={respLogin.senha} onChange={(e) => setRespLogin((r) => ({ ...r, senha: e.target.value }))} /></div>
                  <div className="space-y-1.5">
                    <Label>Tipo de usuário</Label>
                    <Select value={respLogin.cargo} onValueChange={(v) => setRespLogin((r) => ({ ...r, cargo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsavel">Responsável do Polo</SelectItem>
                        <SelectItem value="administrador">Administrador do Polo</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="secretaria">Secretaria</SelectItem>
                        <SelectItem value="pedagogico">Pedagógico</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">As permissões detalhadas continuam em Cargos (mod_*).</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar unidade"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
