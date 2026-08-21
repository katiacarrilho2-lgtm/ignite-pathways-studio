import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Megaphone, Kanban, Sparkles, Rocket } from "lucide-react";

const tabs = [
  { to: "/admin/marketing", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/marketing/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/marketing/tarefas", label: "Tarefas", icon: Kanban },
  { to: "/admin/marketing/ia", label: "Estúdio IA", icon: Sparkles },
];

export default function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Rocket className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Central de Marketing Multplick</h1>
            <p className="text-sm text-muted-foreground">Campanhas, resultados, tarefas e criação com IA</p>
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
