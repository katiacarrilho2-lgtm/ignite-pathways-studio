import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Award, CheckCircle2, ChevronLeft, ChevronRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/multplick-logo.png";

type Slide = {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  price?: string;
  priceLabel?: string;
  badges: { text: string }[];
  image: string;
  to: string;
  variant: "navy" | "dark" | "blue" | "full";
};

const variantBg: Record<string, string> = {
  // Navy profundo com leve brilho dourado por baixo — texto branco fica legível
  navy: "bg-[radial-gradient(ellipse_at_top_left,hsl(220_75%_22%)_0%,hsl(220_85%_12%)_55%,hsl(220_90%_7%)_100%)]",
  dark: "bg-[radial-gradient(ellipse_at_top_right,hsl(220_70%_18%)_0%,hsl(220_80%_10%)_55%,hsl(220_90%_6%)_100%)]",
  blue: "bg-[radial-gradient(ellipse_at_bottom_right,hsl(210_85%_45%)_0%,hsl(220_85%_20%)_50%,hsl(220_90%_8%)_100%)]",
  full: "bg-black",
};

export const PromoCarousel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("promo_slides")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (data && data.length) {
        const ids = data.map((s: any) => s.course_id).filter(Boolean);
        const { data: cs } = ids.length
          ? await supabase.from("courses").select("id,slug").in("id", ids)
          : { data: [] as any[] };
        const slugById = new Map((cs ?? []).map((c: any) => [c.id, c.slug]));
        const mapped: Slide[] = data.map((s: any) => {
          const courseSlug = s.course_id ? slugById.get(s.course_id) : undefined;
          const to = s.cta_url || (courseSlug ? `/checkout/${courseSlug}` : "/cursos");
          return {
            eyebrow: s.eyebrow ?? "",
            title: s.title,
            highlight: s.highlight ?? "",
            subtitle: s.subtitle ?? "",
            price: s.price ?? undefined,
            priceLabel: s.price_label ?? undefined,
            badges: Array.isArray(s.badges) ? s.badges : [],
            image: s.image_url || "",
            to,
            variant: (s.variant ?? "navy") as Slide["variant"],
          };
        });
        setSlides(mapped);
      }
      setLoaded(true);
    })();
  }, []);

  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla, slides.length]);

  if (!loaded || slides.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container">
        <div className="relative">
          <div className="overflow-hidden rounded-3xl shadow-elegant" ref={emblaRef}>
            <div className="flex">
              {slides.map((s, i) => (
                <div key={i} className="min-w-0 shrink-0 grow-0 basis-full">
                  {s.variant === "full" ? (
                    <article className="relative overflow-hidden bg-black aspect-[16/9] md:aspect-[21/9]">
                      {s.to.startsWith("http") ? (
                        <a href={s.to} target="_blank" rel="noopener noreferrer" className="absolute inset-0 block group">
                          <img src={s.image} alt={s.title || ""} className="absolute inset-0 w-full h-full object-contain bg-black" />
                          {(s.title || s.highlight) && (
                            <span className="absolute bottom-5 right-5 md:bottom-8 md:right-8 inline-flex items-center gap-2 rounded-full bg-[hsl(45_100%_55%)] group-hover:bg-[hsl(45_100%_60%)] px-6 py-3 text-sm md:text-base font-bold text-[hsl(220_90%_10%)] shadow-[0_10px_30px_-8px_hsl(45_100%_45%/0.6)] transition-all">
                              CLIQUE AQUI <ArrowRight className="size-4" />
                            </span>
                          )}
                        </a>
                      ) : (
                        <Link to={s.to} className="absolute inset-0 block group">
                          <img src={s.image} alt={s.title || ""} className="absolute inset-0 w-full h-full object-contain bg-black" />
                          {(s.title || s.highlight) && (
                            <span className="absolute bottom-5 right-5 md:bottom-8 md:right-8 inline-flex items-center gap-2 rounded-full bg-[hsl(45_100%_55%)] group-hover:bg-[hsl(45_100%_60%)] px-6 py-3 text-sm md:text-base font-bold text-[hsl(220_90%_10%)] shadow-[0_10px_30px_-8px_hsl(45_100%_45%/0.6)] transition-all">
                              CLIQUE AQUI <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Link>
                      )}
                    </article>
                  ) : (
                  <article className={`relative overflow-hidden ${variantBg[s.variant] ?? variantBg.navy} min-h-[360px] md:min-h-[440px]`}>
                    {/* dotted pattern */}
                    <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1.5px)", backgroundSize: "22px 22px" }} />
                    {/* dourado quente atrás */}
                    <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-[hsl(45_100%_50%)] opacity-20 blur-3xl" />
                    {/* photo */}
                    <img
                      src={s.image}
                      alt=""
                      loading="lazy"
                      className="hidden md:block absolute right-0 top-0 h-full w-1/2 object-cover object-center [mask-image:linear-gradient(to_left,black_60%,transparent)]"
                    />
                    <div className="absolute right-0 top-0 h-full w-1/2 hidden md:block bg-gradient-to-l from-transparent via-transparent to-black/30" />

                    <div className="relative grid md:grid-cols-2 gap-6 p-6 md:p-12 lg:p-14 min-h-[360px] md:min-h-[440px]">
                      <div className="flex flex-col justify-center text-white max-w-xl">
                        <div className="flex items-center gap-3 mb-5">
                          <img src={logo} alt="Multplick" className="h-8 md:h-10 w-auto bg-white/95 rounded-md px-2 py-1" />
                          <span className="text-[10px] md:text-xs font-bold tracking-[0.25em] uppercase text-white/80">{s.eyebrow}</span>
                        </div>

                        <h2 className="text-3xl md:text-5xl font-bold leading-[1.05] tracking-tight">
                          {s.title}{" "}
                          <span className="block bg-gradient-to-r from-[hsl(45_100%_55%)] via-[hsl(48_100%_65%)] to-[hsl(38_100%_55%)] bg-clip-text text-transparent drop-shadow-[0_2px_12px_hsl(45_100%_50%/0.25)]">
                            {s.highlight}
                          </span>
                        </h2>

                        <p className="mt-4 text-sm md:text-base text-white/85 max-w-md leading-relaxed">{s.subtitle}</p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {s.badges.map((b) => (
                            <span key={b.text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-[11px] md:text-xs font-medium">
                              <Sparkles className="size-3.5 text-[hsl(45_100%_65%)]" /> {b.text}
                            </span>
                          ))}
                        </div>

                        <div className="mt-7 flex flex-wrap items-center gap-4">
                          {s.to.startsWith("http") ? (
                            <a href={s.to} target="_blank" rel="noopener noreferrer"
                              className="group inline-flex items-center gap-2 rounded-full bg-[hsl(45_100%_55%)] hover:bg-[hsl(45_100%_60%)] px-7 py-3.5 text-sm md:text-base font-bold text-[hsl(220_90%_10%)] shadow-[0_10px_30px_-8px_hsl(45_100%_45%/0.6)] hover:shadow-[0_14px_40px_-8px_hsl(45_100%_50%/0.8)] hover:-translate-y-0.5 transition-all">
                              CLIQUE AQUI <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                            </a>
                          ) : (
                            <Link to={s.to}
                              className="group inline-flex items-center gap-2 rounded-full bg-[hsl(45_100%_55%)] hover:bg-[hsl(45_100%_60%)] px-7 py-3.5 text-sm md:text-base font-bold text-[hsl(220_90%_10%)] shadow-[0_10px_30px_-8px_hsl(45_100%_45%/0.6)] hover:shadow-[0_14px_40px_-8px_hsl(45_100%_50%/0.8)] hover:-translate-y-0.5 transition-all">
                              CLIQUE AQUI <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                          )}
                          {s.price && (
                            <div className="leading-tight">
                              <div className="text-[10px] uppercase tracking-widest text-white/60">{s.priceLabel}</div>
                              <div className="text-2xl md:text-3xl font-bold text-white">{s.price}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* controls */}
          <button
            aria-label="Anterior"
            onClick={() => embla?.scrollPrev()}
            className="hidden md:grid absolute left-3 top-1/2 -translate-y-1/2 size-11 place-items-center rounded-full bg-white/90 hover:bg-white text-primary shadow-lg backdrop-blur transition"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            aria-label="Próximo"
            onClick={() => embla?.scrollNext()}
            className="hidden md:grid absolute right-3 top-1/2 -translate-y-1/2 size-11 place-items-center rounded-full bg-white/90 hover:bg-white text-primary shadow-lg backdrop-blur transition"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir para slide ${i + 1}`}
                onClick={() => embla?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === selected ? "w-8 bg-[hsl(45_100%_55%)]" : "w-2.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};