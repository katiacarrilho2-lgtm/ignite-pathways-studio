import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ScrollText, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { contractTypeLabel } from "@/lib/corporativo/contractTypes";

interface Row {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  updated_at: string;
  dados: any;
  // B4: leitura compatível com fallback legado
  issuer_account_id?: string | null;
  client_account_id?: string | null;
  partner_id?: string | null;
  client_id?: string | null;
}

const statusVariant: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700",
  enviado: "bg-blue-100 text-blue-700",
  assinado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-rose-100 text-rose-700",
};

export default function AdminCorpContratos() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("corp_contracts")
      .select("id,titulo,tipo,status,vigencia_inicio,vigencia_fim,updated_at,dados,issuer_account_id,client_account_id,partner_id,client_id")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("corp_contracts")
      .insert({ titulo: "Novo contrato", tipo: "prestacao_servicos", owner_id: user?.id, dados: {}, clausulas: [] })
      .select("id").single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    nav(`/admin/corporativo/contratos/${data.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await supabase.from("corp_contracts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contrato excluído");
    load();
  };

  const filtered = rows.filter((r) => {
    const t = (q || "").toLowerCase();
    if (!t) return true;
    return (r.titulo || "").toLowerCase().includes(t)
      || (r.dados?.contratante_razao || "").toLowerCase().includes(t)
      || contractTypeLabel(r.tipo).toLowerCase().includes(t);
  });

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Link to="/admin/corporativo" className="text-xs text-muted-foreground hover:text-primary">← Módulo Corporativo</Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Contratos e Termos</h1>
          <p className="text-sm text-muted-foreground">Minutas editáveis com cláusulas padrão revisáveis e exportação em PDF/DOCX.</p>
        </div>
        <Button onClick={create} disabled={creating} size="lg">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Novo contrato
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar por título, contratante ou tipo…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12"><Loader2 className="size-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ScrollText className="size-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum contrato ainda. Clique em <strong>Novo contrato</strong> para começar.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
              <div className="size-11 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <ScrollText className="size-5" />
              </div>
              <Link to={`/admin/corporativo/contratos/${r.id}`} className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.titulo}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {contractTypeLabel(r.tipo)}
                  {r.dados?.contratante_razao ? ` • ${r.dados.contratante_razao}` : ""}
                  {" • atualizado " + new Date(r.updated_at).toLocaleDateString("pt-BR")}
                </div>
              </Link>
              <Badge className={`${statusVariant[r.status] || "bg-slate-100 text-slate-700"} border-0`}>{r.status}</Badge>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}