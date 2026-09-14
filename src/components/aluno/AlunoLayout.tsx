import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, User, LogOut, ExternalLink, GraduationCap, MessageSquare, LifeBuoy, DollarSign, Share2, Menu, Trophy, FolderOpen } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import logo from "@/assets/multplick-logo.png";
import { isImpersonating, stopImpersonation } from "@/lib/impersonate";
import { useNavigate } from "react-router-dom";

const items = [
  { to: "/aluno", label: "Meus Cursos", icon: BookOpen, end: true },
  { to: "/aluno/treinamentos", label: "Treinamentos", icon: Trophy },
  { to: "/aluno/certificados", label: "Certificados", icon: Award },
  { to: "/aluno/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/aluno/compras", label: "Minhas Compras", icon: ShoppingBag },
  { to: "/aluno/documentos", label: "Documentos", icon: FolderOpen },
  { to: "/aluno/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/aluno/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/aluno/afiliado", label: "Afiliado", icon: Share2 },
  { to: "/aluno/perfil", label: "Meu Perfil", icon: User },
];

export const AlunoLayout = () => {
  const { user, loading, signOut } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  useEffect(() => { setImpersonating(isImpersonating()); }, [user?.id]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/aluno/login" state={{ from: pathname }} replace />;

  const returnToAdmin = async () => {
    await stopImpersonation();
    setImpersonating(false);
    nav("/admin/alunos");
  };

  const SidebarBody = (
    <>
      <Link to="/" className="p-5 border-b border-border block"><img src={logo} alt="Multplick" className="h-10 w-auto" /></Link>
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 text-sm">
        <GraduationCap className="size-4 text-primary" />
        <span className="font-medium">Área do Aluno</span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(i => (
          <NavLink key={i.to} to={i.to} end={i.end}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
            <i.icon className="size-4" />{i.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start"><Link to="/"><ExternalLink className="size-4" />Ver site</Link></Button>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive"><LogOut className="size-4" />Sair</Button>
        <p className="text-xs text-muted-foreground px-2 pt-2 truncate" title={user.email ?? ""}>{user.email}</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:flex bg-secondary/30">
      {impersonating && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-black text-sm font-medium px-4 py-2 flex items-center justify-between gap-3 shadow">
          <span>👁️ Você está vendo como <strong>{user.email}</strong> (modo admin)</span>
          <Button size="sm" variant="secondary" onClick={returnToAdmin}>Voltar ao admin</Button>
        </div>
      )}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col sticky top-0 h-screen">
        {SidebarBody}
      </aside>
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 px-3 h-14 bg-card border-b border-border">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu"><Menu className="size-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 flex flex-col">{SidebarBody}</SheetContent>
        </Sheet>
        <img src={logo} alt="Multplick" className="h-8 w-auto" />
        <div className="w-9" />
      </header>
      <main className="flex-1 min-w-0 overflow-x-hidden"><Outlet /></main>
    </div>
  );
};