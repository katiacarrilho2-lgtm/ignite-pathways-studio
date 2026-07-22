import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCcw, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Ticket = {
  id: string; user_id: string; assunto: string; mensagem: string;
  categoria: string | null; prioridade: string; status: string;
  resposta: string | null; created_at: string;
};

const statusColor: Record<string, string> = {
  aberto: "bg-amber-100 text-amber-800",
  em_andamento: "bg-blue-100 text-blue-800",
  resolvido: "bg-emerald-100 text-emerald-800",
  fechado: "bg-muted text-muted-foreground",
};

export default function AdminSuporte() {
  const { user } = useAuth();
  const [list, setList] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("todos");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setList((data ?? []) as Ticket[]);
    const uids = Array.from(new Set((data ?? []).map((t: any) => t.user_id)));
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,username,display_name,email").in("user_id", uids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = `${p.username ?? ""} ${p.display_name ?? p.email ?? ""}`.trim(); });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const send = async (t: Ticket) => {
    const r = (reply[t.id] ?? "").trim();
    if (!r) return;
    const { error } = await supabase.from("support_tickets").update({
      resposta: r, respondido_por: user?.id, respondido_em: new Date().toISOString(), status: "resolvido",
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Resposta enviada");
    setReply({ ...reply, [t.id]: "" });
    load();
  };

  const filtered = list.filter((t) => filter === "todos" ? true : t.status === filter);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Suporte ao aluno</h1>
          <p className="text-muted-foreground">Chamados abertos pelos alunos e responsáveis.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Abertos</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="resolvido">Resolvidos</SelectItem>
              <SelectItem value="fechado">Fechados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /></Button>
        </div>
      </div>

      {loading && <div className="text-muted-foreground">Carregando…</div>}
      {!loading && filtered.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum chamado.</CardContent></Card>}

      <div className="space-y-4">
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{t.assunto}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profiles[t.user_id] ?? t.user_id.slice(0, 8)} · {new Date(t.created_at).toLocaleString("pt-BR")} · {t.categoria ?? "geral"} · <span className="uppercase">{t.prioridade}</span>
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs px-2 py-1 rounded ${statusColor[t.status] ?? ""}`}>{t.status}</span>
                  <Select value={t.status} onValueChange={(v) => setStatus(t.id, v)}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">aberto</SelectItem>
                      <SelectItem value="em_andamento">em andamento</SelectItem>
                      <SelectItem value="resolvido">resolvido</SelectItem>
                      <SelectItem value="fechado">fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm bg-secondary/40 p-3 rounded">{t.mensagem}</p>
              {t.resposta && (
                <div className="border-l-4 border-primary bg-primary/5 p-3 rounded">
                  <p className="text-xs uppercase text-primary font-semibold mb-1">Resposta anterior</p>
                  <p className="whitespace-pre-wrap text-sm">{t.resposta}</p>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Textarea value={reply[t.id] ?? ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })}
                  placeholder="Digite uma resposta…" className="min-h-[70px]" />
                <Button onClick={() => send(t)}><Send className="size-4" /> Responder</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
