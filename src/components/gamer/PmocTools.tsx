import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Wind, ClipboardCheck, Trophy } from "lucide-react";
import { useGamification } from "@/lib/gamer/useGamification";
import { sfx, fireConfetti } from "@/lib/gamer/sfx";

const IMG = {
  inspect: "/__l5e/assets-v1/45e70c2f-5660-44a1-a558-a403be0ea493/pmoc-1.jpg",
  filtros: "/__l5e/assets-v1/0e9654e3-06b3-47be-a93b-959a36f2e153/pmoc-2.jpg",
  limpeza: "/__l5e/assets-v1/a1047244-c611-4042-908b-997679a6cd1c/pmoc-3.jpg",
  rt: "/__l5e/assets-v1/ca8a39a8-576e-4a64-a782-8fb19ca8ef2c/pmoc-4.jpg",
  escritorio: "/__l5e/assets-v1/3c6bd0de-a313-44c4-a060-ba9690b859d8/pmoc-5.jpg",
  ferramentas: "/__l5e/assets-v1/6d82aa85-fb5e-4365-b0f4-e2503cdaa443/pmoc-6.jpg",
};

/** Ilustrações por aula do curso PMOC (lesson id → imagem). */
export const PMOC_LESSON_IMAGES: Record<string, string> = {
  "f0be6846-53d1-42ef-b5db-46965edc5da0": IMG.escritorio,
  "d0aa8bf3-9de5-49ef-9e75-a4af1a76cec3": IMG.rt,
  "5856eeb1-f690-4437-91c9-af2dbe44c45e": IMG.escritorio,
  "95f60127-4b52-4b82-a3f2-729cbc410470": IMG.inspect,
  "ec652479-be49-4d60-8375-e5e5269de765": IMG.filtros,
  "75e5c3d5-ca5b-454d-bae0-9545d755497e": IMG.inspect,
  "c4cd3392-9298-4732-a9e1-35e713e4d5b4": IMG.filtros,
  "5fa6cbf1-f48d-4173-94c6-af333c66ac47": IMG.limpeza,
  "e4918385-af53-48f3-bc58-de7bd0c356c8": IMG.ferramentas,
  "9c9c3eff-b093-4480-8a92-77dd39673360": IMG.rt,
  "fe00e927-e489-4448-9041-3e57ff5157c2": IMG.rt,
  "c45c0c3d-555a-4da2-9356-7941b45ef468": IMG.inspect,
  "09aaceb3-83e0-4616-b308-313672c94a1d": IMG.rt,
  "cfee9e32-c31b-40d7-aa4d-e3cba65033d7": IMG.escritorio,
  "0b6487fb-cecc-47b8-b633-5390db604718": IMG.inspect,
  "3905c9a0-5edc-4b56-a033-3cffe83fb9fa": IMG.escritorio,
  "04328f37-cec1-464c-86cc-5b6aee29cc0d": IMG.limpeza,
};
const CALC_LESSONS = new Set(["5856eeb1-f690-4437-91c9-af2dbe44c45e", "cfee9e32-c31b-40d7-aa4d-e3cba65033d7"]);
const SIM_LESSONS = new Set(["5fa6cbf1-f48d-4173-94c6-af333c66ac47", "c45c0c3d-555a-4da2-9356-7941b45ef468", "3905c9a0-5edc-4b56-a033-3cffe83fb9fa"]);

export function PmocLessonExtras({ lessonId }: { lessonId: string }) {
  return (
    <>
      {CALC_LESSONS.has(lessonId) && <AirCalc />}
      {SIM_LESSONS.has(lessonId) && <PmocInspector />}
    </>
  );
}

function AirCalc() {
  const [pessoas, setPessoas] = useState(20);
  const [area, setArea] = useState(100);
  const vazao = pessoas * 27;
  const ocup = area > 0 ? (area / Math.max(pessoas, 1)).toFixed(1) : "-";
  const maxPessoas = Math.floor(area / 6);
  const lotado = pessoas > maxPessoas;
  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-card p-5 space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2"><Wind className="size-5 text-primary" /> Calculadora de Renovação de Ar (RE-09 ANVISA)</h3>
      <p className="text-sm text-muted-foreground">Mexa nos valores e veja na hora quanto ar externo o ambiente precisa.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">Ocupantes: <b>{pessoas}</b>
          <input type="range" min={1} max={200} value={pessoas} onChange={e => setPessoas(+e.target.value)} className="w-full accent-[hsl(var(--primary))]" />
        </label>
        <label className="space-y-1 text-sm">Área (m²)
          <Input type="number" min={1} value={area} onChange={e => setArea(+e.target.value)} />
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Ar externo mínimo</p><p className="text-2xl font-bold text-primary">{vazao} m³/h</p></div>
        <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">m² por pessoa</p><p className="text-2xl font-bold">{ocup}</p></div>
        <div className={`rounded-xl p-3 ${lotado ? "bg-destructive/15" : "bg-secondary"}`}><p className="text-xs text-muted-foreground">Máx. ocupantes (6 m²/pessoa)</p><p className="text-2xl font-bold">{maxPessoas}</p></div>
      </div>
      {lotado && <p className="text-sm text-destructive font-medium">Atenção: ocupação acima da recomendada para escritórios.</p>}
      <p className="text-xs text-muted-foreground">Regra: 27 m³/h por pessoa (ambientes de uso coletivo). CO₂ deve ficar abaixo de 1000 ppm.</p>
    </section>
  );
}

