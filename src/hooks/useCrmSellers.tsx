export type CrmSeller = { user_id: string; display_name: string };
export const useCrmSellers = (): { sellers: CrmSeller[]; byId: Record<string, CrmSeller>; loading: boolean; refresh: () => void } => ({
  sellers: [], byId: {}, loading: false, refresh: () => {},
});
export default useCrmSellers;
