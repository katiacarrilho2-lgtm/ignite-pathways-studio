import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Captura ?ref=CODIGO da URL e salva em localStorage por 60 dias
export const useReferralCapture = () => {
  const { search } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (ref && /^[A-Z0-9_-]{2,30}$/i.test(ref)) {
      const payload = { code: ref.toUpperCase(), at: Date.now() };
      try { localStorage.setItem("mp_referral", JSON.stringify(payload)); } catch {}
    }
  }, [search]);
};

export const getReferralCode = (): string | null => {
  try {
    const raw = localStorage.getItem("mp_referral");
    if (!raw) return null;
    const p = JSON.parse(raw);
    const ageDays = (Date.now() - p.at) / 86400000;
    if (ageDays > 60) { localStorage.removeItem("mp_referral"); return null; }
    return p.code;
  } catch { return null; }
};