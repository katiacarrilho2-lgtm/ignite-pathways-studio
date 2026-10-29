// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://multplick.live";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/cursos", changefreq: "weekly", priority: "0.9" },
  { path: "/loja", changefreq: "weekly", priority: "0.9" },
  { path: "/curso-por-competencia", changefreq: "monthly", priority: "0.8" },
  { path: "/curso-regular", changefreq: "monthly", priority: "0.8" },
  { path: "/unicorp", changefreq: "monthly", priority: "0.8" },
  { path: "/eja", changefreq: "monthly", priority: "0.8" },
  { path: "/certifique-sua-experiencia", changefreq: "weekly", priority: "0.8" },
  { path: "/empresas", changefreq: "monthly", priority: "0.7" },
  { path: "/in-company", changefreq: "monthly", priority: "0.7" },
  { path: "/sobre", changefreq: "monthly", priority: "0.6" },
  { path: "/contato", changefreq: "monthly", priority: "0.6" },
  { path: "/licenciado", changefreq: "monthly", priority: "0.6" },
  { path: "/seja-vendedor", changefreq: "monthly", priority: "0.5" },
  { path: "/blog", changefreq: "weekly", priority: "0.5" },
  { path: "/validar-certificado", changefreq: "yearly", priority: "0.4" },
];

function readEnv(): Record<string, string> {
  const out: Record<string, string> = { ...(process.env as Record<string, string>) };
  const f = resolve(".env");
  if (existsSync(f)) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && !out[m[1]]) out[m[1]] = m[2];
    }
  }
  return out;
}

async function fetchRows(table: string, query: string): Promise<any[]> {
  const env = readEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return [];
    return (await r.json()) as any[];
  } catch {
    return [];
  }
}

async function main() {
  const entries = [...staticEntries];

  // Mesmos filtros da loja: produtos disponíveis na loja → /curso/:slug
  const products = await fetchRows("store_products", "select=slug&disponivel_loja=eq.true");
  for (const p of products) if (p.slug) entries.push({ path: `/curso/${encodeURIComponent(p.slug)}`, changefreq: "weekly", priority: "0.8" });

  // Mesmos filtros da vitrine de cursos livres → /certifique-sua-experiencia/:slug
  const livres = await fetchRows(
    "courses",
    "select=slug&active=eq.true&venda_livre=eq.true&tipo_curso=in.(curso_livre,avaliacao_conhecimentos)",
  );
  for (const c of livres) if (c.slug) entries.push({ path: `/certifique-sua-experiencia/${encodeURIComponent(c.slug)}`, changefreq: "weekly", priority: "0.7" });

  const seen = new Set<string>();
  const urls = entries
    .filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)))
    .map((e) =>
      [
        "  <url>",
        `    <loc>${BASE_URL}${e.path}</loc>`,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ].filter(Boolean).join("\n"),
    );

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${urls.length} entries)`);
}

main();
