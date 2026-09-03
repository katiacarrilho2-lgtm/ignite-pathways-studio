import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/multplick-logo.png";

const toEmail = (u: string) => {
  const raw = u.trim();
  if (raw.includes("@")) return raw.toLowerCase();
  const m = /^([A-Za-z]{1,3})(\d+)$/.exec(raw);
  if (m) return `${m[1].toLowerCase()}${Number(m[2])}@multplick.local`;
  return `${raw.replace(/\D/g, "").padStart(3, "0")}@multplick.local`;
};

const ROOT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000001";

/** Destino após o login: Matriz vai para /admin, Polo/Licenciado vai para /polo. */
const destinationFor = async (userId: string) => {
  const { data } = await supabase.from("profiles").select("account_id").eq("user_id", userId).maybeSingle();
  const account = (data as any)?.account_id ?? ROOT_ACCOUNT_ID;
  return account && account !== ROOT_ACCOUNT_ID ? "/polo" : "/admin";
};

const Auth = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    destinationFor(user.id).then((to) => { if (alive) nav(to, { replace: true }); });
    return () => { alive = false; };
  }, [user, nav]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    if (!username.trim() || !cleanPassword) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password: cleanPassword });
    if (error || !data.user) {
      setBusy(false);
      return toast.error("Usuário ou senha inválidos");
    }
    const to = await destinationFor(data.user.id);
    setBusy(false);
    toast.success("Bem-vindo de volta!");
    nav(to, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-8">
        <Link to="/" className="flex justify-center mb-6">
          <img src={logo} alt="Multplick" className="h-14 w-auto" />
        </Link>
        <h1 className="text-2xl font-bold text-center text-primary mb-1">Painel Multplick</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Acesso administrativo</p>

        <form onSubmit={signIn} className="space-y-3">
          <div>
            <Label>Usuário</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: 001"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Acesso restrito a administradores autorizados.
        </p>
      </div>
    </div>
  );
};
export default Auth;
