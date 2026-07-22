import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ImageIcon, Trash2, Youtube, Plus, Target, AlertTriangle, Info, MessagesSquare, Wrench, Video as VideoIcon, ListChecks, Layers, Code2, ArrowUp, ArrowDown } from "lucide-react";
import { YoutubePickerDialog, YoutubeVideo } from "./YoutubePickerDialog";

type Lesson = { id: string; title: string; content: any };

async function fileToResizedDataUrl(file: File, maxWidth = 1400, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onerror = () => rej(r.error);
    r.onload = () => res(r.result as string); r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Falha ao ler imagem")); i.src = dataUrl;
  });
  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality);
}

type ExtraImage = { url: string; width: number; caption?: string };
type ExtraVideo = { url: string; title?: string; why?: string };

const pickLessonHtml = (content: any): string => {
  const html = typeof content?.html === "string" ? content.html.trim() : "";
  if (html) return content.html;
  const body = typeof content?.body === "string" ? content.body.trim() : "";
  if (body) return content.body;
  const contentHtml = typeof content?.content_html === "string" ? content.content_html.trim() : "";
  return contentHtml ? content.content_html : "";
};

// -------- Block parsing / serialization --------
type BlockKind = "intro" | "content" | "safety" | "bridge" | "refs" | "other";
type Block = { id: string; kind: BlockKind; title: string; html: string };

const BLOCK_META: Record<BlockKind, { label: string; icon: any; wrapOpen: (title: string) => string; wrapClose: string; defaultTitle: string }> = {
  intro: {
    label: "Introdução",
    icon: Info,
    wrapOpen: (t) => `<div class="lesson-callout lesson-callout--intro"><h3>${t}</h3>`,
    wrapClose: "</div>",
    defaultTitle: "Em poucas palavras",
  },
  content: {
    label: "Conteúdo detalhado",
    icon: Layers,
    wrapOpen: (t) => `<section class="lesson-section"><h3>${t}</h3>`,
    wrapClose: "</section>",
    defaultTitle: "Conteúdo detalhado",
  },
  safety: {
    label: "Alertas de segurança",
    icon: AlertTriangle,
    wrapOpen: (t) => `<div class="lesson-callout lesson-callout--safety"><h3>${t}</h3>`,
    wrapClose: "</div>",
    defaultTitle: "⚠️ Alertas de segurança",
  },
  bridge: {
    label: "Ponte para a prática",
    icon: MessagesSquare,
    wrapOpen: (t) => `<div class="lesson-callout lesson-callout--bridge"><h3>${t}</h3>`,
    wrapClose: "</div>",
    defaultTitle: "Na aula prática presencial",
  },
  refs: {
    label: "Sugestões de vídeo / referências",
    icon: VideoIcon,
    wrapOpen: (t) => `<section class="lesson-section lesson-section--refs"><h3>${t}</h3>`,
    wrapClose: "</section>",
    defaultTitle: "Sugestões de vídeo para complementar",
  },
  other: {
    label: "Bloco livre",
    icon: Code2,
    wrapOpen: (t) => `<section class="lesson-section"><h3>${t}</h3>`,
    wrapClose: "</section>",
    defaultTitle: "Bloco",
  },
};

const uid = () => Math.random().toString(36).slice(2, 9);

function classifyEl(el: Element): BlockKind {
  const c = el.className || "";
  if (c.includes("lesson-callout--intro")) return "intro";
  if (c.includes("lesson-callout--safety")) return "safety";
  if (c.includes("lesson-callout--bridge")) return "bridge";
  if (c.includes("lesson-section--refs")) return "refs";
  if (c.includes("lesson-section")) return "content";
  return "other";
}

