import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, Trash2 } from "lucide-react";

export type YoutubeVideo = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  duration_seconds?: number;
};

function fmtDur(s?: number) {
  if (!s) return "";
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export const YoutubePickerDialog = ({
  open, onOpenChange, initialQuery, current, onPick, onClear,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialQuery?: string;
  current?: YoutubeVideo | null;
  onPick: (v: YoutubeVideo, query: string) => void;
  onClear?: () => void;
}) => {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<YoutubeVideo[]>([]);

  useEffect(() => { if (open) setQuery(initialQuery ?? ""); }, [open, initialQuery]);

  const run = async () => {
    if (!query.trim()) return toast.error("Digite um termo de busca");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-search", {
        body: { query, maxResults: 12 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list: YoutubeVideo[] = (data as any)?.results ?? [];
      setResults(list);
      if (list.length === 0) toast.info("Nenhum vídeo válido encontrado (mín. 3 min, embutível, público).");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na busca do YouTube");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar vídeo no YouTube</DialogTitle>
        </DialogHeader>
        {current?.videoId && (
          <div className="border border-border rounded-lg p-3 bg-secondary/30 flex items-center gap-3">
            <img src={current.thumbnail} alt="" className="w-32 aspect-video object-cover rounded" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Vídeo atual</div>
              <div className="font-medium truncate">{current.title}</div>
              <div className="text-xs text-muted-foreground truncate">{current.channel}</div>
            </div>
            <a href={current.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs inline-flex items-center gap-1">
              <ExternalLink className="size-3" /> Abrir
            </a>
            {onClear && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onClear(); }}>
                <Trash2 className="size-3.5" /> Remover
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ex.: "instalação de ar-condicionado split"'
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <Button onClick={run} disabled={busy} variant="hero">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Apenas vídeos reais do YouTube (mín. 3 min, embutíveis, em PT-BR quando possível, sem Shorts).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((v) => (
            <button
              key={v.videoId}
              onClick={() => onPick(v, query)}
              className="text-left border border-border rounded-lg overflow-hidden hover:border-primary hover:bg-secondary/30 transition"
            >
              <div className="relative aspect-video bg-black">
                <img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                {v.duration_seconds ? (
                  <span className="absolute bottom-1 right-1 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded">
                    {fmtDur(v.duration_seconds)}
                  </span>
                ) : null}
              </div>
              <div className="p-2">
                <div className="text-sm font-medium line-clamp-2">{v.title}</div>
                <div className="text-xs text-muted-foreground truncate">{v.channel}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};