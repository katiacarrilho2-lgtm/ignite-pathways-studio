import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CrmSeller = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  kind?: "admin" | "seller" | "user";
};

export function useCrmSellers() {
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .limit(500);
    setSellers(
      (data || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.user_id?.slice(0, 8) || "—",
        avatar_url: p.avatar_url ?? null,
        kind: "user",
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
