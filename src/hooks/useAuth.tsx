import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type LegacyPermission = "manage_courses" | "manage_users" | "manage_leads" | "view_analytics" | "manage_content" | "view_commission" | "issue_boletos" | "settle_boletos" | "manage_affiliates" | "manage_certification";
export type ModulePermission =
  | "mod_dashboard" | "mod_certificacao" | "mod_documentos_links" | "mod_crm" | "mod_connect"
  | "mod_cursos" | "mod_cursos_ia" | "mod_corporativo" | "mod_categorias" | "mod_andamento"
  | "mod_imagens" | "mod_promo" | "mod_parceiros" | "mod_cupons" | "mod_marketing"
  | "mod_alunos" | "mod_pre_matriculas" | "mod_turmas" | "mod_usuarios" | "mod_cargos"
  | "mod_leads" | "mod_mensagens" | "mod_suporte" | "mod_financeiro" | "mod_relatorios"
  | "mod_afiliados" | "mod_meu_afiliado" | "mod_treinamentos"
  | "mod_rede_interna" | "mod_solicitacoes" | "mod_almoxarifado" | "mod_escola_fisica"
  | "mod_patrimonio" | "mod_manutencao" | "mod_pedagogia" | "mod_frequencia"
  | "mod_agenda" | "mod_documentos_internos" | "mod_auditoria" | "mod_departamentos";
export type Permission = LegacyPermission | ModulePermission;
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

  // Mantém a MESMA referência de `user` quando é o mesmo usuário (ex.: renovação
  // de token ao voltar de outra aba). Assim nada na tela é remontado e o que o
  // usuário tinha aberto (ficha, diálogo, formulário) continua aberto.
  const applyUser = (next: User | null) =>
    setUser((prev) => (prev && next && prev.id === next.id ? prev : next));

  useEffect(() => {
    const loadedFor = { current: null as string | null };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      applyUser(s?.user ?? null);
      if (s?.user) {
        if (loadedFor.current !== s.user.id) {
          loadedFor.current = s.user.id;
          setTimeout(() => loadAccess(s.user.id), 0);
        }
      } else {
        loadedFor.current = null;
        setRoles([]);
        setPermissions([]);
        setUsername(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      applyUser(data.session?.user ?? null);
      if (data.session?.user && loadedFor.current !== data.session.user.id) {
        loadedFor.current = data.session.user.id;
        loadAccess(data.session.user.id);
      }
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
