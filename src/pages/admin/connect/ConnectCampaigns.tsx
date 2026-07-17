import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Send, Loader2, CheckCircle2, MessageCircle, User as UserIcon, Users, ArrowRight, Play, Square } from "lucide-react";
import { useCampaigns, useSaveCampaign, useMessagesLog } from "./hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  rascunho: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  agendada: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  enviando: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  concluida: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  cancelada: "bg-red-100 text-red-700 hover:bg-red-100",
};
const statusLabel: Record<string, string> = {
  rascunho: "Rascunho", agendada: "Agendada", enviando: "Em andamento",
  concluida: "Finalizada", cancelada: "Cancelada",
};

export default function ConnectCampaigns() {
  const { data: list = [] } = useCampaigns();
  const { data: messages = [] } = useMessagesLog(1000);
  const save = useSaveCampaign();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [chooseOpen, setChooseOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["connect"] });

  const startCampaign = async (id: string) => {
    setActionId(id);
    try {
      const { data, error } = await supabase.functions.invoke("connect-campaign-start", {
        body: { campaign_id: id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Campanha agendada: ${(data as any)?.queued ?? 0} mensagens na fila`);
      refresh();
    } catch (e: any) {
      toast.error("Erro ao iniciar: " + (e.message ?? e));
    } finally { setActionId(null); }
  };

  const cancelCampaign = async (id: string) => {
    if (!confirm("Cancelar campanha? As mensagens pendentes não serão enviadas.")) return;
    setActionId(id);
    try {
      await (supabase as any).from("connect_campaign_messages")
        .delete().eq("campaign_id", id).eq("status", "pendente");
      await (supabase as any).from("connect_campaigns")
        .update({ status: "cancelada" }).eq("id", id);
      toast.success("Campanha cancelada");
      refresh();
    } finally { setActionId(null); }
  };

  const kpis = useMemo(() => {
    const total = list.length;
    const andamento = list.filter((c: any) => ["enviando", "agendada"].includes(c.status)).length;
    const finalizados = list.filter((c: any) => c.status === "concluida").length;
    const enviadas = messages.filter((m: any) => ["enviada", "entregue", "lida", "simulada"].includes(m.status)).length;
    return [
      { label: "Total de disparos", value: total, icon: Send, accent: "from-blue-500/15 to-blue-500/5 text-blue-600" },
      { label: "Em andamento", value: andamento, icon: Loader2, accent: "from-amber-500/15 to-amber-500/5 text-amber-600" },
      { label: "Finalizados", value: finalizados, icon: CheckCircle2, accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600" },
      { label: "Mensagens enviadas", value: enviadas, icon: MessageCircle, accent: "from-violet-500/15 to-violet-500/5 text-violet-600" },
    ];
  }, [list, messages]);

  const create = async (tipo: "individual" | "grupo") => {
    setCreating(true);
    try {
      const id = await save.mutateAsync({
        nome: tipo === "grupo" ? "Nova campanha para grupos" : "Nova campanha individual",
        mensagem: "Olá {nome}, ",
        tipo_publico: tipo,
        status: "rascunho",
      } as any);
      nav(`/admin/connect/campanhas/${id}`);
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className={`p-5 bg-gradient-to-br ${k.accent}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-foreground/70">{k.label}</div>
                  <div className="text-3xl font-bold text-foreground mt-1">{k.value}</div>
                </div>
                <div className="size-11 rounded-xl bg-white/70 grid place-items-center shadow-sm">
                  <k.icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setChooseOpen(true)}><Plus className="size-4" /> Nova campanha</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Campanha</th>
                <th className="text-left px-4 py-3 font-medium">Público / Conexão</th>
                <th className="text-left px-4 py-3 font-medium w-[280px]">Progresso de envio</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Nenhuma campanha. Clique em "Nova campanha" para começar.</td></tr>
              )}
              {list.map((c: any) => {
                const total = c.total_destinatarios || 0;
                const sent = c.total_enviadas || 0;
                const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
                const isGrupo = c.tipo_publico === "grupo";
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-foreground">
                        {isGrupo ? <Users className="size-4 text-emerald-600" /> : <UserIcon className="size-4 text-blue-600" />}
                        <span className="text-sm">{isGrupo ? "Grupos" : "Individuais"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.conexao || "Conexão padrão"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-foreground w-16 text-right">{sent}/{total}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">{pct}% concluído</div>
                    </td>
                    <td className="px-4 py-3"><Badge className={statusColor[c.status]}>{statusLabel[c.status] || c.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {["rascunho", "concluida", "cancelada"].includes(c.status) && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700 h-8"
                            disabled={actionId === c.id}
                            onClick={() => startCampaign(c.id)}
                          >
                            {actionId === c.id
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : <Play className="size-3.5" />}
                            <span className="ml-1">Iniciar</span>
                          </Button>
                        )}
                        {["agendada", "enviando"].includes(c.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={actionId === c.id}
                            onClick={() => cancelCampaign(c.id)}
                          >
                            <Square className="size-3.5" /> <span className="ml-1">Parar</span>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => nav(`/admin/connect/campanhas/${c.id}`)}><Pencil className="size-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Para quem é o disparo?</DialogTitle>
            <DialogDescription>Escolha o tipo de público da campanha. As regras anti-ban e o formato da mensagem mudam para cada um.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-2">
            <button
              disabled={creating}
              onClick={() => create("individual")}
              className="group rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-50/40 transition p-6 text-left">
              <div className="size-14 rounded-2xl bg-blue-500/10 text-blue-600 grid place-items-center mb-4 text-3xl">👤</div>
              <div className="font-bold text-lg text-foreground">Individuais</div>
              <p className="text-sm text-muted-foreground mt-1">Envio um a um para contatos. Recomendado para abordagem comercial e atendimento personalizado.</p>
              <div className="mt-4 flex items-center gap-1 text-sm text-blue-600 font-medium">Começar <ArrowRight className="size-4" /></div>
            </button>
            <button
              disabled={creating}
              onClick={() => create("grupo")}
              className="group rounded-2xl border-2 border-border hover:border-emerald-500 hover:bg-emerald-50/40 transition p-6 text-left">
              <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 grid place-items-center mb-4 text-3xl">👥</div>
              <div className="font-bold text-lg text-foreground">Grupos</div>
              <p className="text-sm text-muted-foreground mt-1">Disparo para grupos do WhatsApp já sincronizados. Ideal para avisos e divulgação em massa.</p>
              <div className="mt-4 flex items-center gap-1 text-sm text-emerald-600 font-medium">Começar <ArrowRight className="size-4" /></div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}