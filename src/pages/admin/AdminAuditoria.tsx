import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Search, Download, RefreshCw } from "lucide-react";
import { RequirePermission } from "@/components/admin/AdminLayout";

type Log = { id: string; actor_name: string | null; modulo: string; acao: string; descricao: string | null; registro_id: string | null; created_at: string };

const Inner = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("todos");
  const [dias, setDias] = useState("30");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const desde = new Date(Date.now() - Number(dias) * 86400000).toISOString();
    const { data } = await supabase.from("audit_logs" as any)
      .select("*").gte("created_at", desde).order("created_at", { ascending: false }).limit(1000);
    setLogs((data ?? []) as any);
    setLoading(false);
  }, [dias]);
  useEffect(() => { load(); }, [load]);

  const modulos = useMemo(() => Array.from(new Set(logs.map(l => l.modulo))).sort(), [logs]);
  const lista = logs.filter(l =>
    (modulo === "todos" || l.modulo === modulo) &&
    (!busca || [l.actor_name, l.acao, l.descricao, l.modulo].some(v => (v ?? "").toLowerCase().includes(busca.toLowerCase())))
  );

  const exportar = () => {
    const linhas = [["Data", "Usuário", "Módulo", "Ação", "Descrição"],
      ...lista.map(l => [new Date(l.created_at).toLocaleString("pt-BR"), l.actor_name ?? "—", l.modulo, l.acao, l.descricao ?? ""])];
    const csv = linhas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="size-6" /> Auditoria</h1>
          <p className="text-sm text-muted-foreground">Registro imutável de ações realizadas no sistema</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
        <Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar CSV</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por usuário, ação ou descrição…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={modulo} onValueChange={setModulo}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os módulos</SelectItem>{modulos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{[["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["365", "1 ano"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{lista.length} registro(s)</p>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-2">Data</th><th className="text-left p-2">Usuário</th><th className="text-left p-2">Módulo</th><th className="text-left p-2">Ação</th><th className="text-left p-2">Detalhe</th></tr>
          </thead>
          <tbody>
            {lista.map(l => (
              <tr key={l.id} className="border-t border-border">
                <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-2 font-medium">{l.actor_name ?? "—"}</td>
                <td className="p-2"><Badge variant="secondary">{l.modulo}</Badge></td>
                <td className="p-2">{l.acao}</td>
                <td className="p-2 text-muted-foreground">{l.descricao ?? "—"}</td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum registro no período.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function AdminAuditoria() {
  return <RequirePermission perm="mod_auditoria"><Inner /></RequirePermission>;
}
