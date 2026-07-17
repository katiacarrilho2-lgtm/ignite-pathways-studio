import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Partner = {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number;
  active: boolean;
};

export const usePartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partners" as any)
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (!cancelled) {
        setPartners((data ?? []) as unknown as Partner[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { partners, loading };
};