import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveContact, useTags } from "./hooks";
import { toast } from "sonner";
import { z } from "zod";
import { TagsManagerDialog } from "./TagsManagerDialog";
import { Tag as TagIcon } from "lucide-react";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  whatsapp: z.string().trim().min(8, "WhatsApp obrigatório").max(20),
  email: z.string().trim().email("E-mail inválido").max(200).optional().or(z.literal("")),
  cidade: z.string().max(80).optional(),
  estado: z.string().max(40).optional(),
  origem: z.string().max(60).optional(),
  status: z.string(),
  tipo: z.string().optional(),
  observacoes: z.string().max(2000).optional(),
  opt_out: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const empty: any = { nome: "", whatsapp: "", email: "", cidade: "", estado: "", origem: "", status: "novo", tipo: "contato", observacoes: "", opt_out: false, tags: [] };

export function ContactDialog({ open, onOpenChange, contact }: { open: boolean; onOpenChange: (v: boolean) => void; contact?: any }) {
  const [form, setForm] = useState<any>(empty);
  const save = useSaveContact();
  const { data: tags = [] } = useTags();
  const [tagsManagerOpen, setTagsManagerOpen] = useState(false);

  useEffect(() => {
    if (open) setForm(contact ? { ...empty, ...contact, tags: contact.tags || [] } : empty);
  }, [open, contact]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    try {
      await save.mutateAsync({ ...form, id: contact?.id });
      toast.success(contact ? "Contato atualizado" : "Contato criado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "WhatsApp já cadastrado" : "Erro ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{contact ? "Editar contato" : "Novo contato"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo || "contato"} onValueChange={v => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contato">Contato individual</SelectItem>
                <SelectItem value="grupo">Grupo do WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>WhatsApp *</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="11 99999-9999" /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label>Cidade</Label><Input value={form.cidade || ""} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
            <div><Label>UF</Label><Input maxLength={2} value={form.estado || ""} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Origem</Label>
              <Select value={form.origem || ""} onValueChange={v => setForm({ ...form, origem: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Instagram", "Facebook", "Site", "Indicação", "WhatsApp", "Outro"].map(o =>
                    <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="em_negociacao">Em negociação</SelectItem>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="ex_aluno">Ex-aluno</SelectItem>
                  <SelectItem value="sem_interesse">Sem interesse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Observações</Label><Textarea rows={3} value={form.observacoes || ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Etiquetas</Label>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTagsManagerOpen(true)}>
                <TagIcon className="size-3.5" /> Gerenciar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-secondary/30 min-h-[44px]">
              {tags.length === 0 && <span className="text-xs text-muted-foreground self-center">Nenhuma etiqueta criada. Clique em Gerenciar.</span>}
              {tags.map((t: any) => {
                const on = (form.tags || []).includes(t.nome);
                return (
                  <button key={t.id} type="button"
                    onClick={() => {
                      const set = new Set<string>(form.tags || []);
                      on ? set.delete(t.nome) : set.add(t.nome);
                      setForm({ ...form, tags: Array.from(set) });
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition border-2 ${on ? "text-white" : "text-foreground bg-background"}`}
                    style={on ? { background: t.cor || "#3b82f6", borderColor: t.cor || "#3b82f6" } : { borderColor: t.cor || "#3b82f6" }}>
                    {t.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Não deseja receber mensagens</Label>
              <p className="text-xs text-muted-foreground">Bloqueia este contato em todas as campanhas.</p>
            </div>
            <Switch checked={!!form.opt_out} onCheckedChange={v => setForm({ ...form, opt_out: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
      <TagsManagerDialog open={tagsManagerOpen} onOpenChange={setTagsManagerOpen} />
    </Dialog>
  );
}