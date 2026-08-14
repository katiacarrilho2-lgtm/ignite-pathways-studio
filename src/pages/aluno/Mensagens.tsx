import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Plus, ArrowLeft } from "lucide-react";

type Thread = { id: string; assunto: string; status: string; last_message_at: string; unread_for_student: number };
type Msg = { id: string; corpo: string; from_staff: boolean; created_at: string };

export default function Mensagens() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [novoAssunto, setNovoAssunto] = useState("");
  const [creating, setCreating] = useState(false);

  const loadThreads = async () => {
    if (!user) return;
    const { data } = await supabase.from("message_threads").select("*")
      .eq("user_id", user.id).order("last_message_at", { ascending: false });
    setThreads((data ?? []) as Thread[]);
  };
  useEffect(() => { loadThreads(); }, [user]);

  const openThread = async (t: Thread) => {
    setActive(t);
    const { data } = await supabase.from("messages").select("*").eq("thread_id", t.id).order("created_at");
    setMsgs((data ?? []) as Msg[]);
    if (t.unread_for_student > 0) {
      await supabase.from("message_threads").update({ unread_for_student: 0 }).eq("id", t.id);
      loadThreads();
    }
  };

  const criar = async () => {
    if (!user || !novoAssunto.trim()) return toast.error("Escreva o assunto");
    const { data, error } = await supabase.from("message_threads")
      .insert({ user_id: user.id, assunto: novoAssunto.trim() }).select().single();
    if (error) return toast.error(error.message);
    setNovoAssunto(""); setCreating(false); await loadThreads();
    openThread(data as Thread);
  };

  const enviar = async () => {
    if (!user || !active || !texto.trim()) return;
    const { error } = await supabase.from("messages")
      .insert({ thread_id: active.id, autor_id: user.id, from_staff: false, corpo: texto.trim() });
    if (error) return toast.error(error.message);
    setTexto(""); openThread(active); loadThreads();
  };

  if (active) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <Button variant="ghost" onClick={() => { setActive(null); loadThreads(); }}><ArrowLeft className="size-4" /> Voltar</Button>
        <h1 className="text-2xl font-bold text-primary">{active.assunto}</h1>
        <div className="space-y-3 max-h-[55vh] overflow-y-auto rounded-xl border border-border p-4 bg-card">
          {msgs.length === 0 && <p className="text-muted-foreground text-sm">Escreva sua dúvida abaixo.</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${m.from_staff ? "bg-secondary" : "bg-primary text-primary-foreground ml-auto"}`}>
              <p className="whitespace-pre-wrap">{m.corpo}</p>
              <p className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" rows={2} />
          <Button variant="hero" onClick={enviar}><Send className="size-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><MessageSquare className="size-7" /> Mensagens</h1>
          <p className="text-muted-foreground">Fale direto com a secretaria da escola.</p>
        </div>
        <Button variant="hero" onClick={() => setCreating(true)}><Plus className="size-4" /> Nova mensagem</Button>
      </div>

      {creating && (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
          <Input value={novoAssunto} onChange={(e) => setNovoAssunto(e.target.value)} placeholder="Assunto da sua dúvida" />
          <div className="flex gap-2">
            <Button variant="hero" onClick={criar}>Criar conversa</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border divide-y divide-border bg-card">
        {threads.map((t) => (
          <button key={t.id} onClick={() => openThread(t)} className="w-full text-left p-4 hover:bg-secondary/50 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t.assunto}</p>
              <p className="text-xs text-muted-foreground">{new Date(t.last_message_at).toLocaleString("pt-BR")} · {t.status}</p>
            </div>
            {t.unread_for_student > 0 && <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">{t.unread_for_student}</span>}
          </button>
        ))}
        {threads.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhuma conversa ainda.</p>}
      </div>
    </div>
  );
}
