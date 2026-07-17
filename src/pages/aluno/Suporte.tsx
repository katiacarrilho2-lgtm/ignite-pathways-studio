import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LifeBuoy, Plus, Send } from "lucide-react";
import { withAccount } from "@/lib/multiAccount";

type Ticket = { id: string; subject: string; status: string; created_at: string };
type Msg = { id: string; sender_id: string; body: string; created_at: string };

const statusColor: Record<string, string> = {
  aberto: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  respondido: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  fechado: "bg-muted text-muted-foreground",
};

const AlunoSuporte = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [first, setFirst] = useState("");
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("support_tickets")
      .select("id, subject, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setTickets((data as any) ?? []);
  };

  useEffect(() => { loadTickets(); }, [user]);

  useEffect(() => {
    if (!selected) return;
    const load = () => supabase.from("support_messages")
      .select("id, sender_id, body, created_at")
      .eq("ticket_id", selected.id).order("created_at")
      .then(({ data }) => {
        setMsgs((data as any) ?? []);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
    load();
    const ch = supabase.channel(`tk-${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selected.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  const create = async () => {
    if (!user || !subject.trim() || !first.trim()) return;
    const { data: t, error } = await supabase.from("support_tickets")
      .insert({ user_id: user.id, subject: subject.trim().slice(0, 200) })
      .select().single();
    if (error || !t) return toast.error(error?.message ?? "Erro");
    await supabase.from("support_messages").insert(withAccount({
      ticket_id: t.id, sender_id: user.id, body: first.trim().slice(0, 2000),
    }, (t as any).account_id ?? null));
    toast.success("Chamado aberto");
    setOpen(false); setSubject(""); setFirst("");
    loadTickets();
    setSelected(t as Ticket);
  };

  const send = async () => {
    if (!user || !selected || !body.trim()) return;
    const { error } = await supabase.from("support_messages").insert(withAccount({
      ticket_id: selected.id, sender_id: user.id, body: body.trim().slice(0, 2000),
    }, (selected as any).account_id ?? null));
    if (error) return toast.error(error.message);
    setBody("");
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Suporte</h1>
          <p className="text-muted-foreground">Abra um chamado para nossa equipe.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="size-4" /> Novo chamado</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo chamado de suporte</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Assunto" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} />
              <Textarea placeholder="Descreva sua dúvida ou problema…" rows={5} value={first} onChange={e => setFirst(e.target.value)} maxLength={2000} />
            </div>
            <DialogFooter><Button onClick={create} disabled={!subject.trim() || !first.trim()}>Abrir chamado</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 && !selected ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <LifeBuoy className="size-10 mx-auto mb-3" />Você ainda não tem chamados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-240px)]">
          <aside className="bg-card border border-border rounded-xl p-2 overflow-y-auto space-y-1">
            {tickets.map(t => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-smooth ${selected?.id === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{t.subject}</span>
                  <Badge className={statusColor[t.status] ?? ""} variant="secondary">{t.status}</Badge>
                </div>
                <p className={`text-[11px] mt-0.5 ${selected?.id === t.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
              </button>
            ))}
          </aside>
          <section className="bg-card border border-border rounded-xl flex flex-col">
            {selected ? (
              <>
                <div className="border-b border-border p-4">
                  <h2 className="font-semibold">{selected.subject}</h2>
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
                    <Textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Responder…" maxLength={2000}
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
export default AlunoSuporte;