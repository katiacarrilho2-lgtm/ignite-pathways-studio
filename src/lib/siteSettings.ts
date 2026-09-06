import { supabase } from "@/integrations/supabase/client";

export type IdentitySettings = {
  logo_url: string;
  primary: string;          // HSL sem hsl(), ex: "220 70% 22%"
  accent: string;
  ring: string;
  font_body: string;
  font_heading: string;
};

export const IDENTITY_DEFAULTS: IdentitySettings = {
  logo_url: "",
  primary: "220 70% 22%",
  accent: "210 18% 88%",
  ring: "220 70% 22%",
  font_body: "Inter",
  font_heading: "Manrope",
};

export const FONT_OPTIONS = [
  "Inter",
  "Manrope",
  "Poppins",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Nunito",
  "Work Sans",
  "Playfair Display",
  "Sora",
];

export const SECTION_IDENTITY = "identidade";

/** #rrggbb -> "h s% l%" */
export const hexToHsl = (hex: string): string => {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/** "h s% l%" -> #rrggbb */
export const hslToHex = (hsl: string): string => {
  const parts = hsl.trim().split(/\s+/);
  const h = parseFloat(parts[0] ?? "0");
  const s = parseFloat((parts[1] ?? "0").replace("%", "")) / 100;
  const l = parseFloat((parts[2] ?? "0").replace("%", "")) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
};

export const loadGoogleFonts = (families: string[]) => {
  const unique = Array.from(new Set(families.filter(Boolean)));
  if (!unique.length) return;
  const id = "site-google-fonts";
  const href =
    "https://fonts.googleapis.com/css2?" +
    unique.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`).join("&") +
    "&display=swap";
  let el = document.getElementById(id) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.id = id;
    el.rel = "stylesheet";
    document.head.appendChild(el);
  }
  if (el.href !== href) el.href = href;
};

export const applyIdentity = (v: IdentitySettings) => {
  const root = document.documentElement;
  if (v.primary) root.style.setProperty("--primary", v.primary);
  if (v.accent) root.style.setProperty("--accent", v.accent);
  if (v.ring) root.style.setProperty("--ring", v.ring);
  if (v.font_body) root.style.setProperty("--font-body", `'${v.font_body}', system-ui, sans-serif`);
  if (v.font_heading) root.style.setProperty("--font-heading", `'${v.font_heading}', system-ui, sans-serif`);
  loadGoogleFonts([v.font_body, v.font_heading]);
};

export const fetchSection = async <T,>(section: string, fallback: T, mode: "published" | "draft" = "published"): Promise<T> => {
  const cols = mode === "draft" ? "draft" : "published";
  const { data } = await supabase.from("site_settings").select(cols).eq("section", section).maybeSingle();
  const raw = (data as any)?.[cols];
  if (!raw || typeof raw !== "object" || !Object.keys(raw).length) return fallback;
  return { ...fallback, ...(raw as object) } as T;
};

/* ---------------------------------------------------------------- Home ---- */

export const SECTION_HOME = "home";

export type StatItem = { end: number; suffix: string; label: string; custom?: string };
export type DiffItem = { icon: string; title: string; text: string };

export type HomeSettings = {
  hero_image_url: string;
  hero_badge: string;
  hero_title_1: string;
  hero_title_highlight: string;
  hero_title_2: string;
  hero_subtitle: string;
  hero_cta1_label: string;
  hero_cta1_href: string;
  hero_cta2_label: string;
  hero_cta2_href: string;
  stats: StatItem[];
  diff_eyebrow: string;
  diff_title: string;
  diff_subtitle: string;
  differentials: DiffItem[];
  show_sistec: boolean;
  show_eja: boolean;
  show_carrossel: boolean;
  show_destaques: boolean;
  show_incompany: boolean;
  show_cta: boolean;
  show_mapa: boolean;
  show_parceiros: boolean;
};

export const HOME_DEFAULTS: HomeSettings = {
  hero_image_url: "",
  hero_badge: "Solução corporativa de capacitação",
  hero_title_1: "A solução completa em",
  hero_title_highlight: "formação profissional",
  hero_title_2: "para empresas e alunos.",
  hero_subtitle:
    "Cursos técnicos, graduações,\npós-graduações, EJA, NRs e treinamentos\nin company com valores acessíveis e\natendimento especializado em todo o Brasil.",
  hero_cta1_label: "Solicitar Convênio",
  hero_cta1_href: "/empresas",
  hero_cta2_label: "Ver Catálogo",
  hero_cta2_href: "/cursos",
  stats: [
    { end: 10000, suffix: "+", label: "Alunos formados" },
    { end: 200, suffix: "+", label: "Empresas atendidas" },
    { end: 500, suffix: "+", label: "Treinamentos realizados" },
    { end: 0, suffix: "", label: "Atendimento nacional", custom: "BR" },
  ],
  diff_eyebrow: "Por que Multplick",
  diff_title: "Solução completa em formação profissional",
  diff_subtitle:
    "Conectamos empresas e alunos a uma estrutura educacional robusta, com método prático e acompanhamento real.",
  differentials: [
    { icon: "HardHat", title: "Treinamento in loco", text: "Nossos professores vão até sua empresa e atuam dentro da operação até o fim do treinamento." },
    { icon: "ShieldCheck", title: "Normas Regulamentadoras", text: "Capacitações em NR-10, NR-33, NR-35 e demais NRs com certificação reconhecida." },
    { icon: "GraduationCap", title: "Parcerias acadêmicas", text: "Faculdades, escolas técnicas, graduação, pós-graduação e EJA com mensalidades acessíveis." },
    { icon: "Building2", title: "Convênios empresariais", text: "Descontos exclusivos e turmas customizadas para colaboradores e seus dependentes." },
  ],
  show_sistec: true,
  show_eja: true,
  show_carrossel: true,
  show_destaques: true,
  show_incompany: true,
  show_cta: true,
  show_mapa: true,
  show_parceiros: true,
};

export const DIFF_ICONS = ["HardHat", "ShieldCheck", "GraduationCap", "Building2", "Award", "Users", "Briefcase", "Sparkles"];
