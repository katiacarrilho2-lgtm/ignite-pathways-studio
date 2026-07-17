import { supabase } from "@/integrations/supabase/client";

const KEY = "impersonation:originalSession";

export const isImpersonating = () => !!localStorage.getItem(KEY);

export const startImpersonation = async (userId: string) => {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("Sessão admin não encontrada");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-impersonate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ user_id: userId }),
    },
  );
  const out = await res.json();
  if (!res.ok) throw new Error(out.error || "Falha ao personificar");

  // Guarda a sessão original ANTES de trocar
  localStorage.setItem(
    KEY,
    JSON.stringify({
      access_token: sess.session.access_token,
      refresh_token: sess.session.refresh_token,
    }),
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: out.hashed_token,
    type: "magiclink",
  });
  if (error) {
    localStorage.removeItem(KEY);
    throw error;
  }
};

export const stopImpersonation = async () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  const orig = JSON.parse(raw) as { access_token: string; refresh_token: string };
  localStorage.removeItem(KEY);
  await supabase.auth.setSession(orig);
};