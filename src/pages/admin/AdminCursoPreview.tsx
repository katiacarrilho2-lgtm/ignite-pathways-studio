import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, FileText, HelpCircle, Layers } from "lucide-react";

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
            <LessonView lesson={active} />
          )}
        </main>
      </div>
    </div>
  );
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const yt = lesson.content?.youtube;
  const body: string | undefined = lesson.content?.body;
  const imageUrl: string | undefined = lesson.content?.image_url;
  const flashcards: Array<{ front: string; back: string }> = lesson.content?.flashcards ?? [];
  const quiz: Array<{ question: string; options: string[]; answer: number; explanation?: string }> =
    lesson.content?.quiz ?? lesson.content?.questions ?? [];

  return (
    <article className="space-y-6 max-w-3xl">
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
        <figure className="rounded-lg overflow-hidden border border-border">
          <img src={imageUrl} alt={lesson.title} className="w-full h-auto object-cover" loading="lazy" />
        </figure>
      )}

      {body && (
        <div
          className="lesson-content prose prose-neutral max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: body }}
        />
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
              <QuizItem key={i} index={i} question={q.question} options={q.options} answer={q.answer} explanation={q.explanation} />
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
