import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Stage, Temp, STAGES, TEMP_META, fmtBRL, parseBRLToCents, buildWhatsappLink } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";

export type LeadForm = {
  id?: string; nome: string; telefone: string; email: string;
  etiqueta: Temp; valor_str: string; estagio: Stage; owner_id: string;
  origem: string; curso_interesse: string; descricao: string;
};

const empty: LeadForm = { nome: "", telefone: "", email: "", etiqueta: "frio", valor_str: "", estagio: "novo", owner_id: "", origem: "", curso_interesse: "", descricao: "" };

export default function CrmLeadDialog({ open, onOpenChange, lead, onSaved }: { open: boolean; onOpenChange: (b: boolean) => void; lead?: any; onSaved: () => void; }) {
  const { user } = useAuth();
  const { sellers } = useCrmSellers();
  const { activeAccountId } = useCommercialAccounts();
  const [form, setForm] = useState<LeadForm>(empty);
  const [events, setEvents] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [waMsg, setWaMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    if (lead) {
      setForm({
        id: lead.id, nome: lead.nome || "", telefone: lead.telefone || "", email: lead.email || "",
        etiqueta: lead.etiqueta, valor_str: ((lead.valor_cents || 0) / 100).toFixed(2).replace(".", ","),
        estagio: lead.estagio, owner_id: lead.owner_id, origem: lead.origem || "",
        curso_interesse: lead.curso_interesse || "", descricao: lead.descricao || "",
      });
      loadEvents(lead.id);
      loadWaTemplate();
    } else {
      setForm({ ...empty, owner_id: user?.id || "" });
      setEvents([]);
    }
  }, [open, lead, user?.id]);

  const loadWaTemplate = async () => {
    const { data } = await supabase.from("crm_settings").select("valor").eq("chave", "whatsapp_template").maybeSingle();
    const tmpl = (data as any)?.valor?.text || "Olá {nome}, tudo bem?";
    setWaMsg(tmpl.replace("{nome}", lead?.nome || ""));
  };

  const loadEvents = async (id: string) => {
    const { data } = await supabase.from("crm_lead_events").select("*").eq("lead_id", id).order("created_at", { ascending: false });
    setEvents(data ?? []);
  };

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!form.owner_id) return toast.error("Selecione o vendedor responsável");
    const payload: any = {
      nome: form.nome.trim(), telefone: form.telefone.trim() || null, email: form.email.trim() || null,
      etiqueta: form.etiqueta, valor_cents: parseBRLToCents(form.valor_str),
      estagio: form.estagio, owner_id: form.owner_id, origem: form.origem.trim() || null,
      curso_interesse: form.curso_interesse.trim() || null, descricao: form.descricao.trim() || null,
    };
    if (form.id) {
      const { error } = await supabase.from("crm_leads").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Lead atualizado");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("crm_leads").insert(withAccount(payload, activeAccountId));
      if (error) return toast.error(error.message);
      toast.success("Lead criado");
    }
    onSaved(); onOpenChange(false);
  };

  const addNote = async () => {
    if (!note.trim() || !form.id || !user) return;
    const { error } = await supabase.from("crm_lead_events").insert(withAccount({
      lead_id: form.id, tipo: "anotacao", payload: { texto: note.trim() }, autor_id: user.id,
    }, activeAccountId));
    if (error) return toast.error(error.message);
    await supabase.from("crm_leads").update({ atendimentos: (lead?.atendimentos || 0) + 1 }).eq("id", form.id);
    setNote(""); loadEvents(form.id);
  };

  const openWA = async () => {
    if (!form.telefone || !form.id || !user) return;
    window.open(buildWhatsappLink(form.telefone, waMsg), "_blank");
    await supabase.from("crm_lead_events").insert(withAccount({
      lead_id: form.id, tipo: "whatsapp", payload: { msg: waMsg }, autor_id: user.id,
    }, activeAccountId));
    await supabase.from("crm_leads").update({ atendimentos: (lead?.atendimentos || 0) + 1 }).eq("id", form.id);
    loadEvents(form.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            {form.id && <TabsTrigger value="historico">Histórico ({events.length})</TabsTrigger>}
          </TabsList>
          <TabsContent value="dados" className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} placeholder="(11) 99999-9999" /></div>
              <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Valor esperado (R$)</Label><Input value={form.valor_str} onChange={e => setForm({...form, valor_str: e.target.value})} placeholder="0,00" /></div>
              <div>
                <Label>Etiqueta</Label>
                <Select value={form.etiqueta} onValueChange={(v: Temp) => setForm({...form, etiqueta: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["frio","morno","quente"] as Temp[]).map(t => <SelectItem key={t} value={t}>{TEMP_META[t].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estágio</Label>
                <Select value={form.estagio} onValueChange={(v: Stage) => setForm({...form, estagio: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor responsável *</Label>
                <Select value={form.owner_id} onValueChange={v => setForm({...form, owner_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{sellers.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name} <span className="text-xs text-muted-foreground">({s.kind})</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Origem</Label><Input value={form.origem} onChange={e => setForm({...form, origem: e.target.value})} placeholder="Site, Instagram, Indicação..." /></div>
              <div className="md:col-span-2"><Label>Curso de interesse</Label><Input value={form.curso_interesse} onChange={e => setForm({...form, curso_interesse: e.target.value})} /></div>
              <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={3} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
            </div>
            {form.id && form.telefone && (
              <div className="border border-border rounded-lg p-3 bg-secondary/30 space-y-2">
                <Label className="text-xs">Mensagem WhatsApp</Label>
                <Textarea rows={2} value={waMsg} onChange={e => setWaMsg(e.target.value)} />
                <Button variant="whatsapp" size="sm" onClick={openWA}><MessageCircle className="size-4" />Abrir WhatsApp</Button>
              </div>
            )}
          </TabsContent>
          {form.id && (
            <TabsContent value="historico" className="space-y-3">
              <div className="flex gap-2">
                <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Anotar interação..." />
                <Button onClick={addNote}><Send className="size-4" /></Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="text-sm border border-border rounded-lg p-3 bg-card">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-primary capitalize">{ev.tipo.replace("_", " ")}</span>
                      <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap text-foreground/80 font-sans">
                      {ev.tipo === "anotacao" ? ev.payload?.texto :
                       ev.tipo === "troca_estagio" ? `${ev.payload?.de} → ${ev.payload?.para}` :
                       ev.tipo === "whatsapp" ? `Enviou: "${ev.payload?.msg}"` :
                       JSON.stringify(ev.payload)}
                    </pre>
                  </div>
                ))}
                {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem eventos.</p>}
              </div>
            </TabsContent>
          )}
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const _fmtBRL = fmtBRL;