import { NavLink, Outlet } from "react-router-dom";
import { Kanban, Calendar, BarChart3, Users2, Ticket, ListChecks, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import CrmPromoBanner from "./CrmPromoBanner";
import { usePortalBase } from "@/lib/portal";

const mkTabs = (base: string) => [
  { to: `${base}/crm`, label: "Pipeline", icon: Kanban, end: true },
  { to: `${base}/crm/banco-leads`, label: "Banco de Leads", icon: Database },
  { to: `${base}/crm/agenda`, label: "Agenda", icon: Calendar },
  { to: `${base}/crm/relatorios`, label: "Relatórios", icon: BarChart3 },
  { to: `${base}/crm/listagem`, label: "Listagem / Excel", icon: ListChecks, master: true },
  { to: `${base}/crm/pre-matriculas`, label: "Pré-matrículas", icon: Ticket, master: true },
  { to: `${base}/crm/equipe`, label: "Equipe", icon: Users2, master: true },
];

export default function CrmLayout() {
  const { isMaster } = useAuth();
  const base = usePortalBase();
  const tabs = mkTabs(base);
  const canSeeEquipe = isMaster;
  return (
    <div className="flex flex-col min-h-full">
      <header className="px-8 pt-6 pb-3 border-b border-border bg-card/40">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">CRM</h1>
            <p className="text-sm text-muted-foreground">Pipeline de vendas e atendimento</p>
          </div>
          <nav className="flex gap-1 bg-secondary/60 p-1 rounded-lg">
            {tabs.filter(t => !t.master || canSeeEquipe).map(t => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({isActive}) => `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="size-4" />{t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <CrmPromoBanner />
      <div className="flex-1 overflow-auto"><Outlet /></div>
    </div>
  );
}