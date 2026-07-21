import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sfx, xpToast } from "./sfx";

export type Gamification = {
  xp: number;
  level: number;
  coins: number;
  current_streak: number;
  longest_streak: number;
};

const DEFAULT: Gamification = { xp: 0, level: 1, coins: 0, current_streak: 0, longest_streak: 0 };
const XP_PER_LEVEL = 500;

export function useGamification() {
  const { user } = useAuth();
  const [data, setData] = useState<Gamification>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: row } = await supabase
      .from("user_gamification")
      .select("xp,level,coins,current_streak,longest_streak")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row) setData(row as Gamification);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const award = useCallback(async (xp: number, coins = 0, opts?: { label?: string; anchor?: { x: number; y: number } }) => {
    if (!user) return null;
    const prevLevel = data.level;
    const { data: row, error } = await supabase.rpc("add_xp", { delta_xp: xp, delta_coins: coins });
    if (error) { console.warn("add_xp", error.message); return null; }
    const next = row as any as Gamification;
    setData(next);
    if (opts?.anchor) xpToast(opts.label ?? `+${xp} XP`, opts.anchor.x, opts.anchor.y);
    if (coins > 0) sfx.coin();
    if (next.level > prevLevel) sfx.levelUp();
    return next;
  }, [user, data.level]);

  const xpInLevel = data.xp % XP_PER_LEVEL;
  const xpProgress = Math.round((xpInLevel / XP_PER_LEVEL) * 100);

  return { data, loading, award, reload: load, xpInLevel, xpForLevel: XP_PER_LEVEL, xpProgress };
}