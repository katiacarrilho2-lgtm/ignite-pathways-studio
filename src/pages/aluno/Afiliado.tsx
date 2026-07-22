import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Users, DollarSign, Share2 } from "lucide-react";

type Aff = { id: string; code: string; commission_pct: number; status: string; pix_key: string | null };
type Ref = { id: string; valor_cents: number; commission_cents: number; status: string; created_at: string; paid_at: string | null };

export default function AlunoAfiliado() {
  const { user } = useAuth();
  const [aff, setAff] = useState<Aff | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      setAff(data as Aff | null);
      if (data?.id) {
        const { data: r } = await supabase.from("affiliate_referrals").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false });
        setRefs((r ?? []) as Ref[]);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  if (!aff) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader><CardTitle>Programa de Afiliados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">Você ainda não está cadastrado como afiliado. Fale com nossa equipe para participar do programa e começar a receber comissões pelas suas indicações.</p>
            <Button asChild variant="hero"><a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer">Quero ser afiliado</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const link = `${window.location.origin}/?ref=${aff.code}`;
  const totalPend = refs.filter((r) => r.status === "pendente").reduce((s, r) => s + (r.commission_cents ?? 0), 0);
  const totalPago = refs.filter((r) => r.status === "pago").reduce((s, r) => s + (r.commission_cents ?? 0), 0);

  const copy = async () => { await navigator.clipboard.writeText(link); toast.success("Link copiado!"); };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Multplick", url: link }); } catch { /* */ } }
    else copy();
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Meu programa de afiliados</h1>
        <p className="text-muted-foreground">Compartilhe seu link e receba comissão de {aff.commission_pct}% por cada matrícula.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seu link de indicação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <code className="flex-1 bg-secondary/60 rounded px-3 py-2 text-sm font-mono truncate">{link}</code>
            <Button variant="outline" onClick={copy}><Copy className="size-4" /></Button>
            <Button variant="hero" onClick={share}><Share2 className="size-4" /> Compartilhar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Código: <span className="font-mono font-bold">{aff.code}</span> · Status: {aff.status} · PIX: {aff.pix_key ?? "não cadastrado"}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="size-3" /> Indicações</div><div className="text-2xl font-bold text-primary">{refs.length}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="size-3" /> A receber</div><div className="text-2xl font-bold text-amber-600">R$ {(totalPend / 100).toFixed(2)}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="size-3" /> Recebido</div><div className="text-2xl font-bold text-emerald-600">R$ {(totalPago / 100).toFixed(2)}</div></div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr><th className="text-left p-3">Data</th><th className="text-left p-3">Valor da venda</th><th className="text-left p-3">Comissão</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody>
            {refs.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3">R$ {(r.valor_cents / 100).toFixed(2)}</td>
                <td className="p-3 font-semibold">R$ {(r.commission_cents / 100).toFixed(2)}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
            {refs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma indicação ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
