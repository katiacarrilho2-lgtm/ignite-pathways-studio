import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { sb, brl, clearCart, useStoreWhatsapp, waLink } from "@/lib/store";

// Nunca considera pago pelo redirecionamento: pede ao servidor que confirme na InfinitePay e lê o status gravado.
export default function Confirmacao() {
  const [q] = useSearchParams();
  const id = q.get("pedido"); const t = q.get("t");
  const [p, setP] = useState<any>(null);
  const whats = useStoreWhatsapp();

  useEffect(() => {
    if (!id || !t) return;
    let n = 0; let stop = false;
    const nsu = q.get("transaction_nsu"); const slug = q.get("slug");
    const tick = async () => {
      if (nsu && slug && n % 3 === 0) await sb.functions.invoke("store-infinitepay-webhook", { body: { order_nsu: id, transaction_nsu: nsu, slug, receipt_url: q.get("receipt_url") } }).catch(() => {});
      const { data } = await sb.rpc("store_pedido_publico", { _id: id, _token: t });
      setP(data);
      if (data?.status === "pago") { clearCart(); return; }
      if (!stop && ++n < 20) setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
  }, [id, t]);

  if (!p) return <div className="container py-24 text-center text-muted-foreground">Verificando seu pagamento…</div>;
  const pago = p.status === "pago";
  return (
    <div className="container max-w-xl py-16 text-center space-y-5">
      {pago ? <CheckCircle2 className="size-16 mx-auto text-whatsapp" /> : <Clock className="size-16 mx-auto text-gold" />}
      <h1 className="text-3xl font-extrabold">{pago ? "Pagamento confirmado!" : "Aguardando confirmação do pagamento"}</h1>
      <p className="text-muted-foreground text-lg">{pago ? "Recebemos sua matrícula. Nossa equipe dará continuidade ao processo." : "Assim que a InfinitePay confirmar, seu pedido será atualizado automaticamente."}</p>
      <div className="p-5 rounded-xl border border-border bg-card text-left space-y-1">
        <p className="font-semibold">Pedido {p.numero}</p>
        {(p.itens ?? []).map((i: any, k: number) => <p key={k} className="text-sm text-muted-foreground">{i.nome}</p>)}
        <p className="font-bold text-primary pt-2">{brl(p.total_cents)}</p>
      </div>
      {!pago && p.checkout_url && <Button asChild variant="hero" className="w-full h-12"><a href={p.checkout_url}>Voltar ao pagamento</a></Button>}
      <Button asChild className="w-full h-12 bg-whatsapp hover:bg-whatsapp/90 text-primary-foreground"><a href={waLink(whats, `Olá, fiz o pedido ${p.numero} na loja Multplick.`)} target="_blank" rel="noreferrer">Falar no WhatsApp</a></Button>
      <Button asChild variant="ghost" className="w-full h-12"><Link to="/loja">Voltar para a loja</Link></Button>
    </div>
  );
}
