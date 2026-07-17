// Shim: multi-account feature not enabled in lean schema
export type CommercialAccount = { id: string; name: string };
export const useCommercialAccounts = (): { activeAccountId: string | null; accounts: CommercialAccount[]; loading: boolean; setActiveAccountId: (id: string | null) => void } => ({
  activeAccountId: null,
  accounts: [],
  loading: false,
  setActiveAccountId: () => {},
});
export default useCommercialAccounts;
