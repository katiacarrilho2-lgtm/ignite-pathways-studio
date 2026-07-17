import { AlertTriangle } from "lucide-react";
export default function ModuleUnavailable() {
  return (
    <div className="p-8 flex items-start gap-3 rounded-lg border bg-muted/30">
      <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
      <div>
        <h2 className="font-semibold">Módulo em manutenção</h2>
        <p className="text-sm text-muted-foreground mt-1">Este módulo depende de tabelas avançadas que ainda não foram migradas. Fale com o suporte para ativá-lo.</p>
      </div>
    </div>
  );
}

