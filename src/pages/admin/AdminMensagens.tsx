import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Download, RefreshCcw } from "lucide-react";
import { downloadCsv, dateCsv } from "@/lib/exportCsv";

type Thread = {
  id: string; user_id: string; assunto: string; status: string;
  last_message_at: string; unread_for_staff: number;
};
type Msg = { id: string; corpo: string; from_staff: boolean; created_at: string };

export default function AdminMensagens() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; email: string | null }>>({});
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");

  const load = async () => {
    const { data } = await supabase.from("message_threads").select("*").order("last_message_at", { ascending: false });
    const list = (data ?? []) as Thread[];
    setThreads(list);
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("user_id,display_name,email").in("user_id", ids);
      const map: any = {};
      (p ?? []).forEach((x: any) => { map[x.user_id] = x; });
      setProfiles(map);
    }
  };
  useEffect(() => { load(); }, []);

  const openThread = async (t: Thread) => {
    setActive(t);
    const { data } = await supabase.from("messages").select("*").eq("thread_id", t.id).order("created_at");
    setMsgs((data ?? []) as Msg[]);
    if (t.unread_for_staff > 0) {
      await supabase.from("message_threads").update({ unread_for_staff: 0 }).eq("id", t.id);
      load();
    }
  };

  const responder = async () => {
    if (!user || !active || !texto.trim()) return;
    const { error } = await supabase.from("messages")
      .insert({ thread_id: active.id, autor_id: user.id, from_staff: true, corpo: texto.trim() });
    if (error) return toast.error(error.message);
    setTexto(""); openThread(active); load();
  };

  const fechar = async () => {
    if (!active) return;
    await supabase.from("message_threads").update({ status: active.status === "aberto" ? "resolvido" : "aberto" }).eq("id", active.id);
    toast.success("Status atualizado"); setActive(null); load();
  };

  const filtered = useMemo(() => threads.filter((t) => {
    const p = profiles[t.user_id];
    const s = `${t.assunto} ${p?.display_name ?? ""} ${p?.email ?? ""}`.toLowerCase();
    return !busca || s.includes(busca.toLowerCase());
  }), [threads, profiles, busca]);

  const exportar = () => downloadCsv("mensagens", ["Aluno", "E-mail", "Assunto", "Status", "Última mensagem", "Não lidas"],
    filtered.map((t) => [profiles[t.user_id]?.display_name ?? "", profiles[t.user_id]?.email ?? "", t.assunto, t.status, dateCsv(t.last_message_at), t.unread_for_staff]));

  const naoLidas = threads.reduce((s, t) => s + (t.unread_for_staff || 0), 0);

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><MessageSquare className="size-7" /> Mensagens</h1>
          <p className="text-muted-foreground">Dúvidas enviadas pelos alunos pelo portal. {naoLidas > 0 && <b>{naoLidas} não lida(s)</b>}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="size-4" /></Button>
          <Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar</Button>
        </div>
      </div>

      <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno ou assunto…" className="max-w-sm" />

      <div className="grid md:grid-cols-[340px_1fr] gap-4">
        <div className="rounded-xl border border-border divide-y divide-border bg-card max-h-[70vh] overflow-y-auto">
          {filtered.map((t) => (
            <button key={t.id} onClick={() => openThread(t)}
              className={`w-full text-left p-3 hover:bg-secondary/50 ${active?.id === t.id ? "bg-secondary/60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm truncate">{profiles[t.user_id]?.display_name ?? profiles[t.user_id]?.email ?? "Aluno"}</p>
                {t.unread_for_staff > 0 && <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-2">{t.unread_for_staff}</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{t.assunto}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(t.last_message_at).toLocaleString("pt-BR")}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">Nenhuma mensagem.</p>}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {!active && <p className="text-muted-foreground text-sm">Selecione uma conversa à esquerda.</p>}
          {active && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{active.assunto}</p>
                  <p className="text-xs text-muted-foreground">{profiles[active.user_id]?.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={fechar}>{active.status === "aberto" ? "Marcar resolvido" : "Reabrir"}</Button>
              </div>
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${m.from_staff ? "bg-primary text-primary-foreground ml-auto" : "bg-secondary"}`}>
                    <p className="whitespace-pre-wrap">{m.corpo}</p>
                    <p className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder ao aluno…" />
                <Button variant="hero" onClick={responder}><Send className="size-4" /></Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
