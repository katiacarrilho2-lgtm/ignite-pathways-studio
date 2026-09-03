import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, CalendarDays, Kanban, Inbox, ClipboardList, Share2, Users2,
  CalendarCheck, AlertTriangle, DollarSign, FileBarChart, Users, Link as LinkIcon,
  MessageSquare, LifeBuoy, Trophy, Building2, Boxes, Inbox as InboxIcon, FolderLock,
  Menu, LogOut, ExternalLink, Eye, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, Permission } from "@/hooks/useAuth";
import useCommercialAccounts from "@/hooks/useCommercialAccounts";
import { ROOT_ACCOUNT_ID } from "@/lib/multiAccount";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { NotificationBell } from "@/components/admin/NotificationBell";
import logo from "@/assets/multplick-logo.png";

type Item = { to: string; label: string; icon: any; mod?: Permission };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Início",
    items: [
      { to: "/polo", label: "Dashboard", icon: LayoutDashboard },
      { to: "/polo/agenda", label: "Agenda Geral", icon: CalendarDays, mod: "mod_agenda" },
    ],
  },
  {
    title: "Comercial",
    items: [
      { to: "/polo/crm", label: "CRM", icon: Kanban, mod: "mod_crm" },
      { to: "/polo/leads", label: "Leads", icon: Inbox, mod: "mod_leads" },
      { to: "/polo/pre-matriculas", label: "Pré-matrículas", icon: ClipboardList, mod: "mod_pre_matriculas" },
      { to: "/polo/afiliados", label: "Afiliados", icon: Share2, mod: "mod_afiliados" },
    ],
  },
  {
    title: "Gestão acadêmica",
    items: [
      { to: "/polo/turmas", label: "Turmas", icon: Users2, mod: "mod_turmas" },
      { to: "/polo/chamada", label: "Lista de Chamada", icon: CalendarCheck, mod: "mod_frequencia" },
      { to: "/polo/pedagogico/ocorrencias", label: "Pedagogia", icon: AlertTriangle, mod: "mod_pedagogia" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/polo/financeiro", label: "Financeiro", icon: DollarSign, mod: "mod_financeiro" },
      { to: "/polo/relatorios/pagamentos", label: "Relatórios", icon: FileBarChart, mod: "mod_relatorios" },
      { to: "/polo/usuarios", label: "Usuários / Equipe", icon: Users, mod: "mod_usuarios" },
    ],
  },
  {
    title: "Multplick",
    items: [
      { to: "/polo/documentos-links", label: "Links de Documentos", icon: LinkIcon, mod: "mod_documentos_links" },
      { to: "/polo/mensagens", label: "Mensagens", icon: MessageSquare, mod: "mod_mensagens" },
      { to: "/polo/suporte", label: "Suporte", icon: LifeBuoy, mod: "mod_suporte" },
      { to: "/polo/treinamentos", label: "Treinamentos", icon: Trophy, mod: "mod_treinamentos" },
    ],
  },
  {
    title: "Unidade",
    items: [
      { to: "/polo/escola-fisica", label: "Escola Física", icon: Building2, mod: "mod_escola_fisica" },
      { to: "/polo/almoxarifado", label: "Almoxarifado", icon: Boxes, mod: "mod_almoxarifado" },
      { to: "/polo/solicitacoes", label: "Solicitações Internas", icon: InboxIcon, mod: "mod_solicitacoes" },
      { to: "/polo/documentos-internos", label: "Documentos Internos", icon: FolderLock, mod: "mod_documentos_internos" },
    ],
  },
];

/** Permissão exigida por rota do Portal do Polo — protege o acesso por URL direta. */
const ROUTE_PERMS: { path: string; mod: Permission }[] = groups
  .flatMap((g) => g.items)
  .filter((i) => !!i.mod)
  .map((i) => ({ path: i.to, mod: i.mod as Permission }))
  .sort((a, b) => b.path.length - a.path.length);

