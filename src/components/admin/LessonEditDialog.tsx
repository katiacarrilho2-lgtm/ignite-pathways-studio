import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ImageIcon, Trash2, Youtube, Plus } from "lucide-react";
import { YoutubePickerDialog, YoutubeVideo } from "./YoutubePickerDialog";

type Lesson = { id: string; title: string; content: any };

async function fileToResizedDataUrl(file: File, maxWidth = 1400, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onerror = () => rej(r.error);
    r.onload = () => res(r.result as string); r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Falha ao ler imagem")); i.src = dataUrl;
  });
  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality);
}

type ExtraImage = { url: string; width: number; caption?: string };
type ExtraVideo = { url: string; title?: string; why?: string };

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^ ]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = s.match(p); if (m) return m[1]; }
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export const LessonEditDialog = ({
  open, onOpenChange, lesson, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  onSaved: (updated: Lesson) => void;
}) => {
  const [title, setTitle] = useState(lesson.title);
  const [html, setHtml] = useState<string>(lesson.content?.html ?? lesson.content?.body ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(lesson.content?.image_url ?? null);
  const [imageWidth, setImageWidth] = useState<number>(lesson.content?.image_width ?? 480);
  const [youtube, setYoutube] = useState<any>(lesson.content?.youtube ?? null);
  const [ytOpen, setYtOpen] = useState(false);
  const [extraImages, setExtraImages] = useState<ExtraImage[]>(lesson.content?.extra_images ?? []);
  const [extraVideos, setExtraVideos] = useState<ExtraVideo[]>(lesson.content?.extra_videos ?? lesson.content?.video_suggestions ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(lesson.title);
      setHtml(lesson.content?.html ?? lesson.content?.body ?? "");
      setImageUrl(lesson.content?.image_url ?? null);
      setImageWidth(lesson.content?.image_width ?? 480);
      setYoutube(lesson.content?.youtube ?? null);
      setExtraImages(lesson.content?.extra_images ?? []);
      setExtraVideos(lesson.content?.extra_videos ?? lesson.content?.video_suggestions ?? []);
    }
  }, [open, lesson]);

  const pickFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (f.size > 8 * 1024 * 1024) return toast.error("Máx 8 MB");
    try {
      const url = await fileToResizedDataUrl(f);
      setImageUrl(url);
      toast.success("Imagem carregada (será salva ao clicar em Salvar)");
    } catch (e: any) { toast.error(e?.message ?? "Falha ao processar imagem"); }
  };

  const addExtraImageFromFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (f.size > 8 * 1024 * 1024) return toast.error("Máx 8 MB");
    try {
      const url = await fileToResizedDataUrl(f);
      setExtraImages(arr => [...arr, { url, width: 480, caption: "" }]);
    } catch (e: any) { toast.error(e?.message ?? "Falha ao processar imagem"); }
  };

  const updateExtraImage = (i: number, patch: Partial<ExtraImage>) =>
    setExtraImages(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeExtraImage = (i: number) =>
    setExtraImages(arr => arr.filter((_, idx) => idx !== i));

  const updateExtraVideo = (i: number, patch: Partial<ExtraVideo>) =>
    setExtraVideos(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeExtraVideo = (i: number) =>
    setExtraVideos(arr => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setBusy(true);
    const cleanImages = extraImages.filter(x => x.url?.trim());
    const cleanVideos = extraVideos.filter(x => x.url?.trim());
    const newContent = {
      ...(lesson.content ?? {}),
      html,
      body: html, // compat
      image_url: imageUrl ?? null,
      image_width: imageUrl ? imageWidth : null,
      youtube: youtube?.videoId ? youtube : null,
      extra_images: cleanImages,
      extra_videos: cleanVideos,
    };
    const { error } = await supabase
      .from("course_lessons")
      .update({ title: title.trim() || lesson.title, content: newContent })
      .eq("id", lesson.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Aula atualizada");
    onSaved({ ...lesson, title: title.trim() || lesson.title, content: newContent });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar aula</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <Label>Conteúdo (HTML)</Label>
              <Textarea
                rows={12}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="font-mono text-xs"
                placeholder="<p>Escreva o conteúdo da aula...</p>"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Aceita HTML. Use &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;strong&gt;, etc.
              </p>
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><ImageIcon className="size-4" /> Imagem principal da aula</Label>
                {imageUrl && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setImageUrl(null)}>
                    <Trash2 className="size-3.5" /> Remover
                  </Button>
                )}
              </div>

              {imageUrl && (
                <div className="flex justify-center bg-secondary/30 rounded-md p-3">
                  <img src={imageUrl} alt="preview" style={{ maxWidth: `${imageWidth}px`, width: "100%" }} className="rounded" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary">
                  <ImageIcon className="size-4" /> {imageUrl ? "Trocar imagem" : "Enviar do computador"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                </label>
                <Input
                  placeholder="ou cole uma URL https://..."
                  onBlur={(e) => { const v = e.target.value.trim(); if (v) setImageUrl(v); }}
                />
              </div>

              {imageUrl && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Tamanho de exibição</span>
                    <span className="font-mono">{imageWidth}px</span>
                  </div>
                  <Slider
                    min={200} max={900} step={20}
                    value={[imageWidth]}
                    onValueChange={(v) => setImageWidth(v[0])}
                  />
                </div>
              )}
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><ImageIcon className="size-4" /> Imagens extras (galeria)</Label>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1 cursor-pointer text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary">
                    <Plus className="size-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => addExtraImageFromFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <Button variant="secondary" size="sm" onClick={() => setExtraImages(arr => [...arr, { url: "", width: 480, caption: "" }])}>
                    <Plus className="size-3.5" /> URL
                  </Button>
                </div>
              </div>
              {extraImages.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma imagem extra. Adicione fotos ou diagramas complementares.</p>
              )}
              <div className="space-y-3">
                {extraImages.map((img, i) => (
                  <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/20">
                    <div className="flex items-start gap-3">
                      {img.url ? (
                        <img src={img.url} alt="" className="w-24 h-24 object-cover rounded" />
                      ) : (
                        <div className="w-24 h-24 rounded bg-muted grid place-items-center text-muted-foreground text-xs">sem imagem</div>
                      )}
                      <div className="flex-1 space-y-2 min-w-0">
                        <Input
                          placeholder="URL da imagem"
                          value={img.url}
                          onChange={(e) => updateExtraImage(i, { url: e.target.value })}
                        />
                        <Input
                          placeholder="Legenda (opcional)"
                          value={img.caption ?? ""}
                          onChange={(e) => updateExtraImage(i, { caption: e.target.value })}
                        />
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeExtraImage(i)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Largura</span><span className="font-mono">{img.width}px</span>
                      </div>
                      <Slider min={200} max={900} step={20} value={[img.width]} onValueChange={(v) => updateExtraImage(i, { width: v[0] })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Youtube className="size-4 text-red-600" /> Vídeo principal (YouTube)</Label>
                <Button variant="secondary" size="sm" onClick={() => setYtOpen(true)}>
                  {youtube?.videoId ? "Trocar vídeo" : "Adicionar vídeo"}
                </Button>
              </div>
              {youtube?.videoId ? (
                <div className="flex items-center gap-3">
                  <img src={youtube.thumbnail} alt="" className="w-28 aspect-video object-cover rounded" />
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{youtube.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{youtube.channel}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setYoutube(null)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum vídeo. Clique em Adicionar vídeo para colar um link ou buscar.</p>
              )}
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Youtube className="size-4 text-red-600" /> Vídeos extras</Label>
                <Button variant="secondary" size="sm" onClick={() => setExtraVideos(arr => [...arr, { url: "", title: "", why: "" }])}>
                  <Plus className="size-3.5" /> Adicionar
                </Button>
              </div>
              {extraVideos.length === 0 && (
                <p className="text-xs text-muted-foreground">Cole links do YouTube para complementar a aula.</p>
              )}
              <div className="space-y-2">
                {extraVideos.map((v, i) => {
                  const vid = extractYoutubeId(v.url);
                  return (
                    <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/20">
                      <div className="flex items-start gap-3">
                        {vid ? (
                          <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="" className="w-28 aspect-video object-cover rounded" />
                        ) : (
                          <div className="w-28 aspect-video rounded bg-muted grid place-items-center text-muted-foreground text-[10px]">preview</div>
                        )}
                        <div className="flex-1 space-y-2 min-w-0">
                          <Input placeholder="URL do YouTube" value={v.url} onChange={(e) => updateExtraVideo(i, { url: e.target.value })} />
                          <Input placeholder="Título (opcional)" value={v.title ?? ""} onChange={(e) => updateExtraVideo(i, { title: e.target.value })} />
                          <Input placeholder="Descrição curta (opcional)" value={v.why ?? ""} onChange={(e) => updateExtraVideo(i, { why: e.target.value })} />
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeExtraVideo(i)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
              <Button variant="hero" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <YoutubePickerDialog
        open={ytOpen}
        onOpenChange={setYtOpen}
        current={youtube}
        onPick={(v: YoutubeVideo) => { setYoutube(v); setYtOpen(false); }}
        onClear={() => { setYoutube(null); setYtOpen(false); }}
      />
    </>
  );
};

export default LessonEditDialog;