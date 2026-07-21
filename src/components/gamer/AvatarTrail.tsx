import heroAsset from "@/assets/gamer/multplick-hero.png.asset.json";

type Props = {
  total: number;
  completed: number;
  currentIndex: number;
  courseTitle?: string;
};

export function AvatarTrail({ total, completed, currentIndex, courseTitle }: Props) {
  if (total <= 0) return null;
  const pct = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;
  const donePct = total > 1 ? (completed / total) * 100 : 0;

  // Show at most 20 dots for visual clarity; sample evenly.
  const maxDots = Math.min(total, 20);
  const dots = Array.from({ length: maxDots }, (_, i) => {
    const lessonIdx = Math.round((i / (maxDots - 1 || 1)) * (total - 1));
    return { lessonIdx, x: (i / (maxDots - 1 || 1)) * 100 };
  });

  return (
    <div className="gamer-trail">
      <div className="gamer-trail__label px-1">
        <span>{courseTitle ?? "Sua jornada"}</span>
        <span><b>{completed}</b>/{total} aulas</span>
      </div>
      <div className="gamer-trail__track">
        {/* progress underline */}
        <div
          style={{
            position: "absolute", top: 62, left: 0, height: 3,
            width: `${donePct}%`,
            background: "linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--neon-purple)))",
            boxShadow: "0 0 10px hsl(var(--neon-green) / 0.7)",
            transition: "width 600ms ease",
          }}
        />
        {dots.map((d, i) => {
          const done = d.lessonIdx < completed;
          const current = d.lessonIdx === currentIndex;
          return (
            <div
              key={i}
              className={`gamer-trail__dot ${done ? "gamer-trail__dot--done" : ""} ${current ? "gamer-trail__dot--current" : ""}`}
              style={{ left: `${d.x}%` }}
              title={`Aula ${d.lessonIdx + 1}`}
            />
          );
        })}
        <div className="gamer-trail__flag">🏁</div>
        <img
          src={heroAsset.url}
          alt="Multplick"
          className="gamer-trail__avatar"
          style={{ left: `${pct}%` }}
          width={56}
          height={56}
        />
      </div>
    </div>
  );
}