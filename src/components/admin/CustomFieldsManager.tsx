import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ListPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type CustomField = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  required: boolean;
  active: boolean;
  sort_order: number;
};

export const FIELD_TYPES = [
  { v: "text", label: "Texto" },
  { v: "cpf", label: "CPF" },
  { v: "phone", label: "Telefone" },
  { v: "email", label: "E-mail" },
  { v: "date", label: "Data" },
  { v: "number", label: "Número" },
  { v: "textarea", label: "Texto longo" },
];

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const CustomFieldsManager = () => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [novo, setNovo] = useState({ label: "", field_type: "text", placeholder: "", required: false });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("enrollment_custom_fields")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setFields((data ?? []) as CustomField[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const criar = async () => {
    const label = novo.label.trim();
    if (label.length < 2) return toast.error("Escreva o nome do campo (ex.: Nome do responsável).");
    const base = slugify(label) || "campo";
    let key = base;
    let n = 2;
    while (fields.some(f => f.field_key === key)) { key = `${base}_${n}`; n += 1; }
    setSaving(true);
    const { error } = await supabase.from("enrollment_custom_fields").insert({
      field_key: key,
      label,
      field_type: novo.field_type,
      placeholder: novo.placeholder.trim() || null,
      required: novo.required,
      active: true,
      sort_order: fields.length,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Campo criado e salvo!");
    setNovo({ label: "", field_type: "text", placeholder: "", required: false });
    setCreating(false);
    load();
  };

  const patch = (id: string, changes: Partial<CustomField>) =>
    setFields(list => list.map(f => (f.id === id ? { ...f, ...changes } : f)));

  const salvar = async (f: CustomField) => {
    setSaving(true);
    const { error } = await supabase
      .from("enrollment_custom_fields")
      .update({
        label: f.label.trim(),
        field_type: f.field_type,
        placeholder: f.placeholder?.trim() || null,
        required: f.required,
        active: f.active,
        sort_order: f.sort_order,
      })
      .eq("id", f.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Campo salvo!");
  };

  const excluir = async (f: CustomField) => {
    if (!confirm(`Excluir o campo "${f.label}"? As fichas já recebidas continuam guardadas.`)) return;
    const { error } = await supabase.from("enrollment_custom_fields").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Campo excluído");
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <ListPlus className="size-4" /> Campos da ficha de matrícula
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Crie as informações extras que você quer pedir no link da ficha (ex.: nome do responsável, RG do responsável,
            CPF do responsável). Salve e escolha quais ficam ativas.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(v => !v)}>
          <Plus className="size-4" /> Criar novo campo
        </Button>
      </div>

      {creating && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 md:p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome do campo *</Label>
              <Input
                autoFocus
                value={novo.label}
                onChange={e => setNovo({ ...novo, label: e.target.value })}
                placeholder="Ex.: Nome do responsável"
              />
            </div>
            <div>
              <Label className="text-xs">Tipo de informação</Label>
              <Select value={novo.field_type} onValueChange={v => setNovo({ ...novo, field_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Texto de ajuda (opcional)</Label>
              <Input
                value={novo.placeholder}
                onChange={e => setNovo({ ...novo, placeholder: e.target.value })}
                placeholder="Ex.: informe o nome completo"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={novo.required} onChange={e => setNovo({ ...novo, required: e.target.checked })} />
            Preenchimento obrigatório
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={criar} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar campo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum campo extra criado ainda. Clique em “Criar novo campo” para começar.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map(f => (
            <div key={f.id} className="border border-border rounded-lg p-3 grid md:grid-cols-[1fr_170px_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Nome do campo</Label>
                <Input value={f.label} onChange={e => patch(f.id, { label: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
                <Select value={f.field_type} onValueChange={v => patch(f.id, { field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Texto de ajuda</Label>
                <Input value={f.placeholder ?? ""} onChange={e => patch(f.id, { placeholder: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 pb-1">
                <label className="flex items-center gap-1 text-[11px]">
                  <input type="checkbox" checked={f.active} onChange={e => patch(f.id, { active: e.target.checked })} /> Ativo
                </label>
                <label className="flex items-center gap-1 text-[11px]">
                  <input type="checkbox" checked={f.required} onChange={e => patch(f.id, { required: e.target.checked })} /> Obrigatório
                </label>
                <Button size="sm" variant="outline" onClick={() => salvar(f)} disabled={saving}>
                  <Save className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => excluir(f)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomFieldsManager;
