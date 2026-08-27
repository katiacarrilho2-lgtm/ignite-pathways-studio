import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Send, BellOff, Bell, MessageSquare } from "lucide-react";

type Alerta = {
  id: string;
  conversationId: string | null;
  titulo: string;
  corpo: string;
  autor: string;
  quando: string;
};

const beep = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = t === 0 ? 880 : 1240;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* som opcional */ }
};

export const InternalMessageAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerta, setAlerta] = useState<Alerta | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pausado, setPausado] = useState(() => {
    const until = Number(localStorage.getItem("mp_alert_pause_until") ?? 0);
    return until > Date.now();
  });
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;

  const abrir = useCallback(async (conversationId: string, messageId?: string) => {
    if (pausadoRef.current) return;
    const [{ data: conv }, { data: msg }] = await Promise.all([
      supabase.from("internal_conversations" as any).select("id,titulo,last_message_preview").eq("id", conversationId).maybeSingle(),
      messageId
        ? supabase.from("internal_messages" as any).select("id,body,sender_id,created_at").eq("id", messageId).maybeSingle()
        : supabase.from("internal_messages" as any).select("id,body,sender_id,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const m: any = msg;
    let autor = "Equipe";
    if (m?.sender_id) {
      const { data: p } = await supabase.from("profiles").select("display_name,email").eq("user_id", m.sender_id).maybeSingle();
      autor = (p as any)?.display_name ?? (p as any)?.email ?? "Equipe";
    }
    setResposta("");
    setAlerta({
      id: m?.id ?? conversationId,
      conversationId,
      titulo: (conv as any)?.titulo ?? "Rede Interna",
      corpo: m?.body ?? (conv as any)?.last_message_preview ?? "Nova mensagem",
      autor,
      quando: m?.created_at ?? new Date().toISOString(),
    });
    beep();
  }, []);

  useEffect(() => {
    if (!user) return;
    let convIds: string[] = [];
    let ch: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase
        .from("internal_participants" as any)
        .select("conversation_id")
        .eq("user_id", user.id);
      convIds = ((data ?? []) as any[]).map((p) => p.conversation_id);

      ch = supabase
        .channel("rede-alert-" + user.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages" }, (payload: any) => {
          const m = payload.new;
          if (m.sender_id === user.id) return;
          if (convIds.length && !convIds.includes(m.conversation_id)) return;
          abrir(m.conversation_id, m.id);
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_participants", filter: `user_id=eq.${user.id}` }, (payload: any) => {
          convIds = [...convIds, payload.new.conversation_id];
        })
        .subscribe();
    })();

    return () => { if (ch) supabase.removeChannel(ch); };
  }, [user, abrir]);

  const responder = async () => {
    if (!user || !alerta?.conversationId || !resposta.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from("internal_messages" as any).insert({
      conversation_id: alerta.conversationId,
      sender_id: user.id,
      body: resposta.trim(),
    } as any);
    setEnviando(false);
    if (error) return toast.error(error.message);
    toast.success("Resposta enviada");
    setAlerta(null);
  };

  const pausar = () => {
    const until = Date.now() + 30 * 60 * 1000;
    localStorage.setItem("mp_alert_pause_until", String(until));
    setPausado(true);
    setAlerta(null);
    toast("Alertas pausados por 30 minutos");
  };

  const retomar = () => {
    localStorage.removeItem("mp_alert_pause_until");
    setPausado(false);
    toast.success("Alertas ativados");
  };

  if (!user) return null;

  return (
    <>
      {pausado && (
        <Button
          variant="outline" size="sm"
          onClick={retomar}
          className="fixed bottom-4 right-4 z-[60] shadow-lg"
        >
          <Bell className="size-4" /> Alertas pausados
        </Button>
      )}

      {alerta && (
        <div className="fixed bottom-4 right-4 z-[70] w-[min(92vw,380px)] animate-scale-in">
          <div className="rounded-xl border-2 border-[hsl(28_95%_55%)] bg-[hsl(28_95%_55%/0.12)] backdrop-blur shadow-2xl overflow-hidden animate-[pulse_1.1s_ease-in-out_infinite]">
            <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(28_95%_55%)] text-[hsl(0_0%_100%)]">
              <MessageSquare className="size-4" />
              <span className="text-sm font-bold truncate flex-1">{alerta.autor} está chamando</span>
              <button onClick={() => setAlerta(null)} aria-label="Fechar" className="opacity-80 hover:opacity-100">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-3 space-y-3 bg-card">
              <div>
                <p className="text-xs text-muted-foreground">{alerta.titulo} · {new Date(alerta.quando).toLocaleTimeString("pt-BR")}</p>
                <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-5">{alerta.corpo}</p>
              </div>
              <Textarea
                rows={2}
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Responder agora…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); responder(); } }}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={responder} disabled={enviando || !resposta.trim()}>
                  <Send className="size-4" /> Responder
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigate(`/admin/rede-interna?c=${alerta.conversationId}`); setAlerta(null); }}>
                  Abrir conversa
                </Button>
                <Button size="sm" variant="ghost" onClick={pausar}>
                  <BellOff className="size-4" /> Pausar 30min
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InternalMessageAlert;
