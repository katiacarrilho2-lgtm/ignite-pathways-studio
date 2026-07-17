import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Check, Trash2, Calendar as CalIcon, X } from "lucide-react";
import { toast } from "sonner";
import { buildICS, downloadICS } from "@/lib/crm";
import { useSearchParams } from "react-router-dom";

export default function CrmAgenda() {
  const { user, isMaster } = useAuth();
  const { byId, sellers } = useCrmSellers();
  const { activeAccountId } = useCommercialAccounts();
  const canSeeAll = isMaster;
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerParam = searchParams.get("owner");
  const viewingSeller = canSeeAll && ownerParam ? sellers.find(s => s.user_id === ownerParam) : null;
  const [appts, setAppts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [dlg, setDlg] = useState(false);
  const [form, setForm] = useState({ title: "", scheduled_at: "", notes: "", lead_id: "" });

  const load = async () => {
    const { data } = await supabase.from("crm_appointments").select("*").order("scheduled_at");
    setAppts(data ?? []);
    const { data: l } = await supabase.from("crm_leads").select("id, nome");
    setLeads(l ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("crm-appts").on("postgres_changes", { event: "*", schema: "public", table: "crm_appointments" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => appts.filter(a => {
    if (!canSeeAll) return a.owner_id === user?.id;
    if (ownerParam) return a.owner_id === ownerParam;
    return true;
  }), [appts, canSeeAll, user?.id, ownerParam]);

  const clearOwner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("owner");
    setSearchParams(next, { replace: true });
  };

  const save = async () => {
    if (!form.title.trim() || !form.scheduled_at || !user) return toast.error("Preencha título e data");
    const { error } = await supabase.from("crm_appointments").insert(withAccount({
      title: form.title.trim(), scheduled_at: new Date(form.scheduled_at).toISOString(),
      notes: form.notes.trim() || null, lead_id: form.lead_id || null, owner_id: user.id,
    }, activeAccountId));
    if (error) return toast.error(error.message);
    toast.success("Compromisso criado"); setDlg(false); setForm({ title: "", scheduled_at: "", notes: "", lead_id: "" });
  };

  const toggleDone = async (a: any) => { await supabase.from("crm_appointments").update({ done: !a.done }).eq("id", a.id); };
  const remove = async (id: string) => { if (!confirm("Excluir?")) return; await supabase.from("crm_appointments").delete().eq("id", id); };

  const byDate = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(a => {
      const k = new Date(a.scheduled_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
      (g[k] = g[k] || []).push(a);
    });
    return g;
  }, [filtered]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-muted-foreground"><CalIcon className="size-5" /><span className="text-sm">{filtered.length} compromisso(s)</span></div>
        <Button onClick={() => setDlg(true)}><Plus className="size-4" />Novo compromisso</Button>
      </div>

      {viewingSeller && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-sm">
          <span className="text-primary font-medium">Visualizando a agenda de <strong>{viewingSeller.display_name}</strong></span>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={clearOwner}>
            <X className="size-3.5" />Voltar para minha agenda
          </Button>
        </div>
      )}

      {Object.keys(byDate).length === 0 && <div className="text-center py-12 text-muted-foreground">Nenhum compromisso agendado.</div>}

      {Object.entries(byDate).map(([dia, list]) => (
        <div key={dia} className="space-y-2">
          <h3 className="text-sm font-bold text-primary capitalize border-b border-border pb-1">{dia}</h3>
          {list.map(a => {
            const seller = byId(a.owner_id);
            const lead = leads.find(l => l.id === a.lead_id);
            const when = new Date(a.scheduled_at);
            return (
              <div key={a.id} className={`bg-card border border-border rounded-lg p-3 flex items-center gap-3 ${a.done ? "opacity-60" : ""}`}>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => toggleDone(a)}><Check className={`size-4 ${a.done ? "text-emerald-600" : "text-muted-foreground"}`} /></Button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${a.done ? "line-through" : ""}`}>{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {lead && ` · Lead: ${lead.nome}`}
                    {seller && ` · ${seller.display_name}`}
                  </p>
                  {a.notes && <p className="text-xs mt-1 text-foreground/80">{a.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" className="size-8" title="Baixar .ics"
                  onClick={() => downloadICS(`${a.title}.ics`, buildICS(a.title, when, a.notes))}>
                  <Download className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => remove(a.id)}><Trash2 className="size-4" /></Button>
              </div>
            );
          })}
        </div>
      ))}

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo compromisso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Data e hora *</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} /></div>
            <div>
              <Label>Lead vinculado</Label>
              <Select value={form.lead_id || "none"} onValueChange={v => setForm({...form, lead_id: v === "none" ? "" : v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Anotação</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(false)}>Cancelar</Button><Button onClick={save}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}