const PoloRouteGuard = ({ pathname, children }: { pathname: string; children: React.ReactNode }) => {
  const { hasPermission } = useAuth();
  const match = ROUTE_PERMS.find((r) => pathname === r.path || pathname.startsWith(r.path + "/"));
  if (match && !hasPermission(match.mod)) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-bold text-primary">Acesso restrito</h1>
          <p className="text-muted-foreground">Seu cargo não tem permissão para este módulo do Portal do Polo.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const PoloLayoutInner = () => {
  const { user, loading, isStaff, isSuperAdmin, hasPermission, signOut, username } = useAuth();
  const { activeAccount, activeAccountId, homeAccountId, loading: loadingAccounts, setActiveAccountId } =
    useCommercialAccounts();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading || loadingAccounts) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: pathname }} replace />;
  if (!isStaff) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-primary">Acesso restrito</h1>
        <p className="text-muted-foreground">Sua conta não tem acesso ao Portal do Licenciado.</p>
        <Button asChild variant="outline"><Link to="/aluno">Ir para a Área do Aluno</Link></Button>
      </div>
    </div>
  );

  const impersonating = isSuperAdmin && homeAccountId === ROOT_ACCOUNT_ID && !!activeAccountId && activeAccountId !== ROOT_ACCOUNT_ID;
  // Master na visão global não tem contexto de Polo — volta ao painel da Matriz.
  if (homeAccountId === ROOT_ACCOUNT_ID && !impersonating) return <Navigate to="/admin" replace />;

  const poloNome = activeAccount?.name ?? "Unidade";

  const visible = groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.mod || hasPermission(i.mod)) }))
    .filter(g => g.items.length > 0);

  const SidebarBody = (
    <>
      <div className="px-5 py-5 border-b border-border/60">
        <img src={logo} alt="Multplick Formação Profissional" className="h-9 w-auto" />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Portal do Licenciado</p>
        <p className="text-sm font-semibold text-primary truncate">Polo {poloNome}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visible.map(g => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map(i => (
                <NavLink key={i.to} to={i.to} end={i.to === "/polo"}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-secondary"}`}>
                  <i.icon className="size-4 shrink-0" />
                  <span className="truncate">{i.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border/60 space-y-1">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start"><Link to="/"><ExternalLink className="size-4" />Ver site</Link></Button>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive"><LogOut className="size-4" />Sair</Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:flex bg-secondary/40">
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col sticky top-0 h-screen">{SidebarBody}</aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-3 md:px-6 h-16">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu"><Menu className="size-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 flex flex-col">{SidebarBody}</SheetContent>
            </Sheet>
            <img src={logo} alt="Multplick" className="h-8 w-auto md:hidden" />
            <div className="hidden md:block min-w-0">
              <h1 className="text-sm font-bold uppercase tracking-[0.14em] text-primary truncate">Multplick Formação Profissional</h1>
              <p className="text-xs text-muted-foreground truncate">Polo {poloNome}</p>
            </div>
            <div className="flex-1" />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/polo/suporte"><LifeBuoy className="size-4" />Suporte</Link>
            </Button>
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end leading-tight pl-1">
              <span className="text-xs font-semibold text-foreground">{username ?? user.email}</span>
              <span className="text-[10px] text-muted-foreground">Equipe do Polo</span>
            </div>
          </div>
          {impersonating && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-amber-500/15 border-t border-amber-500/40">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="size-4 text-amber-600" />
                <span className="uppercase tracking-wide text-[11px] font-semibold text-amber-700">Visualizando como</span>
                <strong className="text-foreground uppercase">Polo {poloNome}</strong>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveAccountId(null)}>
                <X className="size-4" /> Voltar à visão global
              </Button>
            </div>
          )}
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden"><Outlet /></main>
      </div>
    </div>
  );
};

export const PoloLayout = () => (
  <NotificationsProvider><PoloLayoutInner /></NotificationsProvider>
);

export default PoloLayout;
