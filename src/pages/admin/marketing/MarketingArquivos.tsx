import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Trash2, Download, FolderOpen, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

type Asset = {
  id: string;
  nome: string;
  pasta: string;
  tipo: string;
  file_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  tags: string[];
  campaign_id: string | null;
  observacoes: string | null;
  created_at: string;
};

const PASTAS = ["Geral", "Campanhas", "Logos", "Vídeos", "Posts", "Anúncios", "Documentos"];
const TIPOS = ["imagem", "video", "documento", "outro"];

function humanSize(n?: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function guessTipo(mime: string) {
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("application/") || mime.startsWith("text/")) return "documento";
  return "outro";
}

export default function MarketingArquivos() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pasta, setPasta] = useState("Geral");
  const [filtroPasta, setFiltroPasta] = useState("todas");
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mkt_assets")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as Asset[];
    setAssets(rows);
    const imgs = rows.filter((a) => a.file_path && a.tipo === "imagem").slice(0, 60);
    if (imgs.length) {
      const { data: signed } = await supabase.storage
        .from("marketing-files")
        .createSignedUrls(imgs.map((a) => a.file_path as string), 3600);
      const map: Record<string, string> = {};
      signed?.forEach((s, i) => { if (s.signedUrl) map[imgs[i].id] = s.signedUrl; });
      setPreviews(map);
    }
  }

  useEffect(() => { load(); }, []);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("marketing-files").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
      const { error } = await supabase.from("mkt_assets").insert({
        nome: file.name,
        pasta,
        tipo: guessTipo(file.type || ""),
        file_path: path,
        mime: file.type || null,
        size_bytes: file.size,
        created_by: userData.user?.id ?? null,
      });
      if (error) toast.error(error.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Upload concluído");
    load();
  }

  async function baixar(a: Asset) {
    if (!a.file_path) { if (a.url) window.open(a.url, "_blank"); return; }
    const { data, error } = await supabase.storage
      .from("marketing-files")
      .createSignedUrl(a.file_path, 300, { download: a.nome });
    if (error || !data) { toast.error("Não foi possível gerar o link"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function excluir(a: Asset) {
    if (!confirm(`Excluir "${a.nome}"?`)) return;
    if (a.file_path) await supabase.storage.from("marketing-files").remove([a.file_path]);
    const { error } = await supabase.from("mkt_assets").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Arquivo excluído");
    load();
  }

  async function salvarEdicao() {
    if (!edit) return;
    const { error } = await supabase
      .from("mkt_assets")
      .update({
        nome: edit.nome,
        pasta: edit.pasta,
        tipo: edit.tipo,
        tags: edit.tags,
        observacoes: edit.observacoes,
      })
      .eq("id", edit.id);
    if (error) { toast.error(error.message); return; }
    setEdit(null);
    toast.success("Arquivo atualizado");
    load();
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return assets.filter((a) => {
      if (filtroPasta !== "todas" && a.pasta !== filtroPasta) return false;
      if (!q) return true;
      return (
        a.nome.toLowerCase().includes(q) ||
        (a.tags ?? []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [assets, filtroPasta, busca]);

  const pastasExistentes = useMemo(
    () => Array.from(new Set([...PASTAS, ...assets.map((a) => a.pasta)])),
    [assets],
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label className="text-xs">Pasta de destino</Label>
          <Select value={pasta} onValueChange={setPasta}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{pastasExistentes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin size-4" /> : <Upload className="size-4" />}
          Enviar arquivos
        </Button>
        <div className="ml-auto flex items-end gap-2">
          <div className="w-40">
            <Label className="text-xs">Filtrar pasta</Label>
            <Select value={filtroPasta} onValueChange={setFiltroPasta}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as pastas</SelectItem>
                {pastasExistentes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome ou tag" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin size-6 text-muted-foreground" /></div>
      ) : filtrados.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          <FolderOpen className="mx-auto mb-2 size-8" />
          Nenhum arquivo por aqui. Envie seus criativos, logos e vídeos.
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {filtrados.map((a) => (
            <Card key={a.id} className="overflow-hidden group">
              <div className="aspect-square bg-secondary/40 grid place-items-center overflow-hidden">
                {previews[a.id] ? (
                  <img src={previews[a.id]} alt={a.nome} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xs uppercase text-muted-foreground">{a.tipo}</span>
                )}
              </div>
              <div className="p-2.5 space-y-1.5">
                <p className="text-xs font-medium truncate" title={a.nome}>{a.nome}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{a.pasta}</Badge>
                  <span className="text-[10px] text-muted-foreground">{humanSize(a.size_bytes)}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => baixar(a)}><Download className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEdit(a)}><Pencil className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => excluir(a)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar arquivo</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pasta</Label>
                  <Select value={edit.pasta} onValueChange={(v) => setEdit({ ...edit, pasta: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{pastasExistentes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={edit.tipo} onValueChange={(v) => setEdit({ ...edit, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Tags (separadas por vírgula)</Label>
                <Input
                  value={(edit.tags ?? []).join(", ")}
                  onChange={(e) => setEdit({ ...edit, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea rows={3} value={edit.observacoes ?? ""} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
