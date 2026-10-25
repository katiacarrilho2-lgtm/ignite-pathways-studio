import { supabase } from "@/integrations/supabase/client";
import { UNICORP_CATALOG } from "@/data/unicorpCatalog";

export const normTitle = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^curso\s+/, "").replace(/\s+/g, " ").trim();

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

/** Corrige técnicos fora da aba e importa o catálogo Unicorp 2026 (idempotente). */
export async function importUnicorpCatalog() {
  const { data: existing, error } = await supabase.from("courses").select("id,title,slug,category,instituicao");
  if (error) throw error;
  const rows = existing ?? [];
  const slugs = new Set(rows.map((r) => r.slug));
  let fixed = 0, both = 0, inserted = 0;

  // 1) Cursos atuais com nome "Técnico..." vão para a aba Técnicos (todos os atuais são da Faculdade LA).
  for (const r of rows) {
    const t = normTitle(r.title), cat = normTitle(r.category ?? "");
    if (t.startsWith("tecnico") && !cat.includes("tecnic") && !cat.includes("pos")) {
      const { error: e } = await supabase.from("courses").update({ category: "TÉCNICOS", instituicao: "FL" }).eq("id", r.id);
      if (e) throw e;
      r.category = "TÉCNICOS"; r.instituicao = "FL"; fixed++;
    }
  }

  // 2) Importa catálogo.
  const byTitle = new Map(rows.map((r) => [normTitle(r.title), r]));
  const toInsert: any[] = [];
  UNICORP_CATALOG.forEach((c, i) => {
    const ex = byTitle.get(normTitle(c.title));
    if (ex) {
      if (c.category === "TÉCNICOS" && ex.instituicao === "FL") {
        both++;
        supabase.from("courses").update({ instituicao: "U/FL" }).eq("id", ex.id).then(() => {});
      }
      return;
    }
    let slug = slugify(c.title) + "-unicorp", n = 2;
    while (slugs.has(slug)) slug = `${slugify(c.title)}-unicorp-${n++}`;
    slugs.add(slug);
    toInsert.push({ ...c, slug, instituicao: "U", active: true, published: true, sort_order: 1000 + i });
  });
  for (let i = 0; i < toInsert.length; i += 100) {
    const { error: e } = await supabase.from("courses").insert(toInsert.slice(i, i + 100));
    if (e) throw e;
    inserted += Math.min(100, toInsert.length - i);
  }
  return { fixed, both, inserted };
}
