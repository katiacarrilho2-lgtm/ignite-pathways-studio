import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SellerKind = "staff" | "afiliado" | "representante" | "parceiro_corporativo";
export type Seller = { user_id: string; display_name: string; kind: SellerKind; avatar_url?: string | null; account_id?: string | null };

// Fase 1.2 — Etapa B4: leitura híbrida (afiliados legados + membros_da_conta)
export const useCrmSellers = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: roles }, { data: affs }, { data: membros }] = await Promise.all([
        supabase.from("user_roles").select("user_id"),
        supabase.from("affiliates").select("user_id"),
        supabase
          .from("membros_da_conta")
          .select("user_id, account_id, status, account:contas_comerciais(tipo_da_conta, status)")
          .eq("status", "ativo"),
      ]);
      const eligibleMembros = ((membros as any[]) ?? []).filter((m) => {
        const tipo = m.account?.tipo_da_conta;
        return tipo === "afiliado" || tipo === "representante_pj" || tipo === "parceiro_corporativo";
      });
      const ids = Array.from(new Set([
        ...((roles ?? []).map((r: any) => r.user_id)),
        ...((affs ?? []).map((a: any) => a.user_id)),
        ...eligibleMembros.map((m: any) => m.user_id),
      ]));
      const kindMap = new Map<string, SellerKind>();
      const accountMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => kindMap.set(r.user_id, "staff"));
      (affs ?? []).forEach((a: any) => { if (!kindMap.has(a.user_id)) kindMap.set(a.user_id, "afiliado"); });
      eligibleMembros.forEach((m: any) => {
        const tipo = m.account?.tipo_da_conta;
        const k: SellerKind = tipo === "representante_pj" ? "representante"
          : tipo === "parceiro_corporativo" ? "parceiro_corporativo"
          : "afiliado";
        if (!kindMap.has(m.user_id)) kindMap.set(m.user_id, k);
        if (!accountMap.has(m.user_id)) accountMap.set(m.user_id, m.account_id);
      });
      if (!ids.length) { setSellers([]); setLoading(false); return; }
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url, email").in("user_id", ids);
      const list: Seller[] = ids.map(uid => {
        const p: any = (profs ?? []).find((x: any) => x.user_id === uid);
        return {
          user_id: uid,
          display_name: p?.display_name || p?.email || uid.slice(0, 8),
          avatar_url: p?.avatar_url ?? null,
          kind: kindMap.get(uid) || "staff",
          account_id: accountMap.get(uid) ?? null,
        };
      }).sort((a, b) => a.display_name.localeCompare(b.display_name));
      setSellers(list);
      setLoading(false);
    })();
  }, []);

  const byId = (id?: string | null) => sellers.find(s => s.user_id === id);
  return { sellers, byId, loading };
};