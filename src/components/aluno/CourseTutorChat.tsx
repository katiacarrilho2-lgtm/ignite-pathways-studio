import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import tutorAvatar from "@/assets/tutor-avatar.png";

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
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-primary-gradient text-primary-foreground shadow-elegant hover:scale-105 transition-smooth"
          aria-label="Falar com o Professor Multplick"
        >
          <img src={tutorAvatar} alt="" className="size-10 rounded-full bg-white object-cover" />
          <span className="text-sm font-semibold">Tirar dúvida</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-2xl shadow-elegant flex flex-col overflow-hidden">
          <header className="bg-primary-gradient text-primary-foreground p-3 flex items-center gap-3">
            <img src={tutorAvatar} alt="Professor Multplick" className="size-11 rounded-full bg-white object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight">Professor Multplick</p>
              <p className="text-[11px] opacity-80 truncate">Tutor de {course.title}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="p-1 hover:bg-white/10 rounded">
              <X className="size-5" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/20">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                {m.role === "assistant" && (
                  <img src={tutorAvatar} alt="" className="size-7 rounded-full bg-white object-cover flex-shrink-0 mt-1" />
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
                <img src={tutorAvatar} alt="" className="size-7 rounded-full bg-white object-cover" />
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
            <button type="submit" disabled={busy || !input.trim()} className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center disabled:opacity-50">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};