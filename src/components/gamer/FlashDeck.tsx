import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { useGamification } from "@/lib/gamer/useGamification";
import { sfx } from "@/lib/gamer/sfx";

type Card = { front: string; back: string };
const TONES = ["fc-1", "fc-2", "fc-3", "fc-4", "fc-5", "fc-6"];

export function FlashDeck({ cards }: { cards: Card[] }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState<Record<number, "ok" | "review">>({});
  const { award } = useGamification();
  const mastered = Object.values(status).filter(s => s === "ok").length;
  const pct = cards.length ? Math.round((mastered / cards.length) * 100) : 0;

  const mark = (i: number, s: "ok" | "review") => {
    if (status[i] === s) return;
    setStatus(p => ({ ...p, [i]: s }));
    if (s === "ok") { sfx.coin?.(); award(5, 1, { label: "+5 XP" }); }
    else sfx.click?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <Sparkles className="size-5 text-primary" />
        <div className="flex-1 min-w-[160px]">
          <p className="text-sm font-semibold">Maestria: {mastered}/{cards.length} cartões</p>
          <div className="h-2 mt-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setOrder(o => [...o].sort(() => Math.random() - 0.5)); setFlipped({}); }}>
          <Shuffle className="size-4" /> Embaralhar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setStatus({}); setFlipped({}); }}>
          <RotateCcw className="size-4" /> Recomeçar
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {order.map((i, pos) => {
          const c = cards[i];
          const tone = TONES[i % TONES.length];
          const st = status[i];
          return (
            <div key={i} className="space-y-2">
              <button
                onClick={() => { setFlipped(f => ({ ...f, [i]: !f[i] })); sfx.click?.(); }}
                className="w-full aspect-[4/3] [perspective:1200px] text-left hover:-translate-y-1 transition-transform"
                aria-pressed={!!flipped[i]}
              >
                <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{ transform: flipped[i] ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                  <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl p-5 flex flex-col shadow-lg"
                    style={{ background: `linear-gradient(135deg, hsl(var(--${tone})), hsl(var(--${tone}) / 0.75))`, color: "hsl(var(--fc-ink))" }}>
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Pergunta {pos + 1}</span>
                    <p className="text-lg font-bold mt-3 flex-1 overflow-auto whitespace-pre-wrap">{c.front}</p>
                    <span className="text-xs opacity-80">Toque para ver a resposta ↻</span>
                  </div>
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl p-5 flex flex-col bg-card shadow-lg border-2"
                    style={{ borderColor: `hsl(var(--${tone}))` }}>
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: `hsl(var(--${tone}))` }}>Resposta</span>
                    <p className="text-base mt-3 flex-1 overflow-auto whitespace-pre-wrap">{c.back}</p>
                  </div>
                </div>
              </button>
              {flipped[i] && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" variant={st === "ok" ? "default" : "outline"} onClick={() => mark(i, "ok")}>
                    <Check className="size-4" /> Já domino
                  </Button>
                  <Button size="sm" className="flex-1" variant={st === "review" ? "secondary" : "outline"} onClick={() => mark(i, "review")}>
                    <RotateCcw className="size-4" /> Revisar depois
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
