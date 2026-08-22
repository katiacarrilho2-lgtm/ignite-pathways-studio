import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Send, CheckCircle2, Users, Hash, User as UserIcon, Reply, X } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

type Dept = { id: string; nome: string; cor: string; slug: string };
type Conv = {
  id: string; tipo: "dm" | "grupo" | "departamento"; titulo: string | null;
  department_id: string | null; last_message_at: string; last_message_preview: string | null;
  resolved_at: string | null; created_by: string | null;
};
type Msg = { id: string; conversation_id: string; sender_id: string; body: string; reply_to: string | null; created_at: string };
type Part = { conversation_id: string; user_id: string; last_read_at: string };
type Person = { user_id: string; display_name: string | null; email: string | null; department_id: string | null };

const RedeInternaInner = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [active, setActive] = useState<string | null>(params.get("c"));
  const [busca, setBusca] = useState("");
  const [buscaMsg, setBuscaMsg] = useState("");
  const [texto, setTexto] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novo, setNovo] = useState<{ tipo: "dm" | "grupo" | "departamento"; titulo: string; department_id: string; membros: string[] }>({
    tipo: "dm", titulo: "", department_id: "", membros: [],
  });
  const endRef = useRef<HTMLDivElement>(null);

  const nome = useCallback((uid: string | null) => {
    if (!uid) return "—";
    const p = people.find(x => x.user_id === uid);
    return p?.display_name || p?.email || "Colaborador";
  }, [people]);

  const load = useCallback(async () => {
    const [{ data: d }, { data: pf }, { data: c }, { data: pt }] = await Promise.all([
      supabase.from("departments" as any).select("id,nome,cor,slug").eq("ativo", true).order("sort_order"),
      supabase.from("profiles" as any).select("user_id,display_name,email,department_id"),
      supabase.from("internal_conversations" as any).select("*").order("last_message_at", { ascending: false }),
      supabase.from("internal_participants" as any).select("conversation_id,user_id,last_read_at"),
    ]);
    setDepts((d ?? []) as any);
    setPeople((pf ?? []) as any);
    setConvs((c ?? []) as any);
    setParts((pt ?? []) as any);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMsgs = useCallback(async (conv: string) => {
    const { data } = await supabase.from("internal_messages" as any).select("*").eq("conversation_id", conv).order("created_at");
    setMsgs((data ?? []) as any);
    if (user) {
      await supabase.from("internal_participants" as any)
        .update({ last_read_at: new Date().toISOString() } as any)
        .eq("conversation_id", conv).eq("user_id", user.id);
      setParts(prev => prev.map(p => p.conversation_id === conv && p.user_id === user.id ? { ...p, last_read_at: new Date().toISOString() } : p));
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [user]);

  useEffect(() => { if (active) loadMsgs(active); }, [active, loadMsgs]);

  useEffect(() => {
    const ch = supabase.channel("rede-interna")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages" }, (payload: any) => {
        const m = payload.new as Msg;
        if (m.conversation_id === active) { setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]); setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }
        load();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, load]);

  const unreadOf = (conv: Conv) => {
    if (!user) return 0;
    const mine = parts.find(p => p.conversation_id === conv.id && p.user_id === user.id);
    if (!mine) return 0;
    return new Date(conv.last_message_at) > new Date(mine.last_read_at) ? 1 : 0;
  };

  const tituloConv = (c: Conv) => {
    if (c.tipo === "departamento") return depts.find(d => d.id === c.department_id)?.nome ?? "Departamento";
    if (c.tipo === "grupo") return c.titulo || "Grupo";
    const outro = parts.find(p => p.conversation_id === c.id && p.user_id !== user?.id);
    return nome(outro?.user_id ?? null);
  };

  const listaConvs = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return convs.filter(c => !q || tituloConv(c).toLowerCase().includes(q) || (c.last_message_preview ?? "").toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, busca, parts, people, depts]);

  const conv = convs.find(c => c.id === active) ?? null;
  const msgsFiltradas = useMemo(() => {
    const q = buscaMsg.trim().toLowerCase();
    return q ? msgs.filter(m => m.body.toLowerCase().includes(q)) : msgs;
  }, [msgs, buscaMsg]);

  const enviar = async () => {
    if (!texto.trim() || !active || !user) return;
    const body = texto.trim();
    setTexto("");
    const { error } = await supabase.from("internal_messages" as any).insert({
      conversation_id: active, sender_id: user.id, body, reply_to: replyTo?.id ?? null,
    } as any);
    setReplyTo(null);
    if (error) { toast.error("Não foi possível enviar"); setTexto(body); return; }
    loadMsgs(active);
  };

  const criar = async () => {
    if (!user) return;
    let membros = [...new Set([user.id, ...novo.membros])];
    let titulo: string | null = novo.titulo || null;
    if (novo.tipo === "departamento") {
      if (!novo.department_id) return toast.error("Escolha o departamento");
      membros = [...new Set([user.id, ...people.filter(p => p.department_id === novo.department_id).map(p => p.user_id)])];
      titulo = depts.find(d => d.id === novo.department_id)?.nome ?? null;
    }
    if (novo.tipo === "dm" && novo.membros.length !== 1) return toast.error("Escolha uma pessoa");
    if (novo.tipo === "grupo" && (!titulo || novo.membros.length === 0)) return toast.error("Informe nome e membros");

    if (novo.tipo === "dm") {
      const existente = convs.find(c => c.tipo === "dm" &&
        parts.filter(p => p.conversation_id === c.id).length === 2 &&
        parts.some(p => p.conversation_id === c.id && p.user_id === novo.membros[0]) &&
        parts.some(p => p.conversation_id === c.id && p.user_id === user.id));
      if (existente) { setNovoOpen(false); setActive(existente.id); return; }
    }

    const { data, error } = await supabase.from("internal_conversations" as any).insert({
      tipo: novo.tipo, titulo, department_id: novo.tipo === "departamento" ? novo.department_id : null, created_by: user.id,
    } as any).select("id").single();
    if (error || !data) return toast.error("Erro ao criar conversa");
    const convId = (data as any).id as string;
    await supabase.from("internal_participants" as any).insert(membros.map(m => ({ conversation_id: convId, user_id: m })) as any);
    setNovoOpen(false);
    setNovo({ tipo: "dm", titulo: "", department_id: "", membros: [] });
    await load();
    setActive(convId);
  };

  const resolver = async () => {
    if (!conv || !user) return;
    const novoVal = conv.resolved_at ? null : new Date().toISOString();
    await supabase.from("internal_conversations" as any).update({ resolved_at: novoVal, resolved_by: novoVal ? user.id : null } as any).eq("id", conv.id);
    load();
    toast.success(novoVal ? "Conversa marcada como resolvida" : "Conversa reaberta");
  };

  useEffect(() => { if (active) { params.set("c", active); setParams(params, { replace: true }); } }, [active]); // eslint-disable-line

  const IconTipo = ({ t }: { t: Conv["tipo"] }) => t === "departamento" ? <Hash className="size-4" /> : t === "grupo" ? <Users className="size-4" /> : <UserIcon className="size-4" />;

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex">
      {/* Lista */}
      <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col ${active ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="font-bold">Rede Interna</h1>
            <Button size="sm" onClick={() => setNovoOpen(true)}><Plus className="size-4" /> Nova</Button>
          </div>
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversa" className="pl-8" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {listaConvs.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma conversa ainda.</p>}
          {listaConvs.map(c => {
            const dep = depts.find(d => d.id === c.department_id);
            return (
              <button key={c.id} onClick={() => setActive(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-border/60 hover:bg-secondary transition-smooth ${active === c.id ? "bg-secondary" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 size-8 rounded-full grid place-items-center text-white" style={{ background: dep?.cor ?? "hsl(var(--primary))" }}>
                    <IconTipo t={c.tipo} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate">{tituloConv(c)}</span>
                      {c.resolved_at && <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">{c.last_message_preview ?? "Sem mensagens"}</span>
                  </span>
                  {unreadOf(c) > 0 && <span className="size-2.5 rounded-full bg-destructive shrink-0" />}
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Conversa */}
      <div className={`flex-1 min-w-0 flex flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {!conv && <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Escolha uma conversa</div>}
        {conv && (
          <>
            <div className="h-14 px-3 border-b border-border flex items-center gap-2 bg-card">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActive(null)}><X className="size-4" /></Button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{tituloConv(conv)}</p>
                <p className="text-xs text-muted-foreground">{parts.filter(p => p.conversation_id === conv.id).length} participante(s)</p>
              </div>
              <div className="relative hidden sm:block">
                <Search className="size-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input value={buscaMsg} onChange={e => setBuscaMsg(e.target.value)} placeholder="Buscar mensagem" className="pl-7 h-9 w-44" />
              </div>
              <Button variant={conv.resolved_at ? "secondary" : "outline"} size="sm" onClick={resolver}>
                <CheckCircle2 className="size-4" />{conv.resolved_at ? "Reabrir" : "Resolver"}
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-3xl mx-auto">
                {msgsFiltradas.map(m => {
                  const meu = m.sender_id === user?.id;
                  const resp = m.reply_to ? msgs.find(x => x.id === m.reply_to) : null;
                  return (
                    <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                      <div className={`group max-w-[80%] rounded-xl px-3 py-2 ${meu ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                        {!meu && <p className="text-[11px] font-semibold opacity-80 mb-0.5">{nome(m.sender_id)}</p>}
                        {resp && <p className="text-[11px] italic opacity-70 border-l-2 pl-2 mb-1 line-clamp-2">{nome(resp.sender_id)}: {resp.body}</p>}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        <p className="text-[10px] opacity-70 mt-1 flex items-center gap-2">
                          {new Date(m.created_at).toLocaleString("pt-BR")}
                          <button className="opacity-0 group-hover:opacity-100 underline" onClick={() => setReplyTo(m)}>responder</button>
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border bg-card">
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <Reply className="size-3.5" /> Respondendo {nome(replyTo.sender_id)}: <span className="truncate max-w-[50%]">{replyTo.body}</span>
                  <button onClick={() => setReplyTo(null)}><X className="size-3.5" /></button>
                </div>
              )}
              <div className="flex gap-2 max-w-3xl mx-auto">
                <Textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} placeholder="Escreva uma mensagem…"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  className="min-h-[42px] max-h-32 resize-none" />
                <Button onClick={enviar} disabled={!texto.trim()}><Send className="size-4" /></Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={novo.tipo} onValueChange={(v: any) => setNovo({ ...novo, tipo: v, membros: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dm">Individual</SelectItem>
                  <SelectItem value="grupo">Grupo</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {novo.tipo === "departamento" && (
              <div>
                <Label>Departamento</Label>
                <Select value={novo.department_id} onValueChange={v => setNovo({ ...novo, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {novo.tipo === "grupo" && (
              <div><Label>Nome do grupo</Label><Input value={novo.titulo} onChange={e => setNovo({ ...novo, titulo: e.target.value })} /></div>
            )}
            {novo.tipo !== "departamento" && (
              <div>
                <Label>{novo.tipo === "dm" ? "Pessoa" : "Membros"}</Label>
                <ScrollArea className="h-52 border border-border rounded-md p-2 mt-1">
                  {people.filter(p => p.user_id !== user?.id).map(p => (
                    <label key={p.user_id} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                      <Checkbox checked={novo.membros.includes(p.user_id)} onCheckedChange={ck => {
                        if (novo.tipo === "dm") setNovo({ ...novo, membros: ck ? [p.user_id] : [] });
                        else setNovo({ ...novo, membros: ck ? [...novo.membros, p.user_id] : novo.membros.filter(m => m !== p.user_id) });
                      }} />
                      <span className="truncate">{p.display_name || p.email}</span>
                      {p.department_id && <Badge variant="secondary" className="ml-auto text-[10px]">{depts.find(d => d.id === p.department_id)?.nome}</Badge>}
                    </label>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={criar}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function RedeInterna() {
  return <RequirePermission perm="mod_rede_interna"><RedeInternaInner /></RequirePermission>;
}
