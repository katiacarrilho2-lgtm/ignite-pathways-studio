import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Users, DollarSign, Link2, Copy, UserPlus, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Pencil } from "lucide-react";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";

type Affiliate = {
  id: string; user_id: string; code: string; commission_pct: number; status: string; pix_key: string | null;
  nome?: string; email?: string;
  total_ganho?: number; pendente?: number;
  account_id?: string | null;
  account_nome?: string | null;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Inner = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Affiliate[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new_seller" | "existing">("new_seller");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");
  const [pix, setPix] = useState("");
  const emptyNew = {
    full_name: "", email: "", whatsapp: "", cpf: "",
    city: "", state: "", instagram: "",
    experience: "", motivation: "",
  };
  const [novo, setNovo] = useState(emptyNew);
  const setN = (k: keyof typeof emptyNew, v: string) => setNovo(s => ({ ...s, [k]: v }));
  const [creds, setCreds] = useState<{ username: string; password: string; code: string } | null>(null);
  const [users, setUsers] = useState<{ user_id: string; display_name: string; email: string }[]>([]);
  const [detailFor, setDetailFor] = useState<Affiliate | null>(null);
  const [detailRows, setDetailRows] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, { installments: any[]; payouts: any[] } | undefined>>({});
  const [expandLoading, setExpandLoading] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Affiliate | null>(null);
  const [editPct, setEditPct] = useState("");
  const [editPix, setEditPix] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const openEdit = (a: Affiliate) => {
    setEditing(a);
    setEditPct(String(a.commission_pct ?? ""));
    setEditPix(a.pix_key ?? "");
    setEditCode(a.code ?? "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const pctNum = parseFloat(editPct);
    if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) return toast.error("% inválida (0–100)");
    setEditBusy(true);
    const { error } = await supabase.from("affiliates").update({
      commission_pct: pctNum,
      pix_key: editPix.trim() || null,
      code: editCode.trim().toUpperCase().slice(0, 30) || editing.code,
    }).eq("id", editing.id);
    setEditBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Afiliado atualizado. A nova % vale para próximas indicações.");
    setEditing(null);
    load();
  };

  const loadReferralDetail = async (referralId: string) => {
    setExpandLoading(s => ({ ...s, [referralId]: true }));
    const [{ data: inst }, { data: payouts }] = await Promise.all([
      supabase.rpc("get_affiliate_installments", { _referral_id: referralId }),
      supabase.from("affiliate_commission_payouts")
        .select("*").eq("referral_id", referralId).order("paid_at", { ascending: false }),
    ]);
    setExpanded(s => ({ ...s, [referralId]: { installments: (inst as any) ?? [], payouts: (payouts as any) ?? [] } }));
    setExpandLoading(s => ({ ...s, [referralId]: false }));
  };

  const toggleExpand = async (referralId: string) => {
    if (expanded[referralId]) {
      setExpanded(s => { const n = { ...s }; delete n[referralId]; return n; });
    } else {
      await loadReferralDetail(referralId);
    }
  };

  const registrarRepasse = async (r: any, tipo: "integral" | "fracionado") => {
    const earned = r.commission_cents ?? 0;
    const paid = (expanded[r.id]?.payouts ?? []).reduce((s: number, p: any) => s + (p.amount_cents ?? 0), 0);
    const remaining = Math.max(0, earned - paid);
    if (remaining <= 0) return toast.error("Nada a pagar — comissão já totalmente repassada.");
    let amountCents = remaining;
    if (tipo === "fracionado") {
      const raw = window.prompt(`Valor a repassar (em R$). Restante: ${brl(remaining)}`, (remaining / 100).toFixed(2).replace(".", ","));
      if (raw == null) return;
      const parsed = Math.round(parseFloat(raw.replace(",", ".")) * 100);
      if (!Number.isFinite(parsed) || parsed <= 0) return toast.error("Valor inválido");
      if (parsed > remaining) return toast.error(`Máximo permitido: ${brl(remaining)}`);
      amountCents = parsed;
    }
    const note = window.prompt("Observação (opcional) — ex: PIX enviado, referência…", "") ?? undefined;
    const { error } = await supabase.from("affiliate_commission_payouts").insert({
      referral_id: r.id,
      amount_cents: amountCents,
      note: note && note.trim() ? note.trim() : null,
      paid_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Repasse registrado. Aguardando confirmação do afiliado.");
    await loadReferralDetail(r.id);
  };

  const excluirRepasse = async (referralId: string, payoutId: string) => {
    if (!confirm("Excluir este repasse? Ele voltará ao saldo a pagar.")) return;
    const { error } = await supabase.from("affiliate_commission_payouts").delete().eq("id", payoutId);
    if (error) return toast.error(error.message);
    toast.success("Repasse removido");
    await loadReferralDetail(referralId);
  };

  const openDetails = async (a: Affiliate) => {
    setDetailFor(a);
    setDetailRows([]);
    setExpanded({});
    setDetailLoading(true);
    await reloadDetails(a);
    setDetailLoading(false);
  };

  const reloadDetails = async (a: Affiliate) => {
    const { data: refs } = await supabase
      .from("affiliate_referrals")
      .select("id, created_at, valor_cents, commission_cents, status, paid_at, enrollment_id, commission_paid_at, commission_confirmed_at, commission_note")
      .eq("affiliate_id", a.id)
      .order("created_at", { ascending: false });
    const enrIds = Array.from(new Set((refs ?? []).map((r: any) => r.enrollment_id).filter(Boolean)));
    let enrMap = new Map<string, any>();
    if (enrIds.length) {
      const { data: enrs } = await supabase
        .from("enrollments")
        .select("id, user_id, course_id, courses(title)")
        .in("id", enrIds);
      const userIds = Array.from(new Set((enrs ?? []).map((e: any) => e.user_id)));
      const [{ data: profs }, { data: sps }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds) : Promise.resolve({ data: [] } as any),
        userIds.length ? supabase.from("student_profiles").select("user_id, full_name").in("user_id", userIds) : Promise.resolve({ data: [] } as any),
      ]);
      const pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const spMap = new Map((sps ?? []).map((s: any) => [s.user_id, s]));
      enrMap = new Map((enrs ?? []).map((e: any) => {
        const p: any = pMap.get(e.user_id);
        const sp: any = spMap.get(e.user_id);
        return [e.id, {
          student_name: sp?.full_name || p?.display_name || p?.email || "Aluno",
          student_email: p?.email ?? null,
          course_title: e.courses?.title ?? null,
        }];
      }));
    }
    setDetailRows((refs ?? []).map((r: any) => ({ ...r, ...(enrMap.get(r.enrollment_id) ?? {}) })));
  };

  const load = async () => {
    const { data: affs } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
    const aIds = (affs ?? []).map((a: any) => a.id);
    const userIds = (affs ?? []).map((a: any) => a.user_id);
    const [{ data: profs }, { data: refs }, { data: membros }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds) : Promise.resolve({ data: [] } as any),
      aIds.length ? supabase.from("affiliate_referrals").select("affiliate_id, commission_cents, status").in("affiliate_id", aIds) : Promise.resolve({ data: [] } as any),
      userIds.length ? supabase
        .from("membros_da_conta")
        .select("user_id, account_id, account:contas_comerciais(nome, tipo_da_conta)")
        .in("user_id", userIds)
        .eq("status", "ativo") : Promise.resolve({ data: [] } as any),
    ]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const stats = new Map<string, { total: number; pendente: number }>();
    for (const r of (refs ?? []) as any[]) {
      const s = stats.get(r.affiliate_id) ?? { total: 0, pendente: 0 };
      if (r.status === "pago") s.total += r.commission_cents;
      else if (r.status === "pendente" || r.status === "liberado") s.pendente += r.commission_cents;
      stats.set(r.affiliate_id, s);
    }
    // B4: vínculo com conta comercial (apenas exibição quando disponível)
    const accMap = new Map<string, { id: string; nome: string }>();
    for (const m of (membros ?? []) as any[]) {
      if (m.account?.tipo_da_conta === "afiliado" && !accMap.has(m.user_id)) {
        accMap.set(m.user_id, { id: m.account_id, nome: m.account?.nome });
      }
    }
    setList((affs ?? []).map((a: any) => {
      const p: any = pMap.get(a.user_id);
      const s = stats.get(a.id) ?? { total: 0, pendente: 0 };
      const acc = accMap.get(a.user_id);
      return { ...a, nome: p?.display_name, email: p?.email, total_ganho: s.total, pendente: s.pendente, account_id: acc?.id ?? null, account_nome: acc?.nome ?? null };
    }));
  };
  useEffect(() => { load(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name, email").order("display_name").limit(500);
    setUsers((data as any) ?? []);
  };
  useEffect(() => { if (open) loadUsers(); }, [open]);

  const resetForm = () => {
    setUserId(""); setCode(""); setPct("10"); setPix(""); setNovo(emptyNew);
  };

  const create = async () => {
    setBusy(true);
    const payload: any = {
      mode: tab,
      commission_pct: parseFloat(pct) || 10,
      pix_key: pix.trim() || (tab === "new_seller" ? (novo as any).pix_key : null) || null,
      code: code.trim().toUpperCase().slice(0, 30) || undefined,
    };
    if (tab === "existing") {
      if (!userId) { setBusy(false); return toast.error("Selecione o usuário"); }
      payload.user_id = userId;
    } else {
      if (!novo.full_name || !novo.email || !novo.whatsapp) {
        setBusy(false); return toast.error("Nome, e-mail e WhatsApp são obrigatórios");
      }
      Object.assign(payload, novo, { state: novo.state.toUpperCase() });
    }
    const { data, error } = await supabase.functions.invoke("admin-create-affiliate", { body: payload });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Falha");
    toast.success("Afiliado cadastrado");
    if (tab === "new_seller" && (data as any)?.username) {
      setCreds({ username: (data as any).username, password: (data as any).password, code: (data as any).code });
    } else {
      setOpen(false);
    }
    resetForm();
    load();
  };

  const toggle = async (a: Affiliate) => {
    const novo = a.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("affiliates").update({ status: novo }).eq("id", a.id);
    if (error) return toast.error(error.message);
    load();
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Afiliados</h1>
          <p className="text-muted-foreground">Programa de indicações e comissões.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="size-4" /> Novo afiliado</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar afiliado</DialogTitle></DialogHeader>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="new_seller"><UserPlus className="size-4 mr-1" /> Cadastro completo + login</TabsTrigger>
                <TabsTrigger value="existing">Usuário existente</TabsTrigger>
              </TabsList>

              <TabsContent value="new_seller" className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  Preencha os dados completos. Será criado um login de vendedor (usuário + senha) e o vínculo de afiliado com código de indicação.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Nome completo *</Label><Input value={novo.full_name} onChange={e => setN("full_name", e.target.value)} /></div>
                  <div><Label>E-mail *</Label><Input type="email" value={novo.email} onChange={e => setN("email", e.target.value)} /></div>
                  <div><Label>WhatsApp *</Label><Input value={novo.whatsapp} onChange={e => setN("whatsapp", e.target.value)} placeholder="(11) 99999-9999" /></div>
                  <div><Label>CPF</Label><Input value={novo.cpf} onChange={e => setN("cpf", e.target.value)} /></div>
                </div>
                <div className="grid md:grid-cols-[2fr_1fr_1fr] gap-3">
                  <div><Label>Cidade</Label><Input value={novo.city} onChange={e => setN("city", e.target.value)} /></div>
                  <div><Label>UF</Label><Input value={novo.state} onChange={e => setN("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} /></div>
                  <div><Label>Instagram</Label><Input value={novo.instagram} onChange={e => setN("instagram", e.target.value)} placeholder="@usuario" /></div>
                </div>
                <div><Label>Experiência</Label><Textarea rows={2} value={novo.experience} onChange={e => setN("experience", e.target.value)} /></div>
                <div><Label>Motivação</Label><Textarea rows={2} value={novo.motivation} onChange={e => setN("motivation", e.target.value)} /></div>

                <div className="grid md:grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div><Label>Código (opcional)</Label><Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="auto" /></div>
                  <div><Label>% comissão</Label><Input type="number" value={pct} onChange={e => setPct(e.target.value)} /></div>
                  <div><Label>Chave Pix</Label><Input value={pix} onChange={e => setPix(e.target.value)} /></div>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-3 mt-4">
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name} ({u.email})</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Código (ex: JOAO10)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
                <Input placeholder="% de comissão" type="number" value={pct} onChange={e => setPct(e.target.value)} />
                <Input placeholder="Chave Pix (opcional)" value={pix} onChange={e => setPix(e.target.value)} />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button onClick={create} disabled={busy}>
                {busy ? "Salvando..." : tab === "new_seller" ? "Cadastrar como vendedor" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credenciais geradas */}
        <Dialog open={!!creds} onOpenChange={(o) => { if (!o) { setCreds(null); setOpen(false); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Vendedor cadastrado!</DialogTitle></DialogHeader>
            {creds && (() => {
              const msg = `Olá! Seu acesso Multplick:\nUsuário: ${creds.username}\nSenha: ${creds.password}\nCódigo de afiliado: ${creds.code}\nLink: ${window.location.origin}/auth`;
              return (
                <div className="space-y-3">
                  <div className="bg-secondary/40 rounded-lg p-3 text-sm space-y-1">
                    <p><strong>Usuário:</strong> {creds.username}</p>
                    <p><strong>Senha:</strong> {creds.password}</p>
                    <p><strong>Código afiliado:</strong> {creds.code}</p>
                  </div>
                  <Button className="w-full" onClick={() => { navigator.clipboard.writeText(msg); toast.success("Copiado para enviar no WhatsApp"); }}>
                    <Copy className="size-4" /> Copiar mensagem
                  </Button>
                  <p className="text-xs text-muted-foreground">Anote ou envie ao vendedor — a senha não será exibida novamente.</p>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">Afiliados ativos</p><Users className="size-5 text-primary" /></div><p className="text-2xl font-bold mt-1">{list.filter(a => a.status === "ativo").length}</p></div>
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">Comissões pagas</p><DollarSign className="size-5 text-emerald-600" /></div><p className="text-2xl font-bold mt-1">{brl(list.reduce((s, a) => s + (a.total_ganho ?? 0), 0))}</p></div>
        <div className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between"><p className="text-xs uppercase text-muted-foreground">Comissões pendentes</p><DollarSign className="size-5 text-amber-600" /></div><p className="text-2xl font-bold mt-1">{brl(list.reduce((s, a) => s + (a.pendente ?? 0), 0))}</p></div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase">
              <tr><th className="text-left p-3">Afiliado</th><th className="text-left p-3">Código</th><th className="text-right p-3">%</th><th className="text-right p-3">Pago</th><th className="text-right p-3">Pendente</th><th className="p-3">Status</th><th className="text-right p-3">Ações</th></tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum afiliado.</td></tr>}
              {list.map(a => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3"><p className="font-medium">{a.nome ?? "—"}</p><p className="text-xs text-muted-foreground">{a.email}</p></td>
                  <td className="p-3 font-mono text-xs">
                    {a.code}
                    {a.account_id && (
                      <div className="mt-1 text-[10px] font-sans text-muted-foreground" title={`Conta comercial: ${a.account_nome}`}>
                        ⌁ conta vinculada
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">{Number(a.commission_pct).toFixed(2)}%</td>
                  <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-medium">{brl(a.total_ganho ?? 0)}</td>
                  <td className="p-3 text-right text-amber-700 dark:text-amber-400">{brl(a.pendente ?? 0)}</td>
                  <td className="p-3 text-center"><Badge variant={a.status === "ativo" ? "default" : "secondary"}>{a.status}</Badge></td>
                  <td className="p-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(a.code)}><Link2 className="size-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openDetails(a)} title="Ver comissões"><Eye className="size-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)} title="Editar comissão / Pix"><Pencil className="size-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toggle(a)}>{a.status === "ativo" ? "Inativar" : "Ativar"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detailFor} onOpenChange={(o) => { if (!o) { setDetailFor(null); setDetailRows([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comissões de {detailFor?.nome ?? detailFor?.email ?? "afiliado"}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="p-6 text-center text-muted-foreground">Carregando…</p>
          ) : detailRows.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nenhuma venda registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase">
                  <tr>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Aluno</th>
                    <th className="text-left p-3">Curso</th>
                    <th className="text-right p-3">Venda</th>
                    <th className="text-right p-3">Comissão</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Comissão paga</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((r: any) => (
                    <Fragment key={r.id}>
                    <tr className="border-t border-border">
                      <td className="p-3">
                        <button className="inline-flex items-center gap-1 text-xs hover:text-primary" onClick={() => toggleExpand(r.id)}>
                          {expanded[r.id] ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </button>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{r.student_name ?? "—"}</p>
                        {r.student_email && <p className="text-xs text-muted-foreground">{r.student_email}</p>}
                      </td>
                      <td className="p-3">{r.course_title ?? "—"}</td>
                      <td className="p-3 text-right">{brl(r.valor_cents)}</td>
                      <td className="p-3 text-right font-medium text-primary">{brl(r.commission_cents)}</td>
                      <td className="p-3 text-center"><Badge variant={r.status === "pago" ? "default" : "secondary"}>{r.status}</Badge></td>
                      <td className="p-3 text-center text-xs">
                        {(() => {
                          const paid = (expanded[r.id]?.payouts ?? []).reduce((s: number, p: any) => s + (p.amount_cents ?? 0), 0);
                          const remaining = Math.max(0, (r.commission_cents ?? 0) - paid);
                          if (!expanded[r.id]) return <span className="text-muted-foreground">expandir p/ ver</span>;
                          return (
                            <div className="space-y-0.5">
                              <p className="text-emerald-700 dark:text-emerald-400">Pago: {brl(paid)}</p>
                              <p className="text-amber-700 dark:text-amber-400">Resta: {brl(remaining)}</p>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {r.commission_cents > 0 && (
                            <>
                              <Button size="sm" variant="hero" onClick={async () => { if (!expanded[r.id]) await loadReferralDetail(r.id); registrarRepasse(r, "integral"); }}>Integral</Button>
                              <Button size="sm" variant="outline" onClick={async () => { if (!expanded[r.id]) await loadReferralDetail(r.id); registrarRepasse(r, "fracionado"); }}>Fracionar</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded[r.id] && (
                      <tr className="bg-secondary/20">
                        <td colSpan={8} className="p-4">
                          {expandLoading[r.id] ? (
                            <p className="text-center text-xs text-muted-foreground">Carregando…</p>
                          ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Boletos / Parcelas</p>
                                <table className="w-full text-xs">
                                  <thead className="text-[10px] uppercase text-muted-foreground">
                                    <tr><th className="text-left py-1">#</th><th className="text-left py-1">Vencto</th><th className="text-right py-1">Valor</th><th className="text-center py-1">Status</th><th className="text-right py-1">Comissão</th></tr>
                                  </thead>
                                  <tbody>
                                    {expanded[r.id]!.installments.map((i: any) => (
                                      <tr key={i.id} className="border-t border-border/50">
                                        <td className="py-1">{i.numero}</td>
                                        <td className="py-1">{i.vencimento ? new Date(i.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                                        <td className="py-1 text-right">{brl(i.valor_cents)}</td>
                                        <td className="py-1 text-center">
                                          <Badge variant={i.status === "pago" ? "default" : "secondary"} className="text-[10px]">{i.status}</Badge>
                                        </td>
                                        <td className="py-1 text-right font-medium text-primary">
                                          {i.status === "pago" ? brl(i.commission_cents) : <span className="text-muted-foreground">—</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Repasses ao afiliado</p>
                                {expanded[r.id]!.payouts.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Nenhum repasse registrado.</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead className="text-[10px] uppercase text-muted-foreground">
                                      <tr><th className="text-left py-1">Data</th><th className="text-right py-1">Valor</th><th className="text-center py-1">Confirmado</th><th className="text-left py-1">Obs.</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                      {expanded[r.id]!.payouts.map((p: any) => (
                                        <tr key={p.id} className="border-t border-border/50">
                                          <td className="py-1">{new Date(p.paid_at).toLocaleDateString("pt-BR")}</td>
                                          <td className="py-1 text-right font-medium">{brl(p.amount_cents)}</td>
                                          <td className="py-1 text-center">
                                            {p.confirmed_at ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">aguardando</span>}
                                          </td>
                                          <td className="py-1 italic text-muted-foreground">{p.note ?? "—"}</td>
                                          <td className="py-1 text-right">
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => excluirRepasse(r.id, p.id)}>Excluir</Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar afiliado — {editing?.nome ?? editing?.email ?? editing?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código</Label>
              <Input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>% de comissão</Label>
              <Input type="number" step="0.01" min="0" max="100" value={editPct} onChange={e => setEditPct(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Aplica-se a novas indicações. Comissões já registradas não são recalculadas.</p>
            </div>
            <div>
              <Label>Chave Pix</Label>
              <Input value={editPix} onChange={e => setEditPix(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editBusy}>{editBusy ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminAfiliados = () => <RequirePermission perm="manage_affiliates"><Inner /></RequirePermission>;
export default AdminAfiliados;