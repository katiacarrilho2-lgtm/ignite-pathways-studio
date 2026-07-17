import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, Stage, fmtBRL } from "@/lib/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import * as XLSX from "xlsx";

type Lead = any;

type Group = { key: string; label: string; stages: Stage[] };

const GROUPS: Group[] = [
  { key: "matriculado", label: "Matriculados", stages: ["matriculado"] },
  { key: "proximo_mes", label: "Próximo mês", stages: ["proximo_mes"] },
  { key: "andamento", label: "Em andamento", stages: ["novo", "lead", "fechamento"] },
  { key: "cancelado", label: "Cancelados", stages: ["cancelado"] },
];

const stageLabel = (k: string) => STAGES.find(s => s.key === k)?.label || k;

export default function CrmListagem() {
  const { user, isMaster } = useAuth();
  const { byId } = useCrmSellers();
  const canSeeAll = isMaster;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<string>("matriculado");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("crm_leads").select("*").order("updated_at", { ascending: false });
    if (error) return toast.error(error.message);
    setLeads(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("crm-listagem")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_leads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const scoped = useMemo(() => leads.filter(l => canSeeAll || l.owner_id === user?.id), [leads, canSeeAll, user?.id]);

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    GROUPS.forEach(g => {
      map[g.key] = scoped.filter(l => g.stages.includes(l.estagio));
    });
    return map;
  }, [scoped]);

  const filtered = (rows: Lead[]) => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(l => `${l.nome} ${l.telefone || ""} ${l.email || ""}`.toLowerCase().includes(q));
  };

  const exportGroup = (group: Group) => {
    const rows = filtered(grouped[group.key] || []).map(l => ({
      Nome: l.nome,
      Telefone: l.telefone || "",
      Email: l.email || "",
      Estágio: stageLabel(l.estagio),
      Etiqueta: l.etiqueta || "",
      "Valor (R$)": ((l.valor_cents || 0) / 100).toFixed(2).replace(".", ","),
      Vendedor: byId(l.owner_id)?.display_name || "",
      "Motivo cancelamento": l.motivo_cancelamento || "",
      "Data cancelamento": l.data_cancelamento || "",
      Criado: l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "",
      "Última atualização": l.updated_at ? new Date(l.updated_at).toLocaleString("pt-BR") : "",
      "Mudança de estágio": l.stage_changed_at ? new Date(l.stage_changed_at).toLocaleString("pt-BR") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, group.label.slice(0, 30));
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `crm-${group.key}-${stamp}.xlsx`);
    toast.success(`Excel exportado (${rows.length} leads)`);
  };

  const exportAll = () => {
    const wb = XLSX.utils.book_new();
    GROUPS.forEach(group => {
      const rows = (grouped[group.key] || []).map(l => ({
        Nome: l.nome,
        Telefone: l.telefone || "",
        Email: l.email || "",
        Estágio: stageLabel(l.estagio),
        Etiqueta: l.etiqueta || "",
        "Valor (R$)": ((l.valor_cents || 0) / 100).toFixed(2).replace(".", ","),
        Vendedor: byId(l.owner_id)?.display_name || "",
        "Motivo cancelamento": l.motivo_cancelamento || "",
        "Data cancelamento": l.data_cancelamento || "",
        Criado: l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "",
        "Última atualização": l.updated_at ? new Date(l.updated_at).toLocaleString("pt-BR") : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Nome: "(vazio)" }]);
      XLSX.utils.book_append_sheet(wb, ws, group.label.slice(0, 30));
    });
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `crm-leads-completo-${stamp}.xlsx`);
    toast.success("Excel completo exportado");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Listagem de leads</h2>
          <p className="text-sm text-muted-foreground">Backup e visão separada por situação. Exporte para Excel a qualquer momento.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 w-56" />
          </div>
          <Button variant="outline" onClick={exportAll}><Download className="size-4" />Exportar tudo</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {GROUPS.map(g => (
            <TabsTrigger key={g.key} value={g.key} className="gap-2">
              {g.label}
              <span className="text-[10px] bg-secondary text-foreground/70 px-1.5 py-0.5 rounded font-semibold">{grouped[g.key]?.length ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {GROUPS.map(g => {
          const rows = filtered(grouped[g.key] || []);
          const total = rows.reduce((s, l) => s + (l.valor_cents || 0), 0);
          return (
            <TabsContent key={g.key} value={g.key} className="mt-4">
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/40">
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{rows.length} leads</span>
                    <span className="text-muted-foreground"> · Total {fmtBRL(total)}</span>
                  </div>
                  <Button size="sm" variant="hero" onClick={() => exportGroup(g)}>
                    <Download className="size-4" />Exportar Excel
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Telefone</th>
                        <th className="text-left p-2">E-mail</th>
                        <th className="text-left p-2">Estágio</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-left p-2">Vendedor</th>
                        {g.key === "cancelado" && <th className="text-left p-2">Motivo</th>}
                        <th className="text-left p-2">Atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(l => (
                        <tr key={l.id} className="border-t border-border hover:bg-secondary/30">
                          <td className="p-2 font-medium">{l.nome}</td>
                          <td className="p-2">{l.telefone || "—"}</td>
                          <td className="p-2">{l.email || "—"}</td>
                          <td className="p-2">{stageLabel(l.estagio)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-700">{fmtBRL(l.valor_cents)}</td>
                          <td className="p-2">{byId(l.owner_id)?.display_name || "—"}</td>
                          {g.key === "cancelado" && <td className="p-2 text-xs text-muted-foreground">{l.motivo_cancelamento || "—"}</td>}
                          <td className="p-2 text-xs text-muted-foreground">{l.updated_at ? new Date(l.updated_at).toLocaleDateString("pt-BR") : "—"}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td colSpan={g.key === "cancelado" ? 8 : 7} className="p-6 text-center text-muted-foreground">Nenhum lead nesta categoria</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}