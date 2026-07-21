import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Video, FileText, HelpCircle,
  RotateCw, Rows, Award, BookOpen, Loader2, ListTree, Download, ExternalLink, Paperclip, Link2, Radio,
  Wind, ShieldAlert, Ruler, Drill, Wrench, Flame, Droplet, Zap, Gauge, Youtube,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { CourseTutorChat } from "@/components/aluno/CourseTutorChat";
import { generateApostila } from "@/lib/apostila";
import { GamerHUD } from "@/components/gamer/GamerHUD";
import { AvatarTrail } from "@/components/gamer/AvatarTrail";
import { CourseFinale } from "@/components/gamer/CourseFinale";
import { useGamification } from "@/lib/gamer/useGamification";
import { sfx, fireConfetti } from "@/lib/gamer/sfx";

type Lesson = {
  id: string; section_id: string; title: string;
  lesson_type: "video" | "text" | "quiz" | "flip" | "accordion";
  sort_order: number; content: any; video_path: string | null;
  duration_seconds: number | null; passing_score: number;
};
type Section = { id: string; title: string; sort_order: number; lessons: Lesson[] };
type Progress = { lesson_id: string; completed: boolean; score: number | null };

const ICONS = { video: Video, text: FileText, quiz: HelpCircle, flip: RotateCw, accordion: Rows } as const;

const MODULE_ICONS: Record<string, any> = {
  Wind, ShieldAlert, Ruler, Drill, Wrench, Flame, Droplet, Zap, Gauge, CheckCircle: CheckCircle2,
};

const extractEmbedUrl = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/src=["']([^"']+)["']/i);
  return match?.[1] ?? value;
};

const CursoPlayer = () => {
  const { enrollmentId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingApostila, setDownloadingApostila] = useState(false);
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [finaleShown, setFinaleShown] = useState(false);
  const { award } = useGamification();

  const handleDownloadApostila = async () => {
    if (!course || sections.length === 0) return;
    setDownloadingApostila(true);
    try {
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", user!.id).maybeSingle();
      await generateApostila(
        { title: course.title, category: course.category, slug: course.slug },
        sections as any,
        prof?.display_name ?? null,
      );
      toast.success("Apostila gerada!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar apostila");
    } finally {
      setDownloadingApostila(false);
    }
  };

  const load = async () => {
    if (!user || !enrollmentId) return;
    const { data: enr, error: e1 } = await supabase
      .from("enrollments")
      .select("id, course_id, courses ( id, title, category, slug, passing_score, live_url, live_label, coursebox_embed_url, external_url )")
      .eq("id", enrollmentId).eq("user_id", user.id).maybeSingle();
    if (e1 || !enr?.courses) { toast.error(e1?.message ?? "Curso não encontrado"); setLoading(false); return; }
    setCourse({ ...(enr as any).courses, enrollment_id: enr.id });

    const { data: ss } = await supabase.from("course_sections").select("*").eq("course_id", (enr as any).course_id).order("sort_order");
    const sectionIds = (ss ?? []).map((s: any) => s.id);
    const { data: ls } = sectionIds.length
      ? await supabase.from("course_lessons").select("*").in("section_id", sectionIds).order("sort_order")
      : { data: [] as any[] };
    const lessonIds = (ls ?? []).map((l: any) => l.id);
    const { data: pr } = lessonIds.length
      ? await supabase.from("lesson_progress").select("lesson_id, completed, score").eq("user_id", user.id).in("lesson_id", lessonIds)
      : { data: [] as any[] };
    const sList: Section[] = (ss ?? []).map((s: any) => ({ ...s, lessons: (ls ?? []).filter((l: any) => l.section_id === s.id) }));
    setSections(sList);
    setProgress(Object.fromEntries((pr ?? []).map((p: any) => [p.lesson_id, p])));
    setCurrentId(prev => prev ?? (ls?.[0]?.id ?? null));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, enrollmentId]);

  const allLessons = useMemo(() => sections.flatMap(s => s.lessons), [sections]);
  const currentIdx = allLessons.findIndex(l => l.id === currentId);
  const current = allLessons[currentIdx];
  const completedCount = allLessons.filter(l => progress[l.id]?.completed).length;
  const percent = allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0;

  // sync enrollment progress
  useEffect(() => {
    if (!course?.enrollment_id || allLessons.length === 0) return;
    supabase.from("enrollments").update({ progress: percent, status: percent === 100 ? "concluido" : "active", completed_at: percent === 100 ? new Date().toISOString() : null }).eq("id", course.enrollment_id);
  }, [percent, course?.enrollment_id, allLessons.length]);

  useEffect(() => {
    if (percent === 100 && !finaleShown) {
      setFinaleShown(true);
      setFinaleOpen(true);
      fireConfetti(2400);
    }
  }, [percent, finaleShown]);

  const markCompleted = async (lessonId: string, score?: number) => {
    if (!user) return;
    const already = progress[lessonId]?.completed;
    const row = { user_id: user.id, lesson_id: lessonId, completed: true, score: score ?? null, completed_at: new Date().toISOString() };
    const { error } = await supabase.from("lesson_progress").upsert(row, { onConflict: "user_id,lesson_id" });
    if (error) return toast.error(error.message);
    setProgress(p => ({ ...p, [lessonId]: { lesson_id: lessonId, completed: true, score: score ?? null } }));
    if (!already) {
      const bonus = typeof score === "number" && score >= 80 ? 20 : 0;
      sfx.coin();
      const rect = document.querySelector("[data-xp-anchor]")?.getBoundingClientRect();
      const anchor = rect ? { x: rect.left + rect.width / 2, y: rect.top } : undefined;
      await award(50 + bonus, 5, { label: `+${50 + bonus} XP`, anchor });
    }
  };

  const goNext = () => { const next = allLessons[currentIdx + 1]; if (next) setCurrentId(next.id); };
  const goPrev = () => { const prev = allLessons[currentIdx - 1]; if (prev) setCurrentId(prev.id); };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;
  const courseboxUrl = extractEmbedUrl(course.coursebox_embed_url);

  const SidebarBody = (
    <>
        <div className="p-4 border-b border-border">
          <Button asChild size="sm" variant="ghost" className="mb-2 -ml-2"><Link to="/aluno"><ArrowLeft className="size-4" /> Meus cursos</Link></Button>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">{course.category}</p>
          <h1 className="font-semibold text-foreground leading-tight mt-0.5">{course.title}</h1>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progresso</span><span className="font-medium text-foreground">{percent}%</span></div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          </div>
          {percent === 100 && (
            <Button asChild variant="hero" size="sm" className="w-full mt-3">
              <Link to={`/aluno/curso/${enrollmentId}/certificado`}><Award className="size-4" /> Ver certificado</Link>
            </Button>
          )}
          {course.live_url && (
            <Button
              asChild
              size="sm"
              className="w-full mt-2"
            >
              <a href={course.live_url} target="_blank" rel="noopener noreferrer">
                <Radio className="size-4 animate-pulse" /> {course.live_label || "Entrar na aula ao vivo"}
              </a>
            </Button>
          )}
          {courseboxUrl && (
            <Button asChild size="sm" className="w-full mt-2">
              <a href={courseboxUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Abrir Coursebox
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handleDownloadApostila}
            disabled={downloadingApostila || sections.length === 0}
          >
            {downloadingApostila ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Baixar apostila (PDF)
          </Button>
        </div>
        {sections.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <BookOpen className="size-8 mx-auto mb-2" />
            Conteúdo em preparação.
          </div>
        ) : (
          <SectionList
            sections={sections}
            currentId={currentId}
            progress={progress}
            onPick={setCurrentId}
          />
        )}
    </>
  );

  return (
    <div className="gamer-shell flex flex-col h-screen bg-background text-foreground">
      <GamerHUD />
      <AvatarTrail total={allLessons.length} completed={completedCount} currentIndex={Math.max(0, currentIdx)} courseTitle={course.title} />
      {/* Top progress strip (Netflix-style) */}
      <div data-xp-anchor className="h-1 w-full bg-muted shrink-0">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <aside className="hidden md:block w-80 bg-card border-r border-border overflow-y-auto flex-shrink-0">
          {SidebarBody}
        </aside>
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 px-3 h-14 bg-card border-b border-border">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm"><ListTree className="size-4" /> Aulas</Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 overflow-y-auto bg-card border-border text-foreground">{SidebarBody}</SheetContent>
          </Sheet>
          <p className="font-medium text-sm truncate text-foreground flex-1 text-right">{course.title}</p>
        </header>

        <main className="flex-1 overflow-y-auto min-w-0 bg-background">
          {courseboxUrl ? (
            <div className="h-full min-h-[720px] flex flex-col">
              <div className="p-4 sm:p-6 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Curso externo</p>
                  <h2 className="text-2xl font-bold text-foreground leading-tight">{course.title}</h2>
                </div>
                <Button asChild>
                  <a href={courseboxUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> Abrir em nova aba
                  </a>
                </Button>
              </div>
              <iframe
                src={courseboxUrl}
                title={course.title}
                className="flex-1 w-full border-0 bg-background"
                allow="fullscreen; clipboard-write"
              />
            </div>
          ) : current ? (
            <LessonView
            key={current.id}
            lesson={current}
            progress={progress[current.id]}
            onComplete={(score) => markCompleted(current.id, score)}
            onNext={currentIdx < allLessons.length - 1 ? goNext : undefined}
            onPrev={currentIdx > 0 ? goPrev : undefined}
            onDownloadApostila={handleDownloadApostila}
            downloadingApostila={downloadingApostila}
            />
          ) : (
            <div className="p-10 text-center text-muted-foreground"><BookOpen className="size-12 mx-auto mb-3" />Nenhuma aula publicada ainda.</div>
          )}
        </main>
        <CourseTutorChat
          course={{ id: course.id, title: course.title, category: course.category }}
          lessonTitle={current?.title}
        />
      </div>
      <CourseFinale
        open={finaleOpen}
        onOpenChange={setFinaleOpen}
        courseId={course.id}
        courseSlug={course.slug}
        courseTitle={course.title}
      />
    </div>
  );
};

const LESSON_LABEL: Record<Lesson["lesson_type"], string> = {
  video: "Vídeo",
  text: "Leitura",
  quiz: "Quiz",
  flip: "Flashcards",
  accordion: "Tópicos",
};

const SectionList = ({
  sections, currentId, progress, onPick,
}: {
  sections: Section[];
  currentId: string | null;
  progress: Record<string, Progress>;
  onPick: (id: string) => void;
}) => {
  // Mantém aberta a seção da aula atual; permite múltiplas abertas.
  const initial = sections
    .filter(s => s.lessons.some(l => l.id === currentId))
    .map(s => s.id);
  const defaultOpen = initial.length ? initial : sections.slice(0, 1).map(s => s.id);
  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      {sections.map((s, sIdx) => {
        const total = s.lessons.length;
        const done = s.lessons.filter(l => progress[l.id]?.completed).length;
        return (
          <AccordionItem key={s.id} value={s.id} className="border-b border-border">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
              <div className="flex-1 text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Módulo {sIdx + 1}</p>
                <p className="font-medium text-sm text-foreground">{s.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{done}/{total} aulas</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <ol className="pb-2">
                {s.lessons.map((l, lIdx) => {
                  const Icon = ICONS[l.lesson_type];
                  const isDone = progress[l.id]?.completed;
                  const active = l.id === currentId;
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => onPick(l.id)}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                          active
                            ? "bg-primary/10 border-l-2 border-primary"
                            : "border-l-2 border-transparent hover:bg-muted/40"
                        }`}
                      >
                        <span className={`mt-0.5 size-6 shrink-0 grid place-items-center rounded-full text-[11px] font-semibold ${
                          isDone
                            ? "bg-primary text-primary-foreground"
                            : active
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {isDone ? <CheckCircle2 className="size-3.5" /> : lIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-tight ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {l.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Icon className="size-3" /> {LESSON_LABEL[l.lesson_type]}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

const LessonView = ({ lesson, progress, onComplete, onNext, onPrev, onDownloadApostila, downloadingApostila }: { lesson: Lesson; progress?: Progress; onComplete: (score?: number) => void; onNext?: () => void; onPrev?: () => void; onDownloadApostila: () => void; downloadingApostila: boolean }) => {
  const done = !!progress?.completed;
  const attachments: { kind: string; title: string; url: string }[] = lesson.content?.attachments ?? [];
  const TypeIcon = ICONS[lesson.lesson_type];
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 space-y-6">
      <div className="flex items-start gap-3">
        <span className="size-10 grid place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
          <TypeIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">{LESSON_LABEL[lesson.lesson_type]}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5 leading-tight">{lesson.title}</h2>
        </div>
      </div>
      {lesson.lesson_type === "video" && <VideoBlock lesson={lesson} done={done} onComplete={() => onComplete()} />}
      {lesson.lesson_type === "text" && <TextBlock lesson={lesson} />}
      {lesson.lesson_type === "quiz" && <QuizBlock lesson={lesson} previousScore={progress?.score ?? null} onPass={(s) => onComplete(s)} />}
      {lesson.lesson_type === "flip" && <FlipBlock lesson={lesson} />}
      {lesson.lesson_type === "accordion" && <AccordionBlock lesson={lesson} />}

      {attachments.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Materiais desta aula</p>
          <ul className="space-y-1.5">
            {attachments.map((a, i) => {
              const Icon = a.kind === "video_link" ? Video : a.kind === "file" ? Paperclip : Link2;
              return (
                <li key={i}>
                  <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <Icon className="size-4" />
                    <span>{a.title}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="pt-2">
        <Button variant="outline" onClick={onDownloadApostila} disabled={downloadingApostila}>
          {downloadingApostila ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Baixar apostila (PDF)
        </Button>
      </div>

      {lesson.lesson_type !== "video" && lesson.lesson_type !== "quiz" && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onPrev} disabled={!onPrev}>
            <ArrowLeft className="size-4" /> Voltar
          </Button>
          <Button variant={done ? "outline" : "hero"} onClick={() => onComplete()}>
            {done ? <><CheckCircle2 className="size-4" /> Concluída</> : "Marcar como concluída"}
          </Button>
          <Button variant="ghost" onClick={onNext} disabled={!onNext}>
            Avançar <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
      {(lesson.lesson_type === "video" || lesson.lesson_type === "quiz") && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onPrev} disabled={!onPrev}>
            <ArrowLeft className="size-4" /> Voltar
          </Button>
          <Button variant="hero" onClick={onNext} disabled={!onNext}>
            Avançar <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const VideoBlock = ({ lesson, done, onComplete }: { lesson: Lesson; done: boolean; onComplete: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!lesson.video_path) return;
      const { data, error } = await supabase.storage.from("course-videos").createSignedUrl(lesson.video_path, 60 * 60 * 4);
      if (!active) return;
      if (error) toast.error(error.message); else setUrl(data.signedUrl);
    })();
    return () => { active = false; };
  }, [lesson.video_path]);

  const yt = lesson.content?.youtube;
  if (yt?.videoId) {
    return (
      <div className="space-y-3">
        <YoutubeEmbed yt={yt} />
        <Button variant={done ? "outline" : "hero"} size="sm" onClick={onComplete}>
          {done ? <><CheckCircle2 className="size-4" /> Concluída</> : "Marcar como concluída"}
        </Button>
      </div>
    );
  }
  if (!lesson.video_path) return <div className="p-6 text-muted-foreground bg-secondary/30 rounded-lg">Vídeo não enviado.</div>;
  if (!url) return <div className="aspect-video bg-black/90 rounded-lg grid place-items-center text-white"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <video ref={ref} src={url} controls className="w-full rounded-lg bg-black"
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (!done && v.duration && v.currentTime / v.duration >= 0.95) onComplete();
      }} />
  );
};

const TextBlock = ({ lesson }: { lesson: Lesson }) => {
  const html: string = lesson.content?.html ?? lesson.content?.body ?? "";
  const flashcards: { front: string; back: string }[] = lesson.content?.flashcards ?? [];
  const quiz: { question: string; options: string[]; answer?: number; correct?: number; explanation?: string }[] =
    lesson.content?.quiz ?? [];
  const theme = lesson.content?.module_theme;
  const toolsImg: string | undefined = lesson.content?.tools_image_url;
  const toolsList: string[] = lesson.content?.tools_list ?? [];
  const videos: { title: string; url: string; why?: string }[] = lesson.content?.video_suggestions ?? [];
  const ModIcon = theme?.icon ? (MODULE_ICONS[theme.icon] ?? BookOpen) : null;
  const themeStyle = theme?.color ? ({ "--lesson-accent": `hsl(${theme.color})` } as React.CSSProperties) : undefined;
  return (
    <div className="lesson-themed space-y-8" style={themeStyle}>
      {theme && (
        <div>
          <span className="lesson-mod-badge">
            {ModIcon && <ModIcon className="size-3.5" />}
            Módulo {theme.module_index} · {theme.label}
          </span>
          <div className="lesson-title-bar" />
        </div>
      )}
      {lesson.content?.youtube?.videoId && <YoutubeEmbed yt={lesson.content.youtube} />}
      {lesson.content?.image_url && !lesson.content?.youtube?.videoId && (
        <figure className="rounded-lg overflow-hidden border border-border">
          <img src={lesson.content.image_url} alt={lesson.title} className="w-full h-auto object-cover" loading="lazy" />
        </figure>
      )}
      {html && (
        <article
          className="lesson-content prose prose-neutral max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/85 prose-li:text-foreground/85 prose-strong:text-foreground prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
      {videos.length > 0 && (
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
        <section className="space-y-3">
          <h3 className="text-lg font-bold">Flashcards de memorização</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {flashcards.map((f, i) => <Flashcard key={i} front={f.front} back={f.back} />)}
          </div>
        </section>
      )}
      {quiz.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold">Verifique seu aprendizado</h3>
          <InlineQuiz questions={quiz.map(q => ({ question: q.question, options: q.options, correct: (q.correct ?? q.answer ?? 0), explanation: q.explanation }))} />
        </section>
      )}
    </div>
  );
};

const Flashcard = ({ front, back }: { front: string; back: string }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <button onClick={() => setFlipped(v => !v)} className="aspect-[4/3] [perspective:1200px] text-left" aria-pressed={flipped}>
      <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div className="absolute inset-0 [backface-visibility:hidden] border border-border rounded-xl p-5 bg-card shadow-sm flex items-center">
          <p className="text-sm">{front}</p>
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border border-primary/40 rounded-xl p-5 bg-secondary/40 shadow-sm flex items-center">
          <p className="text-sm">{back}</p>
        </div>
      </div>
    </button>
  );
};

const InlineQuiz = ({ questions }: { questions: { question: string; options: string[]; correct: number; explanation?: string }[] }) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2 bg-card">
          <p className="font-medium">{i + 1}. {q.question}</p>
          <div className="grid gap-2">
            {q.options.map((opt, j) => {
              const chosen = answers[i] === j;
              const isCorrect = submitted && j === q.correct;
              const isWrong = submitted && chosen && j !== q.correct;
              return (
                <button key={j} type="button" onClick={() => !submitted && setAnswers(a => ({ ...a, [i]: j }))}
                  className={`text-left px-3 py-2 rounded-md border text-sm transition-colors ${isCorrect ? "border-emerald-500 bg-emerald-500/10" : isWrong ? "border-destructive bg-destructive/10" : chosen ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"}`}>
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
        </div>
      ))}
      {!submitted ? (
        <Button variant="hero" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}>Conferir respostas</Button>
      ) : (
        <Button variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }}>Refazer</Button>
      )}
    </div>
  );
};

const YoutubeEmbed = ({ yt }: { yt: { videoId: string; title?: string; channel?: string } }) => (
  <figure className="space-y-2">
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${yt.videoId}?rel=0`}
        title={yt.title ?? "Vídeo do YouTube"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
    {(yt.title || yt.channel) && (
      <figcaption className="text-xs text-muted-foreground">
        {yt.title}{yt.channel ? ` — ${yt.channel}` : ""}
      </figcaption>
    )}
  </figure>
);

const FlipBlock = ({ lesson }: { lesson: Lesson }) => {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const items: { front: string; back: string }[] = lesson.content?.items ?? [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
          className="group aspect-[4/3] [perspective:1200px] text-left"
          aria-pressed={!!flipped[i]}
        >
          <div
            className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
            style={{ transform: flipped[i] ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden] border border-border rounded-xl p-6 bg-card shadow-sm flex flex-col">
              <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-muted-foreground">Frente · clique p/ virar</span>
              <p className="text-base whitespace-pre-wrap mt-6 flex-1 overflow-auto">{it.front}</p>
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border border-primary/40 rounded-xl p-6 bg-secondary/40 shadow-sm flex flex-col">
              <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-muted-foreground">Verso · clique p/ virar</span>
              <p className="text-base whitespace-pre-wrap mt-6 flex-1 overflow-auto">{it.back}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const AccordionBlock = ({ lesson }: { lesson: Lesson }) => {
  const items: { title: string; body: string }[] = lesson.content?.items ?? [];
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((it, i) => (
        <AccordionItem key={i} value={`i-${i}`}>
          <AccordionTrigger>{it.title}</AccordionTrigger>
          <AccordionContent className="whitespace-pre-wrap">{it.body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

const QuizBlock = ({ lesson, previousScore, onPass }: { lesson: Lesson; previousScore: number | null; onPass: (score: number) => void }) => {
  const questions: { question: string; options: string[]; correct: number }[] = lesson.content?.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(previousScore);

  const submit = () => {
    if (Object.keys(answers).length < questions.length) return toast.error("Responda todas as perguntas");
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const s = Math.round((correct / questions.length) * 100);
    setScore(s); setSubmitted(true);
    if (s >= (lesson.passing_score ?? 70)) onPass(s);
    else toast.error(`Nota ${s}% — mínimo ${lesson.passing_score}%. Tente novamente.`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Nota mínima: {lesson.passing_score}%. {previousScore !== null && `Sua melhor nota: ${previousScore}%.`}</p>
      {questions.map((q, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2">
          <p className="font-medium">{i + 1}. {q.question}</p>
          {q.options.map((opt, oi) => {
            const checked = answers[i] === oi;
            const isCorrect = submitted && oi === q.correct;
            const isWrong = submitted && checked && oi !== q.correct;
            return (
              <label key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${isCorrect ? "border-green-500 bg-green-50" : isWrong ? "border-red-500 bg-red-50" : checked ? "border-primary bg-secondary/40" : "border-border hover:bg-secondary/30"}`}>
                <input type="radio" name={`q-${i}`} checked={checked} disabled={submitted}
                  onChange={() => setAnswers(a => ({ ...a, [i]: oi }))} />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      ))}
      {!submitted ? (
        <Button variant="hero" onClick={submit}>Enviar respostas</Button>
      ) : (
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${score! >= (lesson.passing_score ?? 70) ? "text-green-600" : "text-red-600"}`}>
            Nota: {score}% {score! >= (lesson.passing_score ?? 70) ? "✓ Aprovado" : "✗ Refazer"}
          </span>
          <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setAnswers({}); }}>Tentar novamente</Button>
        </div>
      )}
    </div>
  );
};

export default CursoPlayer;