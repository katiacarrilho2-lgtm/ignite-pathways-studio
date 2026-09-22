import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cursoLivre";
import { iniciarPagamentoLivre } from "@/lib/livre";

type Row = {
  id: string; numero_pedido: string | null; valor_final_cents: number; status: string;
  created_at: string; course_id: string | null;
  courses: { title: string; exige_avaliacao: boolean | null } | null;
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
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState<string | null>(null);
  const retorno = params.get("status");

  const carregar = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("livre_orders")
      .select("id, numero_pedido, valor_final_cents, status, created_at, course_id, courses(title, exige_avaliacao)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Voltando do Mercado Pago a confirmação pode levar alguns segundos: reconsulta algumas vezes.
  useEffect(() => {
    if (!retorno || !user) return;
    let n = 0;
    const t = setInterval(() => { n += 1; carregar(); if (n >= 5) clearInterval(t); }, 4000);
    return () => clearInterval(t);
  }, [retorno, user?.id, carregar]);

  const pagar = async (orderId: string) => {
    setPagando(orderId);
    const pg = await iniciarPagamentoLivre(orderId);
    setPagando(null);
    if (pg.url) window.location.href = pg.url;
    else toast.error(pg.error ?? "Pagamento indisponível no momento.");
  };

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><ShoppingBag className="size-6" /> Minhas compras</h1>

      {retorno === "pendente" && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          <Clock className="size-4" /> Estamos aguardando a confirmação do pagamento. Esta página atualiza sozinha.
        </p>
      )}
      {retorno === "falha" && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          O pagamento não foi concluído. Você pode tentar novamente pelo botão do pedido abaixo.
        </p>
      )}

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
                <Badge variant={r.status === "pago" ? "default" : "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>Pedido: <strong className="text-foreground">{r.numero_pedido ?? "—"}</strong></span>
                <span>Valor: <strong className="text-foreground">{formatBRL(r.valor_final_cents)}</strong></span>
                <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
              </div>

              {r.status === "aguardando" && (
                <>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Avaliação e certificado ficam disponíveis somente após a confirmação do pagamento.
                  </p>
                  <Button className="mt-3 h-11 w-full sm:w-auto" variant="hero" disabled={pagando === r.id} onClick={() => pagar(r.id)}>
                    {pagando === r.id ? <Loader2 className="size-4 animate-spin" /> : "PAGAR AGORA"}
                  </Button>
                </>
              )}

              {r.status === "pago" && (
                <div className="mt-3 rounded-lg bg-secondary p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <CheckCircle2 className="size-4" /> PAGAMENTO CONFIRMADO!
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.courses?.exige_avaliacao
                      ? "Seu acesso foi liberado automaticamente e sua avaliação já está disponível."
                      : "Seu acesso ao curso foi liberado automaticamente."}
                  </p>
                  {r.courses?.exige_avaliacao ? (
                    <Button className="mt-3 h-11 w-full sm:w-auto" variant="hero" disabled>
                      INICIAR AVALIAÇÃO
                    </Button>
                  ) : (
                    <Button asChild className="mt-3 h-11 w-full sm:w-auto" variant="hero">
                      <Link to="/aluno">ACESSAR MEU PAINEL</Link>
                    </Button>
                  )}
                  {r.courses?.exige_avaliacao && (
                    <p className="mt-2 text-xs text-muted-foreground">A tela da avaliação entra no ar na próxima etapa.</p>
                  )}
                </div>
              )}

              {r.status === "reembolsado" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pagamento estornado. O acesso ficou suspenso, mas o histórico do pedido é mantido.
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
