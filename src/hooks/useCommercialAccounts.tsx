import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROOT_ACCOUNT_ID } from "@/lib/multiAccount";

export type CommercialAccount = {
  id: string;
  name: string;
  slug: string | null;
  tipo: string | null;
  status: string | null;
};

type Result = {
  /** Conta em que o usuário está operando (a própria, ou a unidade assumida pelo Master). */
  activeAccountId: string | null;
  /** Conta de origem do usuário. */
  homeAccountId: string | null;
  accounts: CommercialAccount[];
  activeAccount: CommercialAccount | null;
  loading: boolean;
  /** Somente o Master pode trocar de unidade — e a troca é validada no banco. */
  canSwitchAccount: boolean;
  setActiveAccountId: (id: string | null) => Promise<void>;
  reload: () => Promise<void>;
};

export const useCommercialAccounts = (): Result => {
  const { user, isSuperAdmin } = useAuth();
  const [accounts, setAccounts] = useState<CommercialAccount[]>([]);
  const [homeAccountId, setHomeAccountId] = useState<string | null>(null);
  const [activeAccountId, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setHomeAccountId(null);
      setActive(null);
      setLoading(false);
      return;
    }
    // Só mostra "carregando" na primeira vez. Recargas em segundo plano
    // não podem apagar a tela nem fechar o que o usuário abriu.
    if (!loadedOnce.current) setLoading(true);
    const [{ data: prof }, { data: ctx }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("account_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("account_context").select("account_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("contas_comerciais").select("id,nome,slug,tipo_da_conta,status").order("nome"),
    ]);
    const home = (prof as any)?.account_id ?? ROOT_ACCOUNT_ID;
    setHomeAccountId(home);
    setActive((ctx as any)?.account_id ?? home);
    setAccounts(
      (rows ?? []).map((r: any) => ({
        id: r.id,
        name: r.nome,
        slug: r.slug ?? null,
        tipo: r.tipo_da_conta ?? null,
        status: r.status ?? null,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Network Master = super_admin da conta raiz. O banco revalida em toda operação.
  const canSwitchAccount = isSuperAdmin && homeAccountId === ROOT_ACCOUNT_ID;

  const setActiveAccountId = useCallback(
    async (id: string | null) => {
      if (!user || !canSwitchAccount) return;
      if (!id || id === homeAccountId) {
        await supabase.from("account_context").delete().eq("user_id", user.id);
        setActive(homeAccountId);
      } else {
        const { error } = await supabase
          .from("account_context")
          .upsert({ user_id: user.id, account_id: id }, { onConflict: "user_id" });
        if (error) return;
        setActive(id);
      }
      await load();
    },
    [user, canSwitchAccount, homeAccountId, load],
  );

  return {
    activeAccountId,
    homeAccountId,
    accounts,
    activeAccount: accounts.find((a) => a.id === activeAccountId) ?? null,
    loading,
    canSwitchAccount,
    setActiveAccountId,
    reload: load,
  };
};

export default useCommercialAccounts;
