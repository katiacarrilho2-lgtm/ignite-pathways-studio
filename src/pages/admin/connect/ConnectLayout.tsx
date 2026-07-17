import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Kanban, Upload, Megaphone, History, Settings, MessagesSquare } from "lucide-react";

const tabs = [
  { to: "/admin/connect", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/connect/contatos", label: "Contatos", icon: Users },
  { to: "/admin/connect/kanban", label: "Funil", icon: Kanban },
  { to: "/admin/connect/importar", label: "Importar", icon: Upload },
  { to: "/admin/connect/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/connect/historico", label: "Histórico", icon: History },
  { to: "/admin/connect/configuracoes", label: "API WhatsApp", icon: Settings },
];

export default function ConnectLayout() {
  useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <MessagesSquare className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Multplick Connect</h1>
            <p className="text-sm text-muted-foreground">CRM, funil de vendas e campanhas de WhatsApp</p>
          </div>
        </div>
        <nav className="px-3 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }>
              <t.icon className="size-4" />{t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}