// Stub — badges desativados durante a migração.
import { createContext, useContext, ReactNode } from "react";
export type BadgeChannel = string;
const Ctx = createContext<{ badges: Record<string, number>; refresh: () => void }>({ badges: {}, refresh: () => {} });
export const AdminBadgesProvider = ({ children }: { children: ReactNode }) => (
  <Ctx.Provider value={{ badges: {}, refresh: () => {} }}>{children}</Ctx.Provider>
);
export const useAdminBadges = () => useContext(Ctx);
export default useAdminBadges;
