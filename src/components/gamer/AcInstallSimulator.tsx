import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Trophy, ArrowRight, Wrench, Zap, Gauge, Wind, Ruler, Flame, ShieldAlert } from "lucide-react";
import { sfx, fireConfetti } from "@/lib/gamer/sfx";

type StepBase = {
  id: string;
  title: string;
  hint: string;
  points: number;
  icon: any;
};
type DragStep = StepBase & {
  kind: "drag";
  targets: { id: string; label: string; accepts: string }[];
  tools: { id: string; label: string; correctTarget: string }[];
};
type ClickStep = StepBase & {
  kind: "click";
  options: { id: string; label: string; correct: boolean; explain: string }[];
};
type GaugeStep = StepBase & {
  kind: "gauge";
  target: [number, number]; // percent range that counts as correct
  label: string;
};
type HoldStep = StepBase & {
  kind: "hold";
  seconds: number;
  label: string;
};
type OrderStep = StepBase & {
  kind: "order";
  items: { id: string; label: string }[];
  correct: string[];
};
type Step = DragStep | ClickStep | GaugeStep | HoldStep | OrderStep;

const STEPS: Step[] = [
  {
    id: "local",
    kind: "click",
    title: "1. Escolha o local da unidade interna",
    hint: "Fuja de sol direto e obstruções.",
    points: 100,
    icon: Wind,
    options: [
      { id: "a", label: "Parede oposta à cama, longe do sol direto", correct: true, explain: "Boa circulação, sem incidência solar." },
      { id: "b", label: "Encostado no teto, sobre a janela ensolarada", correct: false, explain: "Sol direto reduz eficiência." },
      { id: "c", label: "Atrás de um armário alto", correct: false, explain: "Obstrução impede o fluxo de ar." },
    ],
  },
  {
    id: "furo",
    kind: "click",
    title: "2. Furar a parede com caimento correto",
    hint: "O dreno precisa correr para fora.",
    points: 100,
    icon: Ruler,
    options: [
      { id: "a", label: "Caimento levemente para baixo em direção à parte externa", correct: true, explain: "Água escoa por gravidade." },
      { id: "b", label: "Nivelado (0°)", correct: false, explain: "Pode acumular condensado." },
      { id: "c", label: "Caimento para dentro", correct: false, explain: "Vaza água no ambiente." },
    ],
  },
  {
    id: "tubos",
    kind: "drag",
    title: "3. Passe a tubulação de cobre",
    hint: "Arraste cada bitola até o bocal certo.",
    points: 150,
    icon: Wrench,
    targets: [
      { id: "liquid", label: 'Linha de líquido (1/4")', accepts: "cu14" },
      { id: "suction", label: 'Linha de sucção (3/8")', accepts: "cu38" },
    ],
    tools: [
      { id: "cu14", label: 'Tubo cobre 1/4"', correctTarget: "liquid" },
      { id: "cu38", label: 'Tubo cobre 3/8"', correctTarget: "suction" },
    ],
  },
  {
    id: "flange",
    kind: "gauge",
    title: "4. Flangeamento e torque",
    hint: "Solte o mouse quando a agulha estiver na FAIXA VERDE.",
    points: 150,
    icon: Gauge,
    label: "Torquímetro (Nm)",
    target: [45, 55],
  },
  {
    id: "suporte",
    kind: "drag",
    title: "5. Fixe o suporte da unidade externa",
    hint: "Cada peça no lugar certo.",
    points: 100,
    icon: Wrench,
    targets: [
      { id: "p1", label: "Parafuso M8 (esquerda)", accepts: "para" },
      { id: "p2", label: "Bucha de nylon 10mm", accepts: "bucha" },
      { id: "p3", label: "Nível de bolha", accepts: "nivel" },
    ],
    tools: [
      { id: "para", label: "Parafuso M8", correctTarget: "p1" },
      { id: "bucha", label: "Bucha 10mm", correctTarget: "p2" },
      { id: "nivel", label: "Nível de bolha", correctTarget: "p3" },
    ],
  },
  {
    id: "eletrica",
    kind: "drag",
    title: "6. Conecte a elétrica (cuidado!)",
    hint: "Fase, neutro e terra nas cores corretas.",
    points: 200,
    icon: Zap,
    targets: [
      { id: "fase", label: "Fase (F)", accepts: "preto" },
      { id: "neutro", label: "Neutro (N)", accepts: "azul" },
      { id: "terra", label: "Terra (⏚)", accepts: "verde" },
    ],
    tools: [
      { id: "preto", label: "Fio preto", correctTarget: "fase" },
      { id: "azul", label: "Fio azul", correctTarget: "neutro" },
      { id: "verde", label: "Fio verde/amarelo", correctTarget: "terra" },
    ],
  },
  {
    id: "vacuo",
    kind: "hold",
    title: "7. Vácuo do sistema",
    hint: "Segure o botão até o manômetro chegar em 500 microns.",
    points: 200,
    icon: Gauge,
    label: "Bomba de vácuo",
    seconds: 3,
  },
  {
    id: "registros",
    kind: "order",
    title: "8. Abertura dos registros",
    hint: "Coloque na ordem correta.",
    points: 150,
    icon: Wrench,
    items: [
      { id: "b", label: "Abrir registro de líquido (menor)" },
      { id: "a", label: "Verificar torque das flanges" },
      { id: "c", label: "Abrir registro de sucção (maior)" },
      { id: "d", label: "Remover mangueiras do manifold" },
    ],
    correct: ["a", "b", "c", "d"],
  },
  {
    id: "vazamento",
    kind: "click",
    title: "9. Teste de vazamento",
    hint: "Como testar após abrir o gás?",
    points: 100,
    icon: ShieldAlert,
    options: [
      { id: "a", label: "Passar detector eletrônico ou espuma de sabão em cada conexão", correct: true, explain: "Método padrão de campo." },
      { id: "b", label: "Ligar direto e ver se gela", correct: false, explain: "Se vazar, perde carga e queima compressor." },
      { id: "c", label: "Cheirar as conexões", correct: false, explain: "R-410A é inodoro. Perigoso." },
    ],
  },
  {
    id: "final",
    kind: "gauge",
    title: "10. Medição final: ΔT entre insuflação e retorno",
    hint: "O correto é entre 8°C e 12°C. Pare a agulha na faixa verde.",
    points: 250,
    icon: Flame,
    label: "ΔT (°C)",
    target: [40, 60],
  },
];

