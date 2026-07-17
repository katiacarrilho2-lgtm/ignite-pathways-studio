import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TipoConta =
  | "interna_multplick"
  | "afiliado"
  | "representante_pj"
  | "parceiro_corporativo"
  | "cliente_corporativo"
  | "licenciado"
  | "escola_parceira";

export type FuncaoConta =
  | "proprietario"
  | "administrador"
  | "gestor"
  | "operador"
  | "vendedor"
  | "financeiro"
  | "visualizador";

export interface CommercialAccount {
  id: string;
  nome: string;
  slug: string;
  tipo_da_conta: TipoConta;
  status: string;
  parent_id: string | null;
  configuracoes: any;
}

export interface AccountMembership {
  account_id: string;
  funcao_na_conta: FuncaoConta;
  permissoes: string[];
  status: string;
  account: CommercialAccount;
}

/**
 * Fase 1.2 — Etapa B4
 * Hook de acesso à camada de contas comerciais.
 * Lê membros_da_conta + contas_comerciais para o usuário logado.
 * NÃO altera RLS nem fluxos existentes. Apenas leitura compatível.
 */
export const useCommercialAccounts = () => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setActiveAccountId(null);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("membros_da_conta")
        .select("account_id, funcao_na_conta, permissoes, status, account:contas_comerciais(*)")
        .eq("user_id", user.id)
        .eq("status", "ativo");
      if (error) {
        console.warn("[useCommercialAccounts]", error.message);
        setMemberships([]);
        setLoading(false);
        return;
      }
      const list = ((data as any[]) || []).map((r) => ({
        account_id: r.account_id,
        funcao_na_conta: r.funcao_na_conta,
        permissoes: r.permissoes || [],
        status: r.status,
        account: r.account,
      })) as AccountMembership[];
      setMemberships(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem("mp:active_account") : null;
      const chosen = list.find((m) => m.account_id === stored) || list[0] || null;
      setActiveAccountId(chosen?.account_id ?? null);
      setLoading(false);
    })();
  }, [user]);

  const setActive = (id: string) => {
    setActiveAccountId(id);
    try { localStorage.setItem("mp:active_account", id); } catch { /* noop */ }
  };

  const active = memberships.find((m) => m.account_id === activeAccountId) || null;

  return {
    loading,
    memberships,
    accounts: memberships.map((m) => m.account),
    activeAccount: active?.account ?? null,
    activeAccountId,
    activeMembership: active,
    tipoDaConta: active?.account?.tipo_da_conta ?? null,
    funcaoNaConta: active?.funcao_na_conta ?? null,
    permissoes: active?.permissoes ?? [],
    setActiveAccount: setActive,
  };
};