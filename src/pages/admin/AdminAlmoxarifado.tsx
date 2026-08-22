import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Item = {
  id: string; nome: string; categoria: string | null; unidade: string; quantidade: number;
  estoque_minimo: number; localizacao: string | null; fornecedor: string | null;
  valor_unit_cents: number; observacoes: string | null; ativo: boolean;
};
type Mov = { id: string; item_id: string; tipo: string; quantidade: number; data: string; fornecedor: string | null; setor_id: string | null; responsavel_id: string | null; documento: string | null; motivo: string | null };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const vazio: Partial<Item> = { nome: "", categoria: "", unidade: "un", quantidade: 0, estoque_minimo: 0, valor_unit_cents: 0, ativo: true };

const Inner = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [depts, setDepts] = useState<{ id: string; nome: string }[]>([]);
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Item>>(vazio);
  const [movOpen, setMovOpen] = useState<null | "entrada" | "saida">(null);
  const [mov, setMov] = useState<any>({ item_id: "", quantidade: 1, fornecedor: "", setor_id: "", documento: "", motivo: "" });

  const load = useCallback(async () => {
    const [{ data: i }, { data: m }, { data: d }] = await Promise.all([
      supabase.from("inventory_items" as any).select("*").order("nome"),
      supabase.from("inventory_movements" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("departments" as any).select("id,nome").eq("ativo", true).order("sort_order"),
    ]);
    setItems((i ?? []) as any); setMovs((m ?? []) as any); setDepts((d ?? []) as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const salvar = async () => {
    if (!edit.nome) return toast.error("Informe o nome do produto");
    const payload: any = {
      nome: edit.nome, categoria: edit.categoria || null, unidade: edit.unidade || "un",
      estoque_minimo: Number(edit.estoque_minimo) || 0, localizacao: edit.localizacao || null,
      fornecedor: edit.fornecedor || null, valor_unit_cents: Number(edit.valor_unit_cents) || 0,
      observacoes: edit.observacoes || null, ativo: edit.ativo !== false,
    };
    if (!edit.id) payload.quantidade = Number(edit.quantidade) || 0;
    const { error } = edit.id
      ? await supabase.from("inventory_items" as any).update(payload).eq("id", edit.id)
      : await supabase.from("inventory_items" as any).insert(payload);
    if (error) return toast.error(error.message);
    logAudit("Almoxarifado", edit.id ? "editou produto" : "cadastrou produto", edit.nome!);
    toast.success("Salvo"); setOpen(false); setEdit(vazio); load();
  };

  const registrarMov = async () => {
    if (!mov.item_id || !mov.quantidade) return toast.error("Escolha o produto e a quantidade");
    const { error } = await supabase.from("inventory_movements" as any).insert({
      item_id: mov.item_id, tipo: movOpen, quantidade: Number(mov.quantidade),
      fornecedor: mov.fornecedor || null, setor_id: mov.setor_id || null,
      responsavel_id: user?.id ?? null, documento: mov.documento || null, motivo: mov.motivo || null,
    } as any);
    if (error) return toast.error(error.message);
    logAudit("Almoxarifado", `registrou ${movOpen}`, `${mov.quantidade} un`, mov.item_id);
    toast.success("Movimentação registrada");
    setMovOpen(null); setMov({ item_id: "", quantidade: 1, fornecedor: "", setor_id: "", documento: "", motivo: "" });
    load();
  };

  const filtrados = useMemo(() => items.filter(i => !busca || i.nome.toLowerCase().includes(busca.toLowerCase()) || (i.categoria ?? "").toLowerCase().includes(busca.toLowerCase())), [items, busca]);
  const baixos = items.filter(i => Number(i.quantidade) <= Number(i.estoque_minimo));
  const valorTotal = items.reduce((s, i) => s + Number(i.quantidade) * i.valor_unit_cents, 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Almoxarifado</h1>
          <p className="text-sm text-muted-foreground">Estoque, entradas e saídas de materiais</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setMovOpen("entrada")}><ArrowDownCircle className="size-4" /> Entrada</Button>
          <Button variant="outline" onClick={() => setMovOpen("saida")}><ArrowUpCircle className="size-4" /> Saída</Button>
          <Button onClick={() => { setEdit(vazio); setOpen(true); }}><Plus className="size-4" /> Produto</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Produtos", v: items.length },
          { l: "Estoque baixo", v: baixos.length },
          { l: "Movimentações", v: movs.length },
          { l: "Valor em estoque", v: brl(valorTotal) },
        ].map(c => (
          <div key={c.l} className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{c.l}</p>
            <p className="text-xl font-bold">{c.v}</p>
          </div>
        ))}
      </div>

      {baixos.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="size-4" /> Estoque baixo</p>
          <p className="text-xs text-muted-foreground mt-1">{baixos.map(b => `${b.nome} (${b.quantidade} ${b.unidade})`).join(" · ")}</p>
        </div>
      )}

      <Tabs defaultValue="estoque">
        <TabsList><TabsTrigger value="estoque">Estoque</TabsTrigger><TabsTrigger value="mov">Movimentações</TabsTrigger></TabsList>

        <TabsContent value="estoque" className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto" className="pl-8" />
          </div>
          <div className="overflow-x-auto bg-card border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Produto</th><th className="text-left p-2">Categoria</th><th className="text-right p-2">Qtd</th><th className="text-right p-2">Mínimo</th><th className="text-left p-2">Local</th><th className="text-right p-2">Valor un.</th><th /></tr>
              </thead>
              <tbody>
                {filtrados.map(i => {
                  const baixo = Number(i.quantidade) <= Number(i.estoque_minimo);
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="p-2 font-medium">{i.nome} {baixo && <Badge variant="destructive" className="ml-1 text-[10px]">baixo</Badge>}</td>
                      <td className="p-2 text-muted-foreground">{i.categoria ?? "—"}</td>
                      <td className="p-2 text-right">{Number(i.quantidade)} {i.unidade}</td>
                      <td className="p-2 text-right text-muted-foreground">{Number(i.estoque_minimo)}</td>
                      <td className="p-2 text-muted-foreground">{i.localizacao ?? "—"}</td>
                      <td className="p-2 text-right">{brl(i.valor_unit_cents)}</td>
                      <td className="p-2 text-right"><Button variant="ghost" size="icon" onClick={() => { setEdit(i); setOpen(true); }}><Pencil className="size-4" /></Button></td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum produto cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="mov">
          <div className="overflow-x-auto bg-card border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Data</th><th className="text-left p-2">Produto</th><th className="text-left p-2">Tipo</th><th className="text-right p-2">Qtd</th><th className="text-left p-2">Setor/Fornecedor</th><th className="text-left p-2">Obs.</th></tr>
              </thead>
              <tbody>
                {movs.map(m => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-2">{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="p-2">{items.find(i => i.id === m.item_id)?.nome ?? "—"}</td>
                    <td className="p-2">{m.tipo === "entrada" ? <Badge className="bg-green-600">Entrada</Badge> : <Badge variant="secondary">Saída</Badge>}</td>
                    <td className="p-2 text-right">{Number(m.quantidade)}</td>
                    <td className="p-2 text-muted-foreground">{m.tipo === "entrada" ? (m.fornecedor ?? "—") : (depts.find(d => d.id === m.setor_id)?.nome ?? "—")}</td>
                    <td className="p-2 text-muted-foreground">{m.motivo ?? m.documento ?? "—"}</td>
                  </tr>
                ))}
                {movs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sem movimentações.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={edit.nome ?? ""} onChange={e => setEdit({ ...edit, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Categoria</Label><Input value={edit.categoria ?? ""} onChange={e => setEdit({ ...edit, categoria: e.target.value })} /></div>
              <div><Label>Unidade</Label><Input value={edit.unidade ?? "un"} onChange={e => setEdit({ ...edit, unidade: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{edit.id ? "Quantidade atual" : "Quantidade inicial"}</Label>
                <Input type="number" value={Number(edit.quantidade ?? 0)} disabled={!!edit.id} onChange={e => setEdit({ ...edit, quantidade: Number(e.target.value) })} />
              </div>
              <div><Label>Estoque mínimo</Label><Input type="number" value={Number(edit.estoque_minimo ?? 0)} onChange={e => setEdit({ ...edit, estoque_minimo: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Localização</Label><Input value={edit.localizacao ?? ""} onChange={e => setEdit({ ...edit, localizacao: e.target.value })} /></div>
              <div><Label>Fornecedor</Label><Input value={edit.fornecedor ?? ""} onChange={e => setEdit({ ...edit, fornecedor: e.target.value })} /></div>
            </div>
            <div><Label>Valor unitário (R$)</Label>
              <Input type="number" step="0.01" value={(edit.valor_unit_cents ?? 0) / 100} onChange={e => setEdit({ ...edit, valor_unit_cents: Math.round(Number(e.target.value) * 100) })} />
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={edit.observacoes ?? ""} onChange={e => setEdit({ ...edit, observacoes: e.target.value })} /></div>
            {edit.id && <p className="text-xs text-muted-foreground">A quantidade muda apenas por entradas e saídas.</p>}
          </div>
          <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!movOpen} onOpenChange={o => !o && setMovOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{movOpen === "entrada" ? "Entrada de material" : "Saída de material"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produto</Label>
              <Select value={mov.item_id} onValueChange={v => setMov({ ...mov, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.nome} ({Number(i.quantidade)} {i.unidade})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" min={1} value={mov.quantidade} onChange={e => setMov({ ...mov, quantidade: e.target.value })} /></div>
            {movOpen === "entrada" ? (
              <>
                <div><Label>Fornecedor</Label><Input value={mov.fornecedor} onChange={e => setMov({ ...mov, fornecedor: e.target.value })} /></div>
                <div><Label>Nota / documento</Label><Input value={mov.documento} onChange={e => setMov({ ...mov, documento: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div><Label>Setor solicitante</Label>
                  <Select value={mov.setor_id} onValueChange={v => setMov({ ...mov, setor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Motivo</Label><Input value={mov.motivo} onChange={e => setMov({ ...mov, motivo: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter><Button onClick={registrarMov}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminAlmoxarifado() {
  return <RequirePermission perm="mod_almoxarifado"><Inner /></RequirePermission>;
}
