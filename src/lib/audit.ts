import { supabase } from "@/integrations/supabase/client";

export async function logAudit(modulo: string, acao: string, descricao?: string, registro_id?: string) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    let actor_name: string | null = data.user?.email ?? null;
    if (uid) {
      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", uid).maybeSingle();
      actor_name = (p as any)?.display_name ?? actor_name;
    }
    await supabase.from("audit_logs" as any).insert({
      actor_id: uid ?? null,
      actor_name,
      modulo,
      acao,
      descricao: descricao ?? null,
      registro_id: registro_id ?? null,
    } as any);
  } catch {
    /* auditoria nunca deve quebrar o fluxo */
  }
}
