import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Briefcase, GraduationCap, Award, BookOpen, School, Wrench, Snowflake, HardHat, Building2, Target, ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/loja/ProductCard";
import { InteresseDialog } from "@/components/loja/InteresseDialog";
import { sb, StoreBanner, StoreCategory, StoreProduct, OBJETIVOS, promoValida, captureOrigem, useStoreWhatsapp, waLink, setSeo, useCart } from "@/lib/store";

const ICONS: Record<string, any> = {
  "cursos-tecnicos": GraduationCap, "tecnico-por-competencia": Award, "eja-supletivo": BookOpen, graduacao: School,
  "pos-graduacao": GraduationCap, profissionalizantes: Wrench, "refrigeracao-e-climatizacao": Snowflake,
  "nrs-e-seguranca": HardHat, "treinamentos-corporativos": Building2, combos: Tag,
};
const norm = (s?: string | null) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Loja() {
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [cats, setCats] = useState<StoreCategory[]>([]);
  const [prods, setProds] = useState<StoreProduct[]>([]);
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [proposta, setProposta] = useState(false);
  const whats = useStoreWhatsapp();
  const cart = useCart();
  const cat = params.get("categoria");
  const obj = params.get("objetivo");
  const ofertas = params.get("ofertas") === "1";

  useEffect(() => { captureOrigem(search); }, [search]);
  useEffect(() => {
    setSeo("Loja | Multplick Formação Profissional", "Cursos técnicos, profissionalizantes, EJA, graduação, pós e treinamentos corporativos. Escolha, pague online e comece.");
    Promise.all([
      sb.from("store_banners").select("*").eq("ativo", true).order("ordem"),
      sb.from("store_categories").select("*").eq("ativo", true).order("ordem"),
      sb.from("store_products").select("*").eq("disponivel_loja", true).order("ordem").order("nome"),
    ]).then(([b, c, p]: any[]) => { setBanners(b.data ?? []); setCats(c.data ?? []); setProds(p.data ?? []); });
  }, []);
  useEffect(() => { if (banners.length < 2) return; const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 7000); return () => clearInterval(t); }, [banners.length]);

  const catName = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.nome])), [cats]);
  const lojaCats = cats.filter((c) => c.grupo === "loja");
  const corpCats = cats.filter((c) => c.grupo === "corporativo");
  const selCat = cats.find((c) => c.slug === cat);

  const filtrados = useMemo(() => {
    const t = norm(q).split(/\s+/).filter(Boolean);
    return prods.filter((p) => {
      if (selCat && p.category_id !== selCat.id) return false;
      if (obj && !(p.objetivos ?? []).includes(obj)) return false;
      if (ofertas && !promoValida(p)) return false;
      if (!t.length) return true;
      const hay = norm([p.nome, p.modalidade, p.descricao_curta, catName[p.category_id ?? ""], p.tipo].join(" "));
      return t.every((w) => hay.includes(w));
    });
  }, [prods, q, selCat, obj, ofertas, catName]);

  const filtrando = !!(q || cat || obj || ofertas);
  const destaques = prods.filter((p) => p.destaque);
  const emOferta = prods.filter(promoValida);
  const b = banners[idx];
  const go = (k: string, v?: string) => { const n = new URLSearchParams(); if (v) n.set(k, v); setParams(n); setTimeout(() => document.getElementById("cursos")?.scrollIntoView({ behavior: "smooth" }), 50); };
  const btnLink = (l?: string | null) => l === "whatsapp" ? waLink(whats, "Olá, gostaria de falar com um consultor Multplick.") : l || "#cursos";

  return (
    <div className="bg-background">
      {/* HERO / BANNERS */}
      <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
        {b?.imagem_desktop && (
          <picture className="absolute inset-0">
            {b.imagem_mobile && <source media="(max-width: 767px)" srcSet={b.imagem_mobile} />}
            <img src={b.imagem_desktop} alt="" className="size-full object-cover opacity-35" />
          </picture>
        )}
        <div className="container relative py-16 md:py-24 min-h-[420px] flex flex-col justify-center">
          <p className="text-gold font-semibold tracking-widest text-xs md:text-sm uppercase mb-3">Loja Multplick</p>
          <h1 className="text-3xl md:text-5xl font-extrabold max-w-3xl leading-tight">{b?.titulo || "Invista na sua formação. Transforme seu futuro."}</h1>
          <p className="mt-4 text-base md:text-lg max-w-2xl opacity-90">{b?.subtitulo || "Cursos para quem quer começar, se qualificar ou transformar experiência em formação profissional."}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {b?.botao_texto && <Button asChild size="lg" className="h-12 bg-gold text-gold-foreground hover:bg-gold/90 font-bold"><a href={btnLink(b.botao_link)}>{b.botao_texto}</a></Button>}
            {b?.botao2_texto && <Button asChild size="lg" variant="outline" className="h-12 bg-transparent border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10"><a href={btnLink(b.botao2_link)} target={b.botao2_link === "whatsapp" ? "_blank" : undefined} rel="noreferrer">{b.botao2_texto}</a></Button>}
          </div>
          {banners.length > 1 && (
            <div className="mt-10 flex items-center gap-3">
              <button aria-label="Anterior" onClick={() => setIdx((idx - 1 + banners.length) % banners.length)} className="p-2 rounded-full bg-primary-foreground/10"><ChevronLeft className="size-5" /></button>
              {banners.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-smooth ${i === idx ? "w-8 bg-gold" : "w-3 bg-primary-foreground/40"}`} />)}
              <button aria-label="Próximo" onClick={() => setIdx((idx + 1) % banners.length)} className="p-2 rounded-full bg-primary-foreground/10"><ChevronRight className="size-5" /></button>
            </div>
          )}
        </div>
      </section>

      {/* BUSCA */}
      <section className="container -mt-8 relative z-10">
        <form onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(params); q ? n.set("q", q) : n.delete("q"); setParams(n); document.getElementById("cursos")?.scrollIntoView({ behavior: "smooth" }); }}
          className="bg-card rounded-2xl shadow-elegant border border-border p-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qual curso você procura?" className="h-14 pl-12 text-base border-0 shadow-none focus-visible:ring-0" />
          </div>
          <Button type="submit" variant="hero" className="h-14 px-6">Buscar</Button>
        </form>
        {cart.length > 0 && (
          <Link to="/loja/carrinho" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShoppingCart className="size-4" /> Ver carrinho ({cart.length})</Link>
        )}
      </section>

      {/* CATEGORIAS */}
      <section className="container py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Categorias</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {lojaCats.map((c) => { const I = ICONS[c.slug] ?? GraduationCap; const on = cat === c.slug; return (
            <button key={c.id} onClick={() => go("categoria", on ? undefined : c.slug)}
              className={`text-left p-4 rounded-xl border transition-smooth min-h-[96px] flex flex-col gap-2 ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary-glow hover:shadow-card-soft"}`}>
              <I className={`size-6 ${on ? "text-gold" : "text-primary-glow"}`} />
              <span className="font-semibold text-sm leading-tight">{c.nome}</span>
            </button>); })}
        </div>
      </section>

      {/* RESULTADOS / VITRINE */}
      <section id="cursos" className="container pb-12 scroll-mt-24">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            {filtrando ? (selCat?.nome || (obj && OBJETIVOS.find((o) => o.key === obj)?.label) || (ofertas && "Ofertas") || "Resultado da busca") : "Todos os cursos"}
          </h2>
          {filtrando && <Button variant="ghost" onClick={() => { setQ(""); setParams(new URLSearchParams()); }}>Limpar filtros</Button>}
        </div>
        {filtrados.length === 0 ? (
          <div className="text-center py-14 bg-secondary/50 rounded-2xl">
            <p className="text-muted-foreground mb-4">{prods.length === 0 ? "Em breve novos cursos disponíveis na loja." : "Nenhum curso encontrado com esses filtros."}</p>
            <Button asChild className="h-12 bg-whatsapp hover:bg-whatsapp/90 text-primary-foreground"><a href={waLink(whats, "Olá, estou procurando um curso na loja Multplick.")} target="_blank" rel="noreferrer">Falar com um consultor</a></Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtrados.map((p) => <ProductCard key={p.id} p={p} categoria={catName[p.category_id ?? ""]} />)}
          </div>
        )}
      </section>

      {!filtrando && destaques.length > 0 && (
        <section className="bg-secondary/40 py-14"><div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Cursos mais procurados</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{destaques.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} categoria={catName[p.category_id ?? ""]} />)}</div>
        </div></section>
      )}

      {!filtrando && emOferta.length > 0 && (
        <section className="container py-14">
          <div className="flex items-center gap-3 mb-6"><span className="h-8 w-1.5 rounded bg-gold" /><h2 className="text-2xl md:text-3xl font-bold">Ofertas por tempo limitado</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{emOferta.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} categoria={catName[p.category_id ?? ""]} />)}</div>
        </section>
      )}

      {/* OBJETIVOS */}
      <section className="container py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Qual é o seu objetivo?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OBJETIVOS.map((o) => (
            <button key={o.key} onClick={() => go("objetivo", o.key)} className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary-glow hover:shadow-card-soft transition-smooth text-left min-h-[80px]">
              <span className="size-11 shrink-0 rounded-lg bg-primary/10 grid place-items-center"><Target className="size-5 text-primary" /></span>
              <span className="font-semibold">{o.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* CORPORATIVO */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-gold font-semibold tracking-widest text-xs uppercase mb-3">Para empresas</p>
            <h2 className="text-2xl md:text-4xl font-extrabold">MULTPLICK TREINAMENTOS CORPORATIVOS</h2>
            <p className="mt-4 opacity-90 text-lg">Capacitação profissional para empresas, indústrias, usinas e grandes operações.</p>
            <ul className="mt-6 space-y-2">
              {["EAD + prática in loco", "Presencial na empresa", "Turmas personalizadas"].map((m) => <li key={m} className="flex items-center gap-2"><Briefcase className="size-4 text-gold" />{m}</li>)}
            </ul>
            <Button size="lg" className="mt-8 h-12 bg-gold text-gold-foreground hover:bg-gold/90 font-bold" onClick={() => setProposta(true)}>Solicitar proposta</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {corpCats.map((c) => <div key={c.id} className="p-4 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 font-semibold text-sm">{c.nome}</div>)}
          </div>
        </div>
      </section>
      <InteresseDialog tipo="proposta" open={proposta} onOpenChange={setProposta} />
    </div>
  );
}
