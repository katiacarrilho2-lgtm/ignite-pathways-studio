import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, CheckCircle2, Circle, Video, FileText, HelpCircle, RotateCw, Rows, BookOpen, Loader2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useRef } from "react";

type Lesson = {
  id: string; section_id: string; title: string;
  lesson_type: "video" | "text" | "quiz" | "flip" | "accordion";
  sort_order: number; content: any; video_path: string | null;
  duration_seconds: number | null; passing_score: number;
};
type Section = { id: string; title: string; sort_order: number; lessons: Lesson[] };

const ICONS = { video: Video, text: FileText, quiz: HelpCircle, flip: RotateCw, accordion: Rows } as const;

const Inner = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!courseId) return;
      const { data: c } = await supabase.from("courses").select("id, title, category, passing_score, published").eq("id", courseId).maybeSingle();
      if (!c) { toast.error("Curso não encontrado"); setLoading(false); return; }
      setCourse(c);
      const { data: ss } = await supabase.from("course_sections").select("*").eq("course_id", courseId).order("sort_order");
      const sectionIds = (ss ?? []).map((s: any) => s.id);
      const { data: ls } = sectionIds.length
        ? await supabase.from("course_lessons").select("*").in("section_id", sectionIds).order("sort_order")
        : { data: [] as any[] };
      const sList: Section[] = (ss ?? []).map((s: any) => ({ ...s, lessons: (ls ?? []).filter((l: any) => l.section_id === s.id) }));
      setSections(sList);
      setCurrentId(ls?.[0]?.id ?? null);
      setLoading(false);
    })();
  }, [courseId]);

  const allLessons = useMemo(() => sections.flatMap(s => s.lessons), [sections]);
  const current = allLessons.find(l => l.id === currentId);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100">
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500 shrink-0" />
      <div className="flex flex-1 min-h-0">
        <aside className="w-80 bg-zinc-950 border-r border-zinc-800 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <Button asChild size="sm" variant="ghost" className="mb-2 -ml-2 text-zinc-300 hover:text-white hover:bg-zinc-800">
              <Link to={`/admin/cursos/${courseId}/conteudo`}><ArrowLeft className="size-4" /> Voltar ao editor</Link>
            </Button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Eye className="size-3" /> Modo pré-visualização
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.18em]">{course.category}</p>
            <h1 className="font-semibold text-white leading-tight mt-0.5">{course.title}</h1>
          </div>
          {sections.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              <BookOpen className="size-8 mx-auto mb-2" />
              Sem conteúdo ainda.
            </div>
          ) : sections.map(s => (
            <div key={s.id} className="border-b border-zinc-800/60">
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 bg-zinc-900/60">{s.title}</div>
              {s.lessons.map(l => {
                const Icon = ICONS[l.lesson_type];
                const active = l.id === currentId;
                return (
                  <button key={l.id} onClick={() => setCurrentId(l.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${active ? "bg-zinc-800 border-l-2 border-red-500 text-white" : "border-l-2 border-transparent text-zinc-300 hover:bg-zinc-800/60 hover:text-white"}`}>
                    <Circle className="size-4 text-zinc-600 shrink-0" />
                    <Icon className="size-4 text-zinc-500 shrink-0" />
                    <span className="flex-1">{l.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto bg-black">
          {current ? <LessonPreview key={current.id} lesson={current} /> : (
            <div className="p-10 text-center text-zinc-500"><BookOpen className="size-12 mx-auto mb-3" />Nenhuma aula ainda.</div>
          )}
        </main>
      </div>
    </div>
  );
};

const LessonPreview = ({ lesson }: { lesson: Lesson }) => (
  <div className="max-w-5xl mx-auto p-8 md:p-10 space-y-6">
    <div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Aula</p>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">{lesson.title}</h2>
    </div>
    {lesson.lesson_type === "video" && <VideoBlock lesson={lesson} />}
    {lesson.lesson_type === "text" && (
      <>
        {lesson.content?.youtube?.videoId && <YoutubeEmbed yt={lesson.content.youtube} />}
        <article className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-white prose-a:text-red-400" dangerouslySetInnerHTML={{ __html: lesson.content?.html ?? "" }} />
      </>
    )}
    {lesson.lesson_type === "quiz" && (
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">Nota mínima: {lesson.passing_score}% · (preview — respostas não são salvas)</p>
        {(lesson.content?.questions ?? []).map((q: any, i: number) => (
          <div key={i} className="border border-zinc-800 rounded-lg p-4 space-y-2 bg-zinc-900/40">
            <p className="font-medium text-zinc-100">{i + 1}. {q.question}</p>
            {q.options.map((opt: string, oi: number) => (
              <label key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-md border ${oi === q.correct ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-zinc-800 text-zinc-300"}`}>
                <input type="radio" disabled /> <span className="text-sm">{opt}</span>
                {oi === q.correct && <CheckCircle2 className="size-4 text-emerald-400 ml-auto" />}
              </label>
            ))}
          </div>
        ))}
      </div>
    )}
    {lesson.lesson_type === "flip" && (
      <FlipPreview items={lesson.content?.items ?? []} />
    )}
    {lesson.lesson_type === "accordion" && (
      <Accordion type="single" collapsible className="w-full">
        {(lesson.content?.items ?? []).map((it: any, i: number) => (
          <AccordionItem key={i} value={`i-${i}`}>
            <AccordionTrigger>{it.title}</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">{it.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )}
  </div>
);

const VideoBlock = ({ lesson }: { lesson: Lesson }) => {
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    (async () => {
      if (!lesson.video_path) return;
      const { data, error } = await supabase.storage.from("course-videos").createSignedUrl(lesson.video_path, 60 * 60);
      if (error) toast.error(error.message); else setUrl(data.signedUrl);
    })();
  }, [lesson.video_path]);
  const yt = (lesson.content as any)?.youtube;
  if (yt?.videoId) return <YoutubeEmbed yt={yt} />;
  if (!lesson.video_path) return <div className="p-6 text-muted-foreground bg-secondary/30 rounded-lg">Vídeo não enviado.</div>;
  if (!url) return <div className="aspect-video bg-black/90 rounded-lg grid place-items-center text-white"><Loader2 className="size-6 animate-spin" /></div>;
  return <video ref={ref} src={url} controls className="w-full rounded-lg bg-black" />;
};

const YoutubeEmbed = ({ yt }: { yt: { videoId: string; title?: string; channel?: string; url?: string } }) => (
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
        {yt.title}{yt.channel ? ` · ${yt.channel}` : ""}
      </figcaption>
    )}
  </figure>
);

const FlipPreview = ({ items }: { items: { front: string; back: string }[] }) => {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
          className="aspect-[4/3] [perspective:1200px] text-left"
        >
          <div
            className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
            style={{ transform: flipped[i] ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden] border border-border rounded-xl p-6 bg-card shadow-sm flex flex-col">
              <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-muted-foreground">Frente · clique p/ virar</span>
              <p className="whitespace-pre-wrap mt-6 flex-1 overflow-auto">{it.front}</p>
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border border-primary/40 rounded-xl p-6 bg-secondary/40 shadow-sm flex flex-col">
              <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-muted-foreground">Verso · clique p/ virar</span>
              <p className="whitespace-pre-wrap mt-6 flex-1 overflow-auto">{it.back}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const AdminCursoPreview = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminCursoPreview;