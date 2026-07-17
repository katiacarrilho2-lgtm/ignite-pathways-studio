import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, ImageIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { ImageDropZone } from "@/components/admin/ImageDropZone";

type Slide = {
  id: string; eyebrow: string | null; title: string; highlight: string | null; subtitle: string | null;
  price: string | null; price_label: string | null; badges: { text: string }[];
  image_url: string | null; cta_url: string | null; course_id: string | null;
  variant: string; sort_order: number; active: boolean;
};

const empty: Partial<Slide> = { title: "", highlight: "", subtitle: "", badges: [], variant: "navy", active: true, sort_order: 100 };

const BUCKET = "promo-images";

const AdminPromoInner = () => {
  const { isMaster } = useAuth();
  const [list, setList] = useState<Slide[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Slide>>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [badgeInput, setBadgeInput] = useState("");

  const load = async () => {
    const { data } = await supabase.from("promo_slides").select("*").order("sort_order");
    setList((data ?? []) as unknown as Slide[]);
    const { data: cs } = await supabase.from("courses").select("id,title,slug").eq("active", true).order("title");
    setCourses(cs ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(empty); setFile(null); setOpen(true); };
  const openEdit = (s: Slide) => { setEditing({ ...s, badges: s.badges ?? [] }); setFile(null); setOpen(true); };

  const save = async () => {
    if (!editing.title) return toast.error("Título obrigatório");
    setSaving(true);
    let image_url = editing.image_url ?? null;
    try {
      if (file) {
        const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]+/gi, "-")}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (error) throw error;
        image_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const payload: any = {
        eyebrow: editing.eyebrow, title: editing.title, highlight: editing.highlight,
        subtitle: editing.subtitle, price: editing.price, price_label: editing.price_label,
        badges: editing.badges ?? [], image_url, cta_url: editing.cta_url || null,
        course_id: editing.course_id || null, variant: editing.variant ?? "navy",
        sort_order: editing.sort_order ?? 100, active: editing.active !== false,
      };
      const { error } = editing.id
        ? await supabase.from("promo_slides").update(payload).eq("id", editing.id)
        : await supabase.from("promo_slides").insert(payload);
      if (error) throw error;
      toast.success("Slide salvo!");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (s: Slide) => {
    if (!confirm(`Excluir "${s.title}"?`)) return;
    const { error } = await supabase.from("promo_slides").delete().eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const addBadge = () => {
    if (!badgeInput.trim()) return;
    setEditing({ ...editing, badges: [...(editing.badges ?? []), { text: badgeInput.trim() }] });
    setBadgeInput("");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Carrossel da home</h1>
          <p className="text-muted-foreground text-sm">Gerencie os slides promocionais que aparecem na página inicial</p>
        </div>
        {isMaster && <Button onClick={openNew} variant="hero"><Plus className="size-4" /> Novo slide</Button>}
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 flex gap-3 text-sm">
        <Info className="size-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Tamanho recomendado da imagem:</p>
          <p><strong>1600 × 900 pixels</strong> (proporção 16:9), formato JPG ou PNG, até 2 MB. A imagem aparece no lado direito do slide em telas grandes — deixe o assunto principal centralizado/à direita para não ser cortado.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary/60">
            <tr><th className="text-left p-3">Imagem</th><th className="text-left p-3">Título</th><th className="text-left p-3">Variante</th><th className="text-left p-3">Preço</th><th className="text-left p-3">Ordem</th><th className="text-left p-3">Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">{s.image_url ? <img src={s.image_url} alt="" className="w-20 h-12 rounded object-cover" /> : <div className="w-20 h-12 rounded bg-muted grid place-items-center"><ImageIcon className="size-4 text-muted-foreground" /></div>}</td>
                <td className="p-3 font-medium text-primary">{s.title} <span className="text-muted-foreground font-normal">{s.highlight}</span></td>
                <td className="p-3 text-muted-foreground">{s.variant}</td>
                <td className="p-3 text-muted-foreground">{s.price}</td>
                <td className="p-3 text-muted-foreground">{s.sort_order}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${s.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{s.active ? "Ativo" : "Inativo"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  {isMaster && <>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s)} className="text-destructive"><Trash2 className="size-4" /></Button>
                  </>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum slide ainda. Os slides padrão continuam aparecendo no site até você criar o primeiro.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Editar slide" : "Novo slide"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Eyebrow (texto pequeno sobre o título)</Label><Input value={editing.eyebrow ?? ""} onChange={e=>setEditing({...editing, eyebrow: e.target.value})} placeholder="EJA · Conclusão rápida" /></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Título *</Label><Input value={editing.title ?? ""} onChange={e=>setEditing({...editing, title: e.target.value})} placeholder="Termine seus estudos em" /></div>
              <div><Label>Destaque (em amarelo)</Label><Input value={editing.highlight ?? ""} onChange={e=>setEditing({...editing, highlight: e.target.value})} placeholder="90 dias" /></div>
            </div>
            <div><Label>Subtítulo</Label><Textarea rows={2} value={editing.subtitle ?? ""} onChange={e=>setEditing({...editing, subtitle: e.target.value})} /></div>
            <div className="grid md:grid-cols-3 gap-3">
              <div><Label>Preço</Label><Input value={editing.price ?? ""} onChange={e=>setEditing({...editing, price: e.target.value})} placeholder="3x R$ 235" /></div>
              <div><Label>Rótulo do preço</Label><Input value={editing.price_label ?? ""} onChange={e=>setEditing({...editing, price_label: e.target.value})} placeholder="no boleto" /></div>
              <div>
                <Label>Variante de cor</Label>
                <Select value={editing.variant ?? "navy"} onValueChange={v=>setEditing({...editing, variant: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="navy">Navy + Dourado</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="blue">Azul</SelectItem>
                    <SelectItem value="full">Imagem inteira (sem texto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Badges (frases curtas)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={badgeInput} onChange={e=>setBadgeInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addBadge();}}} placeholder="Ex: Reconhecido MEC" />
                <Button type="button" variant="outline" onClick={addBadge}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(editing.badges ?? []).map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
                    {b.text}
                    <button type="button" onClick={()=>setEditing({...editing, badges: editing.badges!.filter((_,x)=>x!==i)})} className="text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Curso vinculado (para checkout interno)</Label>
              <Select value={editing.course_id ?? "none"} onValueChange={v=>setEditing({...editing, course_id: v === "none" ? null : v})}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (usar Link externo abaixo)</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Se você escolher um curso, o botão CLIQUE AQUI vai para /checkout/[slug] (Mercado Pago + cupons).</p>
            </div>

            <div>
              <Label>OU link externo (Mercado Pago, etc.)</Label>
              <Input value={editing.cta_url ?? ""} onChange={e=>setEditing({...editing, cta_url: e.target.value})} placeholder="https://mpago.la/..." />
            </div>

            <div>
              <Label>Imagem do slide</Label>
              <p className="text-xs text-muted-foreground mb-2">
                📐 Tamanhos recomendados:<br />
                • <strong>Variantes com texto</strong> (Navy / Escuro / Azul): <strong>1600 × 900px</strong> (16:9) — assunto principal centralizado/à direita.<br />
                • <strong>Imagem inteira</strong>: <strong>1600 × 686px</strong> (proporção 21:9) ou <strong>1600 × 900px</strong> (16:9) — toda a arte é exibida sem corte, com botão CLIQUE AQUI sobreposto no canto inferior direito.<br />
                Formato JPG ou PNG, até 2 MB.
              </p>
              <ImageDropZone onFiles={(files) => setFile(files[0])}>
                <div className="flex items-center gap-3">
                  {editing.image_url && !file && <img src={editing.image_url} alt="" className="w-24 h-14 rounded object-cover" />}
                  {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
                  <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary">
                    <Upload className="size-4" /> {editing.image_url || file ? "Trocar imagem" : "Enviar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </ImageDropZone>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order ?? 100} onChange={e=>setEditing({...editing, sort_order: Number(e.target.value)})} /></div>
              <label className="flex items-center gap-2 mt-6"><Switch checked={editing.active !== false} onCheckedChange={v=>setEditing({...editing, active: v})} /> <span className="text-sm">Ativo no site</span></label>
            </div>

            <Button onClick={save} variant="hero" className="w-full" disabled={saving}>{saving?"Salvando...":"Salvar slide"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPromo = () => <RequirePermission perm="manage_courses"><AdminPromoInner /></RequirePermission>;
export default AdminPromo;