import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Permission = "manage_courses" | "manage_users" | "manage_leads" | "view_analytics" | "manage_content" | "view_commission" | "issue_boletos" | "settle_boletos" | "manage_affiliates" | "manage_certification";
export type Role = "super_admin" | "admin" | "editor" | "viewer" | "certificadora";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: Role[];
  permissions: Permission[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  isMaster: boolean;
  isCertificadora: boolean;
  username: string | null;
  hasPermission: (p: Permission) => boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadAccess(s.user.id), 0);
      } else {
        setRoles([]);
        setPermissions([]);
        setUsername(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadAccess(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAccess = async (uid: string) => {
    const [{ data: r }, { data: p }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("user_permissions").select("permission").eq("user_id", uid),
      supabase.from("profiles").select("username").eq("user_id", uid).maybeSingle(),
    ]);
    setRoles((r ?? []).map((x: any) => x.role));
    setPermissions((p ?? []).map((x: any) => x.permission));
    setUsername((prof as any)?.username ?? null);
  };

  const isSuperAdmin = roles.includes("super_admin");
  const isStaff = roles.length > 0;
  // Master = papel super_admin no banco. Não depende mais de username.
  const isMaster = isSuperAdmin;
  const isCertificadora = roles.includes("certificadora");
  const hasPermission = (perm: Permission) =>
    isSuperAdmin || permissions.includes(perm) || (perm === "manage_certification" && isCertificadora);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        roles,
        permissions,
        isStaff,
        isSuperAdmin,
        isMaster,
        isCertificadora,
        username,
        hasPermission,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
