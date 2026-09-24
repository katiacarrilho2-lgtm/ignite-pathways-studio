import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StoreProduct = Tables<"store_products">;
export type StoreCategory = Tables<"store_categories">;
export type StoreBanner = Tables<"store_banners">;

export const sb = supabase as any;

export const brl = (c?: number | null) =>
  c == null ? "" : (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** Apenas para exibição — o valor cobrado é sempre recalculado no servidor. */
export const promoValida = (p: Pick<StoreProduct, "promo_ativa" | "preco_promo_cents" | "promo_inicio" | "promo_fim">) => {
  const d = hoje();
  return !!(p.promo_ativa && p.preco_promo_cents && p.preco_promo_cents > 0
    && (!p.promo_inicio || p.promo_inicio <= d) && (!p.promo_fim || p.promo_fim >= d));
};
export const precoVigente = (p: StoreProduct) => (promoValida(p) ? p.preco_promo_cents : p.preco_cents);

export const OBJETIVOS = [
  { key: "comecar", label: "Quero começar uma profissão" },
  { key: "experiencia", label: "Já tenho experiência profissional" },
  { key: "concluir", label: "Quero concluir meus estudos" },
  { key: "faculdade", label: "Quero fazer faculdade" },
  { key: "especializar", label: "Quero me especializar" },
  { key: "equipe", label: "Preciso treinar minha equipe" },
];

export const TIPO_VENDA_LABEL: Record<string, string> = {
  compra_direta: "Compra direta",
  consulta: "Consulta antes da compra",
  proposta: "Solicitar proposta",
};

/* ---------- Carrinho ---------- */
const CART = "mp_store_cart";
export const getCart = (): string[] => { try { return JSON.parse(localStorage.getItem(CART) || "[]"); } catch { return []; } };
const setCart = (ids: string[]) => { localStorage.setItem(CART, JSON.stringify(ids)); window.dispatchEvent(new Event("mp-cart")); };
export const addToCart = (id: string) => { const c = getCart(); if (!c.includes(id)) setCart([...c, id]); };
export const removeFromCart = (id: string) => setCart(getCart().filter((x) => x !== id));
export const clearCart = () => setCart([]);
export const useCart = () => {
  const [c, setC] = useState<string[]>(getCart);
  useEffect(() => { const f = () => setC(getCart()); window.addEventListener("mp-cart", f); window.addEventListener("storage", f);
    return () => { window.removeEventListener("mp-cart", f); window.removeEventListener("storage", f); }; }, []);
  return c;
};

/* ---------- Origem da venda (polo, consultor, campanha) ---------- */
const ORIG = "mp_store_origem";
export const captureOrigem = (search: string) => {
  const q = new URLSearchParams(search);
  const polo = q.get("polo"); const ref = q.get("ref") || q.get("consultor");
  const camp = q.get("utm_campaign") || q.get("campanha"); const src = q.get("utm_source") || q.get("origem");
  if (!polo && !ref && !camp && !src) return;
  const prev = getOrigem();
  localStorage.setItem(ORIG, JSON.stringify({
    polo: polo || prev.polo, consultor: ref || prev.consultor, campanha: camp || prev.campanha, origem: src || prev.origem, at: Date.now(),
  }));
};
export const getOrigem = (): Record<string, string | undefined> => {
  try {
    const o = JSON.parse(localStorage.getItem(ORIG) || "{}");
    if (o.at && Date.now() - o.at > 60 * 86400000) return {};
    if (!o.consultor) { const r = JSON.parse(localStorage.getItem("mp_referral") || "null"); if (r?.code) o.consultor = r.code; }
    return o;
  } catch { return {}; }
};

/* ---------- WhatsApp ---------- */
export const DEFAULT_WHATS = "5518996841902";
export const useStoreWhatsapp = () => {
  const [w, setW] = useState(DEFAULT_WHATS);
  useEffect(() => { sb.from("store_settings").select("whatsapp").eq("id", 1).maybeSingle()
    .then(({ data }: any) => data?.whatsapp && setW(String(data.whatsapp).replace(/\D/g, ""))); }, []);
  return w;
};
export const waLink = (num: string, msg: string) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

export const setSeo = (title: string, desc?: string | null, indexavel = true) => {
  document.title = title;
  const set = (sel: string, attr: string, key: string, val: string) => {
    let m = document.head.querySelector(sel) as HTMLMetaElement | null;
    if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.content = val;
  };
  if (desc) { set('meta[name="description"]', "name", "description", desc); set('meta[property="og:description"]', "property", "og:description", desc); }
  set('meta[property="og:title"]', "property", "og:title", title);
  set('meta[name="robots"]', "name", "robots", indexavel ? "index,follow" : "noindex,nofollow");
};
