import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { toast } from "sonner";
import { Flame } from "lucide-react";

// Siren via WebAudio — no asset needed
function playSiren() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    const t0 = ctx.currentTime;
    // Sweep up and down 3 times (~1.8s)
    for (let i = 0; i < 3; i++) {
      const base = t0 + i * 0.6;
      o.frequency.setValueAtTime(500, base);
      o.frequency.linearRampToValueAtTime(1100, base + 0.3);
      o.frequency.linearRampToValueAtTime(500, base + 0.6);
    }
    g.gain.setValueAtTime(0.25, t0 + 1.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
    o.start(t0);
    o.stop(t0 + 2);
    setTimeout(() => ctx.close(), 2200);
  } catch {}
}

export default function CrmUrgentAlerts() {
  const { user, isMaster, hasPermission } = useAuth();
  const { byId } = useCrmSellers();
  const canSee = isMaster || hasPermission("manage_users");
  const [urgents, setUrgents] = useState<any[]>([]);
  const knownIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  const load = async () => {
    const { data } = await supabase.from("crm_leads")
      .select("id, nome, telefone, owner_id, urgente, urgente_marcado_em")
      .eq("urgente", true)
      .order("urgente_marcado_em", { ascending: false });
    const list = data ?? [];
    setUrgents(list);
    if (!bootstrapped.current) {
      list.forEach(l => knownIds.current.add(l.id));
      bootstrapped.current = true;
    }
  };

  useEffect(() => {
    if (!user || !canSee) return;
    load();
    const ch = supabase.channel("crm-urgent-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_leads" }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row) return;
        const wasUrgent = knownIds.current.has(row.id);
        const isUrgentNow = payload.eventType !== "DELETE" && !!payload.new?.urgente;
        if (isUrgentNow && !wasUrgent) {
          knownIds.current.add(row.id);
          const seller = byId(payload.new.owner_id)?.display_name || "Vendedor";
          playSiren();
          toast.error(`🔥 VENDA URGENTE: ${payload.new.nome}`, {
            description: `${seller} precisa de você agora!`,
            duration: 15000,
            action: { label: "Ver", onClick: () => { window.location.href = "/admin/crm"; } },
          });
        }
        if (!isUrgentNow && wasUrgent) knownIds.current.delete(row.id);
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canSee]);

  if (!canSee || urgents.length === 0) return null;

  return (
    <Link to="/admin/crm"
      title={`${urgents.length} venda(s) urgente(s) aguardando`}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-full shadow-2xl border-2 border-orange-300 animate-pulse">
      <Flame className="size-5" />
      <span className="font-bold text-sm">{urgents.length} URGENTE{urgents.length > 1 ? "S" : ""}</span>
    </Link>
  );
}