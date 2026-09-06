import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Loader2, Upload, Trash2, Download, Folder, FolderPlus, Search, Pencil, Star, Eye,
  Share2, MoreVertical, FileText, FileVideo, FileImage, File as FileIcon, ArrowLeft, Link2, FolderInput, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Folder = { id: string; name: string; sort_order: number; created_at: string };
type Asset = {
  id: string;
  nome: string;
  original_name: string | null;
  pasta: string;
  folder_id: string | null;
  tipo: string;
  file_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  tags: string[];
  is_favorite: boolean;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  rede_visivel: boolean;
  rede_publico: string;
  rede_account_id: string | null;
  copy_texto: string | null;
};

type Unidade = { id: string; nome: string };

const PUBLICOS = [
  { id: "todos", label: "Todos da Rede" },
  { id: "licenciados", label: "Licenciados" },
  { id: "revendedores", label: "Revendedores" },
  { id: "polo", label: "Polo específico" },
];

type UploadItem = { name: string; size: number; progress: number; status: "aguardando" | "enviando" | "ok" | "erro"; error?: string };

const ACCEPT = ".jpg,.jpeg,.png,.webp,.svg,.mp4,.mov,.pdf,.doc,.docx,.xls,.xlsx";
const TIPOS = [
  { id: "todos", label: "Todos os tipos" },
  { id: "imagem", label: "Imagens" },
  { id: "video", label: "Vídeos" },
  { id: "documento", label: "Documentos" },
  { id: "pdf", label: "PDFs" },
  { id: "favoritos", label: "⭐ Favoritos" },
];

function humanSize(n?: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function guessTipo(mime: string, name: string) {
  const n = name.toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|svg|gif)$/.test(n)) return "imagem";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|avi)$/.test(n)) return "video";
  if (n.endsWith(".pdf") || /\.(docx?|xlsx?|pptx?|txt|csv)$/.test(n)) return "documento";
  return "outro";
}
function TipoIcon({ tipo, className = "size-7" }: { tipo: string; className?: string }) {
  if (tipo === "imagem") return <FileImage className={className} />;
  if (tipo === "video") return <FileVideo className={className} />;
  if (tipo === "documento") return <FileText className={className} />;
  return <FileIcon className={className} />;
}

export default function MarketingArquivos() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [openFolder, setOpenFolder] = useState<Folder | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPasta, setFiltroPasta] = useState("todas");
  const [filtroAutor, setFiltroAutor] = useState("todos");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDest, setUploadDest] = useState<string>("");
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [folderDialog, setFolderDialog] = useState<{ id?: string; name: string } | null>(null);
  const [confirmFolder, setConfirmFolder] = useState<Folder | null>(null);
  const [confirmAsset, setConfirmAsset] = useState<Asset | null>(null);
  const [renameAsset, setRenameAsset] = useState<Asset | null>(null);
  const [moveAsset, setMoveAsset] = useState<Asset | null>(null);
  const [moveDest, setMoveDest] = useState<string>("");
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [redeAsset, setRedeAsset] = useState<Asset | null>(null);
  const [viewer, setViewer] = useState<Asset | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: a }, { data: u }] = await Promise.all([
      supabase.from("mkt_folders").select("*").order("sort_order").order("name"),
      supabase.from("mkt_assets").select("*").order("created_at", { ascending: false }),
      supabase.from("contas_comerciais").select("id,nome").neq("tipo_da_conta", "matriz").order("nome"),
    ]);
    setUnidades((u ?? []) as Unidade[]);
    const rows = ((a ?? []) as any[]).map((r) => ({ ...r, tags: r.tags ?? [] })) as Asset[];
    setFolders((f ?? []) as Folder[]);
    setAssets(rows);
    setLoading(false);

    const ids = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,display_name,username").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.display_name || p.username || "—"; });
      setPeople(map);
    }
    const media = rows.filter((r) => r.file_path && r.tipo === "imagem").slice(0, 120);
    if (media.length) {
      const { data: signed } = await supabase.storage
        .from("marketing-files")
        .createSignedUrls(media.map((m) => m.file_path as string), 3600);
      const map: Record<string, string> = {};
      signed?.forEach((s, i) => { if (s.signedUrl) map[media[i].id] = s.signedUrl; });
      setPreviews((prev) => ({ ...prev, ...map }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const countByFolder = useMemo(() => {
    const m: Record<string, number> = {};
    assets.forEach((a) => { if (a.folder_id) m[a.folder_id] = (m[a.folder_id] ?? 0) + 1; });
    return m;
  }, [assets]);

  const autores = useMemo(() => {
    const ids = Array.from(new Set(assets.map((a) => a.created_by).filter(Boolean))) as string[];
    return ids.map((id) => ({ id, nome: people[id] ?? "—" }));
  }, [assets, people]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return assets.filter((a) => {
      if (openFolder && a.folder_id !== openFolder.id) return false;
      if (!openFolder && filtroPasta !== "todas" && a.folder_id !== filtroPasta) return false;
      if (filtroTipo === "favoritos" && !a.is_favorite) return false;
      if (filtroTipo === "pdf" && !(a.mime === "application/pdf" || a.nome.toLowerCase().endsWith(".pdf"))) return false;
      if (["imagem", "video", "documento"].includes(filtroTipo) && a.tipo !== filtroTipo) return false;
      if (filtroAutor !== "todos" && a.created_by !== filtroAutor) return false;
      if (!q) return true;
      return a.nome.toLowerCase().includes(q)
        || (a.original_name ?? "").toLowerCase().includes(q)
        || (a.tags ?? []).join(" ").toLowerCase().includes(q);
    });
  }, [assets, openFolder, filtroPasta, filtroTipo, filtroAutor, busca]);

  const recentes = useMemo(() => assets.slice(0, 6), [assets]);

  /* ---------- pastas ---------- */
  async function saveFolder() {
    if (!folderDialog?.name.trim()) return toast.error("Informe o nome da pasta");
    const { data: u } = await supabase.auth.getUser();
    const payload = { name: folderDialog.name.trim() };
    const { error } = folderDialog.id
      ? await supabase.from("mkt_folders").update(payload).eq("id", folderDialog.id)
      : await supabase.from("mkt_folders").insert({ ...payload, created_by: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success(folderDialog.id ? "Pasta renomeada" : "Pasta criada");
    setFolderDialog(null);
    load();
  }

  async function deleteFolder(f: Folder) {
    const { error } = await supabase.from("mkt_folders").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    setConfirmFolder(null);
    if (openFolder?.id === f.id) setOpenFolder(null);
    toast.success("Pasta excluída (arquivos mantidos em “sem pasta”)");
    load();
  }

  /* ---------- upload ---------- */
  function openUpload() {
    setUploadDest(openFolder?.id ?? folders[0]?.id ?? "");
    setQueue([]);
    setUploadOpen(true);
  }

  async function doUpload(files: File[]) {
    if (!files.length) return;
    if (!uploadDest) return toast.error("Escolha a pasta de destino");
    const dest = folders.find((f) => f.id === uploadDest);
    setUploading(true);
    setQueue(files.map((f) => ({ name: f.name, size: f.size, progress: 0, status: "aguardando" as const })));
    const { data: u } = await supabase.auth.getUser();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setQueue((q) => q.map((it, idx) => idx === i ? { ...it, status: "enviando", progress: 15 } : it));
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${(dest?.name ?? "Outros").replace(/[^\w-]+/g, "_")}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("marketing-files")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) {
        setQueue((q) => q.map((it, idx) => idx === i ? { ...it, status: "erro", progress: 100, error: upErr.message } : it));
        continue;
      }
      setQueue((q) => q.map((it, idx) => idx === i ? { ...it, progress: 80 } : it));
      const { error } = await supabase.from("mkt_assets").insert({
        nome: file.name,
        original_name: file.name,
        pasta: dest?.name ?? "Outros",
        folder_id: dest?.id ?? null,
        tipo: guessTipo(file.type || "", file.name),
        file_path: path,
        mime: file.type || null,
        size_bytes: file.size,
        created_by: u.user?.id ?? null,
      });
      setQueue((q) => q.map((it, idx) => idx === i
        ? { ...it, status: error ? "erro" : "ok", progress: 100, error: error?.message }
        : it));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Upload concluído");
    load();
  }

  /* ---------- ações de arquivo ---------- */
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

  async function copiarLink(a: Asset) {
    const url = await signed(a);
    if (!url) return toast.error("Não foi possível gerar o link");
    await navigator.clipboard.writeText(url);
    toast.success("Link temporário copiado (válido por 10 min)");
  }

  async function abrirViewer(a: Asset) {
    setViewer(a);
    setViewerUrl(previews[a.id] ?? "");
    const url = await signed(a);
    setViewerUrl(url);
  }

  async function toggleFav(a: Asset) {
    const next = !a.is_favorite;
    setAssets((prev) => prev.map((x) => x.id === a.id ? { ...x, is_favorite: next } : x));
    const { error } = await supabase.from("mkt_assets").update({ is_favorite: next }).eq("id", a.id);
    if (error) { toast.error(error.message); load(); }
  }

  async function excluir(a: Asset) {
    if (a.file_path) await supabase.storage.from("marketing-files").remove([a.file_path]);
    const { error } = await supabase.from("mkt_assets").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setConfirmAsset(null);
    if (viewer?.id === a.id) setViewer(null);
    toast.success("Arquivo excluído");
    load();
  }

  async function salvarRename() {
    if (!renameAsset?.nome.trim()) return toast.error("Informe um nome");
    const { error } = await supabase.from("mkt_assets").update({ nome: renameAsset.nome.trim() }).eq("id", renameAsset.id);
    if (error) return toast.error(error.message);
    setRenameAsset(null);
    toast.success("Arquivo renomeado");
    load();
  }

  async function salvarRede() {
    if (!redeAsset) return;
    if (redeAsset.rede_visivel && redeAsset.rede_publico === "polo" && !redeAsset.rede_account_id)
      return toast.error("Escolha o polo específico");
    const { error } = await supabase.from("mkt_assets").update({
      rede_visivel: redeAsset.rede_visivel,
      rede_publico: redeAsset.rede_publico,
      rede_account_id: redeAsset.rede_publico === "polo" ? redeAsset.rede_account_id : null,
      copy_texto: redeAsset.copy_texto?.trim() || null,
    }).eq("id", redeAsset.id);
    if (error) return toast.error(error.message);
    setRedeAsset(null);
    toast.success("Visibilidade da Rede atualizada");
    load();
  }

  async function salvarMove() {
    if (!moveAsset || !moveDest) return;
    const dest = folders.find((f) => f.id === moveDest);
    const { error } = await supabase.from("mkt_assets")
      .update({ folder_id: moveDest, pasta: dest?.name ?? "Outros" })
      .eq("id", moveAsset.id);
    if (error) return toast.error(error.message);
    setMoveAsset(null);
    toast.success(`Movido para ${dest?.name}`);
    load();
  }

  /* ---------- UI ---------- */
  const FileCard = (a: Asset) => (
    <Card key={a.id} className="group overflow-hidden border-border hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => abrirViewer(a)}
        className="relative block w-full aspect-square bg-secondary/40 overflow-hidden"
      >
        {previews[a.id] ? (
          <img src={previews[a.id]} alt={a.nome} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-foreground">
            <TipoIcon tipo={a.tipo} className="size-8" />
          </span>
        )}
        <span className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
          <span className="flex flex-wrap justify-center gap-1 px-2">
            <span onClick={(e) => { e.stopPropagation(); abrirViewer(a); }} className="rounded-md bg-background/90 p-1.5" title="Visualizar"><Eye className="size-4" /></span>
            <span onClick={(e) => { e.stopPropagation(); baixar(a); }} className="rounded-md bg-background/90 p-1.5" title="Baixar"><Download className="size-4" /></span>
            <span onClick={(e) => { e.stopPropagation(); setMoveAsset(a); setMoveDest(a.folder_id ?? ""); }} className="rounded-md bg-background/90 p-1.5" title="Mover"><FolderInput className="size-4" /></span>
            <span onClick={(e) => { e.stopPropagation(); setRedeAsset({ ...a }); }} className="rounded-md bg-background/90 p-1.5" title="Visibilidade na Rede"><Share2 className="size-4" /></span>
            <span onClick={(e) => { e.stopPropagation(); setRenameAsset({ ...a }); }} className="rounded-md bg-background/90 p-1.5" title="Renomear"><Pencil className="size-4" /></span>
            <span onClick={(e) => { e.stopPropagation(); setConfirmAsset(a); }} className="rounded-md bg-background/90 p-1.5 text-destructive" title="Excluir"><Trash2 className="size-4" /></span>
          </span>
        </span>
      </button>
      <div className="p-2.5 space-y-1">
        <div className="flex items-start gap-1">
          <p className="text-xs font-medium truncate flex-1" title={a.nome}>{a.nome}</p>
          <button type="button" onClick={() => toggleFav(a)} title="Favorito">
            <Star className={`size-3.5 ${a.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{a.pasta}</Badge>
          {a.rede_visivel && <Badge className="text-[10px]">Rede</Badge>}
          <span className="text-[10px] text-muted-foreground">{humanSize(a.size_bytes)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {fmtDate(a.created_at)} · {a.created_by ? (people[a.created_by] ?? "—") : "—"}
        </p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Biblioteca de Arquivos</h2>
          <p className="text-sm text-muted-foreground">Organize todos os criativos e materiais da Multplick em um só lugar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFolderDialog({ name: "" })}><FolderPlus className="size-4" /> Nova pasta</Button>
          <Button onClick={openUpload}><Upload className="size-4" /> Enviar arquivo</Button>
        </div>
      </div>

      {/* Busca + filtros */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Pesquisar arquivos..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{TIPOS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        {!openFolder && (
          <Select value={filtroPasta} onValueChange={setFiltroPasta}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as pastas</SelectItem>
              {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filtroAutor} onValueChange={setFiltroAutor}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Enviado por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Enviado por: todos</SelectItem>
            {autores.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin size-6 text-muted-foreground" /></div>
      ) : openFolder ? (
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenFolder(null)}><ArrowLeft className="size-4" /> Pastas</Button>
            <h3 className="font-semibold text-primary flex items-center gap-2"><Folder className="size-4" /> {openFolder.name}</h3>
            <span className="text-xs text-muted-foreground">{filtrados.length} arquivo(s)</span>
          </div>
          {filtrados.length === 0
            ? <Card className="p-12 text-center text-sm text-muted-foreground">Pasta vazia. Envie arquivos para começar.</Card>
            : <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">{filtrados.map(FileCard)}</div>}
        </>
      ) : (
        <>
          {/* Recentes */}
          {recentes.length > 0 && !busca && filtroTipo === "todos" && filtroPasta === "todas" && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Arquivos recentes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">{recentes.map(FileCard)}</div>
            </div>
          )}

          {/* Pastas */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Pastas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {folders.map((f) => (
                <Card key={f.id} className="p-3 flex items-center gap-3 hover:border-primary/50 hover:shadow-sm transition cursor-pointer"
                  onClick={() => setOpenFolder(f)}>
                  <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0"><Folder className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={f.name}>{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">{countByFolder[f.id] ?? 0} arquivo(s)</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="size-7"><MoreVertical className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setOpenFolder(f)}>Abrir</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFolderDialog({ id: f.id, name: f.name })}>Renomear</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setConfirmFolder(f)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Card>
              ))}
            </div>
          </div>

          {/* Galeria geral */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {busca || filtroTipo !== "todos" || filtroPasta !== "todas" || filtroAutor !== "todos" ? "Resultados" : "Todos os arquivos"}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{filtrados.length}</span>
            </h3>
            {filtrados.length === 0
              ? <Card className="p-12 text-center text-sm text-muted-foreground">Nenhum arquivo encontrado.</Card>
              : <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">{filtrados.map(FileCard)}</div>}
          </div>
        </>
      )}

      {/* Dialog upload */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading) setUploadOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enviar arquivos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Pasta de destino</Label>
              <Select value={uploadDest} onValueChange={setUploadDest}>
                <SelectTrigger><SelectValue placeholder="Escolha a pasta" /></SelectTrigger>
                <SelectContent>{folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); doUpload(Array.from(e.dataTransfer.files)); }}
              onClick={() => fileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <Upload className="mx-auto mb-2 size-6 text-primary" />
              <p className="text-sm font-medium">Arraste e solte aqui ou clique para selecionar</p>
              <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, WEBP, SVG, MP4, MOV, PDF, DOC, XLS</p>
              <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
                onChange={(e) => doUpload(Array.from(e.target.files ?? []))} />
            </div>
            {queue.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {queue.map((q, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      {q.status === "ok" ? <CheckCircle2 className="size-3.5 text-emerald-500" />
                        : q.status === "erro" ? <XCircle className="size-3.5 text-destructive" />
                        : <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                      <span className="truncate flex-1">{q.name}</span>
                      <span className="text-muted-foreground">{humanSize(q.size)}</span>
                    </div>
                    <Progress value={q.progress} className="h-1.5" />
                    {q.error && <p className="text-[10px] text-destructive">{q.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={uploading} onClick={() => setUploadOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pasta */}
      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{folderDialog?.id ? "Renomear pasta" : "Nova pasta"}</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Nome da pasta" value={folderDialog?.name ?? ""}
            onChange={(e) => setFolderDialog((s) => s ? { ...s, name: e.target.value } : s)}
            onKeyDown={(e) => e.key === "Enter" && saveFolder()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(null)}>Cancelar</Button>
            <Button onClick={saveFolder}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renomear arquivo */}
      <Dialog open={!!renameAsset} onOpenChange={(o) => !o && setRenameAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renomear arquivo</DialogTitle></DialogHeader>
          <Input autoFocus value={renameAsset?.nome ?? ""}
            onChange={(e) => setRenameAsset((s) => s ? { ...s, nome: e.target.value } : s)}
            onKeyDown={(e) => e.key === "Enter" && salvarRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameAsset(null)}>Cancelar</Button>
            <Button onClick={salvarRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visibilidade na Rede */}
      <Dialog open={!!redeAsset} onOpenChange={(o) => !o && setRedeAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Disponibilizar para a Rede Multplick</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Disponível para a Rede</p>
                <p className="text-xs text-muted-foreground">Quando desligado, o material fica interno da Matriz.</p>
              </div>
              <Switch checked={!!redeAsset?.rede_visivel}
                onCheckedChange={(v) => setRedeAsset((s) => s ? { ...s, rede_visivel: v } : s)} />
            </div>
            {redeAsset?.rede_visivel && (
              <>
                <div className="space-y-1.5">
                  <Label>Público</Label>
                  <Select value={redeAsset.rede_publico}
                    onValueChange={(v) => setRedeAsset((s) => s ? { ...s, rede_publico: v } : s)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PUBLICOS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {redeAsset.rede_publico === "polo" && (
                  <div className="space-y-1.5">
                    <Label>Polo</Label>
                    <Select value={redeAsset.rede_account_id ?? ""}
                      onValueChange={(v) => setRedeAsset((s) => s ? { ...s, rede_account_id: v } : s)}>
                      <SelectTrigger><SelectValue placeholder="Escolha a unidade" /></SelectTrigger>
                      <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Copy / texto sugerido (opcional)</Label>
                  <Textarea rows={4} value={redeAsset.copy_texto ?? ""}
                    onChange={(e) => setRedeAsset((s) => s ? { ...s, copy_texto: e.target.value } : s)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeAsset(null)}>Cancelar</Button>
            <Button onClick={salvarRede}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover arquivo */}
      <Dialog open={!!moveAsset} onOpenChange={(o) => !o && setMoveAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mover arquivo</DialogTitle></DialogHeader>
          <Select value={moveDest} onValueChange={setMoveDest}>
            <SelectTrigger><SelectValue placeholder="Escolha a pasta" /></SelectTrigger>
            <SelectContent>{folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveAsset(null)}>Cancelar</Button>
            <Button onClick={salvarMove}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualizador */}
      <Dialog open={!!viewer} onOpenChange={(o) => { if (!o) { setViewer(null); setViewerUrl(""); } }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle className="truncate pr-8">{viewer?.nome}</DialogTitle></DialogHeader>
          {viewer && (
            <div className="grid md:grid-cols-[1fr_260px] gap-4">
              <div className="bg-secondary/40 rounded-lg min-h-[320px] max-h-[65vh] grid place-items-center overflow-hidden">
                {!viewerUrl ? <Loader2 className="animate-spin size-6 text-muted-foreground" />
                  : viewer.tipo === "imagem" ? <img src={viewerUrl} alt={viewer.nome} className="max-h-[65vh] w-full object-contain" />
                  : viewer.tipo === "video" ? <video src={viewerUrl} controls className="max-h-[65vh] w-full" />
                  : <iframe src={viewerUrl} title={viewer.nome} className="w-full h-[65vh] rounded-lg bg-background" />}
              </div>
              <div className="space-y-3 text-sm">
                <div><p className="text-[11px] text-muted-foreground">Nome</p><p className="font-medium break-words">{viewer.nome}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Tipo</p><p>{(viewer.nome.split(".").pop() ?? viewer.tipo).toUpperCase()}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Tamanho</p><p>{humanSize(viewer.size_bytes)}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Data de envio</p><p>{fmtDate(viewer.created_at)}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Enviado por</p><p>{viewer.created_by ? (people[viewer.created_by] ?? "—") : "—"}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Pasta</p><p>{viewer.pasta}</p></div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => baixar(viewer)}><Download className="size-4" /> Baixar</Button>
                  <Button size="sm" variant="outline" onClick={() => copiarLink(viewer)}><Link2 className="size-4" /> Copiar link</Button>
                  <Button size="sm" variant="outline" onClick={() => { setMoveAsset(viewer); setMoveDest(viewer.folder_id ?? ""); }}><FolderInput className="size-4" /> Mover</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmAsset(viewer)}><Trash2 className="size-4" /> Excluir</Button>
                  <Button size="sm" variant="ghost" className="col-span-2" onClick={() => toggleFav(viewer)}>
                    <Star className={`size-4 ${viewer.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
                    {viewer.is_favorite ? "Remover dos favoritos" : "Marcar como favorito"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmações */}
      <AlertDialog open={!!confirmFolder} onOpenChange={(o) => !o && setConfirmFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta “{confirmFolder?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Os arquivos não serão apagados — eles ficarão sem pasta e você poderá movê-los depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmFolder && deleteFolder(confirmFolder)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmAsset} onOpenChange={(o) => !o && setConfirmAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{confirmAsset?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAsset && excluir(confirmAsset)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
