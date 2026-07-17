import { NavLink, Outlet } from "react-router-dom";
import { Inbox, Database, Upload } from "lucide-react";
import { RequirePermission } from "@/components/admin/AdminLayout";

const tabs = [
  { to: "/admin/leads", label: "Recebidos", icon: Inbox, end: true },
  { to: "/admin/leads/banco", label: "Banco de Leads", icon: Database },
  { to: "/admin/leads/importar", label: "Importar / Colar lista", icon: Upload },
];

export default function LeadsLayout() {
  return (
    <RequirePermission perm="manage_leads">
      <div className="flex flex-col min-h-full">
        <header className="px-8 pt-6 pb-3 border-b border-border bg-card/40">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-primary">Leads</h1>
              <p className="text-sm text-muted-foreground">Central de captação e histórico completo de contatos</p>
            </div>
            <nav className="flex gap-1 bg-secondary/60 p-1 rounded-lg">
              {tabs.map(t => (
                <NavLink key={t.to} to={t.to} end={t.end}
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <t.icon className="size-4" />{t.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <div className="flex-1 overflow-auto"><Outlet /></div>
      </div>
    </RequirePermission>
  );
}