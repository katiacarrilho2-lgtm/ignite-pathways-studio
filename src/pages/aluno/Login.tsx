import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/multplick-logo.png";

const toEmail = (u: string) => `${u.trim().replace(/\D/g, "").padStart(3, "0")}@multplick.local`;

const AlunoLogin = () => {
  const nav = useNavigate();
  const { user, isStaff, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    nav(isStaff ? "/admin" : "/aluno", { replace: true });
  }, [user, isStaff, loading, nav]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    if (!username.trim() || !cleanPassword) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password: cleanPassword });
    if (error || !data.user) { setBusy(false); return toast.error("Usuário ou senha inválidos"); }
    // Detecta se o usuário é da equipe (vendedor/admin/editor) e redireciona para /admin
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    setBusy(false);
    const staff = (roles ?? []).length > 0;
    toast.success("Bem-vindo!");
    nav(staff ? "/admin" : "/aluno", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-8">
        <Link to="/" className="flex justify-center mb-6"><img src={logo} alt="Multplick" className="h-14 w-auto" /></Link>
        <h1 className="text-2xl font-bold text-center text-primary mb-1">Área do Aluno</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Acesse seus cursos e materiais</p>

        <form onSubmit={signIn} className="space-y-3">
          <div>
            <Label>Usuário</Label>
            <Input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ex: 002" autoComplete="username" required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy?"Entrando...":"Entrar"}</Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Não tem acesso? Entre em contato com a Multplick para liberar sua matrícula.
        </p>
      </div>
    </div>
  );
};
export default AlunoLogin;