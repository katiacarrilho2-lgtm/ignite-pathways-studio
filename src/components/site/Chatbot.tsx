import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Loader2, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/multplick-logo.png";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content: "Olá! 👋 Sou a assistente virtual da **Multplick**. Posso te ajudar com dúvidas sobre cursos, NRs, treinamentos in company ou o programa Seja Licenciado. Pode perguntar!",
};

export const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", { body: { messages: next } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(m => [...m, { role: "assistant", content: data.reply || "Não consegui responder agora." }]);
      // Após 2 mensagens do usuário, oferecer captura de contato
      const userCount = next.filter(m => m.role === "user").length;
      if (userCount >= 2 && !contactSaved && !showContact) setShowContact(true);
    } catch (err: any) {
      setMessages(m => [...m, { role: "assistant", content: "Tive um problema para responder. Tente o WhatsApp **(18) 99684-1902** para atendimento imediato." }]);
    } finally { setBusy(false); }
  };

  const saveContact = async () => {
    if (!cName.trim() || (!cEmail.trim() && !cPhone.trim())) return;
    setSavingContact(true);
    try {
      const transcript = messages.slice(-12)
        .map(m => `${m.role === "user" ? "USUÁRIO" : "IA"}: ${m.content.slice(0, 500)}`)
        .join("\n");
      await supabase.from("leads").insert({
        name: cName.trim().slice(0, 120),
        email: cEmail.trim() ? cEmail.trim().slice(0, 200) : null,
        phone: cPhone.trim() ? cPhone.trim().slice(0, 40) : null,
        message: transcript.slice(0, 2000),
        source: "chatbot",
      });
      setContactSaved(true);
      setShowContact(false);
      setMessages(m => [...m, { role: "assistant", content: "Perfeito! ✅ Recebemos seu contato. Nossa equipe vai te chamar em breve. Pode continuar perguntando!" }]);
    } catch (_e) {
      setMessages(m => [...m, { role: "assistant", content: "Não consegui salvar agora. Fale com a gente no WhatsApp **(18) 99684-1902**." }]);
    } finally { setSavingContact(false); }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-50 size-14 rounded-full bg-primary-gradient text-primary-foreground shadow-elegant grid place-items-center hover:scale-105 transition-smooth"
          aria-label="Abrir chat com IA"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-2xl shadow-elegant flex flex-col overflow-hidden">
          <header className="bg-primary-gradient text-primary-foreground p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-white grid place-items-center p-1.5"><img src={logo} alt="" className="h-full w-auto" /></div>
            <div className="flex-1">
              <p className="font-semibold leading-tight">Multplick IA</p>
              <p className="text-xs opacity-80">Online · responde em segundos</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="p-1 hover:bg-white/10 rounded"><X className="size-5" /></button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/20">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 text-sm">{m.content}</div>
                ) : (
                  <div className="max-w-[90%] text-sm text-foreground prose prose-sm prose-p:my-2 prose-strong:text-primary prose-a:text-primary-glow">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Pensando…</div>}

            {showContact && !contactSaved && (
              <div className="bg-card border border-primary/30 rounded-xl p-3 space-y-2 shadow-card-soft">
                <p className="text-xs font-semibold text-primary">📞 Quer que a gente te chame?</p>
                <p className="text-[11px] text-muted-foreground">Deixe seu contato e nossa equipe entra em contato.</p>
                <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Seu nome" className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs" />
                <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="E-mail" type="email" className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs" />
                <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="WhatsApp" className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs" />
                <div className="flex gap-2">
                  <button onClick={saveContact} disabled={savingContact || !cName.trim() || (!cEmail.trim() && !cPhone.trim())}
                    className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                    {savingContact ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Enviar
                  </button>
                  <button onClick={() => setShowContact(false)} className="px-3 py-1.5 rounded border border-border text-xs">Agora não</button>
                </div>
              </div>
            )}
          </div>

          <a
            href="https://wa.me/5518996841902?text=Ol%C3%A1!%20Vim%20pelo%20chat%20do%20site%20da%20Multplick%20e%20quero%20falar%20com%20um%20atendente."
            target="_blank"
            rel="noopener noreferrer"
            className="mx-3 mt-3 mb-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-whatsapp text-white text-sm font-medium hover:bg-whatsapp/90 transition-smooth"
          >
            <MessageCircle className="size-4" />
            Falar com atendente no WhatsApp
          </a>

          <form onSubmit={send} className="p-3 border-t border-border bg-card flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua dúvida…"
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
