import { createContext, useContext, ReactNode } from "react";
export type BadgeChannel = string;
type Ctx = { counts: Record<string, number>; markRead: (_c: BadgeChannel) => void; refresh: () => void };
const AdminBadgesCtx = createContext<Ctx>({ counts: {}, markRead: () => {}, refresh: () => {} });
export const AdminBadgesProvider = ({ children }: { children: ReactNode }) => (
  <AdminBadgesCtx.Provider value={{ counts: {}, markRead: () => {}, refresh: () => {} }}>{children}</AdminBadgesCtx.Provider>
);
export const useAdminBadges = () => useContext(AdminBadgesCtx);
export default useAdminBadges;
