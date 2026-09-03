import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, LifeBuoy, Search } from "lucide-react";

type Ticket = {
  id: string; account_id: string; polo: string; assunto: string; mensagem: string;
  categoria: string | null; prioridade: string | null; status: string | null; resposta: string | null; created_at: string;
};

const dataBr = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

export default function AdminRedeSuporte() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [polo, setPolo] = useState("todos");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("rede_suporte");
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const polos = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.account_id, r.polo));
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rows]);

  const term = q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) => (polo === "todos" || r.account_id === polo) &&
      (!term || [r.assunto, r.mensagem, r.polo].some((v) => (v ?? "").toLowerCase().includes(term))),
  );

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <Button asChild variant="ghost" size="sm"><Link to="/admin/licenciados"><ArrowLeft className="size-4" /> Rede Multplick</Link></Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><LifeBuoy className="size-7 text-primary" /> Suporte da Rede</h1>
        <p className="text-muted-foreground">Chamados abertos pelos Polos e Revendedores. Os chamados da Matriz ficam em Suporte.</p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar assunto, mensagem ou polo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={polo} onValueChange={setPolo}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Polos</SelectItem>
            {polos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Chamados</CardTitle>
          <CardDescription>{filtered.length} chamado(s)</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="py-6 text-center text-muted-foreground">Carregando…</p>}
          {!loading && filtered.length === 0 && <p className="py-6 text-center text-muted-foreground">Nenhum chamado da Rede.</p>}
          {filtered.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{t.assunto}</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.polo}</span>
                {t.prioridade && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t.prioridade}</span>}
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary">{t.status ?? "aberto"}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{t.mensagem}</p>
              {t.resposta && <p className="text-sm text-emerald-700 whitespace-pre-wrap">Resposta: {t.resposta}</p>}
              <p className="text-xs text-muted-foreground">{t.categoria ?? "geral"} · {dataBr(t.created_at)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
