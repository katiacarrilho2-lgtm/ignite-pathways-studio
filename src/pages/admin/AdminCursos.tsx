import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Upload, Star, Layers, Sparkles, Download, Search, X } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ImageDropZone } from "@/components/admin/ImageDropZone";
import { exportCourseJson } from "@/lib/courseExport";
import { uploadCourseImage } from "@/lib/courseMedia";
import {
  DEFAULT_EXAM_CONFIG, ExamConfig, TIPO_LABEL, TEXTO_PADRAO_CERTIFICADO, TipoCertificacao,
  centsFromInput, centsToInput, formatBRL, precoVigenteCents, validarCursoLivre,
} from "@/lib/cursoLivre";

type Course = {
  id: string; slug: string; title: string; category: string; duration: string | null;
  price_cents: number | null; description: string | null; long_description: string | null;
  image_url: string | null; external_url: string | null; coursebox_embed_url: string | null;
  featured: boolean; active: boolean; published: boolean; sort_order: number;
  categoria_id: string | null;
  has_teacher_manual: boolean;
  teacher_manual_image_url: string | null;
  tipo_curso: string | null;
  venda_livre: boolean;
  exige_avaliacao: boolean;
  emite_certificado_automatico: boolean;
  carga_horaria_horas: number | null;
  preco_promocional_cents: number | null;
  promocao_ativa: boolean;
  promocao_inicio: string | null;
  promocao_fim: string | null;
  certificado_texto_modo: string | null;
  certificado_texto_custom: string | null;
};

const empty: Partial<Course> = {
  title: "", category: "Cursos Técnicos", duration: "", description: "", featured: false, active: true, sort_order: 100,
  tipo_curso: "curso_livre", venda_livre: false, exige_avaliacao: false, emite_certificado_automatico: false,
  promocao_ativa: false, certificado_texto_modo: "padrao",
};

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Filtro = "todos" | "livres" | "cert_ativa" | "cert_inativa";

const AdminCursosInner = () => {
  const { isMaster } = useAuth();
  const [list, setList] = useState<Course[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Course>>(empty);
  const [exam, setExam] = useState<ExamConfig>(DEFAULT_EXAM_CONFIG);
  const [file, setFile] = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

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

  const filtered = list.filter(c => {
    if (filtro === "livres" && !c.venda_livre) return false;
    if (filtro === "cert_ativa" && !c.emite_certificado_automatico) return false;
    if (filtro === "cert_inativa" && c.emite_certificado_automatico) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.category ?? "").toLowerCase().includes(q) ||
      (c.duration ?? "").toLowerCase().includes(q) ||
      (c.slug ?? "").toLowerCase().includes(q)
    );
  });

  const openNew = () => { setEditing(empty); setExam(DEFAULT_EXAM_CONFIG); setFile(null); setManualFile(null); setOpen(true); };
  const openEdit = async (c: Course) => {
    setEditing(c); setFile(null); setManualFile(null); setExam(DEFAULT_EXAM_CONFIG); setOpen(true);
    const { data } = await supabase.from("exam_configs").select("*").eq("course_id", c.id).maybeSingle();
    if (data) setExam({ ...DEFAULT_EXAM_CONFIG, ...(data as any) });
  };

  const save = async () => {
    if (!editing.title || !editing.categoria_id) return toast.error("Título e categoria são obrigatórios");
    if (editing.venda_livre) {
      const erro = validarCursoLivre(editing, exam);
      if (erro) return toast.error(erro);
    }
    setSaving(true);
    let image_url = editing.image_url ?? null;
    let teacher_manual_image_url = editing.teacher_manual_image_url ?? null;
    try {
      if (file) image_url = await uploadCourseImage(file, "course-covers");
      if (manualFile) teacher_manual_image_url = await uploadCourseImage(manualFile, "teacher-manuals");
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
        // curso livre / certificação automática
        tipo_curso: editing.tipo_curso ?? "curso_livre",
        venda_livre: !!editing.venda_livre,
        exige_avaliacao: !!editing.exige_avaliacao,
        emite_certificado_automatico: !!editing.emite_certificado_automatico,
        carga_horaria_horas: editing.carga_horaria_horas ?? null,
        preco_promocional_cents: editing.preco_promocional_cents ?? null,
        promocao_ativa: !!editing.promocao_ativa,
        promocao_inicio: editing.promocao_inicio || null,
        promocao_fim: editing.promocao_fim || null,
        certificado_texto_modo: editing.certificado_texto_modo ?? "padrao",
        certificado_texto_custom: editing.certificado_texto_modo === "personalizado" ? (editing.certificado_texto_custom ?? null) : null,
      };
      let courseId = editing.id;
      if (courseId) {
        const { error } = await supabase.from("courses").update(payload).eq("id", courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("courses").insert(payload).select("id").single();
        if (error) throw error;
        courseId = data!.id;
      }

      if (editing.venda_livre && courseId) {
        const cfg: any = {
          course_id: courseId,
          tipo: editing.tipo_curso ?? "curso_livre",
          ativo: !!editing.exige_avaliacao,
          nota_minima: exam.nota_minima,
          qtd_questoes: exam.qtd_questoes,
          tempo_minutos: exam.tempo_minutos,
          tentativas_permitidas: exam.tentativas_permitidas,
          intervalo_nova_tentativa_horas: exam.intervalo_nova_tentativa_horas,
          embaralhar_questoes: exam.embaralhar_questoes,
          embaralhar_alternativas: exam.embaralhar_alternativas,
          mostrar_respostas: exam.mostrar_respostas,
          libera_certificado: !!editing.emite_certificado_automatico,
        };
        const { error: e2 } = await supabase.from("exam_configs").upsert(cfg, { onConflict: "course_id" });
        if (e2) throw e2;
      }
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

  const tipoAtual = (editing.tipo_curso ?? "curso_livre") as TipoCertificacao;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary">Cursos</h1><p className="text-muted-foreground">Gerencie todo o catálogo do site</p></div>
        {isMaster && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearch(""); }} title="Pesquisar curso">
              <Search className="size-4" /> Pesquisar
            </Button>
            <Button asChild variant="outline" title="Ver a vitrine de cursos livres antes da publicação">
              <a href="/certifique-sua-experiencia?preview=1" target="_blank" rel="noreferrer"><Eye className="size-4" /> Pré-visualizar vitrine</a>
            </Button>
            <Button asChild variant="outline"><Link to="/admin/cursos/ia"><Sparkles className="size-4" /> Novo com IA</Link></Button>
            <Button onClick={openNew} variant="hero"><Plus className="size-4" /> Novo curso</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          ["todos", "Todos"],
          ["livres", "Cursos livres"],
          ["cert_ativa", "Certificação automática ativa"],
          ["cert_inativa", "Certificação automática inativa"],
        ] as [Filtro, string][]).map(([v, label]) => (
          <Button key={v} size="sm" variant={filtro === v ? "default" : "outline"} onClick={() => setFiltro(v)}>{label}</Button>
        ))}
      </div>

      {searchOpen && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por título, categoria, duração…" className="pl-9 pr-9" />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
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

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Imagem</th><th className="text-left p-3">Título</th>
              <th className="text-left p-3">Categoria</th><th className="text-left p-3">Curso livre</th>
              <th className="text-left p-3">Preço</th><th className="text-left p-3">Publicação</th>
              <th className="text-left p-3">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">{c.image_url ? <img src={c.image_url} alt="" className="size-12 rounded object-cover" /> : <div className="size-12 rounded bg-muted" />}</td>
                <td className="p-3 font-medium text-primary"><span className="flex items-center gap-2">{c.title}{c.featured && <Star className="size-3 fill-yellow-500 text-yellow-500" />}</span></td>
                <td className="p-3 text-muted-foreground">{c.category}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {c.venda_livre ? (
                    <div className="space-y-0.5">
                      <div className="font-medium text-foreground">{TIPO_LABEL[c.tipo_curso ?? "curso_livre"]}</div>
                      <div>Avaliação: {c.exige_avaliacao ? "Sim" : "Não"}</div>
                      <div>Certificado automático: {c.emite_certificado_automatico ? "Sim" : "Não"}</div>
                    </div>
                  ) : <span className="opacity-60">—</span>}
                </td>
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {c.venda_livre ? formatBRL(precoVigenteCents(c)) : formatBRL(c.price_cents)}
                </td>
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
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                {search ? `Nenhum curso encontrado para "${search}".` : "Nenhum curso nesta seleção."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Editar curso" : "Novo curso"}</DialogTitle></DialogHeader>

          <Tabs defaultValue="dados">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="dados">Dados do curso</TabsTrigger>
              <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
              <TabsTrigger value="venda">Venda / Preço</TabsTrigger>
              <TabsTrigger value="avaliacao">Avaliação</TabsTrigger>
              <TabsTrigger value="certificacao">Certificação</TabsTrigger>
            </TabsList>

            {/* DADOS DO CURSO */}
            <TabsContent value="dados" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Título comercial *</Label><Input value={editing.title ?? ""} onChange={e=>setEditing({...editing, title: e.target.value})} /></div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={editing.categoria_id ?? ""} onValueChange={(v) => {
                    const cat = categories.find(c => c.id === v);
                    setEditing({ ...editing, categoria_id: v, category: cat?.name ?? editing.category });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Gerencie as opções em <a href="/admin/categorias" className="underline">Categorias</a>.</p>
                </div>
                <div><Label>Duração</Label><Input value={editing.duration ?? ""} onChange={e=>setEditing({...editing, duration: e.target.value})} placeholder="Ex: 90 dias, 200h" /></div>
                <div>
                  <Label>Carga horária do curso (horas)</Label>
                  <Input type="number" min={0} value={editing.carga_horaria_horas ?? ""} onChange={e=>setEditing({...editing, carga_horaria_horas: e.target.value ? Number(e.target.value) : null})} placeholder="Ex: 40" />
                  <p className="text-xs text-muted-foreground mt-1">Opcional. Não informe carga horária quando o produto for apenas uma Avaliação de Conhecimentos.</p>
                </div>
                <div><Label>Ordem</Label><Input type="number" value={editing.sort_order ?? 100} onChange={e=>setEditing({...editing, sort_order: Number(e.target.value)})} /></div>
              </div>
              <div><Label>Descrição curta</Label><Textarea rows={2} value={editing.description ?? ""} onChange={e=>setEditing({...editing, description: e.target.value})} /></div>
              <div><Label>Descrição completa</Label><Textarea rows={4} value={editing.long_description ?? ""} onChange={e=>setEditing({...editing, long_description: e.target.value})} /></div>
              <div>
                <Label>Imagem / capa</Label>
                <p className="text-xs text-muted-foreground mt-1">Tamanho recomendado: <strong>800 × 600 pixels</strong>, JPG ou PNG, até 2 MB.</p>
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
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2"><Switch checked={!!editing.featured} onCheckedChange={v=>setEditing({...editing, featured: v})} /> <span className="text-sm">Em destaque</span></label>
                <label className="flex items-center gap-2"><Switch checked={editing.active !== false} onCheckedChange={v=>setEditing({...editing, active: v})} /> <span className="text-sm">Ativo no site</span></label>
              </div>
            </TabsContent>

            {/* CONTEÚDO */}
            <TabsContent value="conteudo" className="space-y-4 pt-4">
              <div><Label>Link externo (catálogo / matrícula)</Label><Input value={editing.external_url ?? ""} onChange={e=>setEditing({...editing, external_url: e.target.value})} placeholder="https://..." /></div>
              <div>
                <Label>Link do curso na Coursebox (embed)</Label>
                <Input value={editing.coursebox_embed_url ?? ""} onChange={e=>setEditing({...editing, coursebox_embed_url: e.target.value})} placeholder="https://my.coursebox.ai/..." />
                <p className="text-xs text-muted-foreground mt-1">Cole o link público do curso na Coursebox. O conteúdo será aberto dentro da área do aluno.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <Label className="mb-3 block text-base font-semibold">📘 Material do Professor</Label>
                <label className="flex items-center gap-3">
                  <Switch checked={!!editing.has_teacher_manual} onCheckedChange={(v) => setEditing({ ...editing, has_teacher_manual: v })} />
                  <span className="text-sm font-medium">Ativar Manual do Professor</span>
                </label>
              </div>
              {editing.id && (
                <Button asChild variant="outline"><Link to={`/admin/cursos/${editing.id}/conteudo`}><Layers className="size-4" /> Editar módulos e aulas</Link></Button>
              )}
            </TabsContent>

            {/* VENDA / PREÇO */}
            <TabsContent value="venda" className="space-y-4 pt-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-base font-semibold">CURSO LIVRE / CERTIFICAÇÃO AUTOMÁTICA</Label>
                <label className="flex items-center gap-3">
                  <Switch checked={!!editing.venda_livre} onCheckedChange={v=>setEditing({...editing, venda_livre: v})} />
                  <span className="text-sm font-medium">Venda automática de curso livre {editing.venda_livre ? "— ATIVADO" : "— DESATIVADO"}</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Ativação exclusivamente manual. Cursos Técnicos, EJA, Graduação, Pós e Especializações seguem o fluxo comercial próprio e não devem ser ativados aqui.
                </p>
                {editing.venda_livre && (
                  <div>
                    <Label>Tipo de certificação *</Label>
                    <Select value={editing.tipo_curso ?? "curso_livre"} onValueChange={v=>setEditing({...editing, tipo_curso: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="curso_livre">Curso Livre</SelectItem>
                        <SelectItem value="avaliacao_conhecimentos">Avaliação de Conhecimentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço normal (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input className="pl-10" inputMode="decimal" placeholder="0,00" value={centsToInput(editing.price_cents)}
                      onChange={(e)=>setEditing({...editing, price_cents: centsFromInput(e.target.value)})} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Digite só números. Ex: 5990 = R$ 59,90.</p>
                </div>
                <div>
                  <Label>Preço promocional (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input className="pl-10" inputMode="decimal" placeholder="0,00" value={centsToInput(editing.preco_promocional_cents)}
                      onChange={(e)=>setEditing({...editing, preco_promocional_cents: centsFromInput(e.target.value)})} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-3">
                    <Switch checked={!!editing.promocao_ativa} onCheckedChange={v=>setEditing({...editing, promocao_ativa: v})} />
                    <span className="text-sm">Promoção ativa</span>
                  </label>
                </div>
                <div><Label>Data inicial</Label><Input type="date" value={editing.promocao_inicio ?? ""} onChange={e=>setEditing({...editing, promocao_inicio: e.target.value || null})} /></div>
                <div><Label>Data final</Label><Input type="date" value={editing.promocao_fim ?? ""} onChange={e=>setEditing({...editing, promocao_fim: e.target.value || null})} /></div>
              </div>
              <div className="text-sm rounded-md bg-secondary/50 p-3">
                Preço exibido hoje: <strong>{formatBRL(precoVigenteCents(editing as any))}</strong>
                <span className="text-muted-foreground"> — terminado o período, volta automaticamente ao preço normal.</span>
              </div>
            </TabsContent>

            {/* AVALIAÇÃO */}
            <TabsContent value="avaliacao" className="space-y-4 pt-4">
              <Label className="text-base font-semibold">CONFIGURAÇÕES DA AVALIAÇÃO</Label>
              <label className="flex items-center gap-3">
                <Switch checked={!!editing.exige_avaliacao} onCheckedChange={v=>setEditing({...editing, exige_avaliacao: v})} />
                <span className="text-sm">Exige avaliação?</span>
              </label>
              {!editing.venda_livre && <p className="text-xs text-muted-foreground">Ative a venda automática de curso livre para que estas regras sejam salvas.</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade de questões</Label><Input type="number" min={1} value={exam.qtd_questoes} onChange={e=>setExam({...exam, qtd_questoes: Number(e.target.value)})} /></div>
                <div><Label>Nota mínima (0–100)</Label><Input type="number" min={1} max={100} value={exam.nota_minima} onChange={e=>setExam({...exam, nota_minima: Number(e.target.value)})} /></div>
                <div><Label>Máximo de tentativas</Label><Input type="number" min={1} value={exam.tentativas_permitidas} onChange={e=>setExam({...exam, tentativas_permitidas: Number(e.target.value)})} /></div>
                <div><Label>Tempo máximo (minutos)</Label><Input type="number" min={0} placeholder="Sem limite" value={exam.tempo_minutos ?? ""} onChange={e=>setExam({...exam, tempo_minutos: e.target.value ? Number(e.target.value) : null})} /></div>
                <div><Label>Intervalo para nova tentativa (horas)</Label><Input type="number" min={0} placeholder="Sem intervalo" value={exam.intervalo_nova_tentativa_horas ?? ""} onChange={e=>setExam({...exam, intervalo_nova_tentativa_horas: e.target.value ? Number(e.target.value) : null})} /></div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-3"><Switch checked={exam.embaralhar_questoes} onCheckedChange={v=>setExam({...exam, embaralhar_questoes: v})} /><span className="text-sm">Randomizar questões</span></label>
                <label className="flex items-center gap-3"><Switch checked={exam.embaralhar_alternativas} onCheckedChange={v=>setExam({...exam, embaralhar_alternativas: v})} /><span className="text-sm">Randomizar alternativas</span></label>
                <label className="flex items-center gap-3"><Switch checked={exam.mostrar_respostas} onCheckedChange={v=>setExam({...exam, mostrar_respostas: v})} /><span className="text-sm">Mostrar respostas corretas após a conclusão</span></label>
              </div>
            </TabsContent>

            {/* CERTIFICAÇÃO */}
            <TabsContent value="certificacao" className="space-y-4 pt-4">
              <label className="flex items-center gap-3">
                <Switch checked={!!editing.emite_certificado_automatico} onCheckedChange={v=>setEditing({...editing, emite_certificado_automatico: v})} />
                <span className="text-sm">Emitir certificado automaticamente após aprovação</span>
              </label>
              {editing.emite_certificado_automatico && editing.exige_avaliacao && (
                <p className="text-xs text-muted-foreground">O certificado só poderá ser emitido após a aprovação na avaliação.</p>
              )}

              <div className="space-y-3">
                <Label className="text-base font-semibold">TEXTO DO CERTIFICADO</Label>
                <Select value={editing.certificado_texto_modo ?? "padrao"} onValueChange={v=>setEditing({...editing, certificado_texto_modo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Usar texto padrão</SelectItem>
                    <SelectItem value="personalizado">Usar texto personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {(editing.certificado_texto_modo ?? "padrao") === "padrao" ? (
                  <div className="text-sm rounded-md bg-secondary/50 p-3 text-muted-foreground">{TEXTO_PADRAO_CERTIFICADO[tipoAtual] ?? TEXTO_PADRAO_CERTIFICADO.curso_livre}</div>
                ) : (
                  <Textarea rows={4} value={editing.certificado_texto_custom ?? ""} onChange={e=>setEditing({...editing, certificado_texto_custom: e.target.value})} placeholder="Use [NOME DO ALUNO] e [NOME DO CURSO]." />
                )}
              </div>

              <div className="text-xs text-muted-foreground rounded-md border border-border p-3">
                Dados institucionais (empresa, CNPJ, responsável, cargo e assinatura) ficam centralizados nas configurações do certificado — não precisam ser repetidos em cada curso.
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={save} variant="hero" className="w-full" disabled={saving}>{saving ? "Salvando..." : "Salvar curso"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminCursos = () => <RequirePermission perm="manage_courses"><AdminCursosInner /></RequirePermission>;
export default AdminCursos;
