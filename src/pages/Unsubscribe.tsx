import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import logo from "@/assets/multplick-logo.png";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [sp] = useSearchParams();
  const token = sp.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON },
        });
        const j = await r.json();
        if (r.ok && j.valid) setState("valid");
        else if (j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      if ((data as any)?.success) setState("success");
      else if ((data as any)?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch { setState("error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-secondary/30 p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <img src={logo} alt="Multplick" className="h-10 w-auto mx-auto mb-6" />
        {state === "loading" && <><Loader2 className="mx-auto size-8 animate-spin text-primary mb-3" /><p className="text-sm text-muted-foreground">Verificando…</p></>}
        {state === "valid" && (
          <>
            <Mail className="mx-auto size-10 text-primary mb-3" />
            <h1 className="text-xl font-bold mb-2">Confirmar cancelamento</h1>
            <p className="text-sm text-muted-foreground mb-6">Você não receberá mais e-mails da Multplick neste endereço.</p>
            <button onClick={confirm} disabled={busy} className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />} Confirmar cancelamento
            </button>
          </>
        )}
        {state === "success" && <><CheckCircle2 className="mx-auto size-10 text-emerald-600 mb-3" /><h1 className="text-xl font-bold mb-2">Cancelamento confirmado</h1><p className="text-sm text-muted-foreground">Você não receberá mais e-mails deste tipo.</p></>}
        {state === "already" && <><CheckCircle2 className="mx-auto size-10 text-emerald-600 mb-3" /><h1 className="text-xl font-bold mb-2">Já cancelado</h1><p className="text-sm text-muted-foreground">Este e-mail já havia sido descadastrado.</p></>}
        {state === "invalid" && <><XCircle className="mx-auto size-10 text-destructive mb-3" /><h1 className="text-xl font-bold mb-2">Link inválido</h1><p className="text-sm text-muted-foreground">O link expirou ou não é válido.</p></>}
        {state === "error" && <><XCircle className="mx-auto size-10 text-destructive mb-3" /><h1 className="text-xl font-bold mb-2">Erro</h1><p className="text-sm text-muted-foreground">Não foi possível processar. Tente novamente mais tarde.</p></>}
      </div>
    </div>
  );
}