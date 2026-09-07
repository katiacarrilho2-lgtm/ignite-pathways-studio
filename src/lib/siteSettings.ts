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

/* --------------------------------------------------------------- Páginas ---- */

export type BlockKind =
  | "image_text" | "text" | "cards" | "list" | "steps"
  | "quotes" | "logos" | "gallery" | "contacts" | "cta" | "map" | "slot";

export type BlockItem = { icon?: string; title?: string; text?: string; href?: string; image_url?: string };

export type PageBlock = {
  id: string;
  kind: BlockKind;
  visible?: boolean;
  bg?: "none" | "muted";
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  center?: boolean;
  image_url?: string;
  image_right?: boolean;
  cta_label?: string;
  cta_href?: string;
  slot?: string;
  slot_label?: string;
  items: BlockItem[];
};

export type PageSettings = {
  hero_eyebrow: string;
  hero_title: string;
  hero_description: string;
  blocks: PageBlock[];
};

export const BLOCK_KIND_LABELS: Record<BlockKind, string> = {
  image_text: "Imagem + texto",
  text: "Texto",
  cards: "Cartões com ícone",
  list: "Lista com ícone",
  steps: "Passo a passo numerado",
  quotes: "Depoimentos",
  logos: "Faixa de parceiros",
  gallery: "Galeria de imagens",
  contacts: "Cartões de contato",
  cta: "Chamada destacada",
  map: "Mapa",
  slot: "Formulário do site",
};

export const ADDABLE_BLOCK_KINDS: BlockKind[] = [
  "image_text", "text", "cards", "list", "steps", "quotes", "logos", "gallery", "contacts", "cta", "map",
];

export const ICON_OPTIONS = [
  "Sparkles", "Target", "Eye", "Heart", "Building2", "Briefcase", "TrendingUp", "Users", "ShieldCheck",
  "GraduationCap", "HardHat", "Award", "Coins", "Handshake", "CalendarCheck", "ClipboardCheck", "MapPin",
  "Phone", "Mail", "MessageCircle", "PlayCircle", "Star", "CheckCircle2", "Rocket",
];

export const newBlockId = () => `b_${Math.random().toString(36).slice(2, 9)}`;

export const emptyBlock = (kind: BlockKind): PageBlock => ({
  id: newBlockId(),
  kind,
  visible: true,
  bg: "none",
  eyebrow: "",
  title: "Novo bloco",
  subtitle: "",
  body: kind === "map" ? "https://www.openstreetmap.org/export/embed.html?bbox=-46.7,-23.7,-46.5,-23.5&layer=mapnik" : "",
  center: kind === "cards" || kind === "quotes" || kind === "logos" || kind === "gallery",
  image_url: "",
  items: ["cards", "list", "steps", "quotes", "logos", "gallery", "contacts"].includes(kind)
    ? [{ icon: "Sparkles", title: "Título", text: "Texto do item" }]
    : [],
});

export const PAGE_SECTIONS = {
  sobre: "pagina_sobre",
  empresas: "pagina_empresas",
  incompany: "pagina_incompany",
  licenciado: "pagina_licenciado",
  contato: "pagina_contato",
} as const;

export type PageKey = keyof typeof PAGE_SECTIONS;

export const PAGE_LABELS: Record<PageKey, string> = {
  sobre: "Sobre",
  empresas: "Empresas",
  incompany: "In Company",
  licenciado: "Seja Licenciado",
  contato: "Contato",
};

export const SOBRE_DEFAULTS: PageSettings = {
  hero_eyebrow: "Sobre a Multplick",
  hero_title: "Formação que multiplica oportunidades",
  hero_description: "Há anos conectando empresas, instituições de ensino e profissionais em torno de uma educação que entrega resultados reais.",
  blocks: [
    {
      id: "sobre_historia", kind: "image_text", visible: true, bg: "none",
      eyebrow: "Nossa história", title: "Educação profissional com propósito",
      body: "A Multplick nasceu para preencher uma lacuna entre o mercado e a educação técnica. Formamos alunos dentro de usinas, indústrias e ambientes reais de operação — capacitando profissionais em automação, refrigeração e elétrica, com todos os EPIs e uniformes adequados.\n\nAtuamos em parceria com escolas técnicas, EJA, cursos híbridos, profissionalizantes, graduação, pós-graduação e treinamentos em todas as Normas Regulamentadoras. Nosso modelo in company leva o professor diretamente para dentro da empresa, com acompanhamento real até a conclusão do treinamento.\n\nCNPJ 37.541.371/0001-90",
      image_url: "", items: [],
    },
    {
      id: "sobre_dna", kind: "cards", visible: true, bg: "muted", center: true,
      eyebrow: "Nosso DNA", title: "Missão, Visão e Valores",
      items: [
        { icon: "Target", title: "Missão", text: "Multiplicar oportunidades por meio de uma formação profissional acessível, prática e conectada ao mercado." },
        { icon: "Eye", title: "Visão", text: "Ser referência nacional em formação profissional para empresas, usinas e indústrias." },
        { icon: "Heart", title: "Valores", text: "Excelência, proximidade, responsabilidade social e compromisso com o desenvolvimento humano." },
      ],
    },
    {
      id: "sobre_parceiros", kind: "logos", visible: true, bg: "none", center: true,
      eyebrow: "Parceiros e credibilidade", title: "Quem confia na Multplick",
      items: [
        { icon: "Building2", title: "Usinas" }, { icon: "Building2", title: "Indústrias" },
        { icon: "Building2", title: "Faculdades" }, { icon: "Building2", title: "Escolas Técnicas" },
        { icon: "Building2", title: "Governo" },
      ],
    },
  ],
};

export const EMPRESAS_DEFAULTS: PageSettings = {
  hero_eyebrow: "Área para Empresas",
  hero_title: "Convênios e treinamentos corporativos",
  hero_description: "Soluções customizadas em capacitação para RH, segurança do trabalho e desenvolvimento de equipes.",
  blocks: [
    {
      id: "emp_vantagens", kind: "list", visible: true, bg: "none",
      eyebrow: "Vantagens", title: "Por que firmar convênio com a Multplick",
      items: [
        { icon: "TrendingUp", title: "Produtividade", text: "Colaboradores capacitados reduzem retrabalho e aumentam a eficiência operacional." },
        { icon: "ShieldCheck", title: "Conformidade", text: "Todas as NRs e exigências legais aplicáveis ao seu setor, em dia." },
        { icon: "Users", title: "Retenção de talentos", text: "Educação como benefício corporativo fortalece o employer branding." },
        { icon: "Briefcase", title: "Custos otimizados", text: "Mensalidades reduzidas e turmas exclusivas para colaboradores e dependentes." },
      ],
    },
    { id: "emp_form", kind: "slot", visible: true, slot: "form", slot_label: "Formulário “Cadastre sua empresa”", items: [] },
    {
      id: "emp_cases", kind: "quotes", visible: true, bg: "muted", center: true,
      eyebrow: "Cases", title: "Resultados que falam por si",
      items: [
        { title: "Usina Solar Energia", text: "Reduzimos 40% dos afastamentos com o programa de NRs Multplick." },
        { title: "Indústria Metalmecânica BR", text: "Capacitamos 120 colaboradores em soldagem industrial em 90 dias." },
        { title: "Logística Norte", text: "O convênio educacional ajudou a reter nossos talentos operacionais." },
      ],
    },
  ],
};

export const INCOMPANY_DEFAULTS: PageSettings = {
  hero_eyebrow: "Treinamentos In Company",
  hero_title: "Capacitação dentro da sua operação",
  hero_description: "Levamos professores e instrutores qualificados até sua empresa, com acompanhamento contínuo até a conclusão do treinamento.",
  blocks: [
    {
      id: "inc_metodo", kind: "steps", visible: true, bg: "none",
      eyebrow: "Como funciona", title: "Método in loco Multplick",
      items: [
        { icon: "MapPin", title: "Diagnóstico", text: "Visita técnica e mapeamento das necessidades de capacitação da sua operação." },
        { icon: "ClipboardCheck", title: "Planejamento", text: "Cronograma, conteúdo programático e certificações adequadas ao seu setor." },
        { icon: "Users", title: "Execução in loco", text: "Professores presentes na empresa, com aulas práticas no ambiente real de trabalho." },
        { icon: "GraduationCap", title: "Certificação", text: "Avaliação, emissão de certificados e suporte pós-treinamento." },
      ],
    },
    {
      id: "inc_videos", kind: "gallery", visible: true, bg: "muted", center: true,
      eyebrow: "Vídeos", title: "Conheça nossos treinamentos",
      cta_label: "Solicitar treinamento in company", cta_href: "/empresas",
      items: [{ title: "" }, { title: "" }],
    },
  ],
};

export const LICENCIADO_DEFAULTS: PageSettings = {
  hero_eyebrow: "Programa Licenciado",
  hero_title: "Seja um Licenciado Multplick",
  hero_description: "Construa um negócio sólido na área da educação revendendo nosso portfólio completo de cursos em sua região.",
  blocks: [
    {
      id: "lic_intro", kind: "image_text", visible: true, bg: "none",
      eyebrow: "Por que ser Licenciado", title: "Um modelo de negócio com lucro recorrente e marca forte",
      body: "O programa Licenciado Multplick foi desenhado para empreendedores que querem atuar no mercado de educação profissional com baixo investimento inicial, alta margem e o suporte de uma marca consolidada.\n\nVocê revende todo o catálogo Multplick — cursos técnicos, NRs, graduação, pós-graduação, EJA e treinamentos in company — recebendo comissões por cada aluno matriculado.",
      image_url: "", items: [],
    },
    {
      id: "lic_beneficios", kind: "cards", visible: true, bg: "muted", center: true,
      eyebrow: "Benefícios", title: "O que você recebe ao se tornar Licenciado",
      items: [
        { icon: "Coins", title: "Comissões atrativas", text: "Modelo de receita recorrente sobre cada matrícula realizada na sua região." },
        { icon: "TrendingUp", title: "Catálogo completo", text: "Revenda cursos técnicos, NRs, graduação, pós-graduação e EJA com a marca Multplick." },
        { icon: "Users", title: "Suporte comercial", text: "Materiais de venda, treinamento de equipe e acompanhamento dedicado." },
        { icon: "Briefcase", title: "Território exclusivo", text: "Atue como representante oficial Multplick em sua cidade ou região." },
      ],
    },
    { id: "lic_form", kind: "slot", visible: true, slot: "form", slot_label: "Formulário “Agende uma reunião”", items: [] },
  ],
};

export const CONTATO_DEFAULTS: PageSettings = {
  hero_eyebrow: "Contato",
  hero_title: "Vamos conversar?",
  hero_description: "Tire suas dúvidas, solicite informações de cursos ou fale com nossa equipe corporativa.",
  blocks: [
    { id: "cont_form", kind: "slot", visible: true, slot: "form", slot_label: "Formulário de contato", items: [] },
    {
      id: "cont_cards", kind: "contacts", visible: true, bg: "none",
      items: [
        { icon: "Phone", title: "Telefone", text: "(18) 99684-1902", href: "tel:+5518996841902" },
        { icon: "MessageCircle", title: "WhatsApp", text: "(18) 99684-1902", href: "https://wa.me/5518996841902" },
        { icon: "Mail", title: "E-mail", text: "contato@multplick.com.br" },
        { icon: "MapPin", title: "Endereço", text: "Atendimento nacional" },
      ],
    },
    {
      id: "cont_mapa", kind: "map", visible: true, bg: "none",
      body: "https://www.openstreetmap.org/export/embed.html?bbox=-46.7,-23.7,-46.5,-23.5&layer=mapnik",
      items: [],
    },
  ],
};

export const CONTATO_CARDS_DEFAULT: BlockItem[] = [
  { icon: "Phone", title: "Telefone", text: "(18) 99684-1902", href: "tel:+5518996841902" },
  { icon: "MessageCircle", title: "WhatsApp", text: "(18) 99684-1902", href: "https://wa.me/5518996841902" },
  { icon: "Mail", title: "E-mail", text: "contato@multplick.com.br" },
  { icon: "MapPin", title: "Endereço", text: "Atendimento nacional" },
];

export const PAGE_DEFAULTS: Record<PageKey, PageSettings> = {
  sobre: SOBRE_DEFAULTS,
  empresas: EMPRESAS_DEFAULTS,
  incompany: INCOMPANY_DEFAULTS,
  licenciado: LICENCIADO_DEFAULTS,
  contato: CONTATO_DEFAULTS,
};
