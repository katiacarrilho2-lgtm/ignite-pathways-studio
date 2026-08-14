import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  price: string | null;
  price_label: string | null;
  badge: string | null;
  color: string;
  image_url: string | null;
  cta_url: string | null;
};

export const PromoCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    supabase
      .from("crm_promo_banners")
      .select("id,title,subtitle,price,price_label,badge,color,image_url,cta_url")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setBanners((data ?? []) as Banner[]));
  }, []);

  const next = useCallback(() => setI((v) => (banners.length ? (v + 1) % banners.length : 0)), [banners.length]);
  const prev = () => setI((v) => (banners.length ? (v - 1 + banners.length) % banners.length : 0));

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [banners.length, next]);

  if (banners.length === 0) return null;
  const b = banners[i];

  const Inner = (
    <div className="relative w-full aspect-[8/3] md:aspect-[8/3] overflow-hidden rounded-2xl border border-border bg-secondary">
      {b.image_url ? (
        <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full" style={{ background: b.color || "hsl(var(--primary))" }} />
      )}
      {(b.title || b.subtitle || b.price) && (
        <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6 md:p-12 bg-gradient-to-r from-black/60 to-transparent">
          {b.badge && <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase text-primary-foreground">{b.badge}</span>}
          <h3 className="text-2xl md:text-4xl font-extrabold text-primary-foreground drop-shadow max-w-xl">{b.title}</h3>
          {b.subtitle && <p className="text-sm md:text-lg text-primary-foreground/90 max-w-xl">{b.subtitle}</p>}
          {b.price && (
            <p className="text-primary-foreground font-bold text-xl md:text-3xl">
              {b.price} <span className="text-xs md:text-sm font-normal opacity-80">{b.price_label}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="relative">
        {b.cta_url ? (
          <a href={b.cta_url} target="_blank" rel="noreferrer" className="block">{Inner}</a>
        ) : (
          Inner
        )}
        {banners.length > 1 && (
          <>
            <button onClick={prev} aria-label="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={next} aria-label="Próximo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background">
              <ChevronRight className="size-5" />
            </button>
            <div className="mt-3 flex justify-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Banner ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PromoCarousel;