import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, FileText, HelpCircle, Layers, Wind, ShieldAlert, Ruler, Drill, Wrench, Flame, Droplet, Zap, Gauge, CheckCircle2, Youtube, ExternalLink, Pencil, Image as ImageIconLucide } from "lucide-react";
import { LessonEditDialog } from "@/components/admin/LessonEditDialog";

const MODULE_ICONS: Record<string, any> = { Wind, ShieldAlert, Ruler, Drill, Wrench, Flame, Droplet, Zap, Gauge, CheckCircle: CheckCircle2 };

const pickLessonHtml = (content: any): string => {
  const html = typeof content?.html === "string" ? content.html.trim() : "";
  if (html) return content.html;
  const body = typeof content?.body === "string" ? content.body.trim() : "";
  if (body) return content.body;
  const contentHtml = typeof content?.content_html === "string" ? content.content_html.trim() : "";
  return contentHtml ? content.content_html : "";
};

const ytIdFromUrl = (input?: string | null): string | null => {
  if (!input) return null;
  const s = input.trim();
  const pats = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^ ]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of pats) { const m = s.match(p); if (m) return m[1]; }
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};

type Course = { id: string; title: string; description: string | null; image_url: string | null; category: string | null };
type Section = { id: string; title: string; sort_order: number };
type Lesson = {
  id: string;
  section_id: string;
  title: string;
  lesson_type: string;
  sort_order: number;
  duration_seconds: number | null;
  content: any;
};

export default function AdminCursoPreview() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: s }, { data: l }] = await Promise.all([
        supabase.from("courses").select("id,title,description,image_url,category").eq("id", courseId).maybeSingle(),
        supabase.from("course_sections").select("id,title,sort_order").eq("course_id", courseId).order("sort_order"),
        supabase.from("course_lessons").select("id,section_id,title,lesson_type,sort_order,duration_seconds,content").order("sort_order"),
      ]);
      setCourse(c as any);
      const secs = (s ?? []) as Section[];
      setSections(secs);
      const secIds = new Set(secs.map(x => x.id));
      const lss = ((l ?? []) as Lesson[]).filter(x => secIds.has(x.section_id));
      setLessons(lss);
      setActiveId(lss[0]?.id ?? null);
      setLoading(false);
    })();
  }, [courseId]);

  const lessonsBySection = useMemo(() => {
    const map: Record<string, Lesson[]> = {};
    for (const ls of lessons) (map[ls.section_id] ||= []).push(ls);
    return map;
  }, [lessons]);

  const active = lessons.find(l => l.id === activeId) ?? null;

  if (loading) return <div className="p-8 text-muted-foreground">Carregando pré-visualização…</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to={`/admin/cursos/${courseId}`}><ArrowLeft className="size-4" /> Voltar ao editor</Link></Button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Pré-visualização · {course.category}</div>
            <h1 className="text-lg font-bold truncate">{course.title}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-6">
        <aside className="border border-border rounded-lg bg-card overflow-hidden max-h-[calc(100vh-140px)] overflow-y-auto">
          {sections.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma seção cadastrada.</div>}
          {sections.map((sec, i) => (
            <div key={sec.id} className="border-b border-border last:border-0">
              <div className="px-3 py-2 bg-secondary/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Layers className="size-3.5" /> {i + 1}. {sec.title}
              </div>
              <ul>
                {(lessonsBySection[sec.id] ?? []).map(ls => {
                  const Icon = ls.lesson_type === "quiz" ? HelpCircle : ls.content?.youtube?.videoId ? PlayCircle : FileText;
                  return (
                    <li key={ls.id}>
                      <button
                        onClick={() => setActiveId(ls.id)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary/60 transition ${activeId === ls.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="line-clamp-2">{ls.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        <main className="min-w-0">
          {!active ? (
            <div className="p-8 text-muted-foreground border border-dashed border-border rounded-lg">Selecione uma aula à esquerda.</div>
          ) : (
            <LessonView
              lesson={active}
              onUpdated={(u) => setLessons(ls => ls.map(l => l.id === u.id ? { ...l, title: u.title, content: u.content } : l))}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function LessonView({ lesson, onUpdated }: { lesson: Lesson; onUpdated?: (u: Lesson) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const yt = lesson.content?.youtube;
  const body = pickLessonHtml(lesson.content);
  const imageUrl: string | undefined = lesson.content?.image_url;
  const flashcards: Array<{ front: string; back: string }> = lesson.content?.flashcards ?? lesson.content?.items ?? [];
  const quiz: Array<{ question: string; options: string[]; answer?: number; correct?: number; explanation?: string }> =
    lesson.content?.quiz ?? lesson.content?.questions ?? [];
  const theme = lesson.content?.module_theme;
  const toolsImg: string | undefined = lesson.content?.tools_image_url;
  const toolsList: string[] = lesson.content?.tools_list ?? [];
  const videos: { title: string; url: string; why?: string }[] = lesson.content?.video_suggestions ?? [];
  const extraImages: { url: string; width?: number; caption?: string }[] = lesson.content?.extra_images ?? [];
  const extraVideos: { url: string; title?: string; why?: string }[] = lesson.content?.extra_videos ?? [];
  const ModIcon = theme?.icon ? (MODULE_ICONS[theme.icon] ?? FileText) : null;
  const themeStyle = theme?.color ? ({ "--lesson-accent": `hsl(${theme.color})` } as React.CSSProperties) : undefined;

  return (
    <article className="lesson-themed space-y-6 max-w-3xl" style={themeStyle}>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Editar aula
        </Button>
      </div>
      <LessonEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lesson={lesson as any}
        onSaved={(u) => onUpdated?.({ ...(lesson as any), ...u })}
      />
      {theme && (
        <div>
          <span className="lesson-mod-badge">
            {ModIcon && <ModIcon className="size-3.5" />}
            Módulo {theme.module_index} · {theme.label}
          </span>
          <div className="lesson-title-bar" />
        </div>
      )}
      <header>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{lesson.lesson_type}</div>
        <h2 className="text-2xl font-bold">{lesson.title}</h2>
      </header>

      {yt?.videoId && (
        <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${yt.videoId}`}
            title={yt.title || lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {imageUrl && !yt?.videoId && (
        <figure className="flex justify-center">
          <img
            src={imageUrl}
            alt={lesson.title}
            loading="lazy"
            className="rounded-lg border border-border w-full h-auto object-contain"
            style={{ maxWidth: `${lesson.content?.image_width ?? 720}px` }}
          />
        </figure>
      )}

      {body && (
        <div
          className="lesson-content prose prose-neutral max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      )}

      {extraImages.length > 0 && (
        <section>
          <p className="lesson-block-heading"><ImageIconLucide className="size-4" /> Galeria da aula</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {extraImages.map((im, i) => (
              <figure key={i} className="flex flex-col items-center bg-secondary/20 border border-border rounded-lg p-3">
                <img src={im.url} alt={im.caption ?? ""} loading="lazy" className="rounded object-contain w-full h-auto" style={{ maxWidth: `${im.width ?? 480}px` }} />
                {im.caption && <figcaption className="text-xs text-muted-foreground mt-2 text-center">{im.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {extraVideos.length > 0 && (
        <section>
          <p className="lesson-block-heading"><Youtube className="size-4" /> Vídeos complementares</p>
          <div className="grid gap-4 md:grid-cols-2">
            {extraVideos.map((v, i) => {
              const id = ytIdFromUrl(v.url);
              if (!id) return null;
              return (
                <figure key={i} className="space-y-1.5">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${id}?rel=0`} title={v.title ?? "Vídeo"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                  </div>
                  {(v.title || v.why) && (
                    <figcaption className="text-xs text-muted-foreground">
                      {v.title && <span className="font-medium text-foreground/80">{v.title}</span>}
                      {v.why && <span className="block">{v.why}</span>}
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        </section>
      )}

      {(toolsImg || toolsList.length > 0) && (
        <section>
          <p className="lesson-block-heading"><Wrench className="size-4" /> Ferramentas & materiais</p>
          <div className="lesson-tools-kit">
            <div className="lesson-tools-kit__header">
              {ModIcon && <ModIcon className="size-4" />} Kit do módulo
            </div>
            {toolsImg && <img src={toolsImg} alt="Kit de ferramentas" className="lesson-tools-kit__img" loading="lazy" />}
            {toolsList.length > 0 && (
              <ul className="lesson-tools-kit__list">
                {toolsList.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      {videos.length > 0 && extraVideos.length === 0 && (
        <section>
          <p className="lesson-block-heading"><Youtube className="size-4" /> Vídeos recomendados</p>
          <div className="lesson-videos">
            {videos.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noreferrer" className="lesson-videos__card">
                <span className="lesson-videos__icon"><Youtube className="size-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="lesson-videos__title block">{v.title}</span>
                  {v.why && <span className="lesson-videos__why block">{v.why}</span>}
                </span>
                <ExternalLink className="size-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </section>
      )}

      {flashcards.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Flashcards de memorização</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {flashcards.map((f, i) => (
              <Flashcard key={i} front={f.front} back={f.back} />
            ))}
          </div>
        </section>
      )}

      {quiz.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Quiz da aula</h3>
          <div className="space-y-4">
            {quiz.map((q, i) => (
              <QuizItem key={i} index={i} question={q.question} options={q.options} answer={q.answer ?? q.correct ?? 0} explanation={q.explanation} />
            ))}
          </div>
        </section>
      )}

      {!body && !yt?.videoId && flashcards.length === 0 && quiz.length === 0 && (
        <div className="p-6 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
          Aula ainda sem conteúdo. Edite no builder para adicionar vídeo, texto, flashcards ou quiz.
        </div>
      )}
    </article>
  );
}

function Flashcard({ front, back }: { front: string; back: string }) {
  const [flip, setFlip] = useState(false);
  return (
    <button
      onClick={() => setFlip(v => !v)}
      className="text-left border border-border rounded-lg p-4 bg-card hover:border-primary transition min-h-[110px]"
    >
      <div className="text-xs text-muted-foreground mb-1">{flip ? "Resposta" : "Pergunta"}</div>
      <div className="text-sm font-medium">{flip ? back : front}</div>
      <div className="text-[11px] text-muted-foreground mt-2">Clique para virar</div>
    </button>
  );
}

function QuizItem({ index, question, options, answer, explanation }:
  { index: number; question: string; options: string[]; answer: number; explanation?: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="font-medium mb-2">{index + 1}. {question}</div>
      <ul className="space-y-1.5">
        {options.map((op, i) => {
          const isPicked = picked === i;
          const correct = picked !== null && i === answer;
          const wrong = isPicked && i !== answer;
          return (
            <li key={i}>
              <button
                onClick={() => setPicked(i)}
                className={`w-full text-left px-3 py-2 rounded border text-sm transition
                  ${correct ? "border-green-500 bg-green-500/10" : ""}
                  ${wrong ? "border-red-500 bg-red-500/10" : ""}
                  ${!correct && !wrong ? "border-border hover:bg-secondary/60" : ""}`}
              >
                {String.fromCharCode(65 + i)}. {op}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && explanation && (
        <div className="mt-3 text-sm text-muted-foreground border-t border-border pt-2">
          <strong>Explicação:</strong> {explanation}
        </div>
      )}
    </div>
  );
}
