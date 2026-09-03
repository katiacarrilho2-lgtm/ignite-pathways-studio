import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Percent, HandCoins } from "lucide-react";

type Resumo = { recebido_cents: number; elegivel_cents: number; repasse_previsto_cents: number };
type RegraVisivel = {
  id: string; escopo: string; course_title: string | null; categoria_nome: string | null;
  instituicao: string | null; preco_minimo_cents: number; preco_sugerido_cents: number;
  tipo_regra: string; percentual: number; valor_fixo_cents: number;
};

const brl = (c?: number | null) => ((c ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Visão comercial do Polo: recebido no mês, valor elegível e repasse previsto.
 * O custo interno da Multplick nunca é retornado pelas RPCs usadas aqui.
 */
export default function PoloComercialResumo({ accountId }: { accountId?: string | null }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [regras, setRegras] = useState<RegraVisivel[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ym = new Date().toISOString().slice(0, 7);
      const [r, g] = await Promise.all([
        supabase.rpc("polo_resumo_comercial", accountId ? { _ym: ym, _account: accountId } : { _ym: ym }),
        supabase.rpc("polo_regras_visiveis"),
      ]);
      if (!alive) return;
      setResumo(((r.data as any[]) ?? [])[0] ?? null);
      setRegras(((g.data as any[]) ?? []) as RegraVisivel[]);
    })();
    return () => { alive = false; };
  }, [accountId]);

  const cards = [
    { label: "Recebido no mês", value: brl(resumo?.recebido_cents), icon: Wallet, cls: "text-emerald-600" },
    { label: "Elegível para comissão", value: brl(resumo?.elegivel_cents), icon: Percent, cls: "text-primary" },
    { label: "Repasse previsto do Polo", value: brl(resumo?.repasse_previsto_cents), icon: HandCoins, cls: "text-amber-600" },
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><c.icon className={`size-4 ${c.cls}`} /> {c.label}</div>
            <p className="text-2xl font-bold mt-1 tabular-nums">{c.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Previsão calculada apenas sobre parcelas <b>pagas</b> no mês. Parcela em aberto não gera comissão.
        Fechamento, nota fiscal e pagamento ao Polo não fazem parte desta visão.
      </p>

      {regras.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sua condição comercial</CardTitle>
            <CardDescription>Preço sugerido, preço mínimo permitido e condição por curso/categoria.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Curso / Categoria</th>
                  <th className="text-right p-2">Preço sugerido</th>
                  <th className="text-right p-2">Preço mínimo</th>
                  <th className="text-left p-2">Condição</th>
                </tr>
              </thead>
              <tbody>
                {regras.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{r.course_title ?? r.categoria_nome ?? r.instituicao ?? "—"}</td>
                    <td className="p-2 text-right">{brl(r.preco_sugerido_cents)}</td>
                    <td className="p-2 text-right font-medium">{brl(r.preco_minimo_cents)}</td>
                    <td className="p-2">{r.tipo_regra === "percentual_licenciado" ? `${Number(r.percentual)}% sobre o recebido` : `${brl(r.valor_fixo_cents)} por aluno à Multplick`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
