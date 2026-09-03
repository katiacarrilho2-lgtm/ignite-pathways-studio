import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import useCommercialAccounts from "@/hooks/useCommercialAccounts";
import { ROOT_ACCOUNT_ID } from "@/lib/multiAccount";

/**
 * Área exclusiva do Network Master (super_admin da conta raiz Multplick).
 * A rota é bloqueada aqui e o banco também nega: as policies de
 * contas_comerciais exigem is_network_master(auth.uid()).
 */
export const RequireNetworkMaster = ({ children }: { children: ReactNode }) => {
  const { isSuperAdmin, loading } = useAuth();
  const { homeAccountId, loading: loadingAccounts } = useCommercialAccounts();

  if (loading || loadingAccounts) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!isSuperAdmin || homeAccountId !== ROOT_ACCOUNT_ID) {
    return (
      <div className="p-10 text-center space-y-2">
        <h1 className="text-xl font-bold text-destructive">Acesso negado</h1>
        <p className="text-muted-foreground">A Central da Rede Multplick é exclusiva da administração Master.</p>
      </div>
    );
  }
  return <>{children}</>;
};

export default RequireNetworkMaster;
