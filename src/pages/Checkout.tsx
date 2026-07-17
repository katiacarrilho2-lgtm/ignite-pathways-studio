import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tag, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Course = { id: string; slug: string; title: string; description: string | null; price_cents: number | null; image_url: string | null };

const fmt = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sp] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(sp.get("cupom")?.toUpperCase() ?? "");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id,slug,title,description,price_cents,image_url").eq("slug", slug!).maybeSingle();
      setCourse(data as Course);
    })();
  }, [slug]);

  const finalCents = (() => {
    if (!course?.price_cents) return 0;
    if (!appliedCoupon) return course.price_cents;
    if (appliedCoupon.discount_type === "percent") return Math.max(100, Math.round(course.price_cents * (1 - appliedCoupon.discount_value / 100)));
    return Math.max(100, course.price_cents - appliedCoupon.discount_value * 100);
  })();

  const validate = async () => {
    if (!code.trim()) return;
    setChecking(true);
    const { data } = await supabase.rpc("validate_coupon", {
      _code: code.trim().toUpperCase(),
      _course_id: (course?.id ?? undefined) as string | undefined,
    });
    const row = Array.isArray(data) ? data[0] : data;
    setChecking(false);
    if (!row || !row.valid) {
      const map: Record<string, string> = {
        invalid: "Cupom inválido",
        expired: "Cupom expirado",
        exhausted: "Cupom esgotado",
        wrong_course: "Cupom não vale para este curso",
      };
      return toast.error(map[row?.reason ?? "invalid"] ?? "Cupom inválido");
    }
    setAppliedCoupon(row);
    toast.success(`Cupom ${row.code} aplicado!`);
  };

  const pay = async () => {
    if (!course) return;
    if (!name || !email) return toast.error("Preencha nome e e-mail");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { course_id: course.id, payer: { name, email, phone }, coupon_code: appliedCoupon?.code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.location.href = data.init_point ?? data.sandbox_init_point;
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao iniciar pagamento");
      setLoading(false);
    }
  };

  if (!course) return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Carregando…</div>;

  return (
    <section className="py-12 md:py-20 bg-secondary/30 min-h-[80vh]">
      <div className="container max-w-5xl">
        <div className="grid md:grid-cols-[1fr,400px] gap-8">
          {/* Produto */}
          <Card className="p-6 md:p-8 space-y-6">
            <div className="flex gap-4">
              {course.image_url && <img src={course.image_url} alt="" className="w-28 h-28 rounded-lg object-cover" />}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-primary">{course.title}</h1>
                <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h2 className="font-semibold text-lg">Seus dados</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Nome completo *</Label><Input value={name} onChange={e=>setName(e.target.value)} /></div>
                <div><Label>E-mail *</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div className="md:col-span-2"><Label>WhatsApp</Label><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000" /></div>
              </div>
            </div>
          </Card>

          {/* Resumo */}
          <Card className="p-6 space-y-5 h-fit md:sticky md:top-24">
            <h2 className="font-semibold text-lg">Resumo do pedido</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(course.price_cents ?? 0)}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Cupom {appliedCoupon.code}</span>
                  <span>- {fmt((course.price_cents ?? 0) - finalCents)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t">
              <Label className="flex items-center gap-1.5 text-xs"><Tag className="size-3.5" /> Cupom de desconto</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="DESCONTO10" disabled={!!appliedCoupon} />
                {appliedCoupon ? (
                  <Button variant="outline" onClick={()=>{setAppliedCoupon(null); setCode("");}}>Remover</Button>
                ) : (
                  <Button variant="outline" onClick={validate} disabled={checking || !code.trim()}>{checking?"...":"Aplicar"}</Button>
                )}
              </div>
              {appliedCoupon && <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1.5"><CheckCircle2 className="size-3" /> Cupom aplicado</p>}
            </div>

            <div className="pt-3 border-t flex justify-between items-end">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-3xl font-bold text-primary">{fmt(finalCents)}</span>
            </div>

            <Button onClick={pay} disabled={loading} className="w-full h-12 text-base" variant="hero">
              {loading ? "Redirecionando..." : <>Pagar com Mercado Pago <ArrowRight className="size-4 ml-1" /></>}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <ShieldCheck className="size-3" /> Pagamento processado pelo Mercado Pago
            </p>
            <Link to="/cursos" className="block text-xs text-center text-muted-foreground hover:text-primary">← Ver outros cursos</Link>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Checkout;