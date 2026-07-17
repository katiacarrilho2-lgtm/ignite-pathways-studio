import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

type Enrollment = { id: string; courses: { title: string } | null };
type Msg = { id: string; sender_id: string; body: string; created_at: string };

const AlunoMensagens = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("enrollments")
      .select("id, courses ( title )")
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        const list = (data as any) ?? [];
        setEnrollments(list);
        if (list.length && !selected) setSelected(list[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    const load = () => supabase
      .from("course_messages")
      .select("id, sender_id, body, created_at")
      .eq("enrollment_id", selected)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMsgs((data as any) ?? []);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
    load();
    const ch = supabase.channel(`cm-${selected}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "course_messages", filter: `enrollment_id=eq.${selected}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  const send = async () => {
    if (!user || !selected || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("course_messages").insert({
      enrollment_id: selected, sender_id: user.id, body: body.trim().slice(0, 2000),
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Mensagens ao professor</h1>
        <p className="text-muted-foreground">Tire dúvidas sobre o conteúdo do seu curso.</p>
      </div>
      {enrollments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <MessageSquare className="size-10 mx-auto mb-3" />
          Matricule-se em um curso para enviar mensagens ao professor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-220px)]">
          <aside className="bg-card border border-border rounded-xl p-2 overflow-y-auto">
            {enrollments.map(e => (
              <button key={e.id} onClick={() => setSelected(e.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-smooth ${selected === e.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                {e.courses?.title ?? "Curso"}
              </button>
            ))}
          </aside>
          <section className="bg-card border border-border rounded-xl flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Envie a primeira!</p>}
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
            <div className="border-t border-border p-3 flex gap-2">
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Digite sua mensagem…" rows={2} maxLength={2000}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <Button onClick={send} disabled={sending || !body.trim()} variant="hero"><Send className="size-4" /></Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
export default AlunoMensagens;