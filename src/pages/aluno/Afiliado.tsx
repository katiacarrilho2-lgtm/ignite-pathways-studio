import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Users, DollarSign, Share2, Star, Trophy, Medal } from "lucide-react";

type Aff = { id: string; code: string; commission_pct: number; status: string; pix_key: string | null };
type Ref = {
  id: string; enrollment_id: string; valor_cents: number; commission_cents: number; status: string; created_at: string; paid_at: string | null;
  student_name?: string | null; course_title?: string | null; parcela_label?: string | null; comprovante_path?: string | null;
};
type ProgramSettings = { star_every: number; milestone_enrollments: number; milestone_reward: string | null };
type RankingRow = { affiliate_id: string; display_name: string; paid_enrollments: number };
type Message = { id: string; title: string; body: string; created_at: string };

export default function AlunoAfiliado() {
  const { user } = useAuth();
  const [aff, setAff] = useState<Aff | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ProgramSettings>({ star_every: 5, milestone_enrollments: 30, milestone_reward: null });
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      setAff(data as Aff | null);
      if (data?.id) {
        const [{ data: r }, { data: program }, { data: rank }, { data: notices }] = await Promise.all([
          supabase.from("affiliate_referrals").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }),
          supabase.from("affiliate_program_settings").select("star_every,milestone_enrollments,milestone_reward").eq("singleton", true).maybeSingle(),
          supabase.from("affiliate_public_stats").select("affiliate_id,display_name,paid_enrollments").order("paid_enrollments", { ascending: false }).limit(10),
          supabase.from("affiliate_messages").select("id,title,body,created_at").or(`affiliate_id.eq.${data.id},affiliate_id.is.null`).order("created_at", { ascending: false }).limit(5),
        ]);
        setRefs((r ?? []) as Ref[]);
        if (program) setSettings(program);
        setRanking((rank ?? []) as RankingRow[]);
        setMessages((notices ?? []) as Message[]);
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
  const paidEnrollments = new Set(refs.filter((r) => r.valor_cents > 0).map((r) => r.enrollment_id)).size;
  const stars = Math.floor(paidEnrollments / Math.max(settings.star_every, 1));
  const milestoneProgress = Math.min(100, Math.round((paidEnrollments / Math.max(settings.milestone_enrollments, 1)) * 100));

  const copy = async () => { await navigator.clipboard.writeText(link); toast.success("Link copiado!"); };
  const verComprovante = async (path: string) => {
    const { data } = await supabase.storage.from("comprovantes").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank"); else toast.error("Comprovante indisponível");
  };
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

      <section className="border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div><h2 className="text-xl font-bold text-primary flex items-center gap-2"><Trophy className="size-5" /> Minha evolução</h2><p className="text-sm text-muted-foreground">Cada {settings.star_every} matrículas recebidas vale uma estrela.</p></div>
          <div className="flex items-center gap-1 text-primary font-bold"><Star className="size-5 fill-current" /> {stars} {stars === 1 ? "estrela" : "estrelas"}</div>
        </div>
        <div className="h-3 bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${milestoneProgress}%` }} /></div>
        <div className="flex justify-between gap-3 text-sm"><span>{paidEnrollments} de {settings.milestone_enrollments} matrículas</span><strong>{settings.milestone_reward || "Prêmio a definir"}</strong></div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="border border-border bg-card p-5 space-y-3">
          <h2 className="font-bold text-primary flex items-center gap-2"><Medal className="size-5" /> Ranking</h2>
          {ranking.map((row, index) => <div key={row.affiliate_id} className="flex items-center justify-between border-t border-border pt-2"><span>{index + 1}. {row.display_name}{row.affiliate_id === aff.id ? " (você)" : ""}</span><strong>{row.paid_enrollments}</strong></div>)}
          {ranking.length === 0 && <p className="text-sm text-muted-foreground">O ranking começa no primeiro recebimento.</p>}
        </section>
        <section className="border border-border bg-card p-5 space-y-3">
          <h2 className="font-bold text-primary">Recados da equipe</h2>
          {messages.map((message) => <div key={message.id} className="border-t border-border pt-2"><p className="font-medium">{message.title}</p><p className="text-sm text-muted-foreground">{message.body}</p></div>)}
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhum recado novo.</p>}
        </section>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr><th className="text-left p-3">Data</th><th className="text-left p-3">Aluno / Curso</th><th className="text-left p-3">Parcela</th><th className="text-left p-3">Valor recebido</th><th className="text-left p-3">Comissão</th><th className="text-left p-3">Status</th><th className="text-left p-3">Comprovante</th></tr>
          </thead>
          <tbody>
            {refs.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3"><p className="font-medium">{r.student_name ?? "—"}</p><p className="text-xs text-muted-foreground">{r.course_title ?? ""}</p></td>
                <td className="p-3 text-muted-foreground">{r.parcela_label ?? "—"}</td>
                <td className="p-3">R$ {(r.valor_cents / 100).toFixed(2)}</td>
                <td className="p-3 font-semibold">R$ {(r.commission_cents / 100).toFixed(2)}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">
                  {r.comprovante_path
                    ? <Button size="sm" variant="ghost" onClick={() => verComprovante(r.comprovante_path!)}>Ver</Button>
                    : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
            {refs.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma indicação ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
