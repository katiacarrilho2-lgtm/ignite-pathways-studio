import confetti from "canvas-confetti";

export type Stage = "novo" | "lead" | "fechamento" | "matriculado" | "cancelado" | "proximo_mes";
export type Temp = "frio" | "morno" | "quente";

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "novo", label: "Novo Interessado", color: "bg-slate-500" },
  { key: "lead", label: "Lead", color: "bg-blue-500" },
  { key: "fechamento", label: "Em Fechamento", color: "bg-amber-500" },
  { key: "matriculado", label: "Matriculado", color: "bg-emerald-600" },
  { key: "cancelado", label: "Cancelado", color: "bg-rose-600" },
  { key: "proximo_mes", label: "Próximo Mês", color: "bg-violet-600" },
];

export const TEMP_META: Record<Temp, { label: string; cls: string; dot: string }> = {
  frio: { label: "Frio", cls: "bg-sky-100 text-sky-700 border-sky-300", dot: "bg-sky-500" },
  morno: { label: "Morno", cls: "bg-amber-100 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  quente: { label: "Quente", cls: "bg-rose-100 text-rose-700 border-rose-300", dot: "bg-rose-500" },
};

export const fmtBRL = (cents: number) =>
  ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const parseBRLToCents = (s: string): number => {
  const digits = (s || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const v = parseFloat(digits);
  return isNaN(v) ? 0 : Math.round(v * 100);
};

// Synthesize a bell chime via Web Audio (no asset required)
export const playBells = () => {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1108.73, 1318.51, 1760]; // A5 C#6 E6 A6
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 1.3);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
};

export const fireConfetti = () => {
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5 } }), 250);
};

export const buildWhatsappLink = (phone: string, message: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
};

export const buildICS = (title: string, when: Date, notes?: string) => {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(when.getTime() + 30 * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Multplick CRM//PT-BR",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@multplick`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(when)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${title.replace(/\n/g, " ")}`,
    notes ? `DESCRIPTION:${notes.replace(/\n/g, "\\n")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

export const downloadICS = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};