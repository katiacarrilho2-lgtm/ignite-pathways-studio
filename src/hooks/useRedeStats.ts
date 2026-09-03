import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UnitStats = {
  usuarios: number;
  leads: number;
  preMatriculas: number;
  matriculas: number;
  ultimaAtividade: string | null;
};

export type RedeStats = Record<string, UnitStats>;

const empty = (): UnitStats => ({ usuarios: 0, leads: 0, preMatriculas: 0, matriculas: 0, ultimaAtividade: null });

/**
 * Contagens reais por unidade da REDE (Polos e Revendedores).
 * A Matriz nunca entra nesses números — vem da função `rede_stats`,
 * que só responde ao Master da Rede.
 */
export const useRedeStats = () => {
  const [stats, setStats] = useState<RedeStats>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("rede_stats");
    const acc: RedeStats = {};
    ((data ?? []) as any[]).forEach((r) => {
      acc[r.account_id] = {
        usuarios: Number(r.usuarios ?? 0),
        leads: Number(r.leads ?? 0),
        preMatriculas: Number(r.pre_matriculas ?? 0),
        matriculas: Number(r.matriculas ?? 0),
        ultimaAtividade: r.ultima_atividade ?? null,
      };
    });
    setStats(acc);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, reload: load, statsFor: (id: string) => stats[id] ?? empty() };
};

export default useRedeStats;
