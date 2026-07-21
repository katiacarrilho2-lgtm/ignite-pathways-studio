// Web Audio API — synthesized game SFX, no assets needed.
// Global toggle stored in localStorage.

const STORAGE_KEY = "gamer.sfx.enabled";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isSfxEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}
export function setSfxEnabled(v: boolean) {
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {}
}

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.15, delay = 0) {
  const c = getCtx();
  if (!c || !isSfxEnabled()) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(600, 0.05, "square", 0.08),
  coin: () => { tone(988, 0.08, "square", 0.12); tone(1319, 0.16, "square", 0.12, 0.06); },
  correct: () => { tone(660, 0.09, "triangle", 0.14); tone(880, 0.11, "triangle", 0.14, 0.07); tone(1175, 0.16, "triangle", 0.14, 0.15); },
  wrong: () => { tone(220, 0.15, "sawtooth", 0.12); tone(160, 0.2, "sawtooth", 0.12, 0.08); },
  levelUp: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "triangle", 0.16, i * 0.09));
  },
  complete: () => {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.14, i * 0.08));
  },
  drop: () => tone(400, 0.08, "sine", 0.12),
  pickup: () => tone(880, 0.06, "triangle", 0.1),
};

export function fireConfetti(durationMs = 1800) {
  if (typeof document === "undefined") return;
  const colors = ["#2dd4a8", "#a78bfa", "#ff6b35", "#ffd93d", "#3b82f6", "#ff6b6b"];
  const n = 60;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    el.className = "confetti-piece";
    el.style.left = Math.random() * 100 + "vw";
    el.style.background = colors[i % colors.length];
    el.style.animationDelay = Math.random() * 0.5 + "s";
    el.style.animationDuration = 2 + Math.random() * 1.5 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 2000);
  }
}

export function xpToast(text: string, x: number, y: number) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.className = "xp-toast";
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}