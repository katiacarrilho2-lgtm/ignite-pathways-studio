import { AlertTriangle } from "lucide-react";
export function FinanceWidget() {
  return (
    <div className="p-4 flex items-start gap-3 rounded-lg border bg-muted/30">
      <AlertTriangle className="size-4 text-amber-600 mt-0.5" />
      <div className="text-sm text-muted-foreground">Widget financeiro em manutenção.</div>
    </div>
  );
}
export default FinanceWidget;
