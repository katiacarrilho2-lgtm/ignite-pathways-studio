import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/cursoLivre";

type Row = {
  id: string; numero_pedido: string | null; valor_final_cents: number; status: string;
  created_at: string; courses: { title: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
  expirado: "Expirado",
};

const MinhasCompras = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("livre_orders")
        .select("id, numero_pedido, valor_final_cents, status, created_at, courses(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (alive) { setRows((data ?? []) as unknown as Row[]); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><ShoppingBag className="size-6" /> Minhas compras</h1>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Você ainda não tem pedidos registrados.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">{r.courses?.title ?? "Curso"}</p>
                <Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>Pedido: <strong className="text-foreground">{r.numero_pedido ?? "—"}</strong></span>
                <span>Valor: <strong className="text-foreground">{formatBRL(r.valor_final_cents)}</strong></span>
                <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              {r.status === "aguardando" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Avaliação e certificado ficam disponíveis somente após a confirmação do pagamento.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhasCompras;
