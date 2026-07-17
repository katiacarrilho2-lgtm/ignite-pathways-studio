import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMessagesLog, formatPhone } from "./hooks";

const statusColor: Record<string, string> = {
  pendente: "bg-slate-200 text-slate-700",
  enviando: "bg-blue-100 text-blue-700 animate-pulse",
  enviada: "bg-blue-100 text-blue-700",
  entregue: "bg-emerald-100 text-emerald-700",
  lida: "bg-emerald-200 text-emerald-800",
  simulada: "bg-amber-100 text-amber-700",
  falhou: "bg-red-100 text-red-700",
};

export default function ConnectHistorico() {
  const { data: log = [] } = useMessagesLog(500);

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
              <th className="text-left px-4 py-3 font-medium">Contato</th>
              <th className="text-left px-4 py-3 font-medium">Campanha</th>
              <th className="text-left px-4 py-3 font-medium">Mensagem</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Nenhum disparo registrado ainda.</td></tr>}
            {log.map((m: any) => (
              <tr key={m.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{m.connect_contacts?.nome || "—"}</div>
                  <div className="text-xs text-muted-foreground">{formatPhone(m.connect_contacts?.whatsapp)}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.connect_campaigns?.nome || "—"}</td>
                <td className="px-4 py-3 text-foreground max-w-md whitespace-pre-wrap">{m.mensagem}</td>
                <td className="px-4 py-3"><Badge variant="secondary" className={statusColor[m.status]}>{m.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}