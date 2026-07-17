import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, ImageIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { ImageDropZone } from "@/components/admin/ImageDropZone";

type Partner = {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number;
  active: boolean;
};

const empty: Partial<Partner> = { name: "", website_url: "", sort_order: 100, active: true };
const BUCKET = "promo-images";

const AdminParceirosInner = () => {
  const [list, setList] = useState<Partner[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Partner>>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("partners" as any).select("*").order("sort_order");
    setList((data ?? []) as unknown as Partner[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(empty); setFile(null); setOpen(true); };
  const openEdit = (p: Partner) => { setEditing(p); setFile(null); setOpen(true); };

  const save = async () => {
    if (!editing.name) return toast.error("Nome obrigatório");
    setSaving(true);
    let logo_url = editing.logo_url ?? null;
    try {
      if (file) {
        const path = `partners/${Date.now()}-${file.name.replace(/[^a-z0-9.]+/gi, "-")}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (error) throw error;
        logo_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      if (!logo_url) { setSaving(false); return toast.error("Envie o logo"); }
      const payload: any = {
        name: editing.name,
        logo_url,
        website_url: editing.website_url || null,
        sort_order: editing.sort_order ?? 100,
        active: editing.active !== false,
      };
      const { error } = editing.id
        ? await supabase.from("partners" as any).update(payload).eq("id", editing.id)
        : await supabase.from("partners" as any).insert(payload);
      if (error) throw error;
      toast.success("Parceiro salvo!");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (p: Partner) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await supabase.from("partners" as any).delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Parceiros</h1>
          <p className="text-muted-foreground text-sm">Gerencie os logos dos parceiros exibidos na página inicial</p>
        </div>
        <Button onClick={openNew} variant="hero"><Plus className="size-4" /> Novo parceiro</Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 flex gap-3 text-sm">
        <Info className="size-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Tamanho recomendado do logo:</p>
          <p><strong>240 × 120 pixels</strong> (proporção 2:1), formato <strong>PNG com fundo transparente</strong>, até 1 MB. Os logos são exibidos em cinza e ganham cor quando o visitante passa o mouse — use logos com bom contraste.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-secondary/60">
            <tr><th className="text-left p-3">Logo</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Link</th><th className="text-left p-3">Ordem</th><th className="text-left p-3">Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">{p.logo_url ? <img src={p.logo_url} alt={p.name} className="w-20 h-12 rounded object-contain bg-muted/40" /> : <div className="w-20 h-12 rounded bg-muted grid place-items-center"><ImageIcon className="size-4 text-muted-foreground" /></div>}</td>
                <td className="p-3 font-medium text-primary">{p.name}</td>
                <td className="p-3 text-muted-foreground truncate max-w-[260px]">{p.website_url ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.sort_order}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${p.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{p.active ? "Ativo" : "Inativo"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="size-4" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive ml-1"><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum parceiro cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? "Editar parceiro" : "Novo parceiro"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={editing.name ?? ""} onChange={e=>setEditing({...editing, name: e.target.value})} placeholder="Ex.: Empresa XPTO" /></div>
            <div><Label>Link do site (opcional)</Label><Input value={editing.website_url ?? ""} onChange={e=>setEditing({...editing, website_url: e.target.value})} placeholder="https://..." /></div>

            <div>
              <Label>Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">
                📐 <strong>240 × 120 px</strong> (2:1), PNG com fundo transparente, até 1 MB.
              </p>
              <ImageDropZone onFiles={(files) => setFile(files[0])} maxMB={1}>
                <div className="flex items-center gap-3">
                  {editing.logo_url && !file && <img src={editing.logo_url} alt="" className="w-24 h-14 rounded object-contain bg-muted/40" />}
                  {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
                  <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary">
                    <Upload className="size-4" /> {editing.logo_url || file ? "Trocar logo" : "Enviar logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </ImageDropZone>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order ?? 100} onChange={e=>setEditing({...editing, sort_order: Number(e.target.value)})} /></div>
              <label className="flex items-center gap-2 mt-6"><Switch checked={editing.active !== false} onCheckedChange={v=>setEditing({...editing, active: v})} /> <span className="text-sm">Ativo no site</span></label>
            </div>

            <Button onClick={save} variant="hero" className="w-full" disabled={saving}>{saving?"Salvando...":"Salvar parceiro"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminParceiros = () => <RequirePermission perm="manage_courses"><AdminParceirosInner /></RequirePermission>;
export default AdminParceiros;