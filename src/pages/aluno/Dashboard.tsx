import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, PlayCircle, ChevronLeft, ChevronRight, Sparkles, Award, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Enrollment = {
  id: string; progress: number; status: string; enrolled_at: string; course_id: string; certificate_authorized?: boolean;
  courses: { id: string; title: string; category: string; slug: string; image_url: string | null; duration: string | null; description: string | null; published: boolean } | null;
};

const AlunoDashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: enr, error: e1 } = await supabase
        .from("enrollments")
        .select("id, progress, status, enrolled_at, course_id, certificate_authorized, courses ( id, title, category, slug, image_url, duration, description, published )")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });
      if (e1) toast.error(e1.message);
      setEnrollments((enr as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Hero: último curso em andamento (não concluído); fallback para o primeiro matriculado.
  const ownedEnrollments = useMemo(
    () => enrollments.filter(e => e.courses?.published),
    [enrollments],
  );
  const heroEnrollment = useMemo(
    () => ownedEnrollments.find(e => e.progress < 100) ?? ownedEnrollments[0] ?? null,
    [ownedEnrollments],
  );
  const heroCourse = heroEnrollment?.courses ?? null;

  // Agrupa por categoria apenas cursos comprados pelo aluno.
  const byCategory = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    for (const e of ownedEnrollments) {
      const cat = e.courses!.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(e);
    }
    return Array.from(map.entries());
  }, [ownedEnrollments]);

  if (loading) {
    return <div className="min-h-screen bg-background text-muted-foreground grid place-items-center">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      {heroCourse && (
        <section className="relative w-full h-[52vh] min-h-[380px] max-h-[560px] overflow-hidden">
          {heroCourse.image_url ? (
            <img
              src={heroCourse.image_url}
              alt={heroCourse.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-muted to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative h-full max-w-7xl mx-auto flex flex-col justify-end px-6 sm:px-10 pb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-3">
              <Sparkles className="size-3" /> {heroEnrollment!.progress > 0 ? "Continue de onde parou" : "Comece agora"}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground max-w-3xl leading-tight">
              {heroCourse.title}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2">{heroCourse.category}</p>
            <p className="mt-4 text-muted-foreground max-w-xl line-clamp-3 text-sm sm:text-base">
              {heroCourse.description || "Inicie sua jornada de aprendizado agora."}
            </p>

            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Seu progresso</span>
                <span className="font-semibold text-foreground">{heroEnrollment!.progress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${heroEnrollment!.progress}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <Button asChild size="lg" className="font-semibold">
                <Link to={`/aluno/curso/${heroEnrollment!.id}`}>
                  <PlayCircle className="size-5" /> {heroEnrollment!.progress > 0 ? "Continuar estudando" : "Iniciar curso"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 space-y-10">
        {/* Meus cursos por categoria */}
        {byCategory.map(([cat, items]) => (
          <CourseRow
            key={cat}
            title={cat}
            items={items.map(e => ({
              key: e.id,
              to: `/aluno/curso/${e.id}`,
              title: e.courses!.title,
              image_url: e.courses!.image_url,
              category: e.courses!.category,
              progress: e.progress,
              enrollmentId: e.id,
              certAuthorized: e.certificate_authorized !== false,
            }))}
          />
        ))}

        {ownedEnrollments.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <BookOpen className="size-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold text-foreground">Você ainda não possui cursos</h2>
            <p className="text-muted-foreground mb-4">Assim que adquirir um curso, ele aparecerá aqui.</p>
            <Button asChild><Link to="/cursos">Ver catálogo</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
};

type RowItem = {
  key: string; to: string; title: string; image_url: string | null;
  category: string; progress?: number; duration?: string | null;
  enrollmentId?: string; certAuthorized?: boolean;
};

const CourseRow = ({ title, items }: { title: string; items: RowItem[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="group/row">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h2>
        <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button onClick={() => scroll("left")} className="size-9 grid place-items-center rounded-full bg-muted hover:bg-muted/70 text-foreground border border-border">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => scroll("right")} className="size-9 grid place-items-center rounded-full bg-muted hover:bg-muted/70 text-foreground border border-border">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(it => (
          <CourseCard key={it.key} item={it} />
        ))}
      </div>
    </section>
  );
};

const CourseCard = ({ item: it }: { item: RowItem }) => {
  const concluido = typeof it.progress === "number" && it.progress >= 100;
  return (
    <div className="group/card snap-start shrink-0 w-[260px] sm:w-[300px] relative rounded-lg overflow-hidden bg-card ring-1 ring-border hover:ring-2 hover:ring-primary hover:scale-[1.02] transition-all duration-200 shadow-sm">
      <Link to={it.to} className="block aspect-[16/9] relative">
        {it.image_url ? (
          <img src={it.image_url} alt={it.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground bg-muted"><BookOpen className="size-12" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute top-2 left-2">
          {concluido ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold shadow"><CheckCircle2 className="size-3" /> Concluído</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow"><PlayCircle className="size-3" /> Em andamento • {it.progress ?? 0}%</span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/80 line-clamp-1">{it.category}</p>
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mt-0.5 drop-shadow">{it.title}</h3>
          {typeof it.progress === "number" && !concluido && (
            <div className="mt-2">
              <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${it.progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </Link>
      {concluido && it.enrollmentId && (
        <div className="p-2 border-t border-border bg-card">
          {it.certAuthorized ? (
            <Button asChild size="sm" className="w-full" variant="hero">
              <Link to={`/aluno/curso/${it.enrollmentId}/certificado`}><Award className="size-4" /> Gerar certificado</Link>
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground py-1.5 rounded bg-muted/50">
              <Lock className="size-3.5" /> Pedir o certificado na secretaria
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlunoDashboard;