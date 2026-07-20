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
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);

  useEffect(() => { if (open) setQuery(initialQuery ?? ""); }, [open, initialQuery]);

  const extractVideoId = (raw: string): string | null => {
    const s = raw.trim();
    if (!s) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      const host = u.hostname.replace(/^www\./, "");
      if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
      if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        const v = u.searchParams.get("v");
        if (v) return v;
        const parts = u.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex((p) => ["shorts", "embed", "live", "v"].includes(p));
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      }
    } catch { /* noop */ }
    return null;
  };

  const useLink = async () => {
    const id = extractVideoId(pasteUrl);
    if (!id) return toast.error("Link do YouTube inválido");
    setPasteBusy(true);
    try {
      const normalizedUrl = `https://www.youtube.com/watch?v=${id}`;
      let v: YoutubeVideo = {
        videoId: id,
        title: "Vídeo do YouTube",
        channel: "",
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        url: normalizedUrl,
      };

      try {
        const oembed = await fetch(
          `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(normalizedUrl)}`,
        );
        if (oembed.ok) {
          const meta = await oembed.json();
          v = {
            ...v,
            title: meta?.title || v.title,
            channel: meta?.author_name || v.channel,
            thumbnail: meta?.thumbnail_url || v.thumbnail,
          };
        }
      } catch { /* salva mesmo sem metadados */ }

      onPick(v, pasteUrl);
      setPasteUrl("");
      toast.success("Vídeo adicionado à aula");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao usar o link");
    } finally { setPasteBusy(false); }
  };

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
      const msg = e?.message ?? "Falha na busca do YouTube";
      if (msg.includes("non-2xx") || msg.includes("YOUTUBE_API_KEY")) {
        toast.error("A busca automática precisa de chave do YouTube. Use a opção de colar link acima.");
      } else {
        toast.error(msg);
      }
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
        <div className="border border-border rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Colar link do YouTube</div>
          <div className="flex gap-2">
            <Input
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
              onKeyDown={(e) => e.key === "Enter" && useLink()}
            />
            <Button onClick={useLink} disabled={pasteBusy || !pasteUrl.trim()} variant="secondary">
              {pasteBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Usar link
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Aceita youtube.com/watch, youtu.be e youtube.com/shorts. Basta colar o link e clicar em Usar link.
          </p>
        </div>
        <div className="text-xs text-muted-foreground text-center">— ou buscar por termo —</div>
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