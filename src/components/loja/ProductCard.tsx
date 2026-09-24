import { Link } from "react-router-dom";
import { StoreProduct, brl, precoVigente, promoValida } from "@/lib/store";
import { GraduationCap } from "lucide-react";

export const ProductCard = ({ p, categoria }: { p: StoreProduct; categoria?: string }) => {
  const promo = promoValida(p);
  const preco = precoVigente(p);
  return (
    <Link to={`/curso/${p.slug}`} className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-card-soft hover:shadow-elegant hover:-translate-y-0.5 transition-smooth">
      <div className="aspect-[4/3] bg-secondary overflow-hidden relative">
        {p.imagem_url
          ? <img src={p.imagem_url} alt={p.imagem_alt || p.nome} loading="lazy" className="size-full object-cover group-hover:scale-105 transition-smooth" />
          : <div className="size-full grid place-items-center text-primary/30"><GraduationCap className="size-14" /></div>}
        {promo && <span className="absolute top-3 left-3 bg-gold text-gold-foreground text-xs font-bold px-2.5 py-1 rounded-full">OFERTA</span>}
        {p.tipo === "combo" && <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">COMBO</span>}
      </div>
      <div className="p-5 flex flex-col flex-1 gap-2">
        {(categoria || p.modalidade) && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{[categoria, p.modalidade].filter(Boolean).join(" · ")}</p>
        )}
        <h3 className="font-bold text-lg leading-snug text-foreground break-words">{p.nome}</h3>
        {p.descricao_curta && <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao_curta}</p>}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2 flex-wrap">
          <div>
            {p.tipo_venda === "proposta" ? <span className="text-sm font-semibold text-primary">Sob proposta</span>
              : p.tipo_venda === "consulta" && !preco ? <span className="text-sm font-semibold text-primary">Consulte</span>
              : preco ? (
                <>
                  {promo && <p className="text-xs text-muted-foreground line-through">{brl(p.preco_cents)}</p>}
                  <p className="text-xl font-extrabold text-primary">{brl(preco)}</p>
                </>
              ) : <span className="text-sm font-semibold text-primary">Consulte</span>}
          </div>
          <span className="text-sm font-semibold text-primary-glow group-hover:underline">Ver curso →</span>
        </div>
      </div>
    </Link>
  );
};
