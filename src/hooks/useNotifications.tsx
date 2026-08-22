import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type Ctx = {
  items: Notificacao[];
  unread: number;
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotifCtx = createContext<Ctx>({ items: [], unread: 0, refresh: () => {}, markRead: async () => {}, markAllRead: async () => {} });

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notificacao[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return setItems([]);
    const { data } = await supabase
      .from("notifications" as any)
      .select("id,tipo,titulo,corpo,link,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    setItems((data ?? []) as unknown as Notificacao[]);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("notif-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const markRead = async (id: string) => {
    await supabase.from("notifications" as any).update({ read_at: new Date().toISOString() } as any).eq("id", id);
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications" as any).update({ read_at: new Date().toISOString() } as any).eq("user_id", user.id).is("read_at", null);
    refresh();
  };

  const unread = items.filter(n => !n.read_at).length;

  return <NotifCtx.Provider value={{ items, unread, refresh, markRead, markAllRead }}>{children}</NotifCtx.Provider>;
};

export const useNotifications = () => useContext(NotifCtx);
export default useNotifications;
