// ============================================================
//  CAMPANHAS PROMOCIONAIS — edite este arquivo para trocar,
//  ativar/desativar ou criar uma nova campanha.
//
//  Basta alterar os valores abaixo (título, preço, cupom, data
//  de validade, tema visual e mensagem do WhatsApp) que o banner
//  festivo aparece automaticamente na página correspondente.
// ============================================================

export type CampaignTheme = {
  /** cor primária (fundo) */
  primary: string;
  /** cor secundária/destaque */
  secondary: string;
  /** cor de destaque para preço/cupom */
  accent: string;
  /** cor do texto sobre o fundo primário */
  onPrimary: string;
};

export type Campaign = {
  id: string;
  enabled: boolean;
  eyebrow: string;              // ex: "Campanha da Copa"
  emoji?: string;               // ex: "⚽" ou "🎉"
  headline: string;             // título principal (pode usar \n)
  subheadline?: string;         // linha de apoio
  priceLabel?: string;          // ex: "Qualquer curso técnico por apenas"
  priceValue?: string;          // ex: "R$ 499,90" — opcional
  couponCode: string;           // ex: "COPA499"
  /** ISO string. Após essa data o banner some. */
  expiresAt: string;
  whatsappMessage: string;      // texto que vai para o WA
  bullets: string[];            // 3 a 4 destaques
  theme: CampaignTheme;
  /** Imagem hero da campanha (import estático). Opcional. */
  image?: string;
  imageAlt?: string;
};

/**
 * Gera um cupom aleatório curto e legível para cada sessão do usuário.
 * Mantemos o prefixo da campanha para o consultor identificar rapidamente.
 */
function generateCoupon(prefix: string, length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${out}`;
}

/**
 * Campanha ativa — "Estude em Casa / Tô de Férias".
 * Cupom é gerado aleatoriamente por sessão para gerar urgência
 * e permitir rastreio individual pelo consultor.
 */
const COUPON_FERIAS = generateCoupon("FERIAS-");

import campaignHero from "@/assets/campaign-ferias-estudante.jpg";

export const campanhaTecnico: Campaign = {
  id: "ferias-2026-07",
  enabled: true,
  eyebrow: "Estude em Casa · Tô de Férias",
  emoji: "🏖️",
  headline: "Aproveite as férias\ne dê o próximo passo na carreira",
  subheadline:
    "Copie seu cupom exclusivo e garanta um desconto especial em qualquer curso Multplick. Oferta válida até 30/07.",
  couponCode: COUPON_FERIAS,
  expiresAt: "2026-07-30T23:59:59-03:00",
  whatsappMessage: `Olá! Quero aproveitar a campanha "Estude em Casa · Tô de Férias" e garantir meu desconto.\n\nMeu cupom exclusivo: ${COUPON_FERIAS}`,
  bullets: [
    "Desconto exclusivo por cupom",
    "100% online · estude no seu ritmo",
    "Certificado reconhecido pelo MEC",
    "Válido até 30/07 · vagas limitadas",
  ],
  theme: {
    primary: "#0A0A0A",        // preto profundo
    secondary: "#F59E0B",      // amarelo âmbar
    accent: "#FB923C",         // laranja vibrante
    onPrimary: "#FFFFFF",
  },
  image: campaignHero,
  imageAlt: "Estudante em casa aproveitando as férias para estudar online com fone de ouvido no notebook",
};