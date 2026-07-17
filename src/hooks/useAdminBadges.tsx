import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type BadgeChannel = "leads" | "course_messages" | "support_tickets";

type Counts = Record<BadgeChannel, number>;

type Ctx = {
  counts: Counts;
  markRead: (channel: BadgeChannel) => Promise<void>;
  refresh: () => Promise<void>;
};

const BadgeCtx = createContext<Ctx | undefined>(undefined);

const DEFAULT: Counts = { leads: 0, course_messages: 0, support_tickets: 0 };

export const AdminBadgesProvider = ({ children }: { children: ReactNode }) => {
  const { user, isStaff } = useAuth();
  const [counts, setCounts] = useState<Counts>(DEFAULT);
  const [lastRead, setLastRead] = useState<Record<BadgeChannel, string>>({
    leads: new Date(0).toISOString(),
    course_messages: new Date(0).toISOString(),
    support_tickets: new Date(0).toISOString(),
  });

  const loadLastRead = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("admin_read_state").select("channel, last_read_at").eq("user_id", user.id);
    const next = { ...lastRead };
    for (const r of (data as any[]) ?? []) {
      if (r.channel in next) (next as any)[r.channel] = r.last_read_at;
    }
    setLastRead(next);
    return next;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user || !isStaff) return;
    const lr = (await loadLastRead()) ?? lastRead;
    const [leads, msgs, tickets] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).gt("created_at", lr.leads),
      supabase.from("course_messages").select("id", { count: "exact", head: true }).gt("created_at", lr.course_messages).neq("sender_id", user.id),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["aberto", "respondido"]).gt("updated_at", lr.support_tickets),
    ]);
    setCounts({
      leads: leads.count ?? 0,
      course_messages: msgs.count ?? 0,
      support_tickets: tickets.count ?? 0,
    });
  }, [user, isStaff, loadLastRead, lastRead]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: qualquer INSERT nas tabelas refresca
  useEffect(() => {
    if (!user || !isStaff) return;
    const ch = supabase.channel("admin-badges")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "course_messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, isStaff, refresh]);

  const markRead = async (channel: BadgeChannel) => {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("admin_read_state").upsert({ user_id: user.id, channel, last_read_at: now });
    setLastRead(prev => ({ ...prev, [channel]: now }));
    setCounts(prev => ({ ...prev, [channel]: 0 }));
  };

  return <BadgeCtx.Provider value={{ counts, markRead, refresh }}>{children}</BadgeCtx.Provider>;
};

export const useAdminBadges = () => {
  const ctx = useContext(BadgeCtx);
  if (!ctx) return { counts: DEFAULT, markRead: async () => {}, refresh: async () => {} } as Ctx;
  return ctx;
};