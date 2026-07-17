import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContacts, useCampaigns, useMessagesLog, useStages } from "./hooks";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Megaphone, Send, MessageCircleReply } from "lucide-react";
import { useMemo } from "react";

export default function ConnectDashboard() {
  const { data: contacts = [] } = useContacts();
  const { data: campaigns = [] } = useCampaigns();
  const { data: messages = [] } = useMessagesLog(500);
  const { data: stages = [] } = useStages();

  const activeCampaigns = campaigns.filter((c: any) => ["agendada", "enviando"].includes(c.status)).length;
  const sent = messages.filter((m: any) => ["enviada", "entregue", "lida", "simulada"].includes(m.status)).length;
  const replies = messages.filter((m: any) => m.direction === "inbound").length;
  const responseRate = sent > 0 ? Math.round((replies / sent) * 100) : 0;

  const chart = useMemo(() => stages.map(s => ({
    nome: s.nome,
    leads: contacts.filter((c: any) => c.stage_id === s.id).length,
  })), [stages, contacts]);

  const kpis = [
    { label: "Contatos", value: contacts.length, icon: Users },
    { label: "Campanhas ativas", value: activeCampaigns, icon: Megaphone },
    { label: "Mensagens enviadas", value: sent, icon: Send },
    { label: "Taxa de resposta", value: `${responseRate}%`, icon: MessageCircleReply },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-11 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <k.icon className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Leads por etapa do funil</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}