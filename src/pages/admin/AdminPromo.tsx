import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Images, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadCourseImage } from "@/lib/courseMedia";

type Banner = {
  id: string; title: string; subtitle: string | null; price: string | null; price_label: string | null;
  badge: string | null; color: string; image_url: string | null; cta_url: string | null;
  sort_order: number; active: boolean;
};

const empty = {
  title: "", subtitle: "", price: "", price_label: "", badge: "",
  color: "#0ea5e9", image_url: "", cta_url: "", sort_order: 0, active: true,
};

export default function AdminPromo() {
  const [list, setList] = useState<Banner[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("crm_promo_banners").select("*").order("sort_order");
    setList((data ?? []) as Banner[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...empty, sort_order: list.length }); setOpen(true); };
  const openEdit = (b: Banner) => {
    setEditing(b.id);
    setForm({
      title: b.title ?? "", subtitle: b.subtitle ?? "", price: b.price ?? "", price_label: b.price_label ?? "",
      badge: b.badge ?? "", color: b.color ?? "#0ea5e9", image_url: b.image_url ?? "", cta_url: b.cta_url ?? "",
      sort_order: b.sort_order ?? 0, active: b.active,
    });
    setOpen(true);
  };

  const pickImage = async (file: File) => {
    try {
      setSaving(true);
      const url = await uploadCourseImage(file, "promo");
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Arte enviada");
    } catch (e: any) { toast.error(e.message ?? "Falha no upload"); }
    finally { setSaving(false); }
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Informe o título");
    setSaving(true);
    const payload = {
      title: form.title.trim(), subtitle: form.subtitle || null, price: form.price || null,
      price_label: form.price_label || null, badge: form.badge || null, color: form.color,
      image_url: form.image_url || null, cta_url: form.cta_url || null,
      sort_order: Number(form.sort_order) || 0, active: form.active,
    };
    const { error } = editing
      ? await supabase.from("crm_promo_banners").update(payload).eq("id", editing)
      : await supabase.from("crm_promo_banners").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Banner salvo"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este banner?")) return;
    const { error } = await supabase.from("crm_promo_banners").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const toggle = async (b: Banner) => {
    await supabase.from("crm_promo_banners").update({ active: !b.active }).eq("id", b.id);
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Images className="size-7" /> Carrossel da Home</h1>
          <p className="text-muted-foreground">Artes de campanha que rodam no site.</p>
        </div>
        <Button variant="hero" onClick={openNew}><Plus className="size-4" /> Novo banner</Button>
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
        <p className="font-semibold mb-1">Medidas recomendadas para as artes</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
          <li>Desktop: <b>1920 × 720 px</b> (proporção 8:3)</li>
          <li>Mobile: <b>1080 × 1350 px</b> (4:5)</li>
          <li>JPG ou PNG, até 500 KB. Deixe o texto importante no centro, com 10% de margem nas bordas — as laterais são cortadas em telas menores.</li>
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((b) => (
          <div key={b.id} className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="aspect-[8/3] bg-secondary">
              {b.image_url
                ? <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: b.color }} />}
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground truncate">{b.subtitle ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={b.active} onCheckedChange={() => toggle(b)} />
                <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(b.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground">Nenhum banner cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar banner" : "Novo banner"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Arte (1920 × 720 px)</Label>
              {form.image_url && <img src={form.image_url} alt="" className="w-full aspect-[8/3] object-cover rounded-lg mb-2 border" />}
              <label className="flex items-center gap-2 border border-dashed rounded-lg p-3 cursor-pointer text-sm text-muted-foreground hover:bg-secondary/50">
                <Upload className="size-4" /> Enviar imagem
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
              </label>
            </div>
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Subtítulo</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço</Label><Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="R$ 199" /></div>
              <div><Label>Texto do preço</Label><Input value={form.price_label} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="ou 12x" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Selo</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Promoção" /></div>
              <div><Label>Cor de fundo</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            </div>
            <div><Label>Link ao clicar</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://…" /></div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2 pb-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo</label>
            </div>
            <Button variant="hero" className="w-full" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar banner"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
