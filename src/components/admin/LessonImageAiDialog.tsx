import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon, X, Sparkles } from "lucide-react";

const fileToDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onerror = () => reject(r.error);
  r.onload = () => resolve(r.result as string);
  r.readAsDataURL(f);
});

export const LessonImageAiDialog = ({
  open, onOpenChange, lessonTitle, onConfirm, busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lessonTitle: string;
  onConfirm: (images: string[], extraPrompt: string) => Promise<void>;
  busy?: boolean;
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [extra, setExtra] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    const valid = arr.filter(f => f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024);
    const urls = await Promise.all(valid.map(fileToDataUrl));
    setImages((prev) => [...prev, ...urls].slice(0, 5));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setImages([]); setExtra(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> Gerar aula a partir de imagem
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Envie até 5 imagens (prints, manuais técnicos, diagramas, fotos de equipamentos). A IA vai analisar e gerar
          o conteúdo completo da aula <strong>{lessonTitle}</strong>.
        </p>

        <div>
          <Label className="mb-1 block">Imagens (até 5, máx 8 MB cada)</Label>
          <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary w-fit">
            <ImageIcon className="size-4" /> Selecionar imagens
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />
          </label>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {images.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt="" className="w-full h-24 object-cover rounded border border-border" />
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Instruções adicionais (opcional)</Label>
          <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)}
            placeholder="Ex: foque no funcionamento do compressor mostrado no diagrama; explique cada componente numerado." />
        </div>

        <Button variant="hero" className="w-full" disabled={busy || images.length === 0}
          onClick={async () => { await onConfirm(images, extra); }}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Gerar conteúdo
        </Button>
      </DialogContent>
    </Dialog>
  );
};