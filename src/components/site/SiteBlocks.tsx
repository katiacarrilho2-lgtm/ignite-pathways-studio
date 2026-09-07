import { ReactNode } from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/site/SectionHeader";
import type { PageBlock } from "@/lib/siteSettings";

const Icon = ({ name, className }: { name?: string; className?: string }) => {
  const C = (name && (Icons as any)[name]) || Icons.Sparkles;
  return <C className={className} />;
};

const Paragraphs = ({ text }: { text?: string }) =>
  !text ? null : (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">{p}</p>
      ))}
    </>
  );

const Wrap = ({ block, children }: { block: PageBlock; children: ReactNode }) =>
  block.bg === "muted" ? (
    <section className="py-20 bg-secondary/40"><div className="container">{children}</div></section>
  ) : (
    <section className="py-20 container">{children}</section>
  );

const gridCols = (n: number) =>
  n <= 2 ? "md:grid-cols-2" : n === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4";

const BlockView = ({ block, slots }: { block: PageBlock; slots?: Record<string, ReactNode> }) => {
  const b = block;
  const header = b.title ? <SectionHeader eyebrow={b.eyebrow} title={b.title} subtitle={b.subtitle} center={b.center} /> : null;

  switch (b.kind) {
    case "image_text":
      return (
        <Wrap block={b}>
          <div className={`grid lg:grid-cols-2 gap-12 items-center ${b.bg === "muted" ? "" : ""}`}>
            {b.image_url && (
              <img
                src={b.image_url}
                alt={b.title || "Multplick"}
                loading="lazy"
                className={`rounded-2xl shadow-elegant w-full ${b.image_right ? "lg:order-2" : ""}`}
              />
            )}
            <div>
              {header}
              <Paragraphs text={b.body} />
              {b.cta_label && (
                <Button asChild variant="hero" size="lg" className="mt-2">
                  <Link to={b.cta_href || "/contato"}>{b.cta_label}</Link>
                </Button>
              )}
            </div>
          </div>
        </Wrap>
      );

    case "text":
      return (
        <Wrap block={b}>
          {header}
          <div className="max-w-3xl"><Paragraphs text={b.body} /></div>
        </Wrap>
      );

    case "cards":
      return (
        <Wrap block={b}>
          {header}
          <div className={`grid gap-6 ${gridCols(b.items.length)}`}>
            {b.items.map((it, i) => (
              <div key={i} className="p-8 rounded-2xl bg-card border border-border/60 shadow-card-soft hover:shadow-elegant transition-smooth">
                <div className="size-12 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center mb-4">
                  <Icon name={it.icon} className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">{it.title}</h3>
                <p className="text-sm text-muted-foreground">{it.text}</p>
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "list":
      return (
        <Wrap block={b}>
          {header}
          <div className="space-y-5 max-w-3xl">
            {b.items.map((it, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl bg-card border border-border/60 shadow-card-soft">
                <div className="size-12 shrink-0 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center">
                  <Icon name={it.icon} className="size-6" />
                </div>
                <div>
                  <h4 className="font-bold text-primary">{it.title}</h4>
                  <p className="text-sm text-muted-foreground">{it.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "steps":
      return (
        <Wrap block={b}>
          {header}
          <ol className="space-y-5 max-w-3xl">
            {b.items.map((it, i) => (
              <li key={i} className="flex gap-4">
                <div className="size-12 shrink-0 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center font-bold">{i + 1}</div>
                <div>
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <Icon name={it.icon} className="size-4 text-primary-glow" /> {it.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{it.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Wrap>
      );

    case "quotes":
      return (
        <Wrap block={b}>
          {header}
          <div className={`grid gap-6 ${gridCols(b.items.length)}`}>
            {b.items.map((it, i) => (
              <div key={i} className="p-8 rounded-2xl bg-card border border-border/60 shadow-card-soft">
                <Quote className="size-8 text-primary-glow mb-3" />
                <p className="text-foreground italic mb-4">"{it.text}"</p>
                <div className="text-sm font-semibold text-primary">{it.title}</div>
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "logos":
      return (
        <Wrap block={b}>
          {header}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {b.items.map((it, i) => (
              <div key={i} className="aspect-[3/2] rounded-xl bg-silver-gradient grid place-items-center border border-border/60 overflow-hidden">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.title || "Parceiro"} loading="lazy" className="max-h-16 w-auto" />
                ) : (
                  <div className="flex items-center gap-2 text-primary font-semibold text-center px-2">
                    <Icon name={it.icon || "Building2"} className="size-5" /> {it.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "gallery":
      return (
        <Wrap block={b}>
          {header}
          <div className="grid md:grid-cols-2 gap-6">
            {b.items.map((it, i) => (
              <div key={i} className="relative aspect-video rounded-2xl overflow-hidden shadow-elegant bg-secondary">
                {it.image_url && (
                  <img src={it.image_url} alt={it.title || "Multplick"} loading="lazy" className="w-full h-full object-cover" />
                )}
                {it.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-primary/70 text-primary-foreground text-sm px-4 py-2">{it.title}</div>
                )}
              </div>
            ))}
          </div>
          {b.cta_label && (
            <div className="text-center mt-12">
              <Button asChild size="lg" variant="hero"><Link to={b.cta_href || "/contato"}>{b.cta_label}</Link></Button>
            </div>
          )}
        </Wrap>
      );

    case "contacts":
      return (
        <Wrap block={b}>
          {header}
          <div className={`grid gap-4 ${gridCols(b.items.length)}`}>
            {b.items.map((it, i) => (
              <a key={i} href={it.href || "#"} className="flex gap-4 p-5 rounded-xl bg-card border border-border/60 shadow-card-soft hover:shadow-elegant transition-smooth">
                <div className="size-11 shrink-0 rounded-lg bg-primary-gradient text-primary-foreground grid place-items-center">
                  <Icon name={it.icon} className="size-5" />
                </div>
                <div>
                  <div className="font-semibold text-primary">{it.title}</div>
                  <div className="text-sm text-muted-foreground">{it.text}</div>
                </div>
              </a>
            ))}
          </div>
        </Wrap>
      );

    case "cta":
      return (
        <Wrap block={b}>
          <div className="rounded-2xl bg-hero-gradient text-primary-foreground p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">{b.title}</h2>
            {b.subtitle && <p className="mt-4 text-primary-foreground/85 max-w-2xl mx-auto">{b.subtitle}</p>}
            {b.cta_label && (
              <Button asChild size="lg" variant="secondary" className="mt-8">
                <Link to={b.cta_href || "/contato"}>{b.cta_label}</Link>
              </Button>
            )}
          </div>
        </Wrap>
      );

    case "map":
      return (
        <Wrap block={b}>
          {header}
          <div className="rounded-2xl overflow-hidden shadow-card-soft border border-border/60 aspect-[21/9] bg-secondary">
            <iframe title={b.title || "Localização"} src={b.body} className="w-full h-full" loading="lazy" />
          </div>
        </Wrap>
      );

    case "slot":
      return <>{slots?.[b.slot || ""] ?? null}</>;

    default:
      return null;
  }
};

export const SiteBlocks = ({ blocks, slots }: { blocks: PageBlock[]; slots?: Record<string, ReactNode> }) => (
  <>
    {blocks.filter((b) => b.visible !== false).map((b) => (
      <BlockView key={b.id} block={b} slots={slots} />
    ))}
  </>
);
