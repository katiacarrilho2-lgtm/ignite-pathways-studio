import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Lock, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { sb, StoreProduct, brl, precoVigente, promoValida, useCart, removeFromCart, clearCart, getOrigem, setSeo } from "@/lib/store";
import { maskCpf, isValidCpf, onlyDigits } from "@/lib/cpf";
import { useAuth } from "@/hooks/useAuth";

const STEPS = ["Carrinho", "Identificação", "Pagamento", "Confirmação"];
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const maskPhone = (v: string) => { const d = onlyDigits(v).slice(0, 11); return d.length <= 10 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3"); };

export default function Carrinho() {
  const cart = useCart();
  const { user } = useAuth();
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [step, setStep] = useState(0);
  const [cupom, setCupom] = useState("");
  const [f, setF] = useState({ nome: "", cpf: "", nascimento: "", email: "", whatsapp: "", cidade: "", estado: "" });
  const [busy, setBusy] = useState(false);
  const [pedido, setPedido] = useState<any>(null);
  const idem = useRef<string>(crypto.randomUUID());

  useEffect(() => { setSeo("Carrinho | Loja Multplick"); }, []);
  useEffect(() => { if (user?.email && !f.email) setF((x) => ({ ...x, email: user.email! })); }, [user]);
  useEffect(() => {
    if (!cart.length) { setItems([]); return; }
    sb.from("store_products").select("*").in("id", cart).then(({ data }: any) => setItems((data ?? []).filter((p: StoreProduct) => p.tipo_venda === "compra_direta" && precoVigente(p))));
  }, [cart.join(",")]);
  const total = useMemo(() => items.reduce((s, p) => s + (precoVigente(p) ?? 0), 0), [items]);
  const precisaNascimento = false;

  const identificar = () => {
    if (f.nome.trim().split(/\s+/).length < 2) return toast.error("Informe o nome completo");
    if (!isValidCpf(f.cpf)) return toast.error("CPF inválido");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast.error("E-mail inválido");
    if (onlyDigits(f.whatsapp).length < 10) return toast.error("WhatsApp inválido");
    if (!f.cidade.trim() || !f.estado) return toast.error("Informe cidade e estado");
    setStep(2);
  };

  const pagar = async () => {
    setBusy(true);
    try {
      let ped = pedido;
      if (!ped) {
        const { data, error } = await sb.rpc("store_criar_pedido", {
          _itens: items.map((i) => i.id), _cliente: { ...f, cpf: onlyDigits(f.cpf), whatsapp: onlyDigits(f.whatsapp) },
          _cupom: cupom || null, _origem: getOrigem(), _idem: idem.current,
        });
        if (error) throw new Error(error.message);
        ped = data; setPedido(data);
      }
      const { data: ck, error: e2 } = await supabaseInvoke(ped);
      if (e2 || !ck?.url) {
        setStep(3);
        toast.message(ck?.code === "not_configured" || /configurado/i.test(ck?.error ?? "") ? "Pedido registrado. O pagamento online ainda não foi configurado — nossa equipe entrará em contato." : (ck?.error || "Não foi possível abrir o pagamento agora."));
        return;
      }
      clearCart();
      window.location.href = ck.url;
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const supabaseInvoke = async (ped: any) => {
    const { data, error } = await sb.functions.invoke("store-create-checkout", { body: { order_id: ped.id, token: ped.token, origin: window.location.origin } });
    if (error) { let body: any = null; try { body = await error.context?.json?.(); } catch {} return { data: body, error }; }
    return { data, error: null };
  };

  if (!cart.length && !pedido) return (
    <div className="container py-24 text-center space-y-4">
      <ShoppingCart className="size-12 mx-auto text-muted-foreground" />
      <p className="text-xl font-semibold">Seu carrinho está vazio.</p>
      <Button asChild variant="hero" className="h-12"><Link to="/loja">Ver cursos</Link></Button>
    </div>
  );

  return (
    <div className="container max-w-3xl py-8 md:py-12">
      <ol className="flex items-center gap-1 mb-8 text-xs sm:text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1 flex flex-col items-center gap-1 text-center">
            <span className={`size-8 rounded-full grid place-items-center font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
            <span className={i === step ? "font-semibold text-foreground" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              {p.imagem_url && <img src={p.imagem_url} alt={p.imagem_alt || p.nome} className="size-16 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0"><p className="font-semibold break-words">{p.nome}</p>
                {promoValida(p) && <p className="text-xs text-muted-foreground line-through">{brl(p.preco_cents)}</p>}
                <p className="font-bold text-primary">{brl(precoVigente(p))}</p></div>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Remover" onClick={() => removeFromCart(p.id)}><Trash2 className="size-5" /></Button>
            </div>
          ))}
          <div className="flex gap-2"><Input className="h-12" placeholder="Cupom de desconto (opcional)" value={cupom} onChange={(e) => setCupom(e.target.value.toUpperCase())} /></div>
          <p className="text-xs text-muted-foreground">O cupom é validado na finalização do pedido.</p>
          <div className="flex justify-between text-lg font-bold pt-2"><span>Total</span><span className="text-primary">{brl(total)}</span></div>
          <Button variant="hero" className="w-full h-14 text-base" disabled={!items.length} onClick={() => setStep(1)}>Continuar</Button>
          <Button asChild variant="ghost" className="w-full h-12"><Link to="/loja">Continuar comprando</Link></Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1"><Label>Nome completo *</Label><Input className="h-12" autoComplete="name" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="space-y-1"><Label>CPF *</Label><Input className="h-12" inputMode="numeric" value={f.cpf} onChange={(e) => setF({ ...f, cpf: maskCpf(e.target.value) })} /></div>
            {precisaNascimento && <div className="space-y-1"><Label>Data de nascimento</Label><Input className="h-12" type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></div>}
            <div className="space-y-1"><Label>WhatsApp *</Label><Input className="h-12" inputMode="tel" autoComplete="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: maskPhone(e.target.value) })} /></div>
            <div className="sm:col-span-2 space-y-1"><Label>E-mail *</Label><Input className="h-12" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cidade *</Label><Input className="h-12" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></div>
            <div className="space-y-1"><Label>Estado *</Label>
              <select className="h-12 w-full rounded-md border border-input bg-background px-3" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
                <option value="">Selecione</option>{UFS.map((u) => <option key={u}>{u}</option>)}
              </select></div>
          </div>
          <Button variant="hero" className="w-full h-14 text-base" onClick={identificar}>Continuar para pagamento</Button>
          <Button variant="ghost" className="w-full h-12" onClick={() => setStep(0)}>Voltar</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-border bg-card space-y-2">
            <p className="font-semibold">Resumo</p>
            {items.map((p) => <div key={p.id} className="flex justify-between gap-3 text-sm"><span className="break-words">{p.nome}</span><span className="shrink-0">{brl(precoVigente(p))}</span></div>)}
            {cupom && <p className="text-sm text-muted-foreground">Cupom: {cupom} (aplicado ao gerar o pedido)</p>}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{pedido ? brl(pedido.total_cents) : brl(total)}</span></div>
            <p className="text-sm text-muted-foreground pt-2">{f.nome} · {f.email}</p>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Lock className="size-4" />Você será levado ao ambiente seguro da InfinitePay (Pix ou cartão).</p>
          <Button className="w-full h-14 text-base bg-whatsapp hover:bg-whatsapp/90 text-primary-foreground" disabled={busy} onClick={pagar}>{busy ? "Gerando pagamento…" : "Ir para o pagamento"}</Button>
          <Button variant="ghost" className="w-full h-12" onClick={() => setStep(1)}>Voltar</Button>
        </div>
      )}

      {step === 3 && pedido && (
        <div className="text-center space-y-4 py-8">
          <p className="text-2xl font-bold">Pedido {pedido.numero} registrado</p>
          <p className="text-muted-foreground">Total: {brl(pedido.total_cents)} · Aguardando pagamento.</p>
          <p className="text-muted-foreground">Nossa equipe entrará em contato pelo WhatsApp para concluir.</p>
          <Button asChild variant="hero" className="h-12"><Link to="/loja">Voltar para a loja</Link></Button>
        </div>
      )}
    </div>
  );
}
