import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Save, Send, Plus, Trash2, Bold, User as UserIcon, BookOpen,
  Image as ImageIcon, Video, Mic, FileText, ShieldCheck, Clock, Users, CalendarClock,
  CheckCircle2, Tag, Smartphone, Timer, Gauge, Repeat, CalendarRange, X, Search, UsersRound,
} from "lucide-react";
import { useCampaign, useSaveCampaign, useContacts, useTags } from "./hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMOJIS = ["😀", "🎉", "🚀", "✨", "💜", "📚", "🎓", "✅", "👋", "🔔"];
const DYN_TAGS = [
  { k: "<saudacao>", label: "Saudação" },
  { k: "<data>", label: "Data" },
  { k: "<hora>", label: "Hora" },
  { k: "{nome}", label: "Nome" },
  { k: "{curso}", label: "Curso" },
];

function saudacao(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function renderPreview(tpl: string, contact?: any) {
  const now = new Date();
  return (tpl || "")
    .replace(/<saudacao>/gi, saudacao(now))
    .replace(/<data>/gi, now.toLocaleDateString("pt-BR"))
    .replace(/<hora>/gi, now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
    .replace(/\{nome\}/gi, contact?.nome || "Maria")
    .replace(/\{curso\}/gi, contact?.curso_interesse_id || "Curso XPTO");
}

function whatsappFormat(text: string) {
  // *bold* -> <b>
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*(.+?)\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/\n/g, "<br/>");
  return html;
}

const STEPS = [
  { n: 1, label: "Destino", icon: Users },
  { n: 2, label: "Mensagem & Anti-ban", icon: ShieldCheck },
  { n: 3, label: "Regras & Envio", icon: CalendarClock },
];

export default function ConnectCampaignEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: campaign } = useCampaign(id);
  const { data: contacts = [] } = useContacts();
  const { data: tags = [] } = useTags();
  const save = useSaveCampaign();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    nome: "", tipo_publico: "individual", conexao: "principal",
    mensagem: "", etiquetas: [], filtros: {},
    msgs_por_hora: 30, intervalo_min: 30, intervalo_max: 90,
    pausa_apos_msgs: 20, pausa_minutos: 10,
    agendado_para: "", status: "rascunho",
    recorrencia: "unica", dias_semana: [], horarios: [], data_inicio: "", data_fim: "",
  });
  // local message variants (anti-ban)
  const [variants, setVariants] = useState<{ id?: string; ordem: number; mensagem: string }[]>([{ ordem: 0, mensagem: "" }]);
  const [activeVariant, setActiveVariant] = useState(0);

  useEffect(() => {
    if (campaign) {
      setForm({
        ...campaign,
        etiquetas: campaign.etiquetas || [],
        filtros: campaign.filtros || {},
        dias_semana: campaign.dias_semana || [],
        horarios: campaign.horarios || [],
        recorrencia: campaign.recorrencia || "unica",
        data_inicio: campaign.data_inicio || "",
        data_fim: campaign.data_fim || "",
        agendado_para: campaign.agendado_para ? new Date(campaign.agendado_para).toISOString().slice(0, 16) : "",
      });
      // load variants
      (supabase as any).from("connect_campaign_variants").select("*")
        .eq("campaign_id", campaign.id).order("ordem")
        .then(({ data }: any) => {
          if (data && data.length > 0) setVariants(data);
          else setVariants([{ ordem: 0, mensagem: campaign.mensagem || "" }]);
        });
    }
  }, [campaign]);

  const audience = useMemo(() => {
    const wantGrupo = form.tipo_publico === "grupo";
    const idsManual: string[] = form.filtros?.contatos_ids || [];
    return contacts.filter((c: any) => {
      if (c.opt_out) return false;
      if (wantGrupo && c.tipo !== "grupo") return false;
      if (!wantGrupo && c.tipo === "grupo") return false;
      // Se houver seleção manual, ela tem prioridade
      if (idsManual.length > 0) return idsManual.includes(c.id);
      if (form.etiquetas?.length) {
        const ct = c.tags || [];
        if (!form.etiquetas.some((t: string) => ct.includes(t))) return false;
      }
      return true;
    });
  }, [contacts, form.tipo_publico, form.etiquetas, form.filtros]);

  const insertAtActive = (text: string) => {
    setVariants(vs => vs.map((v, i) => i === activeVariant ? { ...v, mensagem: (v.mensagem || "") + text } : v));
  };

  const addVariant = () => {
    setVariants(vs => [...vs, { ordem: vs.length, mensagem: "" }]);
    setActiveVariant(variants.length);
  };
  const removeVariant = (idx: number) => {
    if (variants.length === 1) return;
    setVariants(vs => vs.filter((_, i) => i !== idx).map((v, i) => ({ ...v, ordem: i })));
    setActiveVariant(0);
  };

  const persistVariants = async (campaignId: string) => {
    await (supabase as any).from("connect_campaign_variants").delete().eq("campaign_id", campaignId);
    if (variants.length === 0) return;
    await (supabase as any).from("connect_campaign_variants").insert(
      variants.map((v, i) => ({ campaign_id: campaignId, ordem: i, mensagem: v.mensagem || "" }))
    );
  };

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome da campanha"); return; }
    if (variants.every(v => !v.mensagem?.trim())) { toast.error("Adicione pelo menos uma mensagem"); return; }
    const { _novoHorario, ...clean } = form;
    await save.mutateAsync({
      ...clean, id,
      mensagem: variants[0].mensagem,
      total_destinatarios: audience.length,
      agendado_para: clean.agendado_para ? new Date(clean.agendado_para).toISOString() : null,
      data_inicio: clean.data_inicio || null,
      data_fim: clean.data_fim || null,
    });
    if (id) await persistVariants(id);
    toast.success("Campanha salva");
  };

  const handleDispatch = async () => {
    if (!id) return;
    if (audience.length === 0) { toast.error("Nenhum destinatário no público"); return; }
    if (!confirm(`Disparar para ${audience.length} ${form.tipo_publico === "grupo" ? "grupos" : "contatos"}? (modo simulação até a API ser conectada)`)) return;
    await handleSave();
    const rows = audience.map((c: any) => {
      const v = variants[Math.floor(Math.random() * variants.length)];
      return {
        campaign_id: id, contact_id: c.id,
        mensagem: renderPreview(v.mensagem, c),
        status: "simulada", direction: "outbound",
        enviada_em: new Date().toISOString(),
      };
    });
    const { error } = await (supabase as any).from("connect_campaign_messages").insert(rows);
    if (error) { toast.error("Erro ao registrar disparos"); return; }
    await (supabase as any).from("connect_campaigns").update({
      status: "concluida", iniciado_em: new Date().toISOString(), concluido_em: new Date().toISOString(),
      total_enviadas: rows.length,
    }).eq("id", id);
    toast.success(`${rows.length} disparos registrados (simulação)`);
    nav("/admin/connect/historico");
  };

  const next = () => setStep(s => Math.min(3, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  const previewText = renderPreview(variants[activeVariant]?.mensagem || "", audience[0]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => nav("/admin/connect/campanhas")}><ArrowLeft className="size-4" /> Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}><Save className="size-4" /> Salvar rascunho</Button>
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, i) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} className="flex items-center flex-1">
                  <div className={`flex items-center gap-3 ${active ? "text-primary" : done ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <div className={`size-9 rounded-full grid place-items-center font-semibold border-2 ${active ? "border-primary bg-primary/10" : done ? "border-emerald-500 bg-emerald-50" : "border-border bg-secondary"}`}>
                      {done ? <CheckCircle2 className="size-5" /> : s.n}
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider">Etapa {s.n}</div>
                      <div className="text-sm font-semibold">{s.label}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-3 ${done ? "bg-emerald-500" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left/main */}
        <div className="lg:col-span-2 space-y-4">
          {step === 1 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Destino do disparo</h3>
                <div>
                  <Label>Nome da campanha *</Label>
                  <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Black Friday — Curso XPTO" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de público</Label>
                    <Select value={form.tipo_publico} onValueChange={v => setForm({ ...form, tipo_publico: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">👤 Contatos individuais</SelectItem>
                        <SelectItem value="grupo">👥 Grupos do WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Conexão (instância de envio)</Label>
                    <Select value={form.conexao || "principal"} onValueChange={v => setForm({ ...form, conexao: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principal">Conexão principal</SelectItem>
                        <SelectItem value="secundaria">Conexão secundária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Segmentação por etiquetas {form.tipo_publico === "individual" && <span className="text-xs text-muted-foreground font-normal">(envia apenas para contatos com as etiquetas marcadas)</span>}</Label>
                  <div className="flex flex-wrap gap-2 mt-2 p-3 rounded-lg border border-border bg-secondary/30 min-h-[56px]">
                    {tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada — todos os contatos serão considerados.</span>}
                    {tags.map((t: any) => {
                      const on = form.etiquetas?.includes(t.nome);
                      const color = t.cor || "#3b82f6";
                      return (
                        <button key={t.id} type="button"
                          onClick={() => {
                            const set = new Set<string>(form.etiquetas || []);
                            on ? set.delete(t.nome) : set.add(t.nome);
                            setForm({ ...form, etiquetas: Array.from(set) });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition ${on ? "text-white" : "text-foreground bg-background hover:bg-secondary"}`}
                          style={on ? { background: color, borderColor: color } : { borderColor: color }}>
                          {t.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase font-medium text-primary tracking-wider">Resumo do público</div>
                      <div className="text-4xl font-extrabold text-foreground mt-1">{audience.length}</div>
                      <div className="text-sm text-muted-foreground">{form.tipo_publico === "grupo" ? "Grupos elegíveis" : "Contatos elegíveis"}</div>
                    </div>
                    <div className="size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
                      <Users className="size-7" />
                    </div>
                  </CardContent>
                </Card>

                <ContactPicker
                  tipo={form.tipo_publico}
                  contacts={contacts}
                  selectedIds={form.filtros?.contatos_ids || []}
                  onChange={(ids) => setForm({ ...form, filtros: { ...(form.filtros || {}), contatos_ids: ids } })}
                />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Mensagens (variações anti-ban)</h3>
                  <Button size="sm" variant="outline" onClick={addVariant}><Plus className="size-4" /> Adicionar mensagem</Button>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="size-4" /> O sistema enviará apenas <b>1 mensagem escolhida aleatoriamente</b> a cada disparo — isso reduz o risco de bloqueio.
                </div>

                {/* Variant tabs */}
                <div className="flex flex-wrap gap-1 border-b border-border">
                  {variants.map((v, i) => (
                    <div key={i} className="flex items-center">
                      <button
                        onClick={() => setActiveVariant(i)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${activeVariant === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                        Mensagem {i + 1}
                      </button>
                      {variants.length > 1 && (
                        <button onClick={() => removeVariant(i)} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 bg-secondary/40 rounded-md border border-border">
                  <Button type="button" size="sm" variant="ghost" onClick={() => insertAtActive("*texto em negrito*")}><Bold className="size-4" /></Button>
                  <div className="border-l border-border mx-1" />
                  {DYN_TAGS.map(t => (
                    <Button key={t.k} type="button" size="sm" variant="ghost" onClick={() => insertAtActive(t.k)}>
                      <code className="text-xs">{t.k}</code>
                    </Button>
                  ))}
                  <div className="border-l border-border mx-1" />
                  {EMOJIS.map(e => <button key={e} type="button" className="px-1.5 hover:bg-background rounded text-lg" onClick={() => insertAtActive(e)}>{e}</button>)}
                </div>

                <Textarea rows={10} className="font-mono text-sm"
                  value={variants[activeVariant]?.mensagem || ""}
                  onChange={e => setVariants(vs => vs.map((v, i) => i === activeVariant ? { ...v, mensagem: e.target.value } : v))}
                  placeholder="<saudacao> {nome}! Tudo bem? Estou passando para falar do {curso}." />

                {/* Attachments */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Anexos</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      { icon: ImageIcon, label: "Imagem", color: "text-blue-600" },
                      { icon: Video, label: "Vídeo", color: "text-purple-600" },
                      { icon: Mic, label: "Áudio", color: "text-amber-600" },
                      { icon: FileText, label: "Documento", color: "text-emerald-600" },
                    ].map(a => (
                      <Button key={a.label} type="button" variant="outline" size="sm"
                        onClick={() => toast.info(`Upload de ${a.label.toLowerCase()} será habilitado em breve`)}>
                        <a.icon className={`size-4 ${a.color}`} /> {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-foreground">Regras de envio</h3>

                {/* Recurrence toggle */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: "unica", icon: CalendarClock, title: "Disparo único", desc: "Envia uma única vez na data/hora marcada." },
                    { v: "recorrente", icon: Repeat, title: "Recorrente", desc: "Repete nos dias e horários definidos abaixo." },
                  ].map(opt => {
                    const active = (form.recorrencia || "unica") === opt.v;
                    return (
                      <button key={opt.v} type="button"
                        onClick={() => setForm({ ...form, recorrencia: opt.v })}
                        className={`text-left rounded-lg border-2 p-4 transition ${active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
                        <div className="flex items-center gap-2">
                          <opt.icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="font-semibold text-foreground">{opt.title}</div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {form.recorrencia === "unica" ? (
                  <div>
                    <Label>Agendar início para</Label>
                    <Input type="datetime-local" value={form.agendado_para || ""} onChange={e => setForm({ ...form, agendado_para: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Deixe em branco para iniciar imediatamente ao clicar em Disparar.</p>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-lg border-2 border-primary/30 p-4 bg-primary/[0.03]">
                    {/* Days of week */}
                    <div>
                      <Label className="flex items-center gap-2"><CalendarRange className="size-4 text-primary" /> Dias da semana</Label>
                      <p className="text-xs text-muted-foreground mb-2">Selecione em quais dias a campanha deve disparar.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { n: 1, l: "Seg" }, { n: 2, l: "Ter" }, { n: 3, l: "Qua" },
                          { n: 4, l: "Qui" }, { n: 5, l: "Sex" }, { n: 6, l: "Sáb" }, { n: 0, l: "Dom" },
                        ].map(d => {
                          const on = (form.dias_semana || []).includes(d.n);
                          return (
                            <button key={d.n} type="button"
                              onClick={() => {
                                const set = new Set<number>(form.dias_semana || []);
                                on ? set.delete(d.n) : set.add(d.n);
                                setForm({ ...form, dias_semana: Array.from(set).sort() });
                              }}
                              className={`min-w-[52px] px-3 py-2 rounded-md text-xs font-semibold border-2 transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-secondary"}`}>
                              {d.l}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => setForm({ ...form, dias_semana: [1, 2, 3, 4, 5] })}>Seg–Sex</Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => setForm({ ...form, dias_semana: [0, 1, 2, 3, 4, 5, 6] })}>Todos os dias</Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => setForm({ ...form, dias_semana: [] })}>Limpar</Button>
                      </div>
                    </div>

                    {/* Times */}
                    <div>
                      <Label className="flex items-center gap-2"><Clock className="size-4 text-primary" /> Horários de disparo</Label>
                      <p className="text-xs text-muted-foreground mb-2">Adicione um ou mais horários (ex: 08:00, 12:00, 20:00).</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(form.horarios || []).map((h: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                            {h}
                            <button type="button" className="size-5 rounded-full hover:bg-white/20 grid place-items-center"
                              onClick={() => setForm({ ...form, horarios: form.horarios.filter((_: any, j: number) => j !== i) })}>
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        {(form.horarios || []).length === 0 && <span className="text-xs text-muted-foreground self-center">Nenhum horário adicionado.</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input type="time" className="w-40"
                          value={form._novoHorario || ""}
                          onChange={e => setForm({ ...form, _novoHorario: e.target.value })} />
                        <Button type="button" variant="outline" size="sm"
                          onClick={() => {
                            const h = form._novoHorario;
                            if (!h) return;
                            const list = Array.from(new Set([...(form.horarios || []), h])).sort();
                            setForm({ ...form, horarios: list, _novoHorario: "" });
                          }}>
                          <Plus className="size-4" /> Adicionar horário
                        </Button>
                      </div>
                    </div>

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data de início</Label>
                        <Input type="date" value={form.data_inicio || ""} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
                      </div>
                      <div>
                        <Label>Data final (opcional)</Label>
                        <Input type="date" value={form.data_fim || ""} onChange={e => setForm({ ...form, data_fim: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border p-4 space-y-3 bg-secondary/30">
                  <div className="flex items-center gap-2 text-foreground font-medium"><Clock className="size-4 text-primary" /> Atraso aleatório entre mensagens</div>
                  <p className="text-xs text-muted-foreground">O sistema vai aguardar um tempo aleatório dentro do intervalo abaixo a cada envio — quanto mais natural o ritmo, menor o risco de bloqueio.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>De (segundos)</Label>
                      <Input type="number" min={1} value={form.intervalo_min} onChange={e => setForm({ ...form, intervalo_min: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Até (segundos)</Label>
                      <Input type="number" min={1} value={form.intervalo_max} onChange={e => setForm({ ...form, intervalo_max: +e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3 bg-secondary/30">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Timer className="size-4 text-primary" /> Pausa automática
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para parecer humano, o sistema faz uma pausa longa periodicamente — evita que o WhatsApp identifique padrão de robô.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Após</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={form.pausa_apos_msgs ?? 20}
                      onChange={e => setForm({ ...form, pausa_apos_msgs: +e.target.value })}
                    />
                    <span>mensagens, aguardar</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={form.pausa_minutos ?? 10}
                      onChange={e => setForm({ ...form, pausa_minutos: +e.target.value })}
                    />
                    <span>minutos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={prev} disabled={step === 1}><ArrowLeft className="size-4" /> Anterior</Button>
            {step < 3
              ? <Button onClick={next}>Próximo <ArrowRight className="size-4" /></Button>
              : <Button onClick={handleDispatch}><Send className="size-4" /> Disparar para {audience.length}</Button>}
          </div>
        </div>

        {/* Right: Phone preview */}
        <div className="lg:sticky lg:top-4 self-start">
          {/* Live summary that grows as the user fills in the form */}
          <div className="space-y-2 mb-4">
            <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Resumo ao vivo</div>

            {form.nome?.trim() && (
              <div className="animate-fade-in rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center"><Send className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Campanha</div>
                  <div className="text-sm font-semibold truncate">{form.nome}</div>
                </div>
              </div>
            )}

            {(step >= 1 || audience.length > 0) && (
              <div className="animate-fade-in rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                <div className="size-8 rounded-md bg-emerald-100 text-emerald-700 grid place-items-center"><Users className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Público</div>
                  <div className="text-sm font-semibold">{audience.length} {form.tipo_publico === "grupo" ? "grupos" : "contatos"}</div>
                  {form.etiquetas?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {form.etiquetas.slice(0, 4).map((t: string) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-foreground border border-border">{t}</span>
                      ))}
                      {form.etiquetas.length > 4 && <span className="text-[10px] text-muted-foreground">+{form.etiquetas.length - 4}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {variants.some(v => v.mensagem?.trim()) && (
              <div className="animate-fade-in rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                <div className="size-8 rounded-md bg-purple-100 text-purple-700 grid place-items-center"><ShieldCheck className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensagens</div>
                  <div className="text-sm font-semibold">{variants.filter(v => v.mensagem?.trim()).length} variação(ões) anti-ban</div>
                </div>
              </div>
            )}

            {step >= 3 && (
              <div className="animate-fade-in rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                <div className="size-8 rounded-md bg-amber-100 text-amber-700 grid place-items-center"><Timer className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ritmo</div>
                  <div className="text-sm font-semibold">{form.intervalo_min}–{form.intervalo_max}s entre envios</div>
                  <div className="text-[11px] text-muted-foreground">
                    Pausa: {form.pausa_apos_msgs ?? 20} msgs / {form.pausa_minutos ?? 10} min
                    {form.agendado_para ? ` • agendado` : ""}
                  </div>
                </div>
              </div>
            )}

            {step >= 3 && form.recorrencia === "recorrente" && (form.dias_semana?.length > 0 || form.horarios?.length > 0) && (
              <div className="animate-fade-in rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                <div className="size-8 rounded-md bg-blue-100 text-blue-700 grid place-items-center"><Repeat className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Agenda recorrente</div>
                  <div className="text-sm font-semibold">
                    {(form.dias_semana || []).map((n: number) => ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][n]).join(", ") || "Nenhum dia"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {(form.horarios || []).join(" · ") || "Sem horários"}
                    {form.data_inicio ? ` • a partir de ${new Date(form.data_inicio).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2 text-center flex items-center justify-center gap-1">
            <Smartphone className="size-3.5" /> Pré-visualização no WhatsApp
          </div>
          <div className="mx-auto w-[290px] rounded-[2.5rem] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800">
            <div className="rounded-[2rem] overflow-hidden bg-[#e5ddd5]">
              {/* Header */}
              <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-2">
                <div className="size-8 rounded-full bg-white/20 grid place-items-center text-xs font-bold">
                  {audience[0]?.nome?.[0]?.toUpperCase() || "M"}
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{audience[0]?.nome || "Maria"}</div>
                  <div className="text-[10px] opacity-80">online</div>
                </div>
              </div>
              {/* Chat area */}
              <div className="p-3 min-h-[420px] max-h-[480px] overflow-y-auto bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%221%22 cy=%221%22 r=%221%22 fill=%22%23d4cdc4%22/></svg>')]">
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#dcf8c6] rounded-lg px-2.5 py-1.5 shadow-sm text-sm text-slate-900 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: whatsappFormat(previewText || "Sua mensagem aparecerá aqui..."),
                    }} />
                </div>
                <div className="flex justify-end mt-0.5">
                  <div className="text-[10px] text-slate-500">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ✓✓</div>
                </div>
              </div>
              {/* Footer */}
              <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full h-7" />
                <div className="size-7 rounded-full bg-[#075e54]" />
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Badge variant="secondary" className="text-xs">
              {variants.length} variação{variants.length > 1 ? "ões" : ""} • {audience.length} destinatário(s)
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPicker({
  tipo, contacts, selectedIds, onChange,
}: {
  tipo: "individual" | "grupo" | string;
  contacts: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const isGrupo = tipo === "grupo";
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const base = contacts.filter((c: any) =>
      isGrupo ? c.tipo === "grupo" : c.tipo !== "grupo"
    );
    if (!q.trim()) return base;
    const s = q.toLowerCase();
    return base.filter((c: any) =>
      (c.nome || "").toLowerCase().includes(s) ||
      (c.whatsapp || "").toLowerCase().includes(s)
    );
  }, [contacts, isGrupo, q]);

  const allChecked = list.length > 0 && list.every((c) => selectedIds.includes(c.id));
  const toggle = (id: string) => {
    const set = new Set(selectedIds);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange(Array.from(set));
  };
  const toggleAll = () => {
    if (allChecked) {
      onChange(selectedIds.filter((id) => !list.some((c) => c.id === id)));
    } else {
      const set = new Set(selectedIds);
      list.forEach((c) => set.add(c.id));
      onChange(Array.from(set));
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {isGrupo ? <UsersRound className="size-5 text-primary" /> : <UserIcon className="size-5 text-primary" />}
            <div>
              <div className="font-semibold text-sm">
                {isGrupo ? "Selecionar grupos do WhatsApp" : "Selecionar contatos individuais"}
              </div>
              <div className="text-xs text-muted-foreground">
                Marque para enviar somente aos selecionados. Vazio = usar etiquetas acima.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.length} selecionado(s)</Badge>
            {selectedIds.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => onChange([])}>
                <X className="size-3" /> Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isGrupo ? "Buscar grupo..." : "Buscar contato por nome ou número..."}
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-between px-2 py-1.5 bg-secondary/40 rounded-md">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
            Selecionar todos ({list.length})
          </label>
        </div>

        <ScrollArea className="h-64 rounded-md border">
          {list.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {isGrupo
                ? "Nenhum grupo encontrado. Sincronize o WhatsApp ou cadastre em Contatos."
                : "Nenhum contato encontrado."}
            </div>
          ) : (
            <div className="divide-y">
              {list.map((c: any) => {
                const on = selectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/40 ${on ? "bg-primary/5" : ""}`}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggle(c.id)} />
                    <div className={`size-8 rounded-full grid place-items-center text-xs font-semibold ${isGrupo ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                      {isGrupo ? <UsersRound className="size-4" /> : (c.nome?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.nome || "(sem nome)"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.whatsapp || (isGrupo ? "grupo" : "")}
                        {c.tags?.length ? ` • ${c.tags.join(", ")}` : ""}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}