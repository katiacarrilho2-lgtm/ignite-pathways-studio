import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ShieldCheck, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import {
  CERTIFICACAO_DEFAULTS, SECTION_CERTIFICACAO, CertificacaoSettings, fetchSection,
} from "@/lib/siteSettings";
import { fetchLivreCourses, LivreCourse, setPageMeta } from "@/lib/livre";
import { formatBRL, precoVigenteCents } from "@/lib/cursoLivre";

const normalize = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CourseCard = ({ c }: { c: LivreCourse }) => {
  const vigente = precoVigenteCents(c);
  const promo = vigente != null && c.price_cents != null && vigente < c.price_cents;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-elegant">
      <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
        {c.image_url ? (
          <img
            src={c.image_url}
            alt={`Imagem do curso ${c.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-primary text-primary-foreground">
            <span className="px-4 text-center text-sm font-semibold uppercase tracking-wide">{c.title}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {c.category && (
            <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">{c.category}</Badge>
          )}
          {!c.active && <Badge className="bg-gold text-gold-foreground text-[11px]">Pré-visualização</Badge>}
        </div>
        <h3 className="text-lg font-bold leading-snug text-primary">{c.title}</h3>
        {c.description && <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            {promo && (
              <span className="block text-xs text-muted-foreground line-through">{formatBRL(c.price_cents)}</span>
            )}
            <span className="text-xl font-extrabold text-primary">{formatBRL(vigente)}</span>
          </div>
          <Button asChild variant="hero" size="sm">
            <Link to={`/certifique-sua-experiencia/${c.slug}`}>VER CURSO</Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

const CertifiqueSuaExperiencia = () => {
  const [params] = useSearchParams();
  const { isStaff } = useAuth();
  const preview = params.get("preview") === "1" && isStaff;
  const [settings, setSettings] = useState<CertificacaoSettings>(CERTIFICACAO_DEFAULTS);
  const [courses, setCourses] = useState<LivreCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [cat, setCat] = useState<string>("todas");

  useEffect(() => {
    let alive = true;
    fetchSection<CertificacaoSettings>(
      SECTION_CERTIFICACAO,
      CERTIFICACAO_DEFAULTS,
      preview ? "draft" : "published",
    ).then((v) => { if (alive) setSettings(v); });
    return () => { alive = false; };
  }, [preview]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLivreCourses(preview).then((list) => {
      if (alive) { setCourses(list); setLoading(false); }
    });
    return () => { alive = false; };
  }, [preview]);

  useEffect(() => {
    const titulo = [settings.hero_title, settings.hero_title_highlight].filter(Boolean).join(" ");
    setPageMeta(
      `${titulo} | Multplick Formação Profissional`,
      settings.hero_description || "Encontre cursos livres em diversas áreas e confira as opções disponíveis na Multplick Formação Profissional.",
    );
  }, [settings]);

  const categories = useMemo(
    () => Array.from(new Set(courses.map((c) => c.category).filter(Boolean) as string[])),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = normalize(term.trim());
    return courses.filter((c) => {
      if (cat !== "todas" && c.category !== cat) return false;
      if (!q) return true;
      const haystack = normalize([c.title, c.category, c.description, c.long_description].filter(Boolean).join(" "));
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [courses, term, cat]);

  const menorPreco = useMemo(() => {
    const valores = courses.map((c) => precoVigenteCents(c) ?? 0).filter((v) => v > 0);
    return valores.length ? Math.min(...valores) : null;
  }, [courses]);

  const chamadaPreco = settings.price_label.trim()
    ? settings.price_label.replace(/\{preco\}/gi, formatBRL(menorPreco ?? settings.price_fallback_cents))
    : "";

  const conteudo = (
    <>
      {/* Busca */}
      <section className="mx-auto -mt-8 max-w-3xl px-5">
        <label htmlFor="busca-curso" className="sr-only">Buscar curso</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="busca-curso"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={settings.search_placeholder}
            className="h-14 rounded-2xl border-border bg-card pl-12 text-base shadow-elegant"
          />
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto max-w-6xl px-5 pt-6">
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={cat === "todas" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setCat("todas")}
          >
            Todas as áreas
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              variant={cat === c ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </section>

      {/* Cards */}
      <main className="mx-auto max-w-6xl px-5 py-10">
        {loading ? (
          <p className="py-16 text-center text-muted-foreground">Carregando cursos…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="font-medium text-primary">{settings.empty_title}</p>
            {settings.empty_hint && (
              <p className="mt-1 text-sm text-muted-foreground">{settings.empty_hint}</p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => <CourseCard key={c.id} c={c} />)}
          </div>
        )}
      </main>
    </>
  );

  return (
    <div className="bg-background">
      {preview && (
        <div className="flex items-center justify-center gap-2 bg-gold px-4 py-2 text-center text-sm font-medium text-gold-foreground">
          <Eye className="size-4" /> Modo de pré-visualização da sede — inclui cursos ainda não publicados.
        </div>
      )}

      {/* Hero */}
      <header className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-5xl px-5 py-14 text-center text-primary-foreground sm:py-20">
          {settings.hero_eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]">
              <ShieldCheck className="size-3.5" /> {settings.hero_eyebrow}
            </span>
          )}
          <h1 className="mt-6 whitespace-pre-line text-3xl font-extrabold leading-tight sm:text-5xl">
            {settings.hero_title}
            {settings.hero_title_highlight && (
              <><br /><span className="text-gold">{settings.hero_title_highlight}</span></>
            )}
          </h1>
          {settings.hero_description && (
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              {settings.hero_description}
            </p>
          )}
          {chamadaPreco && (
            <p className="mt-7 inline-block rounded-xl border border-gold/40 bg-white/10 px-5 py-3 text-base font-bold text-gold sm:text-lg">
              {chamadaPreco}
            </p>
          )}
          {settings.price_note && (
            <p className="mt-3 text-[11px] text-white/60">{settings.price_note}</p>
          )}
        </div>
      </header>

      <SiteBlocks blocks={settings.blocks} slots={{ conteudo }} />
    </div>
  );
};

export default CertifiqueSuaExperiencia;
