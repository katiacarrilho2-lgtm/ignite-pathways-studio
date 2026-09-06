import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { IDENTITY_DEFAULTS, IdentitySettings, SECTION_IDENTITY, applyIdentity, fetchSection } from "@/lib/siteSettings";

/** Aplica identidade visual publicada (cores + fontes) ao site. */
export const SiteTheme = () => {
  const { search } = useLocation();
  const preview = new URLSearchParams(search).get("preview") === "1";

  useEffect(() => {
    let alive = true;
    fetchSection<IdentitySettings>(SECTION_IDENTITY, IDENTITY_DEFAULTS, preview ? "draft" : "published")
      .then((v) => { if (alive) applyIdentity(v); })
      .catch(() => {});
    return () => { alive = false; };
  }, [preview]);

  return null;
};

/** Logo configurável com fallback para o logo padrão. */
export const useSiteIdentity = () => {
  const [identity, setIdentity] = useState<IdentitySettings>(IDENTITY_DEFAULTS);
  useEffect(() => {
    let alive = true;
    fetchSection<IdentitySettings>(SECTION_IDENTITY, IDENTITY_DEFAULTS)
      .then((v) => { if (alive) setIdentity(v); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return identity;
};
