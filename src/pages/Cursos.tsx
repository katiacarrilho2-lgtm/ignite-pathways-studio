import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/PageHero";
import { CourseCard } from "@/components/site/CourseCard";
import { useCourses } from "@/hooks/useCourses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, Search, X } from "lucide-react";

const CATALOG_URL = "https://licenciado.laeducacao.com.br/catalogo-la";

type DbCategory = { id: string; name: string; slug: string; sort_order: number };
const slugId = (key: string) => `grupo-${key}`;

const Cursos = () => {
  const [filter, setFilter] = useState<string>("Todos");
  const [query, setQuery] = useState("");
  const { courses, loading } = useCourses();
  const [dbCats, setDbCats] = useState<DbCategory[]>([]);

  useEffect(() => {
    supabase.from("course_categories").select("id,name,slug,sort_order").eq("active", true).order("sort_order")
      .then(({ data }) => setDbCats((data ?? []) as DbCategory[]));
  }, []);

  const grouped = useMemo(() => {
    // Filtro por nome (apenas título do curso, case-insensitive)
    const q = query.trim().toLowerCase();
    const source = q
      ? courses.filter((c) => c.title.toLowerCase().includes(q))
      : courses;
    // Agrupa cursos pela categoria gerenciada (nome exato). Cursos com categoria
    // não cadastrada vão para "Outros cursos".
    const used = new Set<string>();
    const groups = dbCats.map((cat) => {
      const items = source.filter((c) => {
        if (c.category === cat.name) { used.add(c.id); return true; }
        return false;
      });
      return { key: cat.slug, label: cat.name, items };
    });
    const others = source.filter((c) => !used.has(c.id));
    if (others.length) groups.push({ key: "outros", label: "Outros cursos", items: others });
    return groups.filter((g) => g.items.length > 0);
  }, [courses, dbCats, query]);

  const visibleGroups = useMemo(
    () => (filter === "Todos" ? grouped : grouped.filter((g) => g.key === filter)),
    [filter, grouped]
  );

  return (
    <>
      <PageHero eyebrow="Catálogo Completo" title="Cursos para alunos e empresas" description="Da formação técnica à pós-graduação, das NRs aos treinamentos in company." />
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
          <div className="space-y-14">
            {visibleGroups.map((g) => (
              <div key={g.key} id={slugId(g.key)} className="scroll-mt-24">
                <div className="flex items-end justify-between mb-6 pb-3 border-b border-border">
                  <h2 className="text-2xl md:text-3xl font-bold text-primary">{g.label}</h2>
                  <span className="text-sm text-muted-foreground">{g.items.length} {g.items.length === 1 ? "curso" : "cursos"}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {g.items.map((c) => <CourseCard key={c.id} course={c} />)}
                </div>
              </div>
            ))}
            {visibleGroups.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">Nenhum curso disponível no momento.</div>
            )}
          </div>
        )}
      </section>
    </>
  );
};
export default Cursos;