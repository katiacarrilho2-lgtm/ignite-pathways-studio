import { PageHero } from "@/components/site/PageHero";
import { Link } from "react-router-dom";
import hero from "@/assets/hero-industrial.jpg";
import inCompany from "@/assets/in-company.jpg";
import nr from "@/assets/course-nr.jpg";
import prof from "@/assets/course-prof.jpg";
import grad from "@/assets/course-graduacao.jpg";
import eja from "@/assets/course-eja.jpg";

const posts = [
  { title: "Atualizações da NR-10: o que mudou em 2026", excerpt: "Entenda as principais alterações e como adequar sua empresa.", img: nr, tag: "Segurança do Trabalho" },
  { title: "O futuro do mercado de trabalho industrial", excerpt: "Indústria 4.0, automação e os profissionais mais demandados.", img: hero, tag: "Mercado" },
  { title: "Por que investir em treinamento in company", excerpt: "ROI, engajamento e produtividade para sua operação.", img: inCompany, tag: "Empresas" },
  { title: "Carreira técnica: por onde começar", excerpt: "Roteiro prático para entrar no mercado industrial.", img: prof, tag: "Carreira" },
  { title: "Vale a pena fazer pós-graduação?", excerpt: "Quando especializar é o passo certo para sua trajetória.", img: grad, tag: "Formação" },
  { title: "EJA: a volta aos estudos sem barreiras", excerpt: "Como o ensino híbrido transformou a educação de jovens e adultos.", img: eja, tag: "Educação" },
];

const Blog = () => (
  <>
    <PageHero eyebrow="Blog Multplick" title="Conteúdo para sua carreira e sua empresa" description="Artigos sobre formação profissional, mercado de trabalho, segurança e atualizações regulatórias." />
    <section className="py-20 container grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((p) => (
        <Link key={p.title} to="/blog" className="group block rounded-2xl overflow-hidden bg-card border border-border/60 shadow-card-soft hover:shadow-elegant transition-smooth">
          <div className="aspect-[16/10] overflow-hidden">
            <img src={p.img} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
          </div>
          <div className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-glow">{p.tag}</span>
            <h3 className="text-lg font-bold text-primary mt-2 mb-2 leading-snug">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.excerpt}</p>
          </div>
        </Link>
      ))}
    </section>
  </>
);
export default Blog;