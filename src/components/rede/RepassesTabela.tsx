import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

type Repasse = {
  id: string; account_id: string; aluno: string | null; curso: string | null;
  valor_cents: number; status: string; recebido_em: string | null; created_at: string;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

/** Repasses devidos à Multplick por matrícula aprovada. `podeBaixar` = Matriz. */
export default function RepassesTabela({ podeBaixar = false, poloNome }: { podeBaixar?: boolean; poloNome?: (id: string) => string }) {
  const [rows, setRows] = useState<Repasse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("rede_repasses" as any).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const marcar = async (r: Repasse, recebido: boolean) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("rede_repasses" as any).update({
      status: recebido ? "recebido" : "pendente",
      recebido_em: recebido ? new Date().toISOString() : null,
      recebido_por: recebido ? u.user?.id : null,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const editarValor = async (r: Repasse) => {
    const atual = r.valor_cents ? (r.valor_cents / 100).toFixed(2).replace(".", ",") : "";
    const v = window.prompt(`Valor do repasse para ${r.aluno ?? "aluno"} (R$):`, atual);
    if (v === null) return;
    const cents = Math.round(parseFloat((v || "0").replace(/\./g, "").replace(",", ".")) * 100) || 0;
    const { error } = await supabase.from("rede_repasses" as any).update({ valor_cents: cents }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Valor atualizado");
    load();
  };

  const pendente = rows.filter((r) => r.status === "pendente").reduce((s, r) => s + r.valor_cents, 0);
  const recebido = rows.filter((r) => r.status === "recebido").reduce((s, r) => s + r.valor_cents, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">A repassar</div><div className="text-xl font-bold">{brl(pendente)}</div></div>
        <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Já repassado</div><div className="text-xl font-bold">{brl(recebido)}</div></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <th className="py-2 pr-3">Aprovada em</th>{poloNome && <th className="pr-3">Polo</th>}<th className="pr-3">Aluno</th><th className="pr-3">Curso</th>
            <th className="pr-3">Repasse</th><th className="pr-3">Situação</th>{podeBaixar && <th className="text-right">Ação</th>}</tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum repasse ainda. Eles aparecem quando a Matriz aprova uma pré-matrícula.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-2 pr-3 text-xs text-muted-foreground">{dataBr(r.created_at)}</td>
                {poloNome && <td className="pr-3">{poloNome(r.account_id)}</td>}
                <td className="pr-3 font-medium">{r.aluno ?? "—"}</td>
                <td className="pr-3 text-muted-foreground">{r.curso ?? "—"}</td>
                <td className="pr-3 font-semibold whitespace-nowrap">
                  {r.valor_cents ? brl(r.valor_cents) : "A definir"}
                  {podeBaixar && (
                    <Button size="sm" variant="ghost" className="ml-1 h-7 px-2" onClick={() => editarValor(r)} aria-label="Editar valor">
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </td>
                <td className="pr-3 text-xs">{r.status === "recebido" ? `Repassado em ${dataBr(r.recebido_em)}` : "Pendente"}</td>
                {podeBaixar && <td className="text-right">
                  <Button size="sm" variant="outline" onClick={() => marcar(r, r.status !== "recebido")}>
                    {r.status === "recebido" ? "Desfazer" : "Marcar recebido"}
                  </Button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
