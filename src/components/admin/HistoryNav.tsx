import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HistoryNav() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(-1)} aria-label="Voltar" title="Voltar">
        <ChevronLeft className="size-4" /><span className="hidden sm:inline">Voltar</span>
      </Button>
      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(1)} aria-label="Avançar" title="Avançar">
        <span className="hidden sm:inline">Avançar</span><ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
