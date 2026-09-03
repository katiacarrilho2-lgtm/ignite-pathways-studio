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

const ROOT = "00000000-0000-0000-0000-000000000001";
const keyOf = (v: string | null | undefined) => v ?? ROOT;

/**
 * Contagens reais por unidade. Só retorna o que já existe no banco hoje:
 * usuários (profiles), leads (crm_leads), pré-matrículas e matrículas.
 * Nenhum número é estimado.
 */
export const useRedeStats = () => {
  const [stats, setStats] = useState<RedeStats>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [profiles, leads, apps, enrolls] = await Promise.all([
      supabase.from("profiles").select("account_id"),
      supabase.from("crm_leads").select("account_id,created_at"),
      supabase.from("enrollment_applications").select("account_id,created_at"),
      supabase.from("enrollments").select("account_id,enrolled_at"),
    ]);

    const acc: RedeStats = {};
    const bump = (id: string | null | undefined, field: keyof UnitStats, when?: string | null) => {
      const k = keyOf(id);
      acc[k] ??= empty();
      (acc[k][field] as number) += 1;
      if (when && (!acc[k].ultimaAtividade || when > acc[k].ultimaAtividade!)) acc[k].ultimaAtividade = when;
    };

    (profiles.data ?? []).forEach((r: any) => bump(r.account_id, "usuarios"));
    (leads.data ?? []).forEach((r: any) => bump(r.account_id, "leads", r.created_at));
    (apps.data ?? []).forEach((r: any) => bump(r.account_id, "preMatriculas", r.created_at));
    (enrolls.data ?? []).forEach((r: any) => bump(r.account_id, "matriculas", r.enrolled_at));

    setStats(acc);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, reload: load, statsFor: (id: string) => stats[id] ?? empty() };
};

export default useRedeStats;