type Item = { label: string; ok: boolean; why: string };
const SCENES: { title: string; img: string; ask: string; items: Item[] }[] = [
  { title: "Casa de máquinas — Filtros", img: IMG.filtros, ask: "Quais situações exigem ação imediata?", items: [
    { label: "Filtro escurecido e com poeira acumulada", ok: true, why: "Filtro saturado reduz vazão e libera contaminantes: troca imediata." },
    { label: "Filtro branco instalado há 15 dias", ok: false, why: "Dentro do prazo e limpo: apenas registrar." },
    { label: "Moldura do filtro com folga, ar passando por fora", ok: true, why: "Ar não filtrado contorna o elemento: vedar ou substituir." },
  ]},
  { title: "Evaporadora — Bandeja e dreno", img: IMG.limpeza, ask: "Marque as não conformidades:", items: [
    { label: "Água parada com limo na bandeja", ok: true, why: "Água estagnada favorece biofilme e Legionella." },
    { label: "Dreno escoando livremente", ok: false, why: "Situação correta." },
    { label: "Serpentina com sujeira entre as aletas", ok: true, why: "Higienizar com produto registrado na ANVISA." },
  ]},
  { title: "Gestão — Documentação do RT", img: IMG.rt, ask: "O que gera multa numa fiscalização?", items: [
    { label: "PMOC sem ART/TRT do responsável técnico", ok: true, why: "A Lei 13.589/2018 exige RT habilitado." },
    { label: "Registros das manutenções arquivados e assinados", ok: false, why: "É exatamente o que a fiscalização pede." },
    { label: "Plano não atualizado após troca de equipamentos", ok: true, why: "O PMOC deve refletir o inventário atual." },
  ]},
];

function PmocInspector() {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const { award } = useGamification();
  const done = idx >= SCENES.length;
  const sc = SCENES[idx];

  const conferir = () => {
    const hits = sc.items.filter((it, i) => !!sel[i] === it.ok).length;
    setScore(s => s + hits);
    setChecked(true);
    hits === sc.items.length ? sfx.correct() : sfx.wrong();
  };
  const proxima = () => {
    const n = idx + 1;
    setIdx(n); setSel({}); setChecked(false);
    if (n >= SCENES.length) { sfx.complete(); fireConfetti(); award(score * 5, score, { label: `+${score * 5} XP` }); }
  };
  const total = SCENES.reduce((s, x) => s + x.items.length, 0);

  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden">
      <div className="p-4 bg-primary/10 flex items-center gap-2">
        <ClipboardCheck className="size-5 text-primary" />
        <h3 className="font-bold flex-1">Simulador: Fiscal PMOC</h3>
        <span className="text-sm font-semibold">{Math.min(idx + 1, SCENES.length)}/{SCENES.length} · {score} pts</span>
      </div>
      {done ? (
        <div className="p-8 text-center space-y-3">
          <Trophy className="size-12 mx-auto text-primary" />
          <p className="text-xl font-bold">Inspeção concluída: {score}/{total} acertos</p>
          <p className="text-muted-foreground">{score === total ? "Laudo perfeito, Responsável Técnico!" : "Bom trabalho! Revise os itens que errou."}</p>
          <Button onClick={() => { setIdx(0); setScore(0); }}>Refazer inspeção</Button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <img src={sc.img} alt={sc.title} loading="lazy" className="w-full max-h-72 object-cover rounded-xl" />
          <div><p className="font-bold">{sc.title}</p><p className="text-sm text-muted-foreground">{sc.ask}</p></div>
          <div className="grid gap-2">
            {sc.items.map((it, i) => {
              const right = checked && !!sel[i] === it.ok;
              return (
                <button key={i} disabled={checked} onClick={() => { setSel(s => ({ ...s, [i]: !s[i] })); sfx.click(); }}
                  className={`text-left rounded-lg border-2 p-3 transition ${sel[i] ? "border-primary bg-primary/5" : "border-border"} ${checked ? (right ? "border-[hsl(var(--fc-2))]" : "border-destructive") : ""}`}>
                  <div className="flex items-center gap-2">
                    {checked && (right ? <CheckCircle2 className="size-4 text-[hsl(var(--fc-2))]" /> : <XCircle className="size-4 text-destructive" />)}
                    <span className="font-medium">{it.label}</span>
                  </div>
                  {checked && <p className="text-xs text-muted-foreground mt-1">{it.why}</p>}
                </button>
              );
            })}
          </div>
          {checked ? <Button onClick={proxima}>Próximo cenário</Button> : <Button onClick={conferir}>Conferir inspeção</Button>}
        </div>
      )}
    </section>
  );
}
