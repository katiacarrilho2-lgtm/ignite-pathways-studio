import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Copy, RefreshCw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { ImageDropZone } from "@/components/admin/ImageDropZone";

type StorageItem = { name: string; id?: string | null; updated_at?: string; created_at?: string; metadata?: { size?: number } | null };

const BUCKET = "course-images";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.]+/g, "-").replace(/(^-|-$)/g, "");

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const AdminImagensInner = () => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: 1000, sortBy: { column: "created_at", order: "desc" },
    });
    if (error) toast.error(error.message);
    else setItems((data ?? []).filter((f) => f.name && !f.name.startsWith(".")));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File, replacePath?: string) => {
    setUploading(true);
    try {
      const path = replacePath ?? `${Date.now()}-${slugify(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: !!replacePath, cacheControl: "3600" });
      if (error) throw error;
      toast.success(replacePath ? "Imagem substituída" : "Imagem enviada");
      setReplaceTarget(null);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    for (const f of Array.from(files)) await handleUpload(f);
  };

  const remove = async (name: string) => {
    if (!confirm(`Excluir "${name}"? Cursos que usam esta imagem ficarão sem foto.`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) toast.error(error.message);
    else { toast.success("Imagem excluída"); load(); }
  };

  const copyUrl = async (name: string) => {
    await navigator.clipboard.writeText(publicUrl(name));
    toast.success("URL copiada");
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">Imagens</h1>
          <p className="text-muted-foreground">Envie, substitua ou exclua imagens usadas nos cursos.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tamanho recomendado: <strong>800 × 600 pixels</strong> (proporção 4:3), formato JPG ou PNG, até 2 MB.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <ImageDropZone multiple onFiles={(files) => files.forEach((f) => handleUpload(f))}>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
              <Upload className="size-4" /> {uploading ? "Enviando..." : "Enviar imagens"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
                onChange={(e) => { onPickFiles(e.target.files); e.currentTarget.value = ""; }} />
            </label>
          </ImageDropZone>
        </div>
      </div>

      <Input placeholder="Buscar por nome..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          <ImageIcon className="size-10 mx-auto mb-3 opacity-50" />
          {loading ? "Carregando..." : "Nenhuma imagem encontrada. Envie a primeira acima."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((it) => {
            const url = publicUrl(it.name);
            return (
              <div key={it.name} className="group bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted overflow-hidden">
                  <img src={url} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <p className="text-xs font-medium truncate" title={it.name}>{it.name}</p>
                  {it.metadata?.size != null && (
                    <p className="text-[11px] text-muted-foreground">{(it.metadata.size / 1024).toFixed(1)} KB</p>
                  )}
                  <div className="flex items-center gap-1 mt-auto pt-2">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => copyUrl(it.name)} title="Copiar URL">
                      <Copy className="size-3.5" />
                    </Button>
                    <label className="flex-1 inline-flex items-center justify-center cursor-pointer text-sm px-2 py-1.5 rounded-md hover:bg-secondary" title="Substituir">
                      <Upload className="size-3.5" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, it.name); e.currentTarget.value = ""; }} />
                    </label>
                    <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive" onClick={() => remove(it.name)} title="Excluir">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminImagens = () => (
  <RequirePermission perm="manage_courses"><AdminImagensInner /></RequirePermission>
);
export default AdminImagens;