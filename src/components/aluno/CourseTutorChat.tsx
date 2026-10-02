import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import tutorAvatar from "@/assets/tutor-avatar.png";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export const CourseTutorChat = ({
  course,
  lessonTitle,
}: {
  course: { id: string; title: string; category?: string };
  lessonTitle?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const storageKey = `tutor:${course.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { setMessages(JSON.parse(raw)); return; }
    } catch {}
    setMessages([{
      role: "assistant",
      content: `Olá! 👋 Sou o **Professor Multplick**, seu tutor virtual de **${course.title}**. Pode me perguntar qualquer dúvida sobre o conteúdo deste curso — explico, dou exemplos e ajudo você a aprender. Por onde começamos?`,
    }]);
  }, [course.id]);

  useEffect(() => {
    if (messages.length) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); } catch {}
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("course-tutor", {
        body: { messages: next, course: { title: course.title, category: course.category }, lessonTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(m => [...m, { role: "assistant", content: data.reply || "Não consegui responder agora." }]);
    } catch (err: any) {
      setMessages(m => [...m, { role: "assistant", content: "Tive um problema para responder agora. Tente novamente em instantes." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[70] h-14 gap-3 rounded-full pl-2 pr-5 shadow-elegant hover:scale-105 transition-smooth"
          aria-label="Falar com o Professor Multplick"
        >
          <span className="relative">
            <img src={tutorAvatar} alt="" className="size-10 rounded-full bg-background object-cover" />
            <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-primary bg-primary" aria-hidden="true" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold">Professor virtual</span>
            <span className="text-[11px] font-normal opacity-85">Tire suas dúvidas</span>
          </span>
          <MessageCircle className="size-4" />
        </Button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[70] w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100dvh-2rem)] bg-card border border-border rounded-2xl shadow-elegant flex flex-col overflow-hidden">
          <header className="bg-primary-gradient text-primary-foreground p-3 flex items-center gap-3">
            <img src={tutorAvatar} alt="Professor Multplick" className="size-11 rounded-full bg-background object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight">Professor Multplick</p>
              <p className="text-[11px] opacity-80 truncate">Tutor de {course.title}</p>
            </div>
            <Button onClick={() => setOpen(false)} aria-label="Fechar professor virtual" variant="ghost" size="icon" className="size-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <X className="size-5" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/20">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                {m.role === "assistant" && (
                  <img src={tutorAvatar} alt="" className="size-7 rounded-full bg-background object-cover flex-shrink-0 mt-1" />
                )}
                {m.role === "user" ? (
                  <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="max-w-[85%] text-sm text-foreground prose prose-sm prose-p:my-2 prose-strong:text-primary prose-ul:my-2">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <img src={tutorAvatar} alt="" className="size-7 rounded-full bg-background object-cover" />
                <Loader2 className="size-4 animate-spin" /> Pensando…
              </div>
            )}
          </div>

          <form onSubmit={send} className="p-3 border-t border-border bg-card flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Pergunte sobre ${course.title}…`}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !input.trim()} size="icon" aria-label="Enviar pergunta ao professor">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};