import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, Permission } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, GraduationCap, Users, Inbox, LogOut, ExternalLink, Image as ImageIcon, UserCheck, Users2, Activity, MessageSquare, LifeBuoy, DollarSign, FileBarChart, Share2, Kanban, Menu, Megaphone, Tag, Sparkles, ClipboardList, FolderTree, Handshake, Briefcase, MessagesSquare, Trophy, Shield, FileCheck2, Link as LinkIcon, Rocket } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/multplick-logo.png";
import { AdminBadgesProvider, useAdminBadges, BadgeChannel } from "@/hooks/useAdminBadges";
import { useEffect, useState } from "react";
import CrmUrgentAlerts from "@/pages/admin/crm/CrmUrgentAlerts";

const navItems: { to: string; label: string; icon: any; perm?: Permission; mod?: Permission; badge?: BadgeChannel }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/certificacao", label: "Certificação e Documentação para Conselhos", icon: FileCheck2, perm: "manage_certification", mod: "mod_certificacao" },
  { to: "/admin/documentos-links", label: "Links de Documentos", icon: LinkIcon, perm: "manage_courses", mod: "mod_documentos_links" },
  { to: "/admin/crm", label: "CRM", icon: Kanban, perm: "manage_leads", mod: "mod_crm" },
  { to: "/admin/connect", label: "Multplick Connect", icon: MessagesSquare, perm: "manage_leads", mod: "mod_connect" },
  { to: "/admin/cursos", label: "Cursos", icon: GraduationCap, perm: "manage_courses", mod: "mod_cursos" },
  { to: "/admin/cursos/ia", label: "Gerar Curso IA", icon: Sparkles, perm: "manage_courses", mod: "mod_cursos_ia" },
  { to: "/admin/corporativo", label: "Corporativo", icon: Briefcase, perm: "manage_courses", mod: "mod_corporativo" },
  { to: "/admin/categorias", label: "Categorias", icon: FolderTree, perm: "manage_courses", mod: "mod_categorias" },
  { to: "/admin/andamento", label: "Andamento", icon: Activity, perm: "manage_courses", mod: "mod_andamento" },
  { to: "/admin/imagens", label: "Imagens", icon: ImageIcon, perm: "manage_courses", mod: "mod_imagens" },
  { to: "/admin/promo", label: "Carrossel Home", icon: Megaphone, perm: "manage_courses", mod: "mod_promo" },
  { to: "/admin/parceiros", label: "Parceiros", icon: Handshake, perm: "manage_courses", mod: "mod_parceiros" },
  { to: "/admin/cupons", label: "Cupons", icon: Tag, perm: "manage_courses", mod: "mod_cupons" },
  { to: "/admin/marketing", label: "Central de Marketing", icon: Rocket, perm: "manage_courses", mod: "mod_marketing" },
  { to: "/admin/alunos", label: "Alunos", icon: UserCheck, perm: "manage_courses", mod: "mod_alunos" },
  { to: "/admin/pre-matriculas", label: "Pré-matrículas", icon: ClipboardList, perm: "manage_courses", mod: "mod_pre_matriculas" },
  { to: "/admin/turmas", label: "Turmas", icon: Users2, perm: "manage_courses", mod: "mod_turmas" },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, perm: "manage_users", mod: "mod_usuarios" },
  { to: "/admin/cargos", label: "Cargos", icon: Shield, perm: "manage_users", mod: "mod_cargos" },
  { to: "/admin/leads", label: "Leads", icon: Inbox, perm: "manage_leads", mod: "mod_leads", badge: "leads" },
  { to: "/admin/mensagens", label: "Mensagens", icon: MessageSquare, perm: "manage_courses", mod: "mod_mensagens", badge: "course_messages" },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy, perm: "manage_courses", mod: "mod_suporte", badge: "support_tickets" },
  { to: "/admin/financeiro", label: "Financeiro", icon: DollarSign, perm: "manage_courses", mod: "mod_financeiro" },
  { to: "/admin/relatorios/pagamentos", label: "Relatórios", icon: FileBarChart, perm: "manage_courses", mod: "mod_relatorios" },
  { to: "/admin/afiliados", label: "Afiliados", icon: Share2, perm: "manage_affiliates", mod: "mod_afiliados" },
  { to: "/admin/meu-afiliado", label: "Meu Afiliado", icon: Share2 },
  { to: "/admin/treinamentos", label: "Treinamentos", icon: Trophy, perm: "manage_users", mod: "mod_treinamentos" },
];

const AdminLayoutInner = () => {
  const { user, loading, isStaff, hasPermission, signOut, isCertificadora, isSuperAdmin, isMaster } = useAuth();
  const { pathname } = useLocation();
  const { counts, markRead } = useAdminBadges();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Marcar canal como lido ao entrar na rota correspondente
  useEffect(() => {
    const item = navItems.find(i => i.badge && pathname.startsWith(i.to));
    if (item?.badge) markRead(item.badge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Certificadora só enxerga a página dela — se a única permissão é manage_certification, redireciona
  const onlyCertification =
    !isSuperAdmin && hasPermission("manage_certification")
    && !hasPermission("manage_courses") && !hasPermission("manage_users")
    && !hasPermission("manage_leads") && !hasPermission("manage_affiliates");
  if ((onlyCertification || isCertificadora) && !pathname.startsWith("/admin/certificacao")) {
    return <Navigate to="/admin/certificacao" replace />;
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: pathname }} replace />;
  if (!isStaff) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-primary">Acesso restrito</h1>
        <p className="text-muted-foreground">Sua conta ainda não tem permissão para o painel. Solicite um convite a um administrador.</p>
        <Button onClick={signOut} variant="outline">Sair</Button>
      </div>
    </div>
  );

  const SidebarBody = (
    <>
      <Link to="/" className="p-5 border-b border-border block"><img src={logo} alt="Multplick" className="h-10 w-auto" /></Link>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.filter(i => {
          // Itens restritos ao master (não aparecem nem para quem tem permissões amplas)
          const masterOnly = ["/admin/connect", "/admin/cargos", "/admin/usuarios"];
          if (masterOnly.includes(i.to) && !isMaster) return false;
          return !i.perm || hasPermission(i.perm);
        }).map(i => {
          const count = i.badge ? counts[i.badge] : 0;
          return (
            <NavLink key={i.to} to={i.to} end={i.to === "/admin"}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
              <i.icon className="size-4" />
              <span className="flex-1">{i.label}</span>
              {count > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </NavLink>
          );
        })}
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
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
      <CrmUrgentAlerts />
    </div>
  );
};

export const AdminLayout = () => (
  <AdminBadgesProvider><AdminLayoutInner /></AdminBadgesProvider>
);

export const RequirePermission = ({ perm, children }: { perm: Permission; children: React.ReactNode }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(perm)) return (
    <div className="p-10 text-center text-muted-foreground">Você não tem permissão para acessar esta área.</div>
  );
  return <>{children}</>;
};