type Props = {
  onFinish: (score: number, maxScore: number) => void;
};

export function AcInstallSimulator({ onFinish }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const maxScore = useMemo(() => STEPS.reduce((s, x) => s + x.points, 0), []);
  const step = STEPS[stepIdx];
  const Icon = step.icon;

  const advance = (earned: number, text: string, ok: boolean) => {
    setScore(s => s + earned);
    setFeedback({ ok, text });
    if (ok) { sfx.correct(); if (earned >= 150) fireConfetti(1200); } else { sfx.wrong(); }
  };
  const next = () => {
    setFeedback(null);
    if (stepIdx === STEPS.length - 1) {
      sfx.complete();
      fireConfetti(2400);
      onFinish(score, maxScore);
    } else {
      setStepIdx(i => i + 1);
    }
  };
  const reset = () => { setStepIdx(0); setScore(0); setFeedback(null); };

  return (
    <div className="gamer-shell">
      <div className="sim-hud rounded-t-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-xs opacity-70">MISSÃO FINAL</span>
        <span className="text-sm font-bold flex-1 truncate">Instale um split — {STEPS.length} etapas</span>
        <span className="text-xs opacity-90">Etapa <b className="text-[hsl(var(--neon-green))]">{stepIdx + 1}</b>/{STEPS.length}</span>
        <span className="text-xs opacity-90">Pontos: <b className="text-[hsl(var(--neon-yellow))]">{score}</b>/{maxScore}</span>
      </div>
      <div className="sim-stage p-6 min-h-[420px] rounded-b-none">
        <div className="flex items-center gap-3 mb-4">
          <span className="size-11 grid place-items-center rounded-xl bg-[hsl(var(--neon-purple)/0.15)] text-[hsl(var(--neon-purple))]">
            <Icon className="size-6" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">{step.title}</h3>
            <p className="text-sm text-neutral-600">{step.hint}</p>
          </div>
        </div>

        <div className="mt-4">
          {step.kind === "click" && (
            <ClickStepView step={step} disabled={!!feedback} onPick={(opt) => {
              advance(opt.correct ? step.points : Math.floor(step.points * 0.2), opt.explain, opt.correct);
            }} />
          )}
          {step.kind === "drag" && (
            <DragStepView step={step} disabled={!!feedback} onDone={(correctCount, total) => {
              const ratio = correctCount / total;
              advance(Math.round(step.points * ratio), ratio === 1 ? "Perfeito!" : `Você acertou ${correctCount} de ${total}.`, ratio === 1);
            }} />
          )}
          {step.kind === "gauge" && (
            <GaugeStepView step={step} disabled={!!feedback} onStop={(pos) => {
              const [lo, hi] = step.target;
              const ok = pos >= lo && pos <= hi;
              advance(ok ? step.points : Math.floor(step.points * 0.25), ok ? "Na faixa verde!" : "Fora da faixa — cuidado com torque/leitura.", ok);
            }} />
          )}
          {step.kind === "hold" && (
            <HoldStepView step={step} disabled={!!feedback} onDone={(ok) => {
              advance(ok ? step.points : Math.floor(step.points * 0.3), ok ? "Vácuo atingido em 500 microns!" : "Soltou cedo — sistema com umidade.", ok);
            }} />
          )}
          {step.kind === "order" && (
            <OrderStepView step={step} disabled={!!feedback} onDone={(hits) => {
              const ratio = hits / step.correct.length;
              advance(Math.round(step.points * ratio), ratio === 1 ? "Sequência perfeita." : "Ordem incorreta.", ratio === 1);
            }} />
          )}
        </div>

        {feedback && (
          <div className={`mt-6 rounded-xl border p-4 flex items-start gap-3 ${
            feedback.ok ? "bg-[hsl(var(--neon-green)/0.12)] border-[hsl(var(--neon-green))] text-neutral-900"
                        : "bg-[hsl(var(--neon-orange)/0.12)] border-[hsl(var(--neon-orange))] text-neutral-900"
          }`}>
            <CheckCircle2 className={`size-5 shrink-0 ${feedback.ok ? "text-[hsl(var(--neon-green))]" : "text-[hsl(var(--neon-orange))]"}`} />
            <div className="flex-1 text-sm"><b>{feedback.ok ? "Boa!" : "Quase..."}</b> {feedback.text}</div>
            <Button onClick={next} size="sm">
              {stepIdx === STEPS.length - 1 ? "Concluir missão" : "Próxima etapa"} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2 sim-hud rounded-b-2xl">
        <button onClick={reset} className="text-xs opacity-70 hover:opacity-100 inline-flex items-center gap-1">
          <RotateCcw className="size-3" /> Recomeçar
        </button>
        <span className="text-xs opacity-70 inline-flex items-center gap-1">
          <Trophy className="size-3.5" /> Faça o melhor score!
        </span>
      </div>
    </div>
  );
}

function ClickStepView({ step, disabled, onPick }: { step: ClickStep; disabled: boolean; onPick: (o: ClickStep["options"][number]) => void }) {
  return (
    <ul className="grid gap-2">
      {step.options.map(o => (
        <li key={o.id}>
          <button
            disabled={disabled}
            onClick={() => { sfx.click(); onPick(o); }}
            className="w-full text-left px-4 py-3 rounded-lg bg-white border-2 border-neutral-200 hover:border-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple)/0.06)] transition text-sm font-medium text-neutral-800 disabled:opacity-60"
          >
            {o.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function DragStepView({ step, disabled, onDone }: { step: DragStep; disabled: boolean; onDone: (correct: number, total: number) => void }) {
  const [placed, setPlaced] = useState<Record<string, string>>({}); // targetId -> toolId
  const [overTarget, setOverTarget] = useState<string | null>(null);

  const dropOn = (targetId: string, toolId: string) => {
    if (disabled) return;
    sfx.drop();
    setPlaced(p => ({ ...p, [targetId]: toolId }));
  };
  const usedTools = new Set(Object.values(placed));
  const allPlaced = Object.keys(placed).length === step.targets.length;

  const check = () => {
    let correct = 0;
    for (const t of step.targets) {
      if (placed[t.id] && step.tools.find(x => x.id === placed[t.id])?.correctTarget === t.id) correct++;
    }
    onDone(correct, step.targets.length);
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {step.targets.map(t => {
          const toolId = placed[t.id];
          const toolLabel = toolId ? step.tools.find(x => x.id === toolId)?.label : null;
          return (
            <div
              key={t.id}
              onDragOver={(e) => { e.preventDefault(); setOverTarget(t.id); }}
              onDragLeave={() => setOverTarget(null)}
              onDrop={(e) => { const toolId = e.dataTransfer.getData("tool"); if (toolId) dropOn(t.id, toolId); setOverTarget(null); }}
              className={`sim-drop p-4 min-h-[74px] flex flex-col items-center justify-center text-center ${overTarget === t.id ? "is-over" : ""} ${toolId ? "is-done" : ""}`}
            >
              <div className="text-xs uppercase tracking-wide text-neutral-500">{t.label}</div>
              {toolLabel && <div className="mt-1 font-bold text-neutral-900">{toolLabel}</div>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {step.tools.map(t => (
          <div
            key={t.id}
            draggable={!disabled && !usedTools.has(t.id)}
            onDragStart={(e) => { e.dataTransfer.setData("tool", t.id); sfx.pickup(); }}
            className={`sim-tool ${usedTools.has(t.id) ? "opacity-40 pointer-events-none" : ""}`}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="text-center">
        <Button disabled={!allPlaced || disabled} onClick={check}>Confirmar posições</Button>
      </div>
    </div>
  );
}

function GaugeStepView({ step, disabled, onStop }: { step: GaugeStep; disabled: boolean; onStop: (pos: number) => void }) {
  const [pos, setPos] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef<number | null>(null);
  const dir = useRef(1);

  const start = () => {
    if (disabled) return;
    setRunning(true);
    const loop = () => {
      setPos(p => {
        let np = p + dir.current * 1.4;
        if (np >= 100) { np = 100; dir.current = -1; }
        if (np <= 0) { np = 0; dir.current = 1; }
        return np;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setRunning(false);
    onStop(pos);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{step.label}</div>
      <div className="sim-gauge">
        <div className="sim-gauge__needle" style={{ left: pos + "%" }} />
      </div>
      <div className="flex justify-center gap-2">
        {!running ? (
          <Button onClick={start} disabled={disabled}>Iniciar leitura</Button>
        ) : (
          <Button onClick={stop} variant="destructive">PARAR agora!</Button>
        )}
      </div>
    </div>
  );
}

function HoldStepView({ step, disabled, onDone }: { step: HoldStep; disabled: boolean; onDone: (ok: boolean) => void }) {
  const [held, setHeld] = useState(0);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const startedAt = useRef<number>(0);

  const down = () => {
    if (disabled) return;
    setHolding(true);
    startedAt.current = performance.now();
    const tick = () => {
      const dt = (performance.now() - startedAt.current) / 1000;
      setHeld(dt);
      if (dt >= step.seconds) { up(true); return; }
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
  };
  const up = (auto = false) => {
    if (timer.current) cancelAnimationFrame(timer.current);
    setHolding(false);
    const ok = held >= step.seconds || auto;
    onDone(ok);
  };

  const pct = Math.min(100, (held / step.seconds) * 100);
  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{step.label}</div>
      <div className="h-8 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full transition-[width] duration-75" style={{ width: pct + "%", background: "linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--neon-purple)))" }} />
      </div>
      <div className="text-center text-sm text-neutral-600">Segure o botão até 500 microns ({step.seconds}s)</div>
      <div className="flex justify-center">
        <button
          disabled={disabled}
          onMouseDown={down}
          onMouseUp={() => up()}
          onMouseLeave={() => holding && up()}
          onTouchStart={down}
          onTouchEnd={() => up()}
          className="px-8 py-4 rounded-xl bg-[hsl(var(--hud-bg))] text-white font-mono font-bold shadow-lg active:scale-95 transition disabled:opacity-50"
        >
          {holding ? `${held.toFixed(1)}s / ${step.seconds}s` : "🔧 SEGURE PARA VÁCUAR"}
        </button>
      </div>
    </div>
  );
}

function OrderStepView({ step, disabled, onDone }: { step: OrderStep; disabled: boolean; onDone: (hits: number) => void }) {
  const [items, setItems] = useState(step.items);
  const dragIdx = useRef<number | null>(null);

  const onDragStart = (i: number) => { if (disabled) return; dragIdx.current = i; sfx.pickup(); };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (i: number) => {
    if (dragIdx.current === null || disabled) return;
    const from = dragIdx.current;
    if (from === i) return;
    const arr = [...items];
    const [it] = arr.splice(from, 1);
    arr.splice(i, 0, it);
    setItems(arr);
    sfx.drop();
    dragIdx.current = null;
  };

  const check = () => {
    let hits = 0;
    items.forEach((it, i) => { if (it.id === step.correct[i]) hits++; });
    onDone(hits);
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li
            key={it.id}
            draggable={!disabled}
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            className="sim-tool w-full flex items-center gap-3 cursor-grab"
          >
            <span className="size-7 grid place-items-center rounded-full bg-[hsl(var(--neon-purple)/0.15)] text-[hsl(var(--neon-purple))] font-mono">{i + 1}</span>
            <span className="flex-1">{it.label}</span>
            <span className="text-neutral-400">⋮⋮</span>
          </li>
        ))}
      </ol>
      <div className="text-center">
        <Button onClick={check} disabled={disabled}>Confirmar ordem</Button>
      </div>
    </div>
  );
}