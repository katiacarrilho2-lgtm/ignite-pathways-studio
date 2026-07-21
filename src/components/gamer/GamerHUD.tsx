import { Flame, Coins, Zap, Trophy, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { useGamification } from "@/lib/gamer/useGamification";
import { isSfxEnabled, setSfxEnabled, sfx } from "@/lib/gamer/sfx";

type Props = { compact?: boolean };

export function GamerHUD({ compact }: Props) {
  const { data, xpInLevel, xpForLevel, xpProgress } = useGamification();
  const [sfxOn, setSfxOn] = useState(true);

  useEffect(() => { setSfxOn(isSfxEnabled()); }, []);
  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxEnabled(next);
    setSfxOn(next);
    if (next) sfx.click();
  };

  return (
    <div className={`gamer-hud flex items-center gap-3 px-4 py-2 ${compact ? "" : "sm:py-3"}`}>
      <span className="gamer-hud__pill gamer-hud__pill--level">
        <Trophy className="size-3.5" /> LVL {data.level}
      </span>
      <div className="flex-1 min-w-[120px]">
        <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5">
          <span>XP</span>
          <span>{xpInLevel}/{xpForLevel}</span>
        </div>
        <div className="gamer-hud__xpbar"><span style={{ width: xpProgress + "%" }} /></div>
      </div>
      <span className="gamer-hud__pill gamer-hud__pill--xp" title="XP total">
        <Zap className="size-3.5" /> {data.xp}
      </span>
      <span className="gamer-hud__pill gamer-hud__pill--coin" title="Moedas">
        <Coins className="size-3.5" /> {data.coins}
      </span>
      <span className="gamer-hud__pill gamer-hud__pill--streak" title="Dias seguidos estudando">
        <Flame className="size-3.5" /> {data.current_streak}d
      </span>
      <button
        onClick={toggleSfx}
        className="gamer-hud__pill hover:opacity-80"
        title={sfxOn ? "Silenciar sons" : "Ativar sons"}
      >
        {sfxOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
      </button>
    </div>
  );
}