import { usePartners } from "@/hooks/usePartners";

export const PartnersSection = () => {
  const { partners, loading } = usePartners();
  if (loading || partners.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-glow mb-3">
            Quem caminha conosco
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Nossos parceiros</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Empresas e instituições que confiam na Multplick para capacitar suas equipes.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center">
          {partners.map((p) => {
            const img = (
              <img
                src={p.logo_url}
                alt={p.name}
                loading="lazy"
                className="max-h-16 w-auto mx-auto opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-smooth"
              />
            );
            return (
              <div key={p.id} className="p-4 grid place-items-center min-h-[80px]">
                {p.website_url ? (
                  <a href={p.website_url} target="_blank" rel="noopener noreferrer" title={p.name}>
                    {img}
                  </a>
                ) : img}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};