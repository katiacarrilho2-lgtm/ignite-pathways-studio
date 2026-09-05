import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Search, Download, Eye, Copy, FileText, FileVideo, FileImage, File as FileIcon,
} from "lucide-react";
import { toast } from "sonner";

type Asset = {
  id: string;
  nome: string;
  pasta: string;
  folder_id: string | null;
  tipo: string;
  file_path: string | null;
  url: string | null;
  size_bytes: number | null;
  copy_texto: string | null;
  created_at: string;
};

const TIPOS = [
  { id: "todos", label: "Todos os tipos" },
  { id: "imagem", label: "Imagens" },
  { id: "video", label: "Vídeos" },
  { id: "documento", label: "Documentos" },
];

function humanSize(n?: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function TipoIcon({ tipo, className = "size-7" }: { tipo: string; className?: string }) {
  if (tipo === "imagem") return <FileImage className={className} />;
  if (tipo === "video") return <FileVideo className={className} />;
  if (tipo === "documento") return <FileText className={className} />;
  return <FileIcon className={className} />;
}

export default function PoloCriativos() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPasta, setFiltroPasta] = useState("todas");
  const [viewer, setViewer] = useState<Asset | null>(null);
  const [viewerUrl, setViewerUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mkt_assets")
      .select("id,nome,pasta,folder_id,tipo,file_path,url,size_bytes,copy_texto,created_at")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Asset[];
    setAssets(rows);
    setLoading(false);

    const media = rows.filter((r) => r.file_path && r.tipo === "imagem").slice(0, 120);
    if (media.length) {
      const { data: signed } = await supabase.storage
        .from("marketing-files")
        .createSignedUrls(media.map((m) => m.file_path as string), 3600);
      const map: Record<string, string> = {};
      signed?.forEach((s, i) => { if (s.signedUrl) map[media[i].id] = s.signedUrl; });
      setPreviews(map);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pastas = useMemo(
    () => Array.from(new Set(assets.map((a) => a.pasta).filter(Boolean))),
    [assets],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return assets.filter((a) => {
      if (filtroPasta !== "todas" && a.pasta !== filtroPasta) return false;
      if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
      if (!q) return true;
      return a.nome.toLowerCase().includes(q) || (a.copy_texto ?? "").toLowerCase().includes(q);
    });
  }, [assets, busca, filtroTipo, filtroPasta]);

  async function signed(a: Asset, download = false) {
    if (!a.file_path) return a.url ?? "";
    const { data } = await supabase.storage
      .from("marketing-files")
      .createSignedUrl(a.file_path, 600, download ? { download: a.nome } : undefined);
    return data?.signedUrl ?? "";
  }

  async function baixar(a: Asset) {
    const url = await signed(a, true);
    if (!url) return toast.error("Não foi possível gerar o link");
    window.open(url, "_blank");
  }

  async function abrir(a: Asset) {
    setViewer(a);
    setViewerUrl(previews[a.id] ?? "");
    setViewerUrl(await signed(a));
  }

  async function copiarCopy(a: Asset) {
    if (!a.copy_texto) return;
    await navigator.clipboard.writeText(a.copy_texto);
    toast.success("Texto copiado");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Criativos da Rede</h1>
        <p className="text-sm text-muted-foreground">
          Materiais liberados pela Multplick para a sua unidade. Visualize, baixe e use nas suas campanhas.
        </p>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Pesquisar criativos..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{TIPOS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroPasta} onValueChange={setFiltroPasta}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {pastas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin size-6 text-muted-foreground" /></div>
      ) : filtrados.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Nenhum criativo liberado para a sua unidade no momento.
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {filtrados.map((a) => (
            <Card key={a.id} className="group overflow-hidden border-border hover:shadow-md transition-shadow">
              <button type="button" onClick={() => abrir(a)} className="relative block w-full aspect-square bg-secondary/40 overflow-hidden">
                {previews[a.id] ? (
                  <img src={previews[a.id]} alt={a.nome} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-muted-foreground">
                    <TipoIcon tipo={a.tipo} className="size-8" />
                  </span>
                )}
                <span className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                  <span className="flex gap-1">
                    <span onClick={(e) => { e.stopPropagation(); abrir(a); }} className="rounded-md bg-background/90 p-1.5" title="Visualizar"><Eye className="size-4" /></span>
                    <span onClick={(e) => { e.stopPropagation(); baixar(a); }} className="rounded-md bg-background/90 p-1.5" title="Baixar"><Download className="size-4" /></span>
                    {a.copy_texto && (
                      <span onClick={(e) => { e.stopPropagation(); copiarCopy(a); }} className="rounded-md bg-background/90 p-1.5" title="Copiar texto"><Copy className="size-4" /></span>
                    )}
                  </span>
                </span>
              </button>
              <div className="p-2.5 space-y-1">
                <p className="text-xs font-medium truncate" title={a.nome}>{a.nome}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{a.pasta}</Badge>
                  <span className="text-[10px] text-muted-foreground">{humanSize(a.size_bytes)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => { if (!o) { setViewer(null); setViewerUrl(""); } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle className="truncate pr-8">{viewer?.nome}</DialogTitle></DialogHeader>
          {viewer && (
            <div className="space-y-3">
              <div className="bg-secondary/40 rounded-lg min-h-[300px] max-h-[60vh] grid place-items-center overflow-hidden">
                {!viewerUrl ? <Loader2 className="animate-spin size-6 text-muted-foreground" />
                  : viewer.tipo === "imagem" ? <img src={viewerUrl} alt={viewer.nome} className="max-h-[60vh] w-full object-contain" />
                  : viewer.tipo === "video" ? <video src={viewerUrl} controls className="max-h-[60vh] w-full" />
                  : <iframe src={viewerUrl} title={viewer.nome} className="w-full h-[60vh] rounded-lg bg-background" />}
              </div>
              {viewer.copy_texto && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Copy sugerida</p>
                  <p className="text-sm whitespace-pre-wrap">{viewer.copy_texto}</p>
                  <Button size="sm" variant="outline" onClick={() => copiarCopy(viewer)}><Copy className="size-4" /> Copiar texto</Button>
                </div>
              )}
              <Button onClick={() => baixar(viewer)}><Download className="size-4" /> Baixar arquivo</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
