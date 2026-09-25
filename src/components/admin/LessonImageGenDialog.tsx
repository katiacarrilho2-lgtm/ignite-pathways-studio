import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Square, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { streamLessonImage } from "@/lib/lessonImageAi";
import { uploadDataUrlAsImage } from "@/lib/courseMedia";

export const LessonImageGenDialog = ({
  open,
  onOpenChange,
  defaultPrompt,
  folder,
  onUse,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultPrompt: string;
  folder: string;
  onUse: (url: string, target: "cover" | "gallery") => void;
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [preview, setPreview] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) { setPrompt(defaultPrompt); setPreview(null); setPartial(false); }
  }, [open, defaultPrompt]);

  const generate = async () => {
    if (!prompt.trim()) return toast.error("Descreva a cena da ilustração");
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setPreview(null);
    setPartial(true);
    try {
      await streamLessonImage(prompt.trim(), (dataUrl, isFinal) => {
        setPreview(dataUrl);
        setPartial(!isFinal);
      }, controller.signal);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message ?? "Falha ao gerar imagem");
      setPreview(null);
    } finally {
      setPartial(false);
      setBusy(false);
      abortRef.current = null;
    }
  };

  const use = async (target: "cover" | "gallery") => {
    if (!preview) return;
    setSaving(true);
    try {
      const url = await uploadDataUrlAsImage(preview, folder);
      onUse(url, target);
      toast.success(target === "cover" ? "Ilustração definida como capa da aula" : "Ilustração adicionada à galeria");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar a imagem");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) abortRef.current?.abort();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Gerar ilustração com IA
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label className="mb-1 block">O que deve aparecer na imagem</Label>
          <Textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: técnico medindo pressão do gás em um ar-condicionado split com manifold"
          />
          <p className="text-xs text-muted-foreground mt-1">
            A imagem sai em estilo de foto profissional, sem textos nem logotipos.
          </p>
        </div>

        {preview && (
          <figure className="rounded-lg overflow-hidden border border-border bg-secondary/20">
            <img
              src={preview}
              alt="Prévia da ilustração"
              className={`w-full object-contain transition ${partial ? "blur-sm" : "blur-0"}`}
            />
          </figure>
        )}

        <div className="flex flex-wrap gap-2">
          {busy ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <Square className="size-4" /> Parar
            </Button>
          ) : (
            <Button variant="hero" onClick={generate} disabled={saving}>
              {preview ? <RotateCw className="size-4" /> : <Sparkles className="size-4" />}
              {preview ? "Gerar outra" : "Gerar ilustração"}
            </Button>
          )}
          <Button variant="secondary" disabled={!preview || partial || busy || saving} onClick={() => use("cover")}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Usar como capa
          </Button>
          <Button variant="outline" disabled={!preview || partial || busy || saving} onClick={() => use("gallery")}>
            Adicionar à galeria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
