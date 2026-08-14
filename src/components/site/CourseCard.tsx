import { ArrowRight, Clock, Copy, ExternalLink, FileText, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { DbCourse } from "@/hooks/useCourses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { toast as sonner } from "sonner";
import placeholder from "@/assets/course-tecnico.jpg";

const resolveImage = (url: string | null) => {
  if (!url) return placeholder;
  if (url.startsWith("/src/assets/")) return placeholder;
  return url;
};

const formatPrice = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const CourseCard = ({ course }: { course: DbCourse }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(resolveImage(course.image_url));
  const hasPrice = !!course.price_cents && course.price_cents > 0;
  const slug = (course.slug ?? "").toLowerCase();
  const isNrHighlight = slug === "nr-10" || slug === "nr-35";
  const whatsappUrl = `https://wa.me/5518996841902?text=${encodeURIComponent(
    `Olá! Quero desconto no curso ${course.title}.`,
  )}`;

  const buy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", { body: { course_id: course.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data.init_point || data.sandbox_init_point;
      if (!url) throw new Error("Link de pagamento indisponível");
      window.location.href = url;
    } catch (e: any) {
      toast({ title: "Não foi possível iniciar o pagamento", description: e.message ?? "Tente novamente.", variant: "destructive" });
      setLoading(false);
    }
  };

  const copyMatriculaLink = async () => {
    const url = `${window.location.origin}/matricula/${course.slug}`;
    await navigator.clipboard.writeText(url);
    sonner.success("Link da pré-matrícula copiado!");
  };

  return (
  <article className="game-card group rounded-xl overflow-hidden transition-smooth flex flex-col h-full">
    <div className="aspect-[4/3] overflow-hidden relative bg-secondary">
      <span className="game-card__badge">{course.category}</span>
      <img
        src={imgSrc}
        alt={course.title}
        loading="lazy"
        onError={() => setImgSrc(placeholder)}
        className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
      />
      {isNrHighlight && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-0 right-0 mx-3 rounded-md bg-yellow-400 text-black text-xs font-extrabold uppercase tracking-wide py-1.5 px-2 text-center animate-nr-blink border border-yellow-500 hover:bg-yellow-300 transition-colors"
          title="Fale no WhatsApp e ganhe desconto"
        >
          🔥 Desconto especial — Fale no WhatsApp
        </a>
      )}
    </div>
    <div className="p-6 space-y-3 flex flex-col flex-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary-glow">{course.category}</span>
      <h3 className="text-xl font-bold text-primary leading-snug">{course.title}</h3>
      {course.description && <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        {course.duration && <span className="flex items-center gap-1"><Clock className="size-4" />{course.duration}</span>}
        {hasPrice && <span className="font-bold text-primary text-base">{formatPrice(course.price_cents!)}</span>}
      </div>
      {hasPrice ? (
        <>
          <Button onClick={buy} disabled={loading} variant="hero" className="w-full mt-3">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><ShoppingCart className="size-4" /> Comprar agora</>}
          </Button>
          <div className="flex gap-2 mt-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/matricula/${course.slug}`}><FileText className="size-4" /> Pré-matrícula</Link>
            </Button>
            <Button variant="outline" size="icon" onClick={copyMatriculaLink} title="Copiar link da pré-matrícula">
              <Copy className="size-4" />
            </Button>
          </div>
        </>
      ) : course.external_url ? (
        <>
          <Button asChild variant="hero" className="w-full mt-3">
            <a href={course.external_url} target="_blank" rel="noopener noreferrer">
              Matricular-se <ExternalLink className="size-4" />
            </a>
          </Button>
          <div className="flex gap-2 mt-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/matricula/${course.slug}`}><FileText className="size-4" /> Pré-matrícula</Link>
            </Button>
            <Button variant="outline" size="icon" onClick={copyMatriculaLink} title="Copiar link da pré-matrícula">
              <Copy className="size-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button asChild variant="hero" className="w-full mt-3">
            <Link to={`/matricula/${course.slug}`}>
              <FileText className="size-4" /> Fazer pré-matrícula
            </Link>
          </Button>
          <Button variant="outline" className="w-full mt-2" onClick={copyMatriculaLink}>
            <Copy className="size-4" /> Copiar link da pré-matrícula
          </Button>
        </>
      )}
    </div>
  </article>
);
};