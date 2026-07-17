import { useEffect, useMemo, useState } from "react";
import { Copy, MessageCircle, Timer, Sparkles, CheckCircle2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Campaign } from "@/config/campaigns";

const WHATSAPP = "5518996841902";
const waLink = (m: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(m)}`;

/**
 * Banner festivo de campanha promocional.
 * Recebe uma configuração de campanha (ver src/config/campaigns.ts)
 * e renderiza um card colorido com preço, cupom copiável, contagem
 * regressiva e CTA para o WhatsApp.
 */
export function CampaignBanner({ campaign }: { campaign: Campaign }) {
  if (!campaign.enabled) return null;

  const expires = useMemo(() => new Date(campaign.expiresAt).getTime(), [campaign.expiresAt]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = expires - now;
  if (remaining <= 0) return null;

  const days = Math.floor(remaining / 86400000);
  const hh = String(Math.floor((remaining % 86400000) / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  const [copied, setCopied] = useState(false);
  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(campaign.couponCode);
      setCopied(true);
      toast.success("Cupom copiado! Envie no WhatsApp para garantir a promoção.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione o cupom manualmente.");
    }
  };

  const { primary, secondary, accent, onPrimary } = campaign.theme;

  return (
    <section className="container my-10">
      <div
        className="relative rounded-3xl overflow-hidden shadow-elegant"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary} 55%, ${accent}22 100%)`,
          color: onPrimary,
        }}
      >
        {/* Confetes / bolinhas decorativas */}
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <span className="absolute top-6 left-8 size-3 rounded-full animate-pulse" style={{ background: secondary }} />
          <span className="absolute top-14 left-1/3 size-2 rounded-full animate-pulse" style={{ background: accent, animationDelay: "0.3s" }} />
          <span className="absolute top-4 right-12 size-4 rounded-full animate-pulse" style={{ background: accent, animationDelay: "0.6s" }} />
          <span className="absolute bottom-8 left-16 size-2.5 rounded-full animate-pulse" style={{ background: secondary, animationDelay: "0.9s" }} />
          <span className="absolute bottom-16 right-24 size-3 rounded-full animate-pulse" style={{ background: accent, animationDelay: "1.2s" }} />
          <span className="absolute bottom-4 right-1/3 size-2 rounded-full animate-pulse" style={{ background: secondary, animationDelay: "1.5s" }} />
          {/* faixas radiais */}
          <div
            className="absolute -top-24 -right-24 size-72 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${secondary}, transparent 70%)` }}
          />
          <div
            className="absolute -bottom-32 -left-24 size-80 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
          />
        </div>

        <div className="relative p-6 md:p-10 grid lg:grid-cols-[0.85fr_1.15fr_1fr] gap-8 items-center">
          {/* Coluna imagem — hero da campanha */}
          {campaign.image && (
            <div className="relative order-1 lg:order-none">
              <div
                className="absolute -inset-2 rounded-3xl blur-2xl opacity-60"
                style={{ background: `radial-gradient(circle at 30% 30%, ${accent}, transparent 65%)` }}
              />
              <div
                className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl"
                style={{ border: `2px solid ${secondary}55` }}
              >
                <img
                  src={campaign.image}
                  alt={campaign.imageAlt ?? campaign.eyebrow}
                  loading="lazy"
                  width={1280}
                  height={1280}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(180deg, transparent 45%, ${primary}cc 100%)` }}
                />
                <div
                  className="absolute bottom-3 left-3 right-3 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-center"
                  style={{ background: secondary, color: primary }}
                >
                  {campaign.emoji} Estude no conforto de casa
                </div>
              </div>
            </div>
          )}

          {/* Coluna esquerda — headline + preço */}
          <div>
            <div
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full"
              style={{ background: secondary, color: primary }}
            >
              <Sparkles className="size-3.5" /> {campaign.emoji} {campaign.eyebrow}
            </div>

            <h2
              className="mt-4 text-3xl md:text-4xl lg:text-5xl font-black leading-[1.05] whitespace-pre-line drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]"
              style={{ color: onPrimary }}
            >
              {campaign.headline.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {i === 1 ? <span style={{ color: secondary }}>{line}</span> : line}
                </span>
              ))}
            </h2>

            {campaign.subheadline && (
              <p className="mt-3 text-base md:text-lg opacity-95">{campaign.subheadline}</p>
            )}

            {/* Bloco do preço grandão (opcional) */}
            {campaign.priceValue && (
              <div
                className="mt-6 inline-flex flex-col rounded-2xl px-6 py-4 shadow-elegant"
                style={{ background: "rgba(0,0,0,0.35)", border: `2px solid ${secondary}` }}
              >
                {campaign.priceLabel && (
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: secondary }}>
                    {campaign.priceLabel}
                  </span>
                )}
                <span
                  className="text-4xl md:text-5xl lg:text-6xl font-black italic leading-none mt-1"
                  style={{ color: accent, textShadow: "2px 2px 0 rgba(0,0,0,0.35)" }}
                >
                  {campaign.priceValue}
                </span>
              </div>
            )}

            {/* Bullets */}
            <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
              {campaign.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: secondary }} />
                  <span className="opacity-95">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna direita — cupom + timer + CTA */}
          <div className="flex flex-col gap-4">
            {/* Timer */}
            <div
              className="rounded-2xl px-5 py-4 text-center"
              style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${secondary}66` }}
            >
              <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: secondary }}>
                <Timer className="size-3.5 animate-pulse" /> A promoção termina em
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 max-w-xs mx-auto">
                {[
                  { v: days, l: "dias" },
                  { v: hh, l: "hs" },
                  { v: mm, l: "min" },
                  { v: ss, l: "seg" },
                ].map((u, i) => (
                  <div key={i} className="rounded-lg py-2" style={{ background: primary, border: `1px solid ${secondary}55` }}>
                    <div className="text-2xl md:text-3xl font-black tabular-nums" style={{ color: accent }}>
                      {String(u.v).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] uppercase opacity-80">{u.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cupom copiável piscando */}
            <button
              type="button"
              onClick={copyCoupon}
              className="group relative rounded-2xl px-5 py-5 text-left transition-transform hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${secondary}, ${accent})`,
                color: primary,
                border: `2px dashed ${primary}`,
              }}
            >
              <span
                className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
                style={{ boxShadow: `0 0 0 5px ${accent}44` }}
              />
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                <Tag className="size-3.5" /> Copie seu cupom de desconto
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-2xl md:text-3xl font-black tracking-wider tabular-nums select-all animate-pulse">
                  {campaign.couponCode}
                </span>
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: primary, color: secondary }}
                >
                  <Copy className="size-3.5" /> {copied ? "Copiado!" : "Copiar"}
                </span>
              </div>
              <div className="text-[11px] mt-2 font-semibold opacity-80">
                Clique para copiar e envie no WhatsApp
              </div>
            </button>

            {/* CTA WhatsApp */}
            <Button
              asChild
              size="lg"
              className="w-full h-14 text-base font-black uppercase tracking-wider shadow-elegant hover:opacity-95"
              style={{ background: "#25D366", color: "#0b3d1a" }}
              onClick={() => { void copyCoupon(); }}
            >
              <a href={waLink(campaign.whatsappMessage)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> Chame Agora e dê um GOL!
              </a>
            </Button>

            <p className="text-[11px] text-center opacity-80">
              * Válido para todo o Brasil enquanto durar a campanha. Envie o cupom ao consultor para garantir o desconto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}