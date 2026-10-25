import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/PageHero";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, CURSOS_DEFAULTS, PageSettings } from "@/lib/siteSettings";
import { CourseCard } from "@/components/site/CourseCard";
import { useCourses } from "@/hooks/useCourses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InstitutionBadge, INSTITUICAO_LABEL } from "@/components/site/InstitutionBadge";
import { ExternalLink, Loader2, Search, X } from "lucide-react";

const CATALOG_URL = "https://licenciado.laeducacao.com.br/catalogo-la";

type DbCategory = { id: string; name: string; slug: string; sort_order: number };
const slugId = (key: string) => `grupo-${key}`;

const Cursos = () => {
  const [filter, setFilter] = useState<string>("Todos");
  const [query, setQuery] = useState("");
  const { courses, loading } = useCourses();
  const { value: site } = useSiteSection<PageSettings>(PAGE_SECTIONS.cursos, CURSOS_DEFAULTS);
  const [dbCats, setDbCats] = useState<DbCategory[]>([]);

  useEffect(() => {
    supabase.from("course_categories").select("id,name,slug,sort_order").eq("active", true).order("sort_order")
      .then(({ data }) => setDbCats((data ?? []) as DbCategory[]));
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = courses.filter((c) => !/\beja\b/i.test(c.category ?? "") && (!q || c.title.toLowerCase().includes(q)));
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const groupOf = (c: typeof courses[number]) => {
      const cat = norm(c.category ?? ""), t = norm(c.title);
      if (cat.includes("pos")) return "pos";
      if (cat.includes("gradua")) return "graduacao";
      if (cat.includes("compet") || t.includes("competencia")) return "competencia";
      if (cat.includes("tecnic") || /^(curso )?tecnico\b/.test(t)) return "tecnicos";
      return "profissionalizantes";
    };
    const defs = [
      { key: "tecnicos", label: "Técnicos Regulares" },
      { key: "competencia", label: "Técnicos por Competência" },
      { key: "graduacao", label: "Graduação" },
      { key: "pos", label: "Pós-Graduação e MBA" },
      { key: "profissionalizantes", label: "Profissionalizantes" },
    ];
    void dbCats;
    return defs.map((d) => ({ ...d, items: source.filter((c) => groupOf(c) === d.key) })).filter((g) => g.items.length > 0);
  }, [courses, dbCats, query]);

  const visibleGroups = useMemo(
    () => (filter === "Todos" ? grouped : grouped.filter((g) => g.key === filter)),
    [filter, grouped]
  );

  return (
    <>
      <PageHero eyebrow={site.hero_eyebrow} title={site.hero_title} description={site.hero_description} />
      <SiteBlocks blocks={site.blocks} slots={{ conteudo: (
      <section className="py-12 container">
        {/* Search */}
        <div className="mb-8 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar curso pelo nome..."
              className="pl-10 pr-10 h-12 text-base"
              aria-label="Pesquisar curso"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-10 rounded-2xl bg-primary-gradient text-primary-foreground p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-elegant">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Catálogo completo de cursos</h2>
            <p className="text-primary-foreground/85 max-w-2xl">
              Acesse o catálogo oficial Multplick e contrate seu curso diretamente, com matrícula 100% online.
            </p>
          </div>
          <Button asChild variant="silver" size="lg" className="shrink-0">
            <a href={CATALOG_URL} target="_blank" rel="noopener noreferrer">
              Acessar Catálogo <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <button
            onClick={() => setFilter("Todos")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth border ${
              filter === "Todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary-glow"
            }`}
          >
            Todos
          </button>
          {grouped.map((g) => (
            <button
              key={g.key}
              onClick={() => {
                setFilter("Todos");
                setTimeout(() => document.getElementById(slugId(g.key))?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth border ${
                filter === g.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary-glow"
              }`}
            >
              {g.label} <span className="opacity-60">({g.items.length})</span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="py-20 grid place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <>
          <div className="mb-8 rounded-xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Quem emite o certificado de cada curso:</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {(["U","FL","U/FL","M"] as const).map((v) => (
                <span key={v} className="flex items-center gap-2"><InstitutionBadge value={v} size="sm" /> {INSTITUICAO_LABEL[v]}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              A Multplick é uma instituição com faculdades parceiras: cursos técnicos, graduações e pós-graduações são ministrados e certificados pela faculdade parceira indicada, 100% EAD. Toda matrícula é formalizada em contrato, garantindo a segurança do aluno.
            </p>
          </div>
          <Accordion type="multiple" defaultValue={query ? visibleGroups.map((g) => g.key) : []} key={query ? "q" : "n"} className="space-y-4">
            {visibleGroups.map((g) => (
              <AccordionItem key={g.key} value={g.key} id={slugId(g.key)} className="scroll-mt-24 rounded-xl border border-border bg-card px-5">
                <AccordionTrigger className="text-xl md:text-2xl font-bold text-primary hover:no-underline">
                  <span>{g.label} <span className="text-sm font-normal text-muted-foreground">({g.items.length} {g.items.length === 1 ? "curso" : "cursos"})</span></span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 pb-4">
                    {g.items.map((c) => <CourseCard key={c.id} course={c} />)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
            {visibleGroups.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">Nenhum curso disponível no momento.</div>
            )}
          </>
        )}
      </section>
      ) }} />
    </>
  );
};
export default Cursos;