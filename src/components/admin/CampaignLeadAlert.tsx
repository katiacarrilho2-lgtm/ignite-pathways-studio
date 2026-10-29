import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Megaphone, BellOff, MessageCircle } from "lucide-react";

const sb = supabase as any;
const ORIGEM = "catalogo-competencia";
const KEY = "mp_campanha_lead_visto";

// Buzina: dois toques graves tipo "fon-fon"
const buzina = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.45].forEach((t) => {
      [370, 466].forEach((f) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sawtooth"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + t + 0.03);
        g.gain.setValueAtTime(0.12, ctx.currentTime + t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.38);
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
      });
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* som opcional */ }
};

export default function CampaignLeadAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [novos, setNovos] = useState<any[]>([]);
  const somRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, new Date().toISOString());
    const checar = async () => {
      const desde = localStorage.getItem(KEY)!;
      const { data } = await sb.from("crm_leads").select("id,nome,telefone,curso_interesse,created_at")
        .eq("origem", ORIGEM).gt("created_at", desde).order("created_at", { ascending: false }).limit(20);
      setNovos(data ?? []);
    };
    checar();
    const t = window.setInterval(checar, 20000);
    return () => window.clearInterval(t);
  }, [user]);

  // Toca a buzina a cada 8s enquanto houver lead não atendido
  useEffect(() => {
    if (novos.length === 0) { if (somRef.current) window.clearInterval(somRef.current); somRef.current = null; return; }
    if (somRef.current) return;
    buzina();
    somRef.current = window.setInterval(buzina, 8000);
    return () => { if (somRef.current) window.clearInterval(somRef.current); somRef.current = null; };
  }, [novos.length]);

  if (novos.length === 0) return null;
  const desligar = () => { localStorage.setItem(KEY, new Date().toISOString()); setNovos([]); };
  const l = novos[0];
  const tel = String(l.telefone || "").replace(/\D/g, "").replace(/^55/, "");

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(92vw,340px)] animate-pulse rounded-xl border-2 border-primary bg-card p-4 shadow-elegant ring-4 ring-primary/40">
      <div className="flex items-center gap-2 font-bold text-primary"><Megaphone className="size-5" />
        {novos.length === 1 ? "Novo lead da Campanha!" : `${novos.length} novos leads da Campanha!`}
      </div>
      <p className="mt-2 font-semibold">{l.nome}</p>
      <p className="text-sm text-muted-foreground">{l.telefone}</p>
      {l.curso_interesse && <p className="mt-1 text-sm line-clamp-2">{l.curso_interesse}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="whatsapp" asChild><a href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />Atender</a></Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/campanha-competencia")}>Ver todos</Button>
      </div>
      <Button size="sm" className="mt-2 w-full" onClick={desligar}><BellOff className="size-4" />Desligar alerta</Button>
    </div>
  );
}
