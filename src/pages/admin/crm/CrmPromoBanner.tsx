import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Plus, Pencil, Trash2, Tag, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import ImageDropZone from "@/components/admin/ImageDropZone";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  price: string | null;
  price_label: string | null;
  badge: string | null;
  color: string;
  image_url: string | null;
  cta_url: string | null;
  sort_order: number;
  active: boolean;
};

const empty: Partial<Banner> = { title: "", color: "navy", active: true, sort_order: 100 };

const COLORS: Record<string, string> = {
  navy: "from-[#0b1f4d] via-[#122a66] to-[#0b1f4d] text-white",
  emerald: "from-emerald-700 via-emerald-600 to-emerald-800 text-white",
  amber: "from-amber-500 via-orange-500 to-red-500 text-white",
  rose: "from-rose-600 via-pink-600 to-fuchsia-700 text-white",
  slate: "from-slate-800 via-slate-700 to-slate-900 text-white",
};

export default function CrmPromoBanner() {
  const { isMaster } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Banner>>(empty);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("promo-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const url = supabase.storage.from("promo-images").getPublicUrl(path).data.publicUrl;
      setEditing((prev) => ({ ...prev, image_url: url }));
      toast.success("Imagem enviada!");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };


  const load = async () => {
    const { data } = await supabase.from("crm_promo_banners" as any).select("*").order("sort_order");
    setBanners((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const active = banners.filter(b => b.active);
  if (active.length === 0 && !isMaster) return null;

  const save = async () => {
    if (!editing.title?.trim()) return toast.error("Título obrigatório");
    const payload: any = {
      title: editing.title, subtitle: editing.subtitle ?? null, price: editing.price ?? null,
      price_label: editing.price_label ?? null, badge: editing.badge ?? null,
      color: editing.color ?? "navy", image_url: editing.image_url ?? null,
      cta_url: editing.cta_url ?? null, sort_order: editing.sort_order ?? 100,
      active: editing.active !== false,
    };
    const { error } = editing.id
      ? await supabase.from("crm_promo_banners" as any).update(payload).eq("id", editing.id)
      : await supabase.from("crm_promo_banners" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    setEditOpen(false); load();
  };
  const remove = async (b: Banner) => {
    if (!confirm(`Excluir "${b.title}"?`)) return;
    const { error } = await supabase.from("crm_promo_banners" as any).delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  // duplicate for marquee loop
  const loopItems = active.length ? [...active, ...active] : [];

  return (
    <div className="px-4 md:px-8 pt-3">
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Tag className="size-3.5 text-primary" />
            <span>Tabela de preços & promoções</span>
          </div>
          {isMaster && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setManageOpen(true)}>
              <Settings className="size-3.5" /> Gerenciar
            </Button>
          )}
        </div>

        {active.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum banner cadastrado. Clique em <strong>Gerenciar</strong> para adicionar preços e promoções.
          </div>
        ) : (
          <div className="group overflow-hidden py-3">
            <div className="flex gap-3 animate-crm-marquee group-hover:[animation-play-state:paused]" style={{ width: "max-content" }}>
              {loopItems.map((b, i) => {
                const cls = COLORS[b.color] ?? COLORS.navy;
                const inner = (
                  <div className={`relative shrink-0 w-[320px] rounded-lg bg-gradient-to-br ${cls} p-3 shadow-md overflow-hidden`}>
                    {b.image_url && <img src={b.image_url} alt="" className="absolute right-0 top-0 h-full w-24 object-cover opacity-30 pointer-events-none" />}
                    {b.badge && <span className="inline-block bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 animate-pulse">{b.badge}</span>}
                    <div className="font-bold text-sm leading-tight line-clamp-2">{b.title}</div>
                    {b.subtitle && <div className="text-[11px] opacity-80 line-clamp-1 mt-0.5">{b.subtitle}</div>}
                    <div className="flex items-end justify-between mt-2">
                      {b.price && (
                        <div>
                          <div className="text-lg font-black text-yellow-300 leading-none">{b.price}</div>
                          {b.price_label && <div className="text-[10px] opacity-70">{b.price_label}</div>}
                        </div>
                      )}
                      {b.cta_url && <ExternalLink className="size-3.5 opacity-70" />}
                    </div>
                  </div>
                );
                return b.cta_url
                  ? <a key={i} href={b.cta_url} target="_blank" rel="noreferrer" className="hover:scale-[1.02] transition-transform">{inner}</a>
                  : <div key={i}>{inner}</div>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manager Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Banners do CRM</DialogTitle></DialogHeader>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => { setEditing(empty); setEditOpen(true); }}>
              <Plus className="size-4" /> Novo banner
            </Button>
          </div>
          <div className="space-y-2">
            {banners.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum banner ainda.</p>}
            {banners.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                <div className={`w-16 h-10 rounded bg-gradient-to-br ${COLORS[b.color] ?? COLORS.navy}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{b.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.price} {b.price_label}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${b.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{b.active ? "Ativo" : "Inativo"}</span>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setEditOpen(true); }}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(b)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Editar banner" : "Novo banner"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={editing.title ?? ""} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ex: EJA Ensino Médio" /></div>
            <div><Label>Subtítulo</Label><Textarea rows={2} value={editing.subtitle ?? ""} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} placeholder="Conclua em até 6 meses" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço</Label><Input value={editing.price ?? ""} onChange={e => setEditing({ ...editing, price: e.target.value })} placeholder="R$ 497" /></div>
              <div><Label>Rótulo do preço</Label><Input value={editing.price_label ?? ""} onChange={e => setEditing({ ...editing, price_label: e.target.value })} placeholder="ou 12x R$ 49" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Badge (destaque)</Label><Input value={editing.badge ?? ""} onChange={e => setEditing({ ...editing, badge: e.target.value })} placeholder="PROMO · 40% OFF" /></div>
              <div>
                <Label>Cor</Label>
                <Select value={editing.color ?? "navy"} onValueChange={v => setEditing({ ...editing, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="navy">Azul marinho</SelectItem>
                    <SelectItem value="emerald">Verde</SelectItem>
                    <SelectItem value="amber">Laranja/Vermelho</SelectItem>
                    <SelectItem value="rose">Rosa/Roxo</SelectItem>
                    <SelectItem value="slate">Cinza escuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Imagem do banner (opcional)</Label>
              <ImageDropZone maxMB={5} onFiles={(files) => uploadImage(files[0])}>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
                    <Upload className="size-4" /> {uploading ? "Enviando…" : "Escolher do computador"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
                  </label>
                  {editing.image_url && (
                    <div className="flex items-center gap-2">
                      <img src={editing.image_url} alt="Prévia do banner" className="h-12 w-20 rounded object-cover border" />
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setEditing({ ...editing, image_url: null })}>Remover</Button>
                    </div>
                  )}
                </div>
              </ImageDropZone>
              <Input value={editing.image_url ?? ""} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="ou cole uma URL https://..." />
              <p className="text-[11px] text-muted-foreground">Recomendado: 1920×720 px (JPG/PNG, até 5 MB).</p>
            </div>
            <div><Label>Link do botão (opcional)</Label><Input value={editing.cta_url ?? ""} onChange={e => setEditing({ ...editing, cta_url: e.target.value })} placeholder="https://... (WhatsApp, checkout, etc.)" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order ?? 100} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2 mt-6"><Switch checked={editing.active !== false} onCheckedChange={v => setEditing({ ...editing, active: v })} /> <span className="text-sm">Ativo</span></label>
            </div>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}