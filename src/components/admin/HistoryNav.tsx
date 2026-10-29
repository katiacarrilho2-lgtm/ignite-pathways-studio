import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HistoryNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const goBack = () => {
    const index: unknown = window.history.state?.idx;
    if (typeof index === "number" && index > 0) navigate(-1);
    else navigate(pathname.startsWith("/polo") ? "/polo" : "/admin");
  };
  return (
    <div className="flex items-center gap-1" role="navigation" aria-label="Histórico do painel">
      <Button variant="outline" size="sm" className="h-8 px-2" onClick={goBack} aria-label="Voltar" title="Voltar à página anterior">
        <ChevronLeft className="size-4" /><span>Voltar</span>
      </Button>
      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(1)} aria-label="Avançar" title="Avançar à página seguinte do histórico (após voltar)">
        <span>Avançar</span><ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