function parseBody(html: string): { objective: string; blocks: Block[] } {
  if (!html || typeof window === "undefined") return { objective: "", blocks: [] };
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return { objective: "", blocks: [] };
  let objective = "";
  const blocks: Block[] = [];
  const looseNodes: string[] = [];
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) looseNodes.push(node.textContent.trim());
  });
  Array.from(root.children).forEach((el) => {
    if (el.classList.contains("lesson-objective")) {
      const p = el.querySelector("p");
      objective = p?.innerHTML.trim() ?? el.innerHTML;
      return;
    }
    const kind = classifyEl(el);
    const h3 = el.querySelector("h3");
    const title = h3?.textContent?.trim() ?? BLOCK_META[kind].defaultTitle;
    if (h3) h3.remove();
    blocks.push({ id: uid(), kind, title, html: el.innerHTML.trim() });
  });
  if (looseNodes.length) {
    blocks.unshift({ id: uid(), kind: "other", title: "Texto da aula", html: looseNodes.map((t) => `<p>${t}</p>`).join("") });
  }
  return { objective, blocks };
}

function serializeBody(objective: string, blocks: Block[]): string {
  const parts: string[] = [];
  if (objective.trim()) {
    parts.push(`<div class="lesson-objective"><span class="lesson-objective__label">Objetivo desta aula</span><p>${objective.trim()}</p></div>`);
  }
  for (const b of blocks) {
    const meta = BLOCK_META[b.kind];
    parts.push(`${meta.wrapOpen(b.title || meta.defaultTitle)}${b.html}${meta.wrapClose}`);
  }
  return parts.join("");
}

const normalizeQuizAnswer = (q: any): QuizItem => ({
  question: String(q?.question ?? ""),
  options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : [],
  answer: Number.isFinite(Number(q?.answer ?? q?.correct)) ? Number(q?.answer ?? q?.correct) : 0,
  explanation: q?.explanation ? String(q.explanation) : "",
});

type Flashcard = { front: string; back: string };
type QuizItem = { question: string; options: string[]; answer: number; explanation?: string };

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^ ]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = s.match(p); if (m) return m[1]; }
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export const LessonEditDialog = ({
  open, onOpenChange, lesson, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  onSaved: (updated: Lesson) => void;
}) => {
  const [title, setTitle] = useState(lesson.title);
  const [html, setHtml] = useState<string>(pickLessonHtml(lesson.content));
  const [objective, setObjective] = useState<string>("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [toolsList, setToolsList] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(lesson.content?.image_url ?? null);
  const [imageWidth, setImageWidth] = useState<number>(lesson.content?.image_width ?? 480);
  const [youtube, setYoutube] = useState<any>(lesson.content?.youtube ?? null);
  const [ytOpen, setYtOpen] = useState(false);
  const [extraImages, setExtraImages] = useState<ExtraImage[]>(lesson.content?.extra_images ?? []);
  const [extraVideos, setExtraVideos] = useState<ExtraVideo[]>(lesson.content?.extra_videos ?? lesson.content?.video_suggestions ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(lesson.title);
      const rawHtml = pickLessonHtml(lesson.content);
      setHtml(rawHtml);
      const parsed = parseBody(rawHtml);
      const objText = typeof lesson.content?.objective === "string" && lesson.content.objective.trim()
        ? lesson.content.objective
        : parsed.objective;
      setObjective(objText);
      setBlocks(parsed.blocks);
      setRawMode(false);
      const fc = Array.isArray(lesson.content?.flashcards) ? lesson.content.flashcards : [];
      setFlashcards(fc.map((f: any) => ({ front: String(f.front ?? ""), back: String(f.back ?? "") })));
      const qz = Array.isArray(lesson.content?.quiz)
        ? lesson.content.quiz
        : Array.isArray(lesson.content?.questions)
          ? lesson.content.questions
          : [];
      setQuiz(qz.map(normalizeQuizAnswer));
      const tl = Array.isArray(lesson.content?.tools_list) ? lesson.content.tools_list : [];
      setToolsList(tl.map((t: any) => String(t)));
      setImageUrl(lesson.content?.image_url ?? null);
      setImageWidth(lesson.content?.image_width ?? 480);
      setYoutube(lesson.content?.youtube ?? null);
      setExtraImages(lesson.content?.extra_images ?? []);
      setExtraVideos(lesson.content?.extra_videos ?? lesson.content?.video_suggestions ?? []);
    }
  }, [open, lesson]);

  // ---- block helpers ----
  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((arr) => arr.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: string) => setBlocks((arr) => arr.filter((b) => b.id !== id));
  const moveBlock = (id: string, dir: -1 | 1) =>
    setBlocks((arr) => {
      const i = arr.findIndex((b) => b.id === id);
      if (i < 0) return arr;
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const addBlock = (kind: BlockKind) =>
    setBlocks((arr) => [...arr, { id: uid(), kind, title: BLOCK_META[kind].defaultTitle, html: "<p></p>" }]);

  const pickFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (f.size > 8 * 1024 * 1024) return toast.error("Máx 8 MB");
    try {
      const url = await fileToResizedDataUrl(f);
      setImageUrl(url);
      toast.success("Imagem carregada (será salva ao clicar em Salvar)");
    } catch (e: any) { toast.error(e?.message ?? "Falha ao processar imagem"); }
  };

  const addExtraImageFromFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (f.size > 8 * 1024 * 1024) return toast.error("Máx 8 MB");
    try {
      const url = await fileToResizedDataUrl(f);
      setExtraImages(arr => [...arr, { url, width: 480, caption: "" }]);
    } catch (e: any) { toast.error(e?.message ?? "Falha ao processar imagem"); }
  };

  const updateExtraImage = (i: number, patch: Partial<ExtraImage>) =>
    setExtraImages(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeExtraImage = (i: number) =>
    setExtraImages(arr => arr.filter((_, idx) => idx !== i));

  const updateExtraVideo = (i: number, patch: Partial<ExtraVideo>) =>
    setExtraVideos(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeExtraVideo = (i: number) =>
    setExtraVideos(arr => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setBusy(true);
    const cleanImages = extraImages.filter(x => x.url?.trim());
    const cleanVideos = extraVideos.filter(x => x.url?.trim());
    const blockHtml = serializeBody(objective, blocks);
    const finalHtml = rawMode ? html : (blockHtml.trim() ? blockHtml : html);
    const cleanFlashcards = flashcards.filter((f) => f.front.trim() || f.back.trim());
    const cleanQuiz = quiz
      .filter((q) => q.question.trim())
      .map((q) => ({ ...q, options: q.options.map((o) => o).filter((o) => o.trim() !== "" || q.options.length <= 2) }));
    const legacyQuestions = cleanQuiz.map((q) => ({
      question: q.question,
      options: q.options,
      correct: q.answer ?? 0,
      explanation: q.explanation ?? "",
    }));
    const cleanTools = toolsList.map((t) => t.trim()).filter(Boolean);
    const newContent = {
      ...(lesson.content ?? {}),
      html: finalHtml,
      body: finalHtml, // compat
      content_html: finalHtml, // compat
      objective: objective.trim() || null,
      flashcards: cleanFlashcards,
      items: cleanFlashcards,
      quiz: cleanQuiz.map((q) => ({ ...q, correct: q.answer ?? 0 })),
      questions: legacyQuestions,
      tools_list: cleanTools,
      image_url: imageUrl ?? null,
      image_width: imageUrl ? imageWidth : null,
      youtube: youtube?.videoId ? youtube : null,
      extra_images: cleanImages,
      extra_videos: cleanVideos,
      video_suggestions: cleanVideos,
    };
    const { error } = await supabase
      .from("course_lessons")
      .update({ title: title.trim() || lesson.title, content: newContent })
      .eq("id", lesson.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Aula atualizada");
    onSaved({ ...lesson, title: title.trim() || lesson.title, content: newContent });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar aula</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <Tabs defaultValue="blocos" className="w-full">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="blocos"><Layers className="size-3.5 mr-1" /> Blocos</TabsTrigger>
                <TabsTrigger value="objetivo"><Target className="size-3.5 mr-1" /> Objetivo</TabsTrigger>
                <TabsTrigger value="flashcards"><Layers className="size-3.5 mr-1" /> Flashcards</TabsTrigger>
                <TabsTrigger value="quiz"><ListChecks className="size-3.5 mr-1" /> Quiz</TabsTrigger>
                <TabsTrigger value="ferramentas"><Wrench className="size-3.5 mr-1" /> Ferramentas</TabsTrigger>
                <TabsTrigger value="html"><Code2 className="size-3.5 mr-1" /> HTML avançado</TabsTrigger>
              </TabsList>

              <TabsContent value="objetivo" className="pt-3">
                <Label>Objetivo desta aula</Label>
                <Textarea rows={4} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="O que o aluno vai aprender ou saber fazer ao final desta aula" />
              </TabsContent>

              <TabsContent value="blocos" className="pt-3 space-y-3">
                {rawMode && (
                  <div className="text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-md p-2 text-yellow-700 dark:text-yellow-300">
                    Você editou o HTML avançado. Salve ou volte para o HTML avançado — os blocos abaixo serão ignorados ao salvar.
                  </div>
                )}
                <Accordion type="multiple" className="space-y-2">
                  {blocks.map((b, idx) => {
                    const meta = BLOCK_META[b.kind];
                    const Icon = meta.icon;
                    return (
                      <AccordionItem key={b.id} value={b.id} className="border border-border rounded-lg bg-secondary/20">
                        <div className="flex items-center gap-1 pr-2">
                          <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
                            <span className="flex items-center gap-2 text-left text-sm">
                              <Icon className="size-4 text-primary" />
                              <span className="font-medium">{b.title || meta.defaultTitle}</span>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">({meta.label})</span>
                            </span>
                          </AccordionTrigger>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => moveBlock(b.id, -1)} disabled={idx === 0} title="Subir"><ArrowUp className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => moveBlock(b.id, 1)} disabled={idx === blocks.length - 1} title="Descer"><ArrowDown className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeBlock(b.id)} title="Remover"><Trash2 className="size-3.5" /></Button>
                        </div>
                        <AccordionContent className="px-3 pb-3 space-y-2">
                          <div>
                            <Label className="text-xs">Título do bloco</Label>
                            <Input value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-xs">Tipo do bloco</Label>
                            <select
                              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                              value={b.kind}
                              onChange={(e) => updateBlock(b.id, { kind: e.target.value as BlockKind })}
                            >
                              {(Object.keys(BLOCK_META) as BlockKind[]).map((k) => (
                                <option key={k} value={k}>{BLOCK_META[k].label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Conteúdo (HTML deste bloco)</Label>
                            <Textarea
                              rows={8}
                              value={b.html}
                              onChange={(e) => updateBlock(b.id, { html: e.target.value })}
                              className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Use &lt;p&gt;, &lt;ul&gt;&lt;li&gt;, &lt;strong&gt; etc. Não precisa envolver com o container — isso é feito automaticamente.
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
                <div className="flex flex-wrap gap-2 pt-2">
                  {(Object.keys(BLOCK_META) as BlockKind[]).map((k) => (
                    <Button key={k} variant="outline" size="sm" onClick={() => addBlock(k)}>
                      <Plus className="size-3.5 mr-1" /> {BLOCK_META[k].label}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="flashcards" className="pt-3 space-y-2">
                {flashcards.map((f, i) => (
                  <div key={i} className="border border-border rounded-md p-3 bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Flashcard {i + 1}</span>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setFlashcards((a) => a.filter((_, idx) => idx !== i))}><Trash2 className="size-3.5" /></Button>
                    </div>
                    <div>
                      <Label className="text-xs">Frente (pergunta)</Label>
                      <Textarea rows={2} value={f.front} onChange={(e) => setFlashcards((a) => a.map((x, idx) => idx === i ? { ...x, front: e.target.value } : x))} />
                    </div>
                    <div>
                      <Label className="text-xs">Verso (resposta)</Label>
                      <Textarea rows={2} value={f.back} onChange={(e) => setFlashcards((a) => a.map((x, idx) => idx === i ? { ...x, back: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFlashcards((a) => [...a, { front: "", back: "" }])}><Plus className="size-3.5 mr-1" /> Adicionar flashcard</Button>
              </TabsContent>

              <TabsContent value="quiz" className="pt-3 space-y-3">
                {quiz.map((q, i) => (
                  <div key={i} className="border border-border rounded-md p-3 bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Pergunta {i + 1}</span>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setQuiz((a) => a.filter((_, idx) => idx !== i))}><Trash2 className="size-3.5" /></Button>
                    </div>
                    <div>
                      <Label className="text-xs">Pergunta</Label>
                      <Textarea rows={2} value={q.question} onChange={(e) => setQuiz((a) => a.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Opções (marque a correta)</Label>
                      {q.options.map((op, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`q-${i}`} checked={q.answer === oi} onChange={() => setQuiz((a) => a.map((x, idx) => idx === i ? { ...x, answer: oi } : x))} />
                          <Input value={op} onChange={(e) => setQuiz((a) => a.map((x, idx) => idx === i ? { ...x, options: x.options.map((o2, oi2) => oi2 === oi ? e.target.value : o2) } : x))} />
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setQuiz((a) => a.map((x, idx) => idx === i ? { ...x, options: x.options.filter((_, oi2) => oi2 !== oi), answer: x.answer > oi ? x.answer - 1 : x.answer } : x))}><Trash2 className="size-3.5" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setQuiz((a) => a.map((x, idx) => idx === i ? { ...x, options: [...x.options, ""] } : x))}><Plus className="size-3 mr-1" /> Opção</Button>
                    </div>
                    <div>
                      <Label className="text-xs">Explicação (opcional)</Label>
                      <Textarea rows={2} value={q.explanation ?? ""} onChange={(e) => setQuiz((a) => a.map((x, idx) => idx === i ? { ...x, explanation: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setQuiz((a) => [...a, { question: "", options: ["", ""], answer: 0, explanation: "" }])}><Plus className="size-3.5 mr-1" /> Adicionar pergunta</Button>
              </TabsContent>

              <TabsContent value="ferramentas" className="pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Ferramentas/materiais desta aula (uma por linha).</p>
                {toolsList.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={t} onChange={(e) => setToolsList((a) => a.map((x, idx) => idx === i ? e.target.value : x))} placeholder="ex.: Manifold" />
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setToolsList((a) => a.filter((_, idx) => idx !== i))}><Trash2 className="size-3.5" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setToolsList((a) => [...a, ""])}><Plus className="size-3.5 mr-1" /> Adicionar ferramenta</Button>
              </TabsContent>

              <TabsContent value="html" className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label>HTML completo do corpo</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={rawMode} onChange={(e) => setRawMode(e.target.checked)} />
                    <span>Salvar usando este HTML (ignora os blocos)</span>
                  </div>
                </div>
                  <Textarea
                  rows={16}
                  value={html}
                  onChange={(e) => { setHtml(e.target.value); setRawMode(true); }}
                  className="font-mono text-xs"
                  placeholder="<p>Escreva o conteúdo da aula...</p>"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Modo avançado. Se preferir editar por partes, use a aba <strong>Blocos</strong>.
                </p>
              </TabsContent>
            </Tabs>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><ImageIcon className="size-4" /> Imagem principal da aula</Label>
                {imageUrl && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setImageUrl(null)}>
                    <Trash2 className="size-3.5" /> Remover
                  </Button>
                )}
              </div>

              {imageUrl && (
                <div className="flex justify-center bg-secondary/30 rounded-md p-3">
                  <img src={imageUrl} alt="preview" style={{ maxWidth: `${imageWidth}px`, width: "100%" }} className="rounded" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary">
                  <ImageIcon className="size-4" /> {imageUrl ? "Trocar imagem" : "Enviar do computador"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                </label>
                <Input
                  placeholder="ou cole uma URL https://..."
                  onBlur={(e) => { const v = e.target.value.trim(); if (v) setImageUrl(v); }}
                />
              </div>

              {imageUrl && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Tamanho de exibição</span>
                    <span className="font-mono">{imageWidth}px</span>
                  </div>
                  <Slider
                    min={200} max={900} step={20}
                    value={[imageWidth]}
                    onValueChange={(v) => setImageWidth(v[0])}
                  />
                </div>
              )}
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><ImageIcon className="size-4" /> Imagens extras (galeria)</Label>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1 cursor-pointer text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary">
                    <Plus className="size-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => addExtraImageFromFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <Button variant="secondary" size="sm" onClick={() => setExtraImages(arr => [...arr, { url: "", width: 480, caption: "" }])}>
                    <Plus className="size-3.5" /> URL
                  </Button>
                </div>
              </div>
              {extraImages.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma imagem extra. Adicione fotos ou diagramas complementares.</p>
              )}
              <div className="space-y-3">
                {extraImages.map((img, i) => (
                  <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/20">
                    <div className="flex items-start gap-3">
                      {img.url ? (
                        <img src={img.url} alt="" className="w-24 h-24 object-cover rounded" />
                      ) : (
                        <div className="w-24 h-24 rounded bg-muted grid place-items-center text-muted-foreground text-xs">sem imagem</div>
                      )}
                      <div className="flex-1 space-y-2 min-w-0">
                        <Input
                          placeholder="URL da imagem"
                          value={img.url}
                          onChange={(e) => updateExtraImage(i, { url: e.target.value })}
                        />
                        <Input
                          placeholder="Legenda (opcional)"
                          value={img.caption ?? ""}
                          onChange={(e) => updateExtraImage(i, { caption: e.target.value })}
                        />
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeExtraImage(i)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Largura</span><span className="font-mono">{img.width}px</span>
                      </div>
                      <Slider min={200} max={900} step={20} value={[img.width]} onValueChange={(v) => updateExtraImage(i, { width: v[0] })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Youtube className="size-4 text-red-600" /> Vídeo principal (YouTube)</Label>
                <Button variant="secondary" size="sm" onClick={() => setYtOpen(true)}>
                  {youtube?.videoId ? "Trocar vídeo" : "Adicionar vídeo"}
                </Button>
              </div>
              {youtube?.videoId ? (
                <div className="flex items-center gap-3">
                  <img src={youtube.thumbnail} alt="" className="w-28 aspect-video object-cover rounded" />
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{youtube.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{youtube.channel}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setYoutube(null)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum vídeo. Clique em Adicionar vídeo para colar um link ou buscar.</p>
              )}
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Youtube className="size-4 text-red-600" /> Vídeos extras</Label>
                <Button variant="secondary" size="sm" onClick={() => setExtraVideos(arr => [...arr, { url: "", title: "", why: "" }])}>
                  <Plus className="size-3.5" /> Adicionar
                </Button>
              </div>
              {extraVideos.length === 0 && (
                <p className="text-xs text-muted-foreground">Cole links do YouTube para complementar a aula.</p>
              )}
              <div className="space-y-2">
                {extraVideos.map((v, i) => {
                  const vid = extractYoutubeId(v.url);
                  return (
                    <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/20">
                      <div className="flex items-start gap-3">
                        {vid ? (
                          <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="" className="w-28 aspect-video object-cover rounded" />
                        ) : (
                          <div className="w-28 aspect-video rounded bg-muted grid place-items-center text-muted-foreground text-[10px]">preview</div>
                        )}
                        <div className="flex-1 space-y-2 min-w-0">
                          <Input placeholder="URL do YouTube" value={v.url} onChange={(e) => updateExtraVideo(i, { url: e.target.value })} />
                          <Input placeholder="Título (opcional)" value={v.title ?? ""} onChange={(e) => updateExtraVideo(i, { title: e.target.value })} />
                          <Input placeholder="Descrição curta (opcional)" value={v.why ?? ""} onChange={(e) => updateExtraVideo(i, { why: e.target.value })} />
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeExtraVideo(i)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
              <Button variant="hero" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <YoutubePickerDialog
        open={ytOpen}
        onOpenChange={setYtOpen}
        current={youtube}
        onPick={(v: YoutubeVideo) => { setYoutube(v); setYtOpen(false); }}
        onClear={() => { setYoutube(null); setYtOpen(false); }}
      />
    </>
  );
};

export default LessonEditDialog;