import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConnectContact = any;
export type ConnectStage = { id: string; nome: string; cor: string; ordem: number; is_final: boolean };
export type ConnectCampaign = any;

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export function useStages() {
  return useQuery({
    queryKey: ["connect", "stages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("connect_pipeline_stages").select("*").order("ordem");
      if (error) throw error;
      return (data ?? []) as ConnectStage[];
    },
  });
}

export function useContacts(filters?: { search?: string; stage_id?: string; status?: string }) {
  return useQuery({
    queryKey: ["connect", "contacts", filters],
    queryFn: async () => {
      let q = (supabase as any).from("connect_contacts").select("*").order("created_at", { ascending: false });
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`nome.ilike.${s},whatsapp.ilike.${s},email.ilike.${s},cidade.ilike.${s}`);
      }
      if (filters?.stage_id) q = q.eq("stage_id", filters.stage_id);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["connect", "campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("connect_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["connect", "tags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("connect_contact_tags").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; nome: string; cor: string }) => {
      if (input.id) {
        const { error } = await (supabase as any).from("connect_contact_tags")
          .update({ nome: input.nome, cor: input.cor }).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("connect_contact_tags")
          .insert({ nome: input.nome, cor: input.cor });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connect", "tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("connect_contact_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connect", "tags"] }),
  });
}

export function useVariants(campaignId?: string) {
  return useQuery({
    enabled: !!campaignId,
    queryKey: ["connect", "variants", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("connect_campaign_variants").select("*").eq("campaign_id", campaignId).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAttachments(campaignId?: string) {
  return useQuery({
    enabled: !!campaignId,
    queryKey: ["connect", "attachments", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("connect_campaign_attachments").select("*").eq("campaign_id", campaignId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCampaign(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["connect", "campaign", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("connect_campaigns").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMessagesLog(limit = 200) {
  return useQuery({
    queryKey: ["connect", "messages", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("connect_campaign_messages")
        .select("*, connect_contacts(nome, whatsapp), connect_campaigns(nome)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApiConfig() {
  return useQuery({
    queryKey: ["connect", "apiconfig"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("connect_api_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ConnectContact> & { id?: string }) => {
      const payload: any = { ...input };
      if (payload.whatsapp) payload.whatsapp = onlyDigits(payload.whatsapp);
      if (payload.id) {
        const { error } = await (supabase as any).from("connect_contacts").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { data: user } = await supabase.auth.getUser();
        payload.created_by = user.user?.id;
        const { error } = await (supabase as any).from("connect_contacts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connect"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("connect_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connect"] }),
  });
}

export function useMoveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; stage_id: string; stage_ordem: number }) => {
      const { error } = await (supabase as any).from("connect_contacts")
        .update({ stage_id: p.stage_id, stage_ordem: p.stage_ordem }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connect", "contacts"] }),
  });
}

export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ConnectCampaign> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await (supabase as any).from("connect_campaigns").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("connect_campaigns")
        .insert({ ...input, created_by: user.user?.id }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connect"] }),
  });
}

export const formatPhone = (s?: string | null) => {
  if (!s) return "—";
  const d = onlyDigits(s);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s;
};

export { onlyDigits };