// Stub — CRM desativado durante a migração.
export type CrmSeller = { user_id: string; display_name: string };
export const useCrmSellers = (): { sellers: CrmSeller[]; loading: boolean; refresh: () => void } => ({
  sellers: [], loading: false, refresh: () => {},
});
export default useCrmSellers;
