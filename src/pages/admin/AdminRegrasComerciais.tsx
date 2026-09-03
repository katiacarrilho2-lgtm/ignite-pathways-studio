import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RequireNetworkMaster from "@/components/admin/RequireNetworkMaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Scale, Lock } from "lucide-react";

type Regra = {
  id: string;
  escopo: string;
  course_id: string | null;
  categoria_id: string | null;
  instituicao: string | null;
  account_id: string | null;
  preco_minimo_cents: number;
  preco_sugerido_cents: number;
  custo_interno_cents: number;
  tipo_regra: string;
  percentual: number;
  valor_fixo_cents: number;
  ativo: boolean;
  observacoes: string | null;
};

const brl = (c?: number | null) => ((c ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toCents = (v: string) => Math.round(parseFloat((v || "0").replace(/\./g, "").replace(",", ".")) * 100) || 0;
const fromCents = (c?: number | null) => ((c ?? 0) / 100).toFixed(2);

const ESCOPOS = [
  { v: "curso", label: "Curso" },
  { v: "categoria", label: "Categoria" },
  { v: "instituicao", label: "Instituição" },
];
const TIPOS = [
  { v: "percentual_licenciado", label: "Percentual do Licenciado" },
  { v: "valor_fixo_multplick", label: "Valor fixo da Multplick" },
];

const empty = (): Partial<Regra> => ({
  escopo: "curso", tipo_regra: "percentual_licenciado", percentual: 40,
  preco_minimo_cents: 0, preco_sugerido_cents: 0, custo_interno_cents: 0, valor_fixo_cents: 0, ativo: true,
});

function Inner() {
  const [rows, setRows] = useState<Regra[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Regra>>(empty());
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [r, c, ct, u] = await Promise.all([
      supabase.from("polo_regras").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").eq("active", true).order("title"),
      supabase.from("course_categories").select("id, name").order("name"),
      supabase.from("contas_comerciais").select("id, nome").neq("tipo_da_conta", "matriz").order("nome"),
    ]);
    if (r.error) toast.error(r.error.message);
    setRows((r.data ?? []) as any);
    setCourses((c.data ?? []) as any);
    setCats((ct.data ?? []) as any);
    setUnits((u.data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    const cMap = new Map(courses.map((c) => [c.id, c.title]));
    const ctMap = new Map(cats.map((c) => [c.id, c.name]));
    return rows.filter((r) =>
      [cMap.get(r.course_id ?? ""), ctMap.get(r.categoria_id ?? ""), r.instituicao, r.observacoes]
        .some((v) => (v ?? "").toLowerCase().includes(t)),
    );
  }, [rows, q, courses, cats]);

  const save = async () => {
    if (form.escopo === "curso" && !form.course_id) return toast.error("Selecione o curso");
    if (form.escopo === "categoria" && !form.categoria_id) return toast.error("Selecione a categoria");
    if (form.escopo === "instituicao" && !form.instituicao?.trim()) return toast.error("Informe a instituição");
    setSaving(true);
    const payload: any = {
      escopo: form.escopo,
      course_id: form.escopo === "curso" ? form.course_id : null,
      categoria_id: form.escopo === "categoria" ? form.categoria_id : null,
      instituicao: form.escopo === "instituicao" ? form.instituicao?.trim() : null,
      account_id: form.account_id || null,
      preco_minimo_cents: form.preco_minimo_cents ?? 0,
      preco_sugerido_cents: form.preco_sugerido_cents ?? 0,
      custo_interno_cents: form.custo_interno_cents ?? 0,
      tipo_regra: form.tipo_regra,
      percentual: Number(form.percentual ?? 0),
      valor_fixo_cents: form.valor_fixo_cents ?? 0,
      ativo: form.ativo ?? true,
      observacoes: form.observacoes || null,
    };
    const res = form.id
      ? await supabase.from("polo_regras").update(payload).eq("id", form.id)
      : await supabase.from("polo_regras").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Regra salva");
    setOpen(false);
    load();
  };

  const remove = async (r: Regra) => {
    if (!confirm("Excluir esta regra comercial?")) return;
    const { error } = await supabase.from("polo_regras").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída"); load();
  };

  const alvo = (r: Regra) =>
    r.escopo === "curso" ? (courses.find((c) => c.id === r.course_id)?.title ?? "Curso")
      : r.escopo === "categoria" ? (cats.find((c) => c.id === r.categoria_id)?.name ?? "Categoria")
        : (r.instituicao ?? "Instituição");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/licenciados"><ArrowLeft className="size-4" /> Voltar para a Rede</Link>
      </Button>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Scale className="size-7 text-primary" /> Regras Comerciais</h1>
          <p className="text-muted-foreground text-sm">Preço mínimo, preço sugerido e condição comercial das unidades da Rede.</p>
        </div>
        <Button onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="size-4" /> Nova regra</Button>
      </header>

      <Card className="border-amber-300 bg-amber-50/60">
        <CardContent className="p-4 flex items-start gap-2 text-sm text-amber-900">
          <Lock className="size-4 mt-0.5" />
          <span>O <b>custo interno Multplick</b> aparece apenas nesta página da Matriz. Polos e revendedores nunca recebem esse campo — nem na interface, nem por consulta direta.</span>
        </CardContent>
      </Card>

      <Input placeholder="Buscar por curso, categoria ou instituição…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Regras cadastradas</CardTitle>
          <CardDescription>{filtered.length} regra(s)</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Alvo</th>
                <th className="text-left p-2">Escopo</th>
                <th className="text-left p-2">Polo</th>
                <th className="text-right p-2">Mínimo</th>
                <th className="text-right p-2">Sugerido</th>
                <th className="text-right p-2">Custo interno</th>
                <th className="text-left p-2">Condição</th>
                <th className="text-center p-2">Ativo</th>
                <th className="text-right p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhuma regra cadastrada.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 font-medium">{alvo(r)}</td>
                  <td className="p-2">{ESCOPOS.find((e) => e.v === r.escopo)?.label}</td>
                  <td className="p-2">{r.account_id ? (units.find((u) => u.id === r.account_id)?.nome ?? "—") : "Todos"}</td>
                  <td className="p-2 text-right">{brl(r.preco_minimo_cents)}</td>
                  <td className="p-2 text-right">{brl(r.preco_sugerido_cents)}</td>
                  <td className="p-2 text-right text-amber-700">{brl(r.custo_interno_cents)}</td>
                  <td className="p-2">{r.tipo_regra === "percentual_licenciado" ? `${Number(r.percentual)}% ao Polo` : `${brl(r.valor_fixo_cents)} à Multplick`}</td>
                  <td className="p-2 text-center">{r.ativo ? "Sim" : "Não"}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => { setForm({ ...r }); setOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="size-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} regra comercial</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Escopo</Label>
              <Select value={form.escopo} onValueChange={(v) => setForm({ ...form, escopo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESCOPOS.map((e) => <SelectItem key={e.v} value={e.v}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.escopo === "curso" && (
              <div>
                <Label>Curso</Label>
                <Select value={form.course_id ?? ""} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.escopo === "categoria" && (
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria_id ?? ""} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.escopo === "instituicao" && (
              <div>
                <Label>Instituição</Label>
                <Input value={form.instituicao ?? ""} onChange={(e) => setForm({ ...form, instituicao: e.target.value })} placeholder="Ex: Faculdade LA" />
              </div>
            )}
            <div>
              <Label>Polo específico (opcional)</Label>
              <Select value={form.account_id ?? "todos"} onValueChange={(v) => setForm({ ...form, account_id: v === "todos" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Polos</SelectItem>
                  {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço mínimo permitido (R$)</Label>
              <Input type="number" step="0.01" value={fromCents(form.preco_minimo_cents)} onChange={(e) => setForm({ ...form, preco_minimo_cents: toCents(e.target.value) })} />
            </div>
            <div>
              <Label>Preço sugerido (R$)</Label>
              <Input type="number" step="0.01" value={fromCents(form.preco_sugerido_cents)} onChange={(e) => setForm({ ...form, preco_sugerido_cents: toCents(e.target.value) })} />
            </div>
            <div>
              <Label className="text-amber-700">Custo interno Multplick (R$) — só a Matriz vê</Label>
              <Input type="number" step="0.01" value={fromCents(form.custo_interno_cents)} onChange={(e) => setForm({ ...form, custo_interno_cents: toCents(e.target.value) })} />
            </div>
            <div>
              <Label>Tipo de regra</Label>
              <Select value={form.tipo_regra} onValueChange={(v) => setForm({ ...form, tipo_regra: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.tipo_regra === "percentual_licenciado" ? (
              <div>
                <Label>Percentual do Licenciado (%)</Label>
                <Input type="number" step="0.01" value={String(form.percentual ?? 0)} onChange={(e) => setForm({ ...form, percentual: Number(e.target.value) })} />
                <p className="text-[11px] text-muted-foreground mt-1">Calculado somente sobre valores efetivamente recebidos do aluno.</p>
              </div>
            ) : (
              <div>
                <Label>Valor fixo devido à Multplick (R$)</Label>
                <Input type="number" step="0.01" value={fromCents(form.valor_fixo_cents)} onChange={(e) => setForm({ ...form, valor_fixo_cents: toCents(e.target.value) })} />
                <p className="text-[11px] text-muted-foreground mt-1">Ex.: R$ 30 por aluno/curso nos profissionalizantes. Não é comissão do Polo.</p>
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Regra ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminRegrasComerciais() {
  return <RequireNetworkMaster><Inner /></RequireNetworkMaster>;
}
