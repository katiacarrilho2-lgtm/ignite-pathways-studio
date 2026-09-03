import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import useCommercialAccounts from "@/hooks/useCommercialAccounts";

/**
 * Aviso fixo exibido enquanto o Network Master está no modo "Visualizar como Polo".
 * Sair remove o registro em account_context e devolve a visão GLOBAL da Rede.
 */
export const AccountContextBanner = () => {
  const { activeAccountId, homeAccountId, activeAccount, canSwitchAccount, setActiveAccountId } = useCommercialAccounts();

  if (!canSwitchAccount || !activeAccountId || activeAccountId === homeAccountId) return null;

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/40">
      <div className="flex items-center gap-2 text-sm">
        <Eye className="size-4 text-amber-600" />
        <span className="uppercase tracking-wide text-[11px] font-semibold text-amber-700">Visualizando</span>
        <strong className="text-foreground">{activeAccount?.name ?? "Unidade"}</strong>
        <span className="text-muted-foreground hidden sm:inline">— você está vendo os dados desta unidade.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="secondary"><Link to="/polo">Abrir Portal do Polo</Link></Button>
        <Button size="sm" variant="outline" onClick={() => setActiveAccountId(null)}>
          <X className="size-4" /> Voltar para visão global
        </Button>
      </div>
    </div>
  );
};

export default AccountContextBanner;
