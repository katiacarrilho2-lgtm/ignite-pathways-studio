interface Props { eyebrow?: string; title: string; description?: string; }
export const PageHero = ({ eyebrow, title, description }: Props) => (
  <section className="bg-hero-gradient text-primary-foreground">
    <div className="container py-20 md:py-28 text-center">
      {eyebrow && <span className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/70">{eyebrow}</span>}
      <h1 className="mt-3 text-4xl md:text-6xl font-bold text-balance animate-fade-up">{title}</h1>
      {description && <p className="mt-5 text-lg text-primary-foreground/85 max-w-2xl mx-auto">{description}</p>}
    </div>
  </section>
);