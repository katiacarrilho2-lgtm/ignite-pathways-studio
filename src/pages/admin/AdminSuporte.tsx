import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import { LifeBuoy, Send } from "lucide-react";

type Ticket = {
  id: string; subject: string; status: string; created_at: string; user_id: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};
type Msg = { id: string; sender_id: string; body: string; created_at: string };

const AdminSuporte = () => {
  const { activeAccountId } = useCommercialAccounts();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase.from("support_tickets")
      .select("id, subject, status, created_at, user_id")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const rows = (data as any[]) ?? [];
    const ids = Array.from(new Set(rows.map(r => r.user_id)));
    let pMap = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("user_id, display_name, email").in("user_id", ids);
      pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    }
    setTickets(rows.map(t => ({ ...t, profiles: pMap.get(t.user_id) ?? null })));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    const loadMsgs = () => supabase.from("support_messages")
      .select("id, sender_id, body, created_at")
      .eq("ticket_id", selected.id).order("created_at")
      .then(({ data }) => {
        setMsgs((data as any) ?? []);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
    loadMsgs();
    const ch = supabase.channel(`as-${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selected.id}` }, () => loadMsgs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  const send = async () => {
    if (!user || !selected || !body.trim()) return;
    const { error } = await supabase.from("support_messages").insert(withAccount({
      ticket_id: selected.id, sender_id: user.id, body: body.trim().slice(0, 2000),
    }, activeAccountId));
    if (error) return toast.error(error.message);
    if (selected.status === "aberto") {
      await supabase.from("support_tickets").update({ status: "respondido" }).eq("id", selected.id);
      setSelected({ ...selected, status: "respondido" });
      load();
    }
    setBody("");
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    setSelected({ ...selected, status });
    load();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Suporte</h1>
        <p className="text-muted-foreground">Chamados abertos pelos alunos.</p>
      </div>
      {tickets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <LifeBuoy className="size-10 mx-auto mb-3" />Nenhum chamado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)]">
          <aside className="bg-card border border-border rounded-xl p-2 overflow-y-auto space-y-1">
            {tickets.map(t => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-smooth ${selected?.id === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{t.subject}</span>
                  <Badge variant="secondary">{t.status}</Badge>
                </div>
                <p className={`text-[11px] truncate ${selected?.id === t.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{t.profiles?.display_name ?? t.profiles?.email ?? "Aluno"}</p>
              </button>
            ))}
          </aside>
          <section className="bg-card border border-border rounded-xl flex flex-col">
            {selected ? (
              <>
                <div className="border-b border-border p-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{selected.subject}</h2>
                    <p className="text-xs text-muted-foreground">{selected.profiles?.display_name ?? selected.profiles?.email}</p>
                  </div>
                  <Select value={selected.status} onValueChange={setStatus}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="respondido">Respondido</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgs.map(m => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                {selected.status !== "fechado" && (
                  <div className="border-t border-border p-3 flex gap-2">
                    <Textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Responder ao aluno…" maxLength={2000}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                    <Button onClick={send} disabled={!body.trim()} variant="hero"><Send className="size-4" /></Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-muted-foreground">Selecione um chamado</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
export default AdminSuporte;