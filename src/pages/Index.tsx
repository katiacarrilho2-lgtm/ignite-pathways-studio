import { Link } from "react-router-dom";
import { ArrowRight, Award, Briefcase, Building2, ExternalLink, GraduationCap, HardHat, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/site/SectionHeader";
import { CourseCard } from "@/components/site/CourseCard";
import { AnimatedCounter } from "@/components/site/AnimatedCounter";
import { useCourses } from "@/hooks/useCourses";
import hero from "@/assets/hero-multplick.jpg";
import inCompany from "@/assets/in-company.jpg";
import { BrazilMap } from "@/components/site/BrazilMap";
import { PromoCarousel } from "@/components/site/PromoCarousel";
import { PartnersSection } from "@/components/site/PartnersSection";
import { EjaConejapBanner } from "@/components/site/EjaConejapBanner";

const stats = [
  { end: 10000, suffix: "+", label: "Alunos formados" },
  { end: 200, suffix: "+", label: "Empresas atendidas" },
  { end: 500, suffix: "+", label: "Treinamentos realizados" },
  { end: 0, label: "Atendimento nacional", custom: "BR" },
];

const differentials = [
  { icon: HardHat, title: "Treinamento in loco", text: "Nossos professores vão até sua empresa e atuam dentro da operação até o fim do treinamento." },
  { icon: ShieldCheck, title: "Normas Regulamentadoras", text: "Capacitações em NR-10, NR-33, NR-35 e demais NRs com certificação reconhecida." },
  { icon: GraduationCap, title: "Parcerias acadêmicas", text: "Faculdades, escolas técnicas, graduação, pós-graduação e EJA com mensalidades acessíveis." },
  { icon: Building2, title: "Convênios empresariais", text: "Descontos exclusivos e turmas customizadas para colaboradores e seus dependentes." },
];

const Index = () => {
  const { courses: featuredAll } = useCourses({ featuredOnly: true, limit: 6 });
  const { courses: anyCourses } = useCourses({ limit: 6 });
  const featured = featuredAll.length ? featuredAll : anyCourses;
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <img
          src={hero}
          alt="Treinamento industrial Multplick com profissionais usando EPI dentro de uma planta industrial"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover object-right"
        />
        {/* Premium overlay — metallic deep blue blending into brushed silver highlights */}
        {/* Layer 1: deep navy base, near-solid on the left for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220_75%_4%)] via-[hsl(220_70%_7%)]/95 via-35% to-[hsl(215_55%_14%)]/55 to-80%" />
        {/* Layer 2: subtle metallic sheen, fade out before the faces on the right */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: "linear-gradient(115deg, hsl(220 80% 8%) 0%, hsl(215 70% 12%) 35%, hsla(210 45% 28% / 0.45) 55%, transparent 75%)",
            maskImage: "linear-gradient(115deg, black 0%, black 55%, transparent 80%)",
            WebkitMaskImage: "linear-gradient(115deg, black 0%, black 55%, transparent 80%)",
          }}
        />
        {/* Layer 3: soft highlight, reduced over the right-side people */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(ellipse at 80% 10%, hsla(210 40% 85% / 0.12), transparent 50%)",
            maskImage: "linear-gradient(to left, transparent 0%, black 40%)",
            WebkitMaskImage: "linear-gradient(to left, transparent 0%, black 40%)",
          }}
        />
        {/* Layer 4: vertical depth — darker top & bottom for cinematic anchor */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_75%_4%)]/60 via-transparent to-[hsl(220_75%_4%)]/70" />
        {/* Layer 5: subtle tech grid texture for corporate technology feel */}
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-screen"
          style={{
            backgroundImage:
              "linear-gradient(hsl(210 50% 70%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 50% 70%) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse at 30% 50%, black 0%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 30% 50%, black 0%, transparent 75%)",
          }}
        />
        {/* Layer 6: faint circuit-like dot matrix */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(215 85% 60%) 1px, transparent 1.5px)",
            backgroundSize: "32px 32px",
            maskImage:
              "linear-gradient(115deg, black 0%, transparent 55%)",
            WebkitMaskImage:
              "linear-gradient(115deg, black 0%, transparent 55%)",
          }}
        />

        <div className="container relative z-10 py-20 md:py-28 text-base">
          <div className="max-w-xl text-primary-foreground">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-primary-glow/30 bg-primary-glow/5 backdrop-blur px-4 py-1.5 text-[10px] font-semibold tracking-[0.3em] uppercase text-primary-glow mb-8 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0ms]"
            >
              <Sparkles className="size-3.5" /> Solução corporativa de capacitação
            </span>
            <h1 className="text-2xl md:text-[2.35rem] font-semibold leading-[1.1] tracking-tight text-left animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:120ms]">
              A solução completa em
              <br />
              <span className="bg-gradient-to-r from-primary-glow to-[hsl(195_90%_65%)] bg-clip-text text-transparent font-bold">
                formação profissional
              </span>
              <br />
              para empresas e alunos.
            </h1>
            <p className="mt-5 text-sm md:text-[0.95rem] text-primary-foreground/75 max-w-md leading-relaxed animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:260ms]">
              Cursos técnicos, graduações,
              <br />
              pós-graduações, EJA, NRs e treinamentos
              <br />
              in company com valores acessíveis e
              <br />
              atendimento especializado em todo o Brasil.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:380ms]">
              <Button asChild size="lg" variant="hero" className="h-12 px-7 text-sm">
                <Link to="/empresas">Solicitar Convênio <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="silver" className="h-12 px-7 text-sm">
                <Link to="/cursos">Ver Catálogo</Link>
              </Button>
            </div>

            {/* Dual entry cards */}
            <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl">
              <Link
                to="/empresas"
                className="group relative overflow-hidden rounded-xl border border-primary-glow/25 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-xl p-4 shadow-[0_8px_32px_-12px_hsl(220_70%_4%/0.6),inset_0_1px_0_0_hsl(210_40%_85%/0.12)] hover:from-primary-glow/15 hover:via-primary-glow/8 hover:border-primary-glow/60 hover:shadow-glow hover:-translate-y-0.5 transition-smooth animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:500ms]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,hsl(210_40%_90%/0.08)_50%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-smooth" />
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary-gradient grid place-items-center shadow-glow shrink-0 group-hover:scale-110 transition-smooth">
                    <Briefcase className="size-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold tracking-widest uppercase text-primary-glow">Sou empresa</div>
                    <div className="text-sm font-medium text-primary-foreground truncate">Convênios, NRs e In Company</div>
                  </div>
                  <ArrowRight className="size-3.5 text-primary-foreground/50 ml-auto group-hover:translate-x-1 group-hover:text-primary-glow transition-smooth" />
                </div>
              </Link>
              <Link
                to="/cursos"
                className="group relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-xl p-4 shadow-[0_8px_32px_-12px_hsl(220_70%_4%/0.6),inset_0_1px_0_0_hsl(210_40%_85%/0.12)] hover:from-white/15 hover:via-white/8 hover:border-white/40 hover:-translate-y-0.5 transition-smooth animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:620ms]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,hsl(210_40%_90%/0.08)_50%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-smooth" />
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-silver-gradient grid place-items-center shrink-0 group-hover:scale-110 transition-smooth">
                    <GraduationCap className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold tracking-widest uppercase text-primary-foreground/60">Sou aluno</div>
                    <div className="text-sm font-medium text-primary-foreground truncate">Cursos, Graduação e EJA</div>
                  </div>
                  <ArrowRight className="size-3.5 text-primary-foreground/50 ml-auto group-hover:translate-x-1 transition-smooth" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* In Company badge — floating (bottom-right so it doesn't cover the subjects) */}
        <div className="hidden lg:flex absolute bottom-32 right-8 z-10 animate-float">
          <div className="flex items-center gap-3 rounded-full border border-primary-glow/40 bg-[hsl(220_70%_8%)]/80 backdrop-blur px-5 py-3 shadow-glow">
            <div className="size-9 rounded-full bg-primary-gradient grid place-items-center">
              <HardHat className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-bold tracking-widest uppercase text-primary-glow">Selo</div>
              <div className="text-sm font-semibold text-primary-foreground">Treinamentos In Company</div>
            </div>
          </div>
        </div>

        {/* Animated counters strip */}
        <div className="absolute bottom-0 inset-x-0 z-10">
          <div className="bg-gradient-to-t from-[hsl(220_70%_6%)] via-[hsl(220_70%_8%)]/95 to-transparent pt-10 pb-6">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 border-t border-primary-glow/20 pt-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center md:text-left">
                    <div className="text-3xl md:text-4xl font-bold text-primary-glow tracking-tight">
                      {s.custom ? (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="size-7" /> {s.custom}
                        </span>
                      ) : (
                        <AnimatedCounter end={s.end} suffix={s.suffix ?? ""} />
                      )}
                    </div>
                    <div className="text-[11px] md:text-xs uppercase tracking-widest text-primary-foreground/70 mt-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Differentials */}
      <section className="py-24 bg-background">
        <div className="container">
          <SectionHeader
            eyebrow="Por que Multplick"
            title="Solução completa em formação profissional"
            subtitle="Conectamos empresas e alunos a uma estrutura educacional robusta, com método prático e acompanhamento real."
            center
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentials.map((d) => (
              <div key={d.title} className="group p-8 rounded-2xl bg-card border border-border/60 shadow-card-soft hover:shadow-elegant hover:-translate-y-1 transition-smooth">
                <div className="size-12 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center mb-5 group-hover:scale-110 transition-smooth">
                  <d.icon className="size-6" />
                </div>
                <h3 className="font-bold text-lg text-primary mb-2">{d.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISTEC validation banner */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[hsl(215_70%_18%)] text-primary-foreground p-8 md:p-12 shadow-elegant">
            <div className="absolute -top-16 -right-16 size-64 rounded-full bg-primary-glow/15 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-primary-glow/10 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="size-20 md:size-24 shrink-0 rounded-2xl bg-primary-glow/15 border border-primary-glow/40 grid place-items-center shadow-glow">
                <ShieldCheck className="size-12 md:size-14 text-primary-glow" />
              </div>
              <div className="flex-1">
                <span className="inline-block text-[11px] font-bold tracking-[0.3em] uppercase text-primary-glow mb-2">
                  Validade Nacional · MEC
                </span>
                <h2 className="text-2xl md:text-4xl font-bold leading-tight">
                  Valide o registro do aluno no SISTEC
                </h2>
                <p className="mt-3 text-primary-foreground/85 max-w-2xl text-base md:text-lg">
                  Consulte gratuitamente diplomas e certificados emitidos pelas
                  instituições parceiras Multplick diretamente no portal oficial do
                  Ministério da Educação.
                </p>
              </div>
              <Button asChild size="lg" variant="silver" className="shrink-0 h-14 px-8 text-base shadow-elegant">
                <a
                  href="https://sistec.mec.gov.br/validadenacional"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Acessar SISTEC <ExternalLink className="size-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* EJA · Conejap banner */}
      <EjaConejapBanner />

      {/* Promotional carousel */}
      <PromoCarousel />

      {/* Featured courses */}
      <section className="py-24 bg-secondary/40">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <SectionHeader eyebrow="Catálogo" title="Cursos em destaque" />
            <Button asChild variant="silver">
              <Link to="/cursos">Ver todos os cursos <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </div>
      </section>

      {/* In company CTA */}
      <section className="py-24 bg-background">
        <div className="container grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <img src={inCompany} alt="Treinamento in company da Multplick" loading="lazy" className="rounded-2xl shadow-elegant" />
            <div className="absolute -bottom-6 -right-6 bg-card rounded-2xl p-6 shadow-elegant hidden md:block max-w-xs border border-border/60">
              <div className="flex items-center gap-3">
                <Users className="size-10 text-primary-glow" />
                <div>
                  <div className="font-bold text-primary">Turmas customizadas</div>
                  <div className="text-xs text-muted-foreground">Conteúdo desenhado para sua operação</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <SectionHeader
              eyebrow="Treinamentos In Company"
              title="Levamos a capacitação até a sua empresa"
              subtitle="Nossos professores acompanham sua equipe dentro da operação, com aulas práticas e teóricas, até a conclusão do treinamento."
            />
            <ul className="space-y-3 mb-8">
              {["Atendimento nacional", "Conteúdo customizado por setor", "Certificação reconhecida", "Acompanhamento pós-treinamento"].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Award className="size-5 text-primary-glow mt-0.5" />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="hero">
              <Link to="/in-company">Saiba mais sobre In Company <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-20 bg-hero-gradient text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-balance">Pronto para multiplicar resultados?</h2>
          <p className="mt-4 text-primary-foreground/85 max-w-2xl mx-auto">
            Solicite uma proposta para sua empresa ou conheça os cursos disponíveis para alunos.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" variant="silver"><Link to="/empresas">Sou Empresa</Link></Button>
            <Button asChild size="lg" variant="whatsapp">
              <a href="https://wa.me/5518996841902" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Brazil presence map */}
      <section className="py-24 bg-[hsl(220_70%_8%)] text-primary-foreground overflow-hidden">
        <div className="container">
          <div className="mb-12 text-center mx-auto max-w-2xl">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-glow mb-3">Atendimento nacional</span>
            <h2 className="text-3xl md:text-5xl font-bold text-balance">Multplick presente em todo o Brasil</h2>
            <p className="mt-4 text-lg text-primary-foreground/75">Equipes credenciadas e licenciados Multplick em pontos estratégicos do país, prontos para atender sua empresa ou turma.</p>
          </div>
          <BrazilMap />
        </div>
      </section>

      {/* Partners */}
      <PartnersSection />
    </>
  );
};

export default Index;
