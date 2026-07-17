import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Video, Upload, Link2, ArrowUp, ArrowDown, ExternalLink, Loader2, Smartphone, GraduationCap, CalendarClock, Copy, Sparkles, UserPlus, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Training = {
  id: string; title: string; slug: string; description: string | null;
  category: string; audience: string; cover_url: string | null; status: string;
  meet_url: string | null; meet_scheduled_at: string | null; position: number;
};
type Lesson = {
  id: string; training_id: string; title: string; description: string | null;
  video_url: string | null; video_kind: string; duration_seconds: number | null;
  attachments: any[]; position: number;
};

type Meeting = {
  id: string; training_id: string | null; title: string; description: string | null;
  meet_url: string; starts_at: string; duration_minutes: number; audience: string;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `t-${Date.now()}`;

const AdminTreinamentos = () => {
  const [list, setList] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Training | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openLessons, setOpenLessons] = useState<Training | null>(null);
  const [openAi, setOpenAi] = useState(false);
  const [openInvite, setOpenInvite] = useState<Training | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("trainings").select("*").order("position").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setList((data ?? []) as Training[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (t: Training) => {
    if (!confirm(`Excluir treinamento "${t.title}"?`)) return;
    const { error } = await supabase.from("trainings").delete().eq("id", t.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Excluído" }); load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2"><GraduationCap /> Centro de Treinamentos</h1>
          <p className="text-sm text-muted-foreground">Treinamentos internos para vendedores e afiliados. Adicione vídeos, links do Meet e materiais.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenAi(true)}>
            <Sparkles className="size-4" /> Gerar com IA
          </Button>
          <Button variant="hero" onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="size-4" /> Novo treinamento
          </Button>
        </div>
      </div>

    <MeetingsManager trainings={list} />

      {loading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : list.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          Nenhum treinamento ainda. Clique em <b>Novo treinamento</b> para começar.
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(t => (
            <Card key={t.id} className="overflow-hidden">
              {t.cover_url && <img src={t.cover_url} alt={t.title} className="h-32 w-full object-cover" />}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <Badge variant={t.status === "publicado" ? "default" : "secondary"}>{t.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-secondary">{t.audience}</span>
                  <span className="px-1.5 py-0.5 rounded bg-secondary">{t.category}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                {t.meet_url && (
                  <a href={t.meet_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                    <ExternalLink className="size-3" /> Sala do Meet
                  </a>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenLessons(t)}><Video className="size-3.5" /> Aulas</Button>
                  <Button size="sm" variant="outline" onClick={() => setOpenInvite(t)}><UserPlus className="size-3.5" /> Convidar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setOpenForm(true); }}><Pencil className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(t)}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TrainingForm
        open={openForm}
        onOpenChange={setOpenForm}
        initial={editing}
        onSaved={load}
      />
      {openLessons && (
        <LessonsDialog
          training={openLessons}
          onClose={() => setOpenLessons(null)}
        />
      )}
      <AiTrainingDialog open={openAi} onOpenChange={setOpenAi} onCreated={load} />
      {openInvite && (
        <InviteUsersDialog training={openInvite} onClose={() => setOpenInvite(null)} />
      )}
    </div>
  );
};

const MeetingsManager = ({ trainings }: { trainings: Training[] }) => {
  const [list, setList] = useState<Meeting[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Meeting> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("training_meetings").select("*").order("starts_at", { ascending: true });
    setList((data ?? []) as Meeting[]);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing({ title: "", meet_url: "", starts_at: "", duration_minutes: 60, audience: "all", training_id: null, description: "" }); setOpen(true); };
  const startEdit = (m: Meeting) => { setEditing({ ...m, starts_at: m.starts_at?.slice(0, 16) }); setOpen(true); };

  const save = async () => {
    if (!editing?.title || !editing?.meet_url || !editing?.starts_at) {
      toast({ title: "Preencha título, link e data/hora", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload: any = {
      title: editing.title, meet_url: editing.meet_url,
      starts_at: new Date(editing.starts_at).toISOString(),
      duration_minutes: editing.duration_minutes || 60,
      audience: editing.audience || "all",
      training_id: editing.training_id || null,
      description: editing.description || null,
    };
    const { error } = (editing as any).id
      ? await (supabase as any).from("training_meetings").update(payload).eq("id", (editing as any).id)
      : await (supabase as any).from("training_meetings").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" }); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta reunião?")) return;
    await (supabase as any).from("training_meetings").delete().eq("id", id);
    load();
  };

  const now = new Date();
  const upcoming = list.filter(m => new Date(m.starts_at) >= now);
  const past = list.filter(m => new Date(m.starts_at) < now).slice(-5).reverse();

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="size-5 text-primary" /> Agenda de encontros ao vivo</CardTitle>
        <Button size="sm" variant="hero" onClick={startNew}><Plus className="size-4" /> Nova reunião</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && past.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma reunião agendada. Crie uma para divulgar aos vendedores/afiliados.</p>
        )}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Próximas</p>
            {upcoming.map(m => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    📅 {new Date(m.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {m.duration_minutes}min · {m.audience}
                    {m.training_id && (() => { const t = trainings.find(x => x.id === m.training_id); return t ? <> · {t.title}</> : null; })()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" asChild><a href={m.meet_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Abrir</a></Button>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(m.meet_url); toast({ title: "Link copiado" }); }}><Copy className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(m)}><Pencil className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Recentes</p>
            {past.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground px-3 py-1.5">
                <span>· {m.title} — {new Date(m.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                <Button size="sm" variant="ghost" className="h-6 text-destructive" onClick={() => remove(m.id)}><Trash2 className="size-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{(editing as any)?.id ? "Editar reunião" : "Nova reunião"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={editing.title || ""} onChange={e => setEditing(s => ({ ...s!, title: e.target.value }))} placeholder="Ex: Treinamento NR10 — Sessão 1" /></div>
              <div><Label>Link do Google Meet</Label><Input value={editing.meet_url || ""} onChange={e => setEditing(s => ({ ...s!, meet_url: e.target.value }))} placeholder="https://meet.google.com/xxx-xxxx-xxx" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data e hora</Label><Input type="datetime-local" value={editing.starts_at || ""} onChange={e => setEditing(s => ({ ...s!, starts_at: e.target.value }))} /></div>
                <div><Label>Duração (min)</Label><Input type="number" value={editing.duration_minutes || 60} onChange={e => setEditing(s => ({ ...s!, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Público</Label>
                  <Select value={editing.audience || "all"} onValueChange={(v) => setEditing(s => ({ ...s!, audience: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="vendedor">Vendedores</SelectItem>
                      <SelectItem value="afiliado">Afiliados</SelectItem>
                      <SelectItem value="aluno">Alunos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Treinamento (opcional)</Label>
                  <Select value={editing.training_id || "none"} onValueChange={(v) => setEditing(s => ({ ...s!, training_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição / pauta</Label><Textarea rows={3} value={editing.description || ""} onChange={e => setEditing(s => ({ ...s!, description: e.target.value }))} /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button variant="hero" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const TrainingForm = ({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: Training | null; onSaved: () => void;
}) => {
  const [form, setForm] = useState<Partial<Training>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ?? { title: "", slug: "", description: "", category: "geral", audience: "ambos", status: "rascunho", cover_url: "", meet_url: "", meet_scheduled_at: null });
  }, [initial, open]);

  const save = async () => {
    if (!form.title?.trim()) return toast({ title: "Informe o título", variant: "destructive" });
    setSaving(true);
    const slug = (form.slug?.trim() || slugify(form.title));
    const payload: any = {
      title: form.title.trim(),
      slug,
      description: form.description ?? null,
      category: form.category ?? "geral",
      audience: form.audience ?? "ambos",
      status: form.status ?? "rascunho",
      cover_url: form.cover_url || null,
      meet_url: form.meet_url || null,
      meet_scheduled_at: form.meet_scheduled_at || null,
    };
    const q = initial
      ? supabase.from("trainings").update(payload).eq("id", initial.id)
      : supabase.from("trainings").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: initial ? "Atualizado" : "Criado" });
    onOpenChange(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} treinamento</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Label>Título *</Label>
            <Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Slug</Label>
              <Input value={form.slug ?? ""} onChange={e => setForm({ ...form, slug: slugify(e.target.value) })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category ?? "geral"} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["geral", "onboarding", "vendas", "produto", "pos-venda", "tecnico"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Público</Label>
              <Select value={form.audience ?? "ambos"} onValueChange={v => setForm({ ...form, audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Vendedores e Afiliados</SelectItem>
                  <SelectItem value="vendedor">Apenas Vendedores</SelectItem>
                  <SelectItem value="afiliado">Apenas Afiliados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "rascunho"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>URL da capa</Label>
            <Input value={form.cover_url ?? ""} onChange={e => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Link do Google Meet</Label>
              <Input value={form.meet_url ?? ""} onChange={e => setForm({ ...form, meet_url: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
            <div>
              <Label>Data/hora do encontro</Label>
              <Input type="datetime-local" value={form.meet_scheduled_at ? form.meet_scheduled_at.slice(0, 16) : ""}
                onChange={e => setForm({ ...form, meet_scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LessonsDialog = ({ training, onClose }: { training: Training; onClose: () => void }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [openLesson, setOpenLesson] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("training_lessons").select("*").eq("training_id", training.id).order("position");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLessons((data ?? []) as Lesson[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [training.id]);

  const move = async (l: Lesson, dir: -1 | 1) => {
    const sorted = [...lessons].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(x => x.id === l.id);
    const swap = sorted[idx + dir]; if (!swap) return;
    await supabase.from("training_lessons").update({ position: swap.position }).eq("id", l.id);
    await supabase.from("training_lessons").update({ position: l.position }).eq("id", swap.id);
    load();
  };
  const remove = async (l: Lesson) => {
    if (!confirm(`Excluir aula "${l.title}"?`)) return;
    const { error } = await supabase.from("training_lessons").delete().eq("id", l.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aulas de "{training.title}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <Button variant="hero" size="sm" onClick={() => { setEditing(null); setOpenLesson(true); }}>
            <Plus className="size-4" /> Nova aula
          </Button>
          {loading ? <div className="text-muted-foreground">Carregando…</div>
            : lessons.length === 0 ? <div className="text-muted-foreground text-sm">Nenhuma aula ainda.</div>
            : <ul className="space-y-2">
              {lessons.map((l, i) => (
                <li key={l.id} className="border border-border rounded-md p-3 flex items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={i === 0} onClick={() => move(l, -1)}><ArrowUp className="size-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={i === lessons.length - 1} onClick={() => move(l, 1)}><ArrowDown className="size-3" /></Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{i + 1}. {l.title}</div>
                    {l.description && <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-secondary">{l.video_kind}</span>
                      {l.video_url && <span className="truncate max-w-[300px]">{l.video_url.split("/").pop()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setOpenLesson(true); }}><Pencil className="size-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(l)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ul>}
        </div>

        {openLesson && (
          <LessonForm
            training={training}
            initial={editing}
            nextPosition={lessons.length}
            onClose={() => { setOpenLesson(false); load(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const LessonForm = ({ training, initial, nextPosition, onClose }: {
  training: Training; initial: Lesson | null; nextPosition: number; onClose: () => void;
}) => {
  const [form, setForm] = useState<Partial<Lesson>>(initial ?? {
    title: "", description: "", video_kind: "upload", video_url: "", attachments: [], position: nextPosition,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileMobileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    if (file.size > 500 * 1024 * 1024) return toast({ title: "Vídeo muito grande", description: "Máximo 500 MB.", variant: "destructive" });
    setUploading(true);
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const path = `trainings/${training.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("course-videos").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (error) return toast({ title: "Falha no upload", description: error.message, variant: "destructive" });
    setForm(f => ({ ...f, video_kind: "upload", video_url: path }));
    toast({ title: "Vídeo enviado" });
  };

  const save = async () => {
    if (!form.title?.trim()) return toast({ title: "Informe o título", variant: "destructive" });
    setSaving(true);
    const payload: any = {
      training_id: training.id,
      title: form.title.trim(),
      description: form.description ?? null,
      video_kind: form.video_kind ?? "upload",
      video_url: form.video_url || null,
      duration_seconds: form.duration_seconds ?? null,
      attachments: form.attachments ?? [],
      position: form.position ?? nextPosition,
    };
    const q = initial
      ? supabase.from("training_lessons").update(payload).eq("id", initial.id)
      : supabase.from("training_lessons").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: initial ? "Aula atualizada" : "Aula criada" });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{initial ? "Editar aula" : "Nova aula"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Label>Título *</Label>
            <Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Descrição / roteiro</Label>
            <Textarea rows={4} value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Roteiro do vídeo, pontos-chave, materiais a citar…" />
          </div>

          <Tabs value={form.video_kind ?? "upload"} onValueChange={v => setForm({ ...form, video_kind: v, video_url: "" })}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="upload"><Upload className="size-3.5" /> Upload</TabsTrigger>
              <TabsTrigger value="youtube"><Video className="size-3.5" /> YouTube</TabsTrigger>
              <TabsTrigger value="link"><Link2 className="size-3.5" /> Link externo</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-2">
              <input ref={fileRef} type="file" accept="video/*" className="hidden"
                onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
              <input ref={fileMobileRef} type="file" accept="video/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Enviar arquivo
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileMobileRef.current?.click()} disabled={uploading}>
                  <Smartphone className="size-4" /> Gravar pelo celular
                </Button>
              </div>
              {form.video_url && form.video_kind === "upload" && (
                <p className="text-xs text-muted-foreground truncate">📁 {form.video_url}</p>
              )}
              <p className="text-xs text-muted-foreground">Até 500 MB. Formatos comuns: MP4, MOV, WEBM.</p>
            </TabsContent>
            <TabsContent value="youtube" className="space-y-2">
              <Input placeholder="https://youtube.com/watch?v=..." value={form.video_url ?? ""} onChange={e => setForm({ ...form, video_url: e.target.value })} />
            </TabsContent>
            <TabsContent value="link" className="space-y-2">
              <Input placeholder="https://vimeo.com/... ou Drive" value={form.video_url ?? ""} onChange={e => setForm({ ...form, video_url: e.target.value })} />
            </TabsContent>
          </Tabs>

          <div>
            <Label>Duração (segundos, opcional)</Label>
            <Input type="number" value={form.duration_seconds ?? ""} onChange={e => setForm({ ...form, duration_seconds: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="hero" onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Salvar aula</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTreinamentos;

const InviteUsersDialog = ({ training, onClose }: { training: Training; onClose: () => void }) => {
  const [users, setUsers] = useState<Array<{ user_id: string; display_name: string | null; username: string | null; email: string | null; role: string | null }>>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: roles }, { data: invs }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        (supabase as any).from("training_invitations").select("user_id").eq("training_id", training.id),
      ]);
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      const roleByUser = new Map<string, string>();
      (roles ?? []).forEach((r: any) => { if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role); });
      let profiles: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("user_id, display_name, username, email").in("user_id", ids);
        profiles = data ?? [];
      }
      const list = profiles
        .map(p => ({ ...p, role: roleByUser.get(p.user_id) ?? null }))
        .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
      setUsers(list);
      const inv = new Set<string>((invs ?? []).map((x: any) => x.user_id));
      setInvited(inv);
      setSelected(new Set(inv));
      setLoading(false);
    })();
  }, [training.id]);

  const toggle = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = users.filter(u => {
    if (!q) return true;
    const s = `${u.display_name ?? ""} ${u.username ?? ""} ${u.email ?? ""} ${u.role ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  const save = async () => {
    setSaving(true);
    const toAdd = Array.from(selected).filter(id => !invited.has(id));
    const toRemove = Array.from(invited).filter(id => !selected.has(id));
    const { data: sess } = await supabase.auth.getSession();
    const me = sess.session?.user.id;
    if (toAdd.length) {
      const rows = toAdd.map(uid => ({ training_id: training.id, user_id: uid, invited_by: me }));
      const { error } = await (supabase as any).from("training_invitations").insert(rows);
      if (error) { setSaving(false); return toast({ title: "Erro ao convidar", description: error.message, variant: "destructive" }); }
    }
    if (toRemove.length) {
      const { error } = await (supabase as any).from("training_invitations").delete()
        .eq("training_id", training.id).in("user_id", toRemove);
      if (error) { setSaving(false); return toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }); }
    }
    setSaving(false);
    toast({ title: "Convites atualizados", description: `${selected.size} pessoa(s) com acesso.` });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convidar pessoas — {training.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, login, email ou papel…" className="pl-9" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{selected.size} selecionado(s) de {users.length} usuário(s)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(filtered.map(u => u.user_id)))}>Selecionar todos</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button>
            </div>
          </div>
          <div className="border border-border rounded-lg max-h-[50vh] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-2" /> Carregando…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
            ) : filtered.map(u => (
              <label key={u.user_id} className="flex items-center gap-3 p-2.5 hover:bg-secondary/40 cursor-pointer">
                <Checkbox checked={selected.has(u.user_id)} onCheckedChange={() => toggle(u.user_id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || u.username || "(sem nome)"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"} · <span className="font-mono">{u.username ?? "—"}</span></p>
                </div>
                {u.role && <Badge variant="secondary" className="text-[10px]">{u.role}</Badge>}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="hero" onClick={save} disabled={saving || loading}>
            {saving ? <><Loader2 className="size-4 animate-spin" /> Salvando…</> : <><UserPlus className="size-4" /> Salvar convites</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AiTrainingDialog = ({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("geral");
  const [audience, setAudience] = useState("ambos");
  const [numLessons, setNumLessons] = useState(6);
  const [tone, setTone] = useState("Didático");
  const [depth, setDepth] = useState("Intermediário");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [base, setBase] = useState("");
  const [files, setFiles] = useState<{ name: string; mime: string; data_base64: string; size: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(""); setCategory("geral"); setAudience("ambos");
      setNumLessons(6); setTone("Didático"); setDepth("Intermediário");
      setModel("google/gemini-2.5-flash"); setBase(""); setFiles([]);
    }
  }, [open]);

  const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    const acc = [...files];
    for (const f of Array.from(list)) {
      if (acc.length >= 10) { toast({ title: "Máximo 10 arquivos" }); break; }
      if (f.size > 20 * 1024 * 1024) { toast({ title: `${f.name}: máx 20MB`, variant: "destructive" }); continue; }
      const data_base64 = await readFileAsBase64(f);
      acc.push({ name: f.name, mime: f.type || "application/octet-stream", data_base64, size: f.size });
    }
    setFiles(acc);
  };

  const generate = async () => {
    if (!title.trim()) return toast({ title: "Informe o título", variant: "destructive" });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-training-ai", {
        body: {
          title: title.trim(), category, audience, num_lessons: numLessons, tone, depth, model, base,
          files: files.map(f => ({ name: f.name, mime: f.mime, data_base64: f.data_base64 })),
        },
      });
      if (error) {
        const context = (error as any).context;
        if (context?.json) {
          const payload = await context.json().catch(() => null);
          if (payload?.error) throw new Error(payload.error);
          if (payload?.message) throw new Error(payload.message);
        }
        throw error;
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Treinamento gerado!", description: `${(data as any).lessons} aulas criadas. Revise e publique.` });
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      const m = e?.message || String(e);
      if (m.includes("429")) toast({ title: "Limite da IA atingido. Aguarde e tente novamente.", variant: "destructive" });
      else if (m.includes("402")) toast({ title: "Créditos de IA esgotados.", variant: "destructive" });
      else toast({ title: "Erro", description: m, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Gerar treinamento com IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Label>Título do treinamento *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Onboarding Vendedor Multplick" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["geral", "onboarding", "vendas", "produto", "pos-venda", "tecnico"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Público</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Vendedores e Afiliados</SelectItem>
                  <SelectItem value="vendedor">Apenas Vendedores</SelectItem>
                  <SelectItem value="afiliado">Apenas Afiliados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº de aulas</Label>
              <Input type="number" min={1} max={20} value={numLessons} onChange={e => setNumLessons(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} />
            </div>
            <div>
              <Label>Tom</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Didático", "Formal", "Técnico", "Motivacional"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profundidade</Label>
              <Select value={depth} onValueChange={setDepth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Básico", "Intermediário", "Avançado"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo IA</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (rápido)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (mais detalhado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Base de conteúdo (cole aqui o material que a IA deve seguir)</Label>
            <Textarea
              rows={10}
              value={base}
              onChange={e => setBase(e.target.value)}
              placeholder="Cole roteiros, normas, scripts de venda, manuais, transcrições, FAQ, regras internas, etc. A IA usará este conteúdo como fonte principal para gerar as aulas."
            />
            <p className="text-xs text-muted-foreground mt-1">Quanto mais rica e específica a base, melhor o resultado. Pode deixar vazio para a IA gerar com boas práticas da área.</p>
          </div>
          <div>
            <Label>Anexar material (PDF, imagens, .txt, .md) — até 10 arquivos / 20MB cada</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-secondary/30 transition-colors">
              <input
                id="ai-training-files"
                type="file"
                multiple
                accept=".pdf,.txt,.md,image/*"
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
              <label htmlFor="ai-training-files" className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary">
                <Upload className="size-4" /> Clique para selecionar arquivos
              </label>
              <p className="text-xs text-muted-foreground mt-1">A IA vai ler, organizar em ordem didática e gerar as aulas.</p>
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-secondary/40 rounded px-2 py-1">
                    <span className="truncate">📎 {f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)}KB)</span></span>
                    <Button size="sm" variant="ghost" className="h-6 text-destructive" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><Trash2 className="size-3" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant="hero" onClick={generate} disabled={busy}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Gerando…</> : <><Sparkles className="size-4" /> Gerar treinamento</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};