import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Tag as TagIcon, Pencil, Check, X } from "lucide-react";
import { useTags, useSaveTag, useDeleteTag } from "./hooks";
import { toast } from "sonner";

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={`size-7 rounded-full border-2 transition ${value === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
          style={{ background: c }} aria-label={c} />
      ))}
      <label className="size-7 rounded-full border border-dashed border-border grid place-items-center cursor-pointer text-[10px] text-muted-foreground hover:bg-secondary">
        +
        <input type="color" className="sr-only" value={value} onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function TagsManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: tags = [] } = useTags();
  const save = useSaveTag();
  const del = useDeleteTag();

  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PALETTE[10]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState(PALETTE[10]);

  const submit = async () => {
    if (!nome.trim()) { toast.error("Informe o nome da etiqueta"); return; }
    try {
      await save.mutateAsync({ nome: nome.trim(), cor });
      setNome(""); setCor(PALETTE[10]);
      toast.success("Etiqueta criada");
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Etiqueta já existe" : "Erro ao salvar");
    }
  };

  const startEdit = (t: any) => { setEditingId(t.id); setEditNome(t.nome); setEditCor(t.cor || PALETTE[10]); };
  const saveEdit = async () => {
    if (!editNome.trim()) return;
    try {
      await save.mutateAsync({ id: editingId!, nome: editNome.trim(), cor: editCor });
      setEditingId(null);
      toast.success("Etiqueta atualizada");
    } catch { toast.error("Erro ao salvar"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TagIcon className="size-5 text-primary" /> Gerenciar etiquetas</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nova etiqueta</div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: VIP, Cliente, Lead Frio..." />
            </div>
            <div className="size-9 rounded-md border border-border" style={{ background: cor }} />
            <Button onClick={submit} disabled={save.isPending}><Plus className="size-4" /> Adicionar</Button>
          </div>
          <div>
            <Label className="text-xs">Cor</Label>
            <div className="mt-1.5"><ColorPicker value={cor} onChange={setCor} /></div>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto space-y-1.5">
          {tags.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">Nenhuma etiqueta criada ainda.</div>
          )}
          {tags.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md border border-border p-2 bg-card">
              {editingId === t.id ? (
                <>
                  <div className="size-6 rounded-full border border-border" style={{ background: editCor }} />
                  <Input className="h-8" value={editNome} onChange={e => setEditNome(e.target.value)} />
                  <div className="flex-1"><ColorPicker value={editCor} onChange={setEditCor} /></div>
                  <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="size-4 text-emerald-600" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="size-4" /></Button>
                </>
              ) : (
                <>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: t.cor || "#3b82f6" }}>{t.nome}</span>
                  <span className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={() => { if (confirm(`Excluir etiqueta "${t.nome}"?`)) del.mutate(t.id, { onSuccess: () => toast.success("Etiqueta excluída") }); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}