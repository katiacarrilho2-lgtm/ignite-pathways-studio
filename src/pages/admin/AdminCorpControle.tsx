import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, TrendingUp, CheckCircle2, Send, XCircle, Search } from "lucide-react";
import { proposalTypeLabel } from "@/lib/corporativo/types";

interface Row {
  id: string;
  numero: string | null;
  titulo: string;
  tipo: string;
  status: string;
  valor_total_cents: number | null;
  created_at: string;
  updated_at: string;
  owner_id: string | null;
  dados: any;
  // B4: leitura compatível
  issuer_account_id?: string | null;
  client_account_id?: string | null;
  partner_id?: string | null;
  client_id?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aprovada",
  recusada: "Recusada",
};

const STATUS_COLOR: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700",
  enviada: "bg-blue-100 text-blue-700",
  aceita: "bg-emerald-100 text-emerald-700",
  recusada: "bg-rose-100 text-rose-700",
};

export default function AdminCorpControle() {
  const [rows, setRows] = useState<Row[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("corp_proposals")
        .select("id,numero,titulo,tipo,status,valor_total_cents,created_at,updated_at,owner_id,dados,issuer_account_id,client_account_id,partner_id,client_id")
        .order("created_at", { ascending: false });
      const list = (data as any) || [];
      setRows(list);
      const ids = Array.from(new Set(list.map((r: Row) => r.owner_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name,email")
          .in("user_id", ids);
        const m: Record<string, string> = {};
        (profs || []).forEach((p: any) => { m[p.user_id] = p.display_name || p.email || "—"; });
        setOwners(m);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const t = q.toLowerCase().trim();
    if (!t) return true;
    return (r.titulo || "").toLowerCase().includes(t)
      || (r.numero || "").toLowerCase().includes(t)
      || (r.dados?.razao_social || "").toLowerCase().includes(t)
      || (r.dados?.contato_nome || "").toLowerCase().includes(t);
  }), [rows, q, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const enviadas = rows.filter(r => r.status === "enviada").length;
    const aprovadas = rows.filter(r => r.status === "aceita").length;
    const recusadas = rows.filter(r => r.status === "recusada").length;
    const fechadasConsideradas = aprovadas + recusadas;
    const taxa = fechadasConsideradas > 0 ? Math.round((aprovadas / fechadasConsideradas) * 100) : 0;
    return { total, enviadas, aprovadas, recusadas, taxa };
  }, [rows]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <Link to="/admin/corporativo" className="text-xs text-muted-foreground hover:text-primary">← Módulo Corporativo</Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Controle de Propostas</h1>
        <p className="text-sm text-muted-foreground">Histórico completo, status comercial e taxa de fechamento por proposta enviada.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-4" /> Total</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Send className="size-4" /> Enviadas</div>
          <div className="text-2xl font-bold mt-1 text-blue-700">{stats.enviadas}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4" /> Aprovadas</div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{stats.aprovadas}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><XCircle className="size-4" /> Recusadas</div>
          <div className="text-2xl font-bold mt-1 text-rose-700">{stats.recusadas}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="size-4" /> Taxa de fechamento</div>
          <div className="text-2xl font-bold mt-1 text-primary">{stats.taxa}%</div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar por número, título, empresa ou contato…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="aceita">Aprovada</SelectItem>
            <SelectItem value="recusada">Recusada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="size-6 animate-spin mx-auto" /></div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Nº</th>
                  <th className="text-left p-3">Empresa / Cliente</th>
                  <th className="text-left p-3">Título</th>
                  <th className="text-left p-3 hidden md:table-cell">Tipo</th>
                  <th className="text-left p-3 hidden md:table-cell">Responsável</th>
                  <th className="text-left p-3 hidden md:table-cell">Criada em</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs text-primary">{r.numero || "—"}</td>
                    <td className="p-3 font-medium">{r.dados?.razao_social || "—"}</td>
                    <td className="p-3"><Link to={`/admin/corporativo/propostas/${r.id}`} className="hover:underline">{r.titulo}</Link></td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{proposalTypeLabel(r.tipo)}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{r.owner_id ? (owners[r.owner_id] || "—") : "—"}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3"><Badge className={`${STATUS_COLOR[r.status] || "bg-slate-100 text-slate-700"} border-0`}>{STATUS_LABEL[r.status] || r.status}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma proposta encontrada com esses filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
