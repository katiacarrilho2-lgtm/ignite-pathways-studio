import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { proposalTypeLabel } from "@/lib/corporativo/types";

interface Row {
  id: string;
  numero: string | null;
  titulo: string;
  tipo: string;
  status: string;
  valor_total_cents: number | null;
  updated_at: string;
  dados: any;
  // B4: leitura compatível (prioridade) com fallback p/ partner_id/client_id
  issuer_account_id?: string | null;
  client_account_id?: string | null;
  partner_id?: string | null;
  client_id?: string | null;
}

const statusVariant: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700",
  enviada: "bg-blue-100 text-blue-700",
  aceita: "bg-emerald-100 text-emerald-700",
  recusada: "bg-rose-100 text-rose-700",
};

export default function AdminCorpPropostas() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("corp_proposals")
      .select("id,numero,titulo,tipo,status,valor_total_cents,updated_at,dados,issuer_account_id,client_account_id,partner_id,client_id")
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
      .from("corp_proposals")
      .insert({ titulo: "Nova proposta", tipo: "capacitacao", owner_id: user?.id, dados: {} })
      .select("id").single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    nav(`/admin/corporativo/propostas/${data.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta proposta?")) return;
    const { error } = await supabase.from("corp_proposals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Proposta excluída");
    load();
  };

  const filtered = rows.filter(r => {
    const t = (q || "").toLowerCase();
    if (!t) return true;
    return (r.titulo || "").toLowerCase().includes(t)
      || (r.dados?.razao_social || "").toLowerCase().includes(t)
      || proposalTypeLabel(r.tipo).toLowerCase().includes(t);
  });

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Link to="/admin/corporativo" className="text-xs text-muted-foreground hover:text-primary">← Módulo Corporativo</Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Propostas Comerciais</h1>
          <p className="text-sm text-muted-foreground">Gere PDFs e DOCX profissionais com identidade Multplick.</p>
        </div>
        <Button onClick={create} disabled={creating} size="lg">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Nova proposta
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar por título, cliente ou tipo…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12"><Loader2 className="size-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="size-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma proposta ainda. Clique em <strong>Nova proposta</strong> para começar.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id} className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
              <div className="size-11 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <FileText className="size-5" />
              </div>
              <Link to={`/admin/corporativo/propostas/${r.id}`} className="flex-1 min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">
                  {r.numero && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{r.numero}</span>}
                  <span className="truncate">{r.titulo}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {proposalTypeLabel(r.tipo)}
                  {r.dados?.razao_social ? ` • ${r.dados.razao_social}` : ""}
                  {" • atualizada " + new Date(r.updated_at).toLocaleDateString("pt-BR")}
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