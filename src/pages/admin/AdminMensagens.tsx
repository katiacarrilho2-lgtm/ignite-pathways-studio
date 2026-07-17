import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";

type Thread = {
  enrollment_id: string; last_at: string; last_body: string;
  student_name: string | null; student_email: string | null; course_title: string | null;
};
type Msg = { id: string; sender_id: string; body: string; created_at: string };

const AdminMensagens = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    const { data: cm, error } = await supabase
      .from("course_messages")
      .select("enrollment_id, body, created_at")
      .order("created_at", { ascending: false }).limit(500);
    if (error) return toast.error(error.message);
    const seen = new Map<string, { last_at: string; last_body: string }>();
    for (const m of (cm as any[]) ?? []) {
      if (!seen.has(m.enrollment_id)) seen.set(m.enrollment_id, { last_at: m.created_at, last_body: m.body });
    }
    const ids = Array.from(seen.keys());
    if (ids.length === 0) { setThreads([]); return; }
    const { data: enrs } = await supabase.from("enrollments")
      .select("id, user_id, course_id").in("id", ids);
    const userIds = Array.from(new Set((enrs ?? []).map((e: any) => e.user_id)));
    const courseIds = Array.from(new Set((enrs ?? []).map((e: any) => e.course_id)));
    const [{ data: profs }, { data: cs }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds),
      supabase.from("courses").select("id, title").in("id", courseIds),
    ]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const cMap = new Map((cs ?? []).map((c: any) => [c.id, c]));
    const result: Thread[] = (enrs ?? []).map((e: any) => {
      const s = seen.get(e.id)!;
      const p: any = pMap.get(e.user_id);
      const c: any = cMap.get(e.course_id);
      return {
        enrollment_id: e.id, last_at: s.last_at, last_body: s.last_body,
        student_name: p?.display_name ?? null, student_email: p?.email ?? null,
        course_title: c?.title ?? null,
      };
    }).sort((a, b) => b.last_at.localeCompare(a.last_at));
    setThreads(result);
  };

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => supabase.from("course_messages")
      .select("id, sender_id, body, created_at")
      .eq("enrollment_id", selected).order("created_at")
      .then(({ data }) => {
        setMsgs((data as any) ?? []);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
    load();
    const ch = supabase.channel(`am-${selected}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "course_messages", filter: `enrollment_id=eq.${selected}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  const send = async () => {
    if (!user || !selected || !body.trim()) return;
    const { error } = await supabase.from("course_messages").insert({
      enrollment_id: selected, sender_id: user.id, body: body.trim().slice(0, 2000),
    });
    if (error) return toast.error(error.message);
    setBody(""); loadThreads();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Mensagens dos alunos</h1>
        <p className="text-muted-foreground">Responda dúvidas por curso.</p>
      </div>
      {threads.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <MessageSquare className="size-10 mx-auto mb-3" />Nenhuma mensagem ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)]">
          <aside className="bg-card border border-border rounded-xl p-2 overflow-y-auto space-y-1">
            {threads.map(t => (
              <button key={t.enrollment_id} onClick={() => setSelected(t.enrollment_id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-smooth ${selected === t.enrollment_id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                <p className="font-medium truncate">{t.student_name ?? t.student_email ?? "Aluno"}</p>
                <p className={`text-[11px] truncate ${selected === t.enrollment_id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{t.course_title}</p>
                <p className={`text-xs mt-1 truncate ${selected === t.enrollment_id ? "text-primary-foreground/80" : "text-foreground/80"}`}>{t.last_body}</p>
              </button>
            ))}
          </aside>
          <section className="bg-card border border-border rounded-xl flex flex-col">
            {selected ? (
              <>
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
                <div className="border-t border-border p-3 flex gap-2">
                  <Textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Responder ao aluno…" maxLength={2000}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                  <Button onClick={send} disabled={!body.trim()} variant="hero"><Send className="size-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-muted-foreground">Selecione uma conversa</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
export default AdminMensagens;