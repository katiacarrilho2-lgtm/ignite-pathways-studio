import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RepassesTabela from "@/components/rede/RepassesTabela";

type Regra = {
  id: string; escopo: string; course_title: string | null; categoria_nome: string | null; instituicao: string | null;
  preco_minimo_cents: number; preco_sugerido_cents: number; tipo_regra: string; percentual: number; valor_fixo_cents: number;
};
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function descreve(r: Regra) {
  if (r.tipo_regra === "valor_fixo_multplick") return r.valor_fixo_cents ? `${brl(r.valor_fixo_cents)} por matrícula` : "A definir";
  if (r.tipo_regra === "percentual_multplick") return `${Number(r.percentual)}% do preço de tabela`;
  return `Você fica com ${Number(r.percentual)}% do recebido`;
}

export default function PoloRepasses() {
  const [regras, setRegras] = useState<Regra[]>([]);
  useEffect(() => {
    supabase.rpc("polo_regras_visiveis").then(({ data }) => setRegras((data ?? []) as any));
  }, []);

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Minhas regras e repasses</h1>
        <p className="text-muted-foreground">Quanto você repassa à Multplick por matrícula aprovada.</p>
      </header>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Regras comerciais</CardTitle>
          <CardDescription>Definidas pela Matriz. Uso interno — não divulgue ao aluno.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
              <th className="py-2 pr-3">Aplica-se a</th><th className="pr-3">Repasse</th><th className="pr-3">Preço mínimo</th><th>Preço sugerido</th></tr></thead>
            <tbody>
              {regras.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhuma regra cadastrada.</td></tr>}
              {regras.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{r.course_title ?? r.categoria_nome ?? r.instituicao ?? "—"}</td>
                  <td className="pr-3">{descreve(r)}</td>
                  <td className="pr-3">{r.preco_minimo_cents ? brl(r.preco_minimo_cents) : "—"}</td>
                  <td>{r.preco_sugerido_cents ? brl(r.preco_sugerido_cents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Repasses por matrícula</CardTitle></CardHeader>
        <CardContent><RepassesTabela /></CardContent>
      </Card>
    </div>
  );
}
