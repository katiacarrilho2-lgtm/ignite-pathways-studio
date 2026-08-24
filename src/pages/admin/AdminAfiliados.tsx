import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RefreshCcw, Users, Download, Upload, Eye, Link2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { downloadCsv, brlCsv, dateCsv } from "@/lib/exportCsv";

type Aff = {
  id: string; user_id: string; code: string; commission_pct: number; status: string; pix_key: string | null; notes: string | null;
  profile?: { username: string | null; display_name: string | null; email: string | null } | null;
};
type Ref = {
  id: string; affiliate_id: string; valor_cents: number; commission_cents: number; status: string; paid_at: string | null; created_at: string;
  student_name: string | null; course_title: string | null; parcela_label: string | null;
  comprovante_path: string | null; comprovante_nome: string | null;
};
type Enr = { id: string; user_id: string; affiliate_id: string | null; course_title: string; student_name: string };
type ProgramSettings = { star_every: number; milestone_enrollments: number; milestone_reward: string | null };

const Inner = () => {
  const [list, setList] = useState<Aff[]>([]);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [students, setStudents] = useState<{ user_id: string; label: string }[]>([]);
  const [enrs, setEnrs] = useState<Enr[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", code: "", commission_pct: 10, pix_key: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState<ProgramSettings>({ star_every: 5, milestone_enrollments: 30, milestone_reward: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    const [{ data: a, error: aError }, { data: r, error: rError }, { data: p, error: pError }, { data: program }] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_referrals").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id,username,display_name,email").order("username"),
      supabase.from("affiliate_program_settings").select("star_every,milestone_enrollments,milestone_reward").eq("singleton", true).maybeSingle(),
    ]);
    if (aError || rError || pError) {
      toast.error(aError?.message ?? rError?.message ?? pError?.message ?? "Falha ao carregar afiliados");
    }
    const profileMap = new Map((p ?? []).map((profile) => [profile.user_id, profile]));
    setList((a ?? []).map((affiliate) => ({ ...affiliate, profile: profileMap.get(affiliate.user_id) ?? null })) as Aff[]);
    setRefs((r ?? []) as any);
    setStudents((p ?? []).map((x: any) => ({ user_id: x.user_id, label: `${x.username ?? ""} · ${x.display_name ?? x.email ?? ""}` })));
    if (program) setSettings(program);
    const { data: e } = await supabase
      .from("enrollments")
      .select("id,user_id,affiliate_id, course:courses(title)")
      .order("enrolled_at", { ascending: false })
      .limit(300);
    const pMap = new Map((p ?? []).map((x: any) => [x.user_id, x.display_name ?? x.email ?? x.user_id]));
    setEnrs((e ?? []).map((x: any) => ({
      id: x.id, user_id: x.user_id, affiliate_id: x.affiliate_id,
      course_title: x.course?.title ?? "—", student_name: String(pMap.get(x.user_id) ?? x.user_id.slice(0, 8)),
    })));
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (settings.star_every < 1 || settings.milestone_enrollments < 1) return toast.error("Informe metas maiores que zero");
    setSavingSettings(true);
    const { error } = await supabase.from("affiliate_program_settings").update({
      star_every: settings.star_every,
      milestone_enrollments: settings.milestone_enrollments,
      milestone_reward: settings.milestone_reward?.trim() || null,
    }).eq("singleton", true);
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success("Regras de premiação atualizadas");
  };

  const create = async () => {
    if (!form.user_id || !form.code.trim()) return toast.error("Usuário e código obrigatórios");
    const { error } = await supabase.from("affiliates").insert({
      user_id: form.user_id, code: form.code.trim(), commission_pct: form.commission_pct, pix_key: form.pix_key || null, status: "ativo",
    });
    if (error) return toast.error(error.message);
    toast.success("Afiliado criado"); setOpen(false); setForm({ user_id: "", code: "", commission_pct: 10, pix_key: "" }); load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("affiliates").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover afiliado?")) return;
    const { error } = await supabase.from("affiliates").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const totalPend = refs.filter((r) => r.status === "pendente").reduce((s, r) => s + (r.commission_cents ?? 0), 0);
  const totalPago = refs.filter((r) => r.status === "pago").reduce((s, r) => s + (r.commission_cents ?? 0), 0);

  const affLabel = (id: string) => {
    const a = list.find((x) => x.id === id);
    if (!a) return id.slice(0, 8);
    const name = a.profile?.display_name ?? a.profile?.email ?? a.user_id.slice(0, 8);
    const login = a.profile?.username ? ` · ${a.profile.username}` : "";
    return `${name}${login} · ${a.code}`;
  };

  const vincular = async (enrollmentId: string, affiliateId: string) => {
    const { error } = await supabase.from("enrollments")
      .update({ affiliate_id: affiliateId === "none" ? null : affiliateId }).eq("id", enrollmentId);
    if (error) return toast.error(error.message);
    toast.success("Matrícula vinculada — novas parcelas pagas geram comissão automaticamente");
    load();
  };

  const marcarPago = async (r: Ref) => {
    const { error } = await supabase.from("affiliate_referrals")
      .update({ status: r.status === "pago" ? "pendente" : "pago", paid_at: r.status === "pago" ? null : new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const enviarComprovante = async (r: Ref, file: File) => {
    setBusy(r.id);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${r.affiliate_id}/${r.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("comprovantes").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase.from("affiliate_referrals")
        .update({ comprovante_path: path, comprovante_nome: file.name, status: "pago", paid_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) throw error;
      toast.success("Comprovante anexado");
      load();
    } catch (e: any) { toast.error(e.message ?? "Falha no envio"); }
    finally { setBusy(null); }
  };

  const verComprovante = async (path: string) => {
    const { data } = await supabase.storage.from("comprovantes").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank"); else toast.error("Comprovante indisponível");
  };

  const exportarAfiliados = () => downloadCsv("afiliados", ["Afiliado", "Código", "Comissão %", "PIX", "Status"],
    list.map((a) => [a.profile?.display_name ?? a.profile?.email ?? a.user_id, a.code, a.commission_pct, a.pix_key ?? "", a.status]));

  const exportarComissoes = () => downloadCsv("comissoes", ["Data", "Afiliado", "Aluno", "Curso", "Parcela", "Valor recebido", "Comissão", "Status", "Pago em", "Comprovante"],
    refs.map((r) => [dateCsv(r.created_at), affLabel(r.affiliate_id), r.student_name ?? "", r.course_title ?? "", r.parcela_label ?? "",
      brlCsv(r.valor_cents), brlCsv(r.commission_cents), r.status, dateCsv(r.paid_at), r.comprovante_nome ?? ""]));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Users className="size-7" /> Afiliados</h1>
          <p className="text-muted-foreground">Programa de indicações — códigos, comissões e pagamentos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /></Button>
          <Button variant="outline" onClick={exportarAfiliados}><Download className="size-4" /> Exportar</Button>
          <Button variant="hero" onClick={() => setOpen(true)}><Plus className="size-4" /> Novo afiliado</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Afiliados ativos</div><div className="text-2xl font-bold text-primary">{list.filter((a) => a.status === "ativo").length}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Comissões pendentes</div><div className="text-2xl font-bold text-amber-600">R$ {(totalPend / 100).toFixed(2)}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Comissões pagas</div><div className="text-2xl font-bold text-emerald-600">R$ {(totalPago / 100).toFixed(2)}</div></div>
      </div>

      <section className="border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Trophy className="size-5" /> Metas e premiação</h2>
          <p className="text-sm text-muted-foreground">As estrelas contam matrículas com recebimento registrado, sem duplicar o mesmo aluno/curso.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Uma estrela a cada</Label><Input type="number" min={1} value={settings.star_every} onChange={(e) => setSettings({ ...settings, star_every: Number(e.target.value) })} /><p className="text-xs text-muted-foreground mt-1">matrículas pagas</p></div>
          <div><Label>Marco do prêmio</Label><Input type="number" min={1} value={settings.milestone_enrollments} onChange={(e) => setSettings({ ...settings, milestone_enrollments: Number(e.target.value) })} /><p className="text-xs text-muted-foreground mt-1">matrículas pagas</p></div>
          <div><Label>Prêmio do marco</Label><Input value={settings.milestone_reward ?? ""} onChange={(e) => setSettings({ ...settings, milestone_reward: e.target.value })} placeholder="Ex.: bônus de R$ 500" /></div>
        </div>
        <Button variant="hero" onClick={saveSettings} disabled={savingSettings}>{savingSettings ? "Salvando..." : "Salvar regras"}</Button>
      </section>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Afiliado</th>
              <th className="text-left p-3">Código</th>
              <th className="text-left p-3">%</th>
              <th className="text-left p-3">PIX</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">{a.profile ? `${a.profile.username ?? ""} · ${a.profile.display_name ?? a.profile.email ?? ""}` : a.user_id.slice(0, 8)}</td>
                <td className="p-3 font-mono">
                  <div className="flex items-center gap-2">
                    {a.code}
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Copiar link com o código deste afiliado"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/?ref=${a.code}`);
                        toast.success("Link do afiliado copiado");
                      }}
                    >
                      Copiar link
                    </Button>
                  </div>
                </td>
                <td className="p-3">{a.commission_pct}%</td>
                <td className="p-3 text-muted-foreground">{a.pix_key ?? "—"}</td>
                <td className="p-3">
                  <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">ativo</SelectItem>
                      <SelectItem value="pausado">pausado</SelectItem>
                      <SelectItem value="bloqueado">bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}><Trash2 className="size-4" /></Button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum afiliado.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Link2 className="size-5" /> Vincular matrículas a afiliados</h2>
        <p className="text-sm text-muted-foreground">Ao marcar uma parcela como paga no financeiro, a comissão do afiliado é gerada automaticamente sobre o valor recebido.</p>
        <div className="bg-card rounded-xl border border-border overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr><th className="text-left p-3">Aluno</th><th className="text-left p-3">Curso</th><th className="text-left p-3">Afiliado</th></tr></thead>
            <tbody>
              {enrs.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3">{e.student_name}</td>
                  <td className="p-3 text-muted-foreground">{e.course_title}</td>
                  <td className="p-3">
                    <Select value={e.affiliate_id ?? "none"} onValueChange={(v) => vincular(e.id, v)}>
                      <SelectTrigger className="w-64 h-8 text-xs"><SelectValue placeholder="Sem afiliado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem afiliado</SelectItem>
                        {list.filter((a) => a.status === "ativo").map((a) => <SelectItem key={a.id} value={a.id}>{affLabel(a.id)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {enrs.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhuma matrícula.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-primary">Comissões por parcela recebida</h2>
          <Button variant="outline" onClick={exportarComissoes}><Download className="size-4" /> Exportar</Button>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="text-left p-3">Data</th><th className="text-left p-3">Afiliado</th>
                <th className="text-left p-3">Aluno / Curso</th><th className="text-left p-3">Parcela</th>
                <th className="text-right p-3">Recebido</th><th className="text-right p-3">Comissão</th>
                <th className="text-left p-3">Status</th><th className="text-left p-3">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">{affLabel(r.affiliate_id)}</td>
                  <td className="p-3"><p className="font-medium">{r.student_name ?? "—"}</p><p className="text-xs text-muted-foreground">{r.course_title ?? ""}</p></td>
                  <td className="p-3">{r.parcela_label ?? "—"}</td>
                  <td className="p-3 text-right">R$ {(r.valor_cents / 100).toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">R$ {(r.commission_cents / 100).toFixed(2)}</td>
                  <td className="p-3">
                    <Button size="sm" variant={r.status === "pago" ? "outline" : "hero"} onClick={() => marcarPago(r)}>
                      {r.status === "pago" ? "pago" : "marcar pago"}
                    </Button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {r.comprovante_path && <Button size="sm" variant="ghost" onClick={() => verComprovante(r.comprovante_path!)}><Eye className="size-4" /></Button>}
                      <label className="inline-flex items-center gap-1 text-xs cursor-pointer rounded border border-dashed px-2 py-1 hover:bg-secondary/60">
                        <Upload className="size-3" /> {busy === r.id ? "…" : "anexar"}
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(ev) => ev.target.files?.[0] && enviarComprovante(r, ev.target.files[0])} />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
              {refs.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma comissão gerada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo afiliado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Usuário *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: MARIA10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Comissão (%)</Label><Input type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })} /></div>
              <div><Label>Chave PIX</Label><Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} /></div>
            </div>
            <Button variant="hero" className="w-full" onClick={create}>Criar afiliado</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminAfiliados() {
  return <RequirePermission perm="manage_affiliates"><Inner /></RequirePermission>;
}

