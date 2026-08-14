import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CrmSeller = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  kind?: string;
};

export function useCrmSellers() {
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Somente membros da equipe: quem tem cargo (user_roles) ou permissão de leads.
    const [{ data: roles }, { data: perms }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_permissions").select("user_id").eq("permission", "manage_leads"),
    ]);
    const roleMap = new Map<string, string>();
    (roles || []).forEach((r: any) => {
      const prev = roleMap.get(r.user_id);
      const rank = (x: string) => ["viewer", "certificadora", "editor", "admin", "super_admin"].indexOf(x);
      if (!prev || rank(r.role) > rank(prev)) roleMap.set(r.user_id, r.role);
    });
    const ids = Array.from(new Set([...roleMap.keys(), ...((perms || []).map((p: any) => p.user_id))]));
    if (ids.length === 0) { setSellers([]); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", ids);
    const labels: Record<string, string> = {
      super_admin: "Master", admin: "Coordenador", editor: "Editor",
      viewer: "Consulta", certificadora: "Certificadora",
    };
    setSellers(
      (data || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.user_id?.slice(0, 8) || "—",
        avatar_url: p.avatar_url ?? null,
        kind: labels[roleMap.get(p.user_id) || ""] || "Vendedor",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const map = useMemo(() => {
    const m = new Map<string, CrmSeller>();
    sellers.forEach((s) => m.set(s.user_id, s));
    return m;
  }, [sellers]);

  const byId = (id: string): CrmSeller | undefined => map.get(id);

  return { sellers, byId, loading, refresh: load };
}

export default useCrmSellers;
