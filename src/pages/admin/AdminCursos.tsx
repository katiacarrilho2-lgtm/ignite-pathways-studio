import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, Star, Layers, Sparkles, Download, Search, X } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ImageDropZone } from "@/components/admin/ImageDropZone";
import { exportCourseJson } from "@/lib/courseExport";
import { uploadCourseImage } from "@/lib/courseMedia";

type Course = {
  id: string; slug: string; title: string; category: string; duration: string | null;
  price_cents: number | null; description: string | null; long_description: string | null;
  image_url: string | null; external_url: string | null; coursebox_embed_url: string | null;
  featured: boolean; active: boolean; published: boolean; sort_order: number;
  categoria_id: string | null;
  has_teacher_manual: boolean;
  teacher_manual_image_url: string | null;
};

const empty: Partial<Course> = { title: "", category: "Cursos Técnicos", duration: "", description: "", featured: false, active: true, sort_order: 100 };

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminCursosInner = () => {
  const { isMaster } = useAuth();
  const [list, setList] = useState<Course[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Course>>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("courses").select("*").order("sort_order");
    if (error) return toast.error(error.message);
    setList((data ?? []) as Course[]);
  };
  const loadCategories = async () => {
    const { data } = await supabase.from("course_categories").select("id,name").eq("active", true).order("sort_order");
    setCategories((data ?? []) as any);
  };
  useEffect(() => { load(); loadCategories(); }, []);

  const filtered = search.trim()
    ? list.filter(c => {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q) ||
          (c.duration ?? "").toLowerCase().includes(q) ||
          (c.slug ?? "").toLowerCase().includes(q)
        );
      })
    : list;

  const openNew = () => { setEditing(empty); setFile(null); setManualFile(null); setOpen(true); };
  const openEdit = (c: Course) => { setEditing(c); setFile(null); setManualFile(null); setOpen(true); };

  const save = async () => {
    if (!editing.title || !editing.categoria_id) return toast.error("Título e categoria são obrigatórios");
    setSaving(true);
    let image_url = editing.image_url ?? null;
    let teacher_manual_image_url = editing.teacher_manual_image_url ?? null;
    try {
      if (file) {
        image_url = await uploadCourseImage(file, "course-covers");
      }
      if (manualFile) {
        teacher_manual_image_url = await uploadCourseImage(manualFile, "teacher-manuals");
      }
      const catName = categories.find(c => c.id === editing.categoria_id)?.name ?? editing.category ?? "";
      const payload: any = {
        title: editing.title, category: catName, categoria_id: editing.categoria_id, duration: editing.duration,
        price_cents: editing.price_cents ?? null, description: editing.description, long_description: editing.long_description,
        image_url, external_url: editing.external_url,
        coursebox_embed_url: editing.coursebox_embed_url || null,
        featured: !!editing.featured, active: editing.active !== false,
        sort_order: editing.sort_order ?? 100,
        slug: editing.slug || slugify(editing.title!),
        has_teacher_manual: !!editing.has_teacher_manual,
        teacher_manual_image_url: editing.has_teacher_manual ? teacher_manual_image_url : null,
      };
      const { error } = editing.id
        ? await supabase.from("courses").update(payload).eq("id", editing.id)
        : await supabase.from("courses").insert(payload);
      if (error) throw error;
      toast.success("Curso salvo!");
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (c: Course) => {
    if (!confirm(`Excluir "${c.title}"?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary">Cursos</h1><p className="text-muted-foreground">Gerencie todo o catálogo do site</p></div>
        {isMaster && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearch(""); }}
              title="Pesquisar curso"
            >
              <Search className="size-4" /> Pesquisar
            </Button>
            <Button asChild variant="outline"><Link to="/admin/cursos/ia"><Sparkles className="size-4" /> Novo com IA</Link></Button>
            <Button onClick={openNew} variant="hero"><Plus className="size-4" /> Novo curso</Button>
          </div>
        )}
      </div>
      {searchOpen && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título, categoria, duração…"
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      {!isMaster && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-lg p-3">
          Modo somente leitura — apenas o usuário Master (001) pode criar, editar ou excluir cursos.
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr><th className="text-left p-3">Imagem</th><th className="text-left p-3">Título</th><th className="text-left p-3">Categoria</th><th className="text-left p-3">Duração</th><th className="text-left p-3">Publicação</th><th className="text-left p-3">Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">{c.image_url ? <img src={c.image_url} alt="" className="size-12 rounded object-cover" /> : <div className="size-12 rounded bg-muted" />}</td>
                <td className="p-3 font-medium text-primary flex items-center gap-2">{c.title}{c.featured && <Star className="size-3 fill-yellow-500 text-yellow-500" />}</td>
                <td className="p-3 text-muted-foreground">{c.category}</td>
                <td className="p-3 text-muted-foreground">{c.duration}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${c.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{c.published ? "Publicado" : "Rascunho"}</span></td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${c.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{c.active ? "Ativo" : "Inativo"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button asChild size="sm" variant="ghost" title="Conteúdo do curso"><Link to={`/admin/cursos/${c.id}/conteudo`}><Layers className="size-4" /></Link></Button>
                  <Button size="sm" variant="ghost" title="Exportar JSON" onClick={() => exportCourseJson(c.id).catch((e:any) => toast.error(e.message))}><Download className="size-4" /></Button>
                  {isMaster && <>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c)} className="text-destructive"><Trash2 className="size-4" /></Button>
                  </>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                {search ? `Nenhum curso encontrado para "${search}".` : "Nenhum curso ainda."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Editar curso" : "Novo curso"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Título *</Label><Input value={editing.title ?? ""} onChange={e=>setEditing({...editing, title: e.target.value})} /></div>
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={editing.categoria_id ?? ""}
                  onValueChange={(v) => {
                    const cat = categories.find(c => c.id === v);
                    setEditing({ ...editing, categoria_id: v, category: cat?.name ?? editing.category });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Gerencie as opções em <a href="/admin/categorias" className="underline">Categorias</a>.</p>
              </div>
              <div><Label>Duração</Label><Input value={editing.duration ?? ""} onChange={e=>setEditing({...editing, duration: e.target.value})} placeholder="Ex: 90 dias, 200h" /></div>
              <div>
                <Label>Preço (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="pl-10"
                    placeholder="0,00"
                    value={
                      editing.price_cents != null
                        ? (editing.price_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : ""
                    }
                    onChange={(e) => {
                      // mantém só dígitos; cada 2 dígitos finais = centavos
                      const digits = e.target.value.replace(/\D/g, "");
                      setEditing({ ...editing, price_cents: digits ? Number(digits) : null });
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Digite só números. Ex: 19990 = R$ 199,90. Deixe vazio para curso gratuito.</p>
              </div>
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order ?? 100} onChange={e=>setEditing({...editing, sort_order: Number(e.target.value)})} /></div>
            </div>
            <div><Label>Descrição curta</Label><Textarea rows={2} value={editing.description ?? ""} onChange={e=>setEditing({...editing, description: e.target.value})} /></div>
            <div><Label>Descrição completa</Label><Textarea rows={4} value={editing.long_description ?? ""} onChange={e=>setEditing({...editing, long_description: e.target.value})} /></div>

            <div><Label>Link externo (catálogo / matrícula)</Label><Input value={editing.external_url ?? ""} onChange={e=>setEditing({...editing, external_url: e.target.value})} placeholder="https://..." /></div>
            <div>
              <Label>Link do curso na Coursebox (embed)</Label>
              <Input value={editing.coursebox_embed_url ?? ""} onChange={e=>setEditing({...editing, coursebox_embed_url: e.target.value})} placeholder="https://my.coursebox.ai/..." />
              <p className="text-xs text-muted-foreground mt-1">Cole o link público do curso na Coursebox. O conteúdo será aberto dentro da área do aluno.</p>
            </div>
            <div>
              <Label>Imagem</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Tamanho recomendado: <strong>800 × 600 pixels</strong> (proporção 4:3), formato JPG ou PNG, até 2 MB. A imagem aparece nos cards de curso em todo o site.
              </p>
              <ImageDropZone className="mt-2" onFiles={(files) => setFile(files[0])}>
                <div className="flex items-center gap-3">
                  {editing.image_url && !file && <img src={editing.image_url} alt="" className="size-16 rounded object-cover" />}
                  {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
                  <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary">
                    <Upload className="size-4" /> {editing.image_url || file ? "Trocar imagem" : "Enviar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </ImageDropZone>
            </div>
            <div className="rounded-lg border border-border p-4">
              <Label className="mb-3 block text-base font-semibold">📘 Material do Professor</Label>
              <label className="flex items-center gap-3">
                <Switch
                  checked={!!editing.has_teacher_manual}
                  onCheckedChange={(v) => setEditing({ ...editing, has_teacher_manual: v })}
                />
                <span className="text-sm font-medium">Ativar Manual do Professor</span>
              </label>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2"><Switch checked={!!editing.featured} onCheckedChange={v=>setEditing({...editing, featured: v})} /> <span className="text-sm">Em destaque</span></label>
              <label className="flex items-center gap-2"><Switch checked={editing.active !== false} onCheckedChange={v=>setEditing({...editing, active: v})} /> <span className="text-sm">Ativo no site</span></label>
            </div>

            <Button onClick={save} variant="hero" className="w-full" disabled={saving}>{saving?"Salvando...":"Salvar curso"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminCursos = () => <RequirePermission perm="manage_courses"><AdminCursosInner /></RequirePermission>;
export default AdminCursos;
