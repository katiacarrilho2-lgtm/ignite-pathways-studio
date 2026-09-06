import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchSection } from "@/lib/siteSettings";

/** Lê uma seção das Configurações do site (publicada, ou rascunho com ?preview=1). */
export function useSiteSection<T>(section: string, defaults: T) {
  const { search } = useLocation();
  const preview = new URLSearchParams(search).get("preview") === "1";
  const [value, setValue] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchSection<T>(section, defaults, preview ? "draft" : "published")
      .then((v) => { if (alive) setValue(v); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, preview]);

  return { value, loading };
}
