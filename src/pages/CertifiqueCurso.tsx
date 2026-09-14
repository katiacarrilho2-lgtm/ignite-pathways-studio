import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, ClipboardList, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchLivreCourseBySlug, LivreCourse, setPageMeta } from "@/lib/livre";
import { formatBRL, precoVigenteCents, TIPO_LABEL } from "@/lib/cursoLivre";

type ExamInfo = { qtd_questoes: number; nota_minima: number; tentativas_permitidas: number; tempo_minutos: number | null; ativo: boolean } | null;

const CertifiqueCurso = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const { isStaff } = useAuth();
  const preview = params.get("preview") === "1" && isStaff;
  const [course, setCourse] = useState<LivreCourse | null>(null);
  const [exam, setExam] = useState<ExamInfo>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const c = slug ? await fetchLivreCourseBySlug(slug, preview) : null;
      if (!alive) return;
      setCourse(c);
      setLoading(false);
      if (c) {
        setPageMeta(
          `${c.title} | Multplick Formação Profissional`,
          c.description ?? "Confira as opções disponíveis na Multplick Formação Profissional.",
        );
        const { data } = await supabase
          .from("exam_configs")
          .select("qtd_questoes, nota_minima, tentativas_permitidas, tempo_minutos, ativo")
          .eq("course_id", c.id)
          .maybeSingle();
        if (alive) setExam((data as ExamInfo) ?? null);
      }
    })();
    return () => { alive = false; };
  }, [slug, preview]);

  if (loading) return <p className="py-24 text-center text-muted-foreground">Carregando…</p>;

  if (!course) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold text-primary">Curso não disponível</h1>
        <p className="mt-2 text-muted-foreground">Este curso não está disponível para compra no momento.</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/certifique-sua-experiencia">Ver cursos</Link></Button>
      </div>
    );
  }

  const vigente = precoVigenteCents(course);
  const promo = vigente != null && course.price_cents != null && vigente < course.price_cents;
  const previewSuffix = preview ? "?preview=1" : "";

  return (
    <div className="bg-background">
      {preview && (
        <div className="flex items-center justify-center gap-2 bg-gold px-4 py-2 text-center text-sm font-medium text-gold-foreground">
          <Eye className="size-4" /> Pré-visualização da sede — curso ainda não publicado.
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 py-8">
        <Link to={`/certifique-sua-experiencia${previewSuffix}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Voltar para os cursos
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
              {course.image_url ? (
                <img src={course.image_url} alt={`Imagem do curso ${course.title}`} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-gradient-primary p-6 text-center text-xl font-bold text-primary-foreground">
                  {course.title}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {course.category && <Badge variant="secondary">{course.category}</Badge>}
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {TIPO_LABEL[course.tipo_curso ?? "curso_livre"] ?? "Curso Livre"}
              </Badge>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-primary sm:text-4xl">{course.title}</h1>
            {course.description && <p className="mt-4 text-muted-foreground">{course.description}</p>}
            {course.long_description && (
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">{course.long_description}</div>
            )}

            <section className="mt-8 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold text-primary">O que você encontrará</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><BadgeCheck className="mt-0.5 size-4 text-gold" /> Formação livre da Multplick Formação Profissional.</li>
                {course.exige_avaliacao && (
                  <li className="flex gap-2"><ClipboardList className="mt-0.5 size-4 text-gold" /> Avaliação de conhecimentos online, corrigida pelo sistema.</li>
                )}
                {course.carga_horaria_horas ? (
                  <li className="flex gap-2"><Clock className="mt-0.5 size-4 text-gold" /> Carga horária: {course.carga_horaria_horas} horas.</li>
                ) : null}
              </ul>
              {exam?.ativo && (
                <div className="mt-4 rounded-xl bg-secondary p-4 text-sm">
                  <p className="font-semibold text-primary">Sobre a avaliação</p>
                  <p className="mt-1 text-muted-foreground">
                    {exam.qtd_questoes} questões · nota mínima {exam.nota_minima} · {exam.tentativas_permitidas} tentativa(s)
                    {exam.tempo_minutos ? ` · ${exam.tempo_minutos} minutos` : " · sem limite de tempo"}.
                  </p>
                </div>
              )}
              {course.emite_certificado_automatico && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Certificado disponível após cumprimento dos critérios e aprovação.
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              {promo && <p className="text-sm text-muted-foreground line-through">{formatBRL(course.price_cents)}</p>}
              <p className="text-3xl font-extrabold text-primary">{formatBRL(vigente)}</p>
              {promo && <p className="mt-1 text-xs font-semibold text-gold">Valor promocional válido por tempo limitado.</p>}
              <Button asChild variant="hero" size="lg" className="mt-5 w-full">
                <Link to={`/checkout/${course.slug}${previewSuffix}`}>QUERO COMEÇAR</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Você fará o cadastro e conferirá o resumo antes de qualquer pagamento.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CertifiqueCurso;
