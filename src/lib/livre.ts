import { supabase } from "@/integrations/supabase/client";
import { precoVigenteCents } from "@/lib/cursoLivre";

export type LivreCourse = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  categoria_id: string | null;
  description: string | null;
  long_description: string | null;
  image_url: string | null;
  price_cents: number | null;
  preco_promocional_cents: number | null;
  promocao_ativa: boolean | null;
  promocao_inicio: string | null;
  promocao_fim: string | null;
  tipo_curso: string | null;
  venda_livre: boolean | null;
  exige_avaliacao: boolean | null;
  emite_certificado_automatico: boolean | null;
  carga_horaria_horas: number | null;
  active: boolean | null;
};

const FIELDS =
  "id, slug, title, category, categoria_id, description, long_description, image_url, price_cents, " +
  "preco_promocional_cents, promocao_ativa, promocao_inicio, promocao_fim, tipo_curso, venda_livre, " +
  "exige_avaliacao, emite_certificado_automatico, carga_horaria_horas, active";

/**
 * Vitrine pública: só cursos ativos, marcados para venda como curso livre e com preço válido.
 * Pré-visualização da sede (preview): também os que ainda não foram publicados.
 * O banco continua sendo a última palavra — RLS só devolve curso inativo para quem tem permissão.
 */
export const fetchLivreCourses = async (preview: boolean): Promise<LivreCourse[]> => {
  let q = supabase.from("courses").select(FIELDS).in("tipo_curso", ["curso_livre", "avaliacao_conhecimentos"]);
  q = preview ? q.or("venda_livre.eq.true,exige_avaliacao.eq.true") : q.eq("active", true).eq("venda_livre", true);
  const { data } = await q.order("sort_order");
  return ((data ?? []) as unknown as LivreCourse[]).filter((c) => (precoVigenteCents(c) ?? 0) > 0);
};

export const fetchLivreCourseBySlug = async (slug: string, preview: boolean): Promise<LivreCourse | null> => {
  const { data } = await supabase.from("courses").select(FIELDS).eq("slug", slug).maybeSingle();
  const c = data as unknown as LivreCourse | null;
  if (!c) return null;
  if (!["curso_livre", "avaliacao_conhecimentos"].includes(c.tipo_curso ?? "")) return null;
  if (!preview && !(c.active && c.venda_livre)) return null;
  return c;
};

/** Define título e descrição da página (SEO/compartilhamento). */
export const setPageMeta = (title: string, description: string) => {
  document.title = title;
  const set = (selector: string, attr: string, value: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement("meta");
      const [key, val] = selector.replace(/^meta\[|\]$/g, "").split("=");
      el.setAttribute(key, val.replace(/["']/g, ""));
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  set('meta[name="description"]', "content", description);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", description);
  set('meta[property="og:type"]', "content", "website");
  set('meta[name="twitter:card"]', "content", "summary_large_image");
};
