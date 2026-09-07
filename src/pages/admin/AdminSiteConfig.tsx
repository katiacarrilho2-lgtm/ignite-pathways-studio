import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Rocket, RotateCcw, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { uploadCourseImage } from "@/lib/courseMedia";
import {
  IDENTITY_DEFAULTS, IdentitySettings, SECTION_IDENTITY, FONT_OPTIONS,
  HOME_DEFAULTS, HomeSettings, SECTION_HOME, DIFF_ICONS,
  applyIdentity, hexToHsl, hslToHex,
  PAGE_SECTIONS, PAGE_LABELS, PAGE_DEFAULTS, PageKey, PageSettings,
} from "@/lib/siteSettings";
import { PageBlocksEditor } from "@/components/admin/PageBlocksEditor";

const PAGE_PATHS: Record<PageKey, string> = {
  sobre: "/sobre", empresas: "/empresas", incompany: "/in-company",
  licenciado: "/licenciado", contato: "/contato",
};

type SectionState<T> = { draft: T; published: T };

const Inner = () => {
  const [tab, setTab] = useState("identidade");
  const [ident, setIdent] = useState<SectionState<IdentitySettings>>({ draft: IDENTITY_DEFAULTS, published: IDENTITY_DEFAULTS });
  const [home, setHome] = useState<SectionState<HomeSettings>>({ draft: HOME_DEFAULTS, published: HOME_DEFAULTS });
  const [page, setPage] = useState<PageKey>("sobre");
  const [pages, setPages] = useState<Record<PageKey, SectionState<PageSettings>>>(() =>
    Object.fromEntries(
      (Object.keys(PAGE_DEFAULTS) as PageKey[]).map((k) => [k, { draft: PAGE_DEFAULTS[k], published: PAGE_DEFAULTS[k] }])
    ) as Record<PageKey, SectionState<PageSettings>>);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("section, draft, published");
    const rows = (data ?? []) as any[];
    const pick = <T,>(section: string, defaults: T): SectionState<T> => {
      const r = rows.find((x) => x.section === section);
      const published = { ...defaults, ...((r?.published as object) ?? {}) } as T;
      return { published, draft: { ...published, ...((r?.draft as object) ?? {}) } as T };
    };
    setIdent(pick(SECTION_IDENTITY, IDENTITY_DEFAULTS));
    setHome(pick(SECTION_HOME, HOME_DEFAULTS));
    setPages(Object.fromEntries(
      (Object.keys(PAGE_DEFAULTS) as PageKey[]).map((k) => [k, pick(PAGE_SECTIONS[k], PAGE_DEFAULTS[k])])
    ) as Record<PageKey, SectionState<PageSettings>>);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const current = tab === "home"
    ? { section: SECTION_HOME, draft: home.draft as any, published: home.published as any }
    : tab === "paginas"
      ? { section: PAGE_SECTIONS[page], draft: pages[page].draft as any, published: pages[page].published as any }
      : { section: SECTION_IDENTITY, draft: ident.draft as any, published: ident.published as any };

  const save = async (alsoPublish: boolean) => {
    setBusy(true);
    const payload: any = { section: current.section, draft: current.draft };
    if (alsoPublish) { payload.published = current.draft; payload.published_at = new Date().toISOString(); }
    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "section" });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (alsoPublish) {
      if (tab === "identidade") { setIdent((s) => ({ ...s, published: s.draft })); applyIdentity(ident.draft); }
      else if (tab === "home") setHome((s) => ({ ...s, published: s.draft }));
      else setPages((s) => ({ ...s, [page]: { ...s[page], published: s[page].draft } }));
      toast.success("Publicado no site.");
    } else {
      toast.success("Rascunho salvo. Use “Ver rascunho” para conferir.");
    }
  };

  const restore = () => {
    if (tab === "identidade") setIdent((s) => ({ ...s, draft: s.published }));
    else if (tab === "home") setHome((s) => ({ ...s, draft: s.published }));
    else setPages((s) => ({ ...s, [page]: { ...s[page], draft: s[page].published } }));
    toast.success("Voltou para a versão publicada.");
  };

  const setI = (patch: Partial<IdentitySettings>) => setIdent((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
  const setH = (patch: Partial<HomeSettings>) => setHome((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
  const i = ident.draft;
  const h = home.draft;

  const upload = async (file: File, apply: (url: string) => void) => {
    try {
      setBusy(true);
      apply(await uploadCourseImage(file, "site"));
      toast.success("Imagem enviada");
    } catch (e: any) { toast.error(e.message ?? "Falha no upload"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const editable = tab === "identidade" || tab === "home" || tab === "paginas";
  const previewPath = tab === "paginas" ? PAGE_PATHS[page] : "/";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Settings className="size-7" /> Configurações do site</h1>
          <p className="text-muted-foreground">Edite o site público da Multplick. Nada muda para o visitante até você publicar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`${previewPath}?preview=1`, "_blank")}><Eye className="size-4" /> Ver rascunho</Button>
          <Button variant="outline" onClick={restore} disabled={busy || !editable}><RotateCcw className="size-4" /> Descartar alterações</Button>
          <Button variant="outline" onClick={() => save(false)} disabled={busy || !editable}><Save className="size-4" /> Salvar rascunho</Button>
          <Button variant="hero" onClick={() => save(true)} disabled={busy || !editable}><Rocket className="size-4" /> Publicar</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="home">Página inicial</TabsTrigger>
          <TabsTrigger value="paginas">Páginas</TabsTrigger>
          <TabsTrigger value="menu">Menu e rodapé</TabsTrigger>
          <TabsTrigger value="contato">Contato e redes</TabsTrigger>
          <TabsTrigger value="midia">Mídia</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------ Identidade */}
        <TabsContent value="identidade" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary/40 p-4 grid place-items-center min-h-28">
                {i.logo_url
                  ? <img src={i.logo_url} alt="Logo do site" className="max-h-20 w-auto" />
                  : <span className="text-sm text-muted-foreground">Usando o logo padrão da Multplick</span>}
              </div>
              <label className="flex items-center gap-2 border border-dashed rounded-lg p-3 cursor-pointer text-sm text-muted-foreground hover:bg-secondary/50">
                <Upload className="size-4" /> Enviar novo logo (PNG com fundo transparente)
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], (url) => setI({ logo_url: url }))} />
              </label>
              <div>
                <Label>Ou informe o endereço da imagem</Label>
                <Input value={i.logo_url} onChange={(e) => setI({ logo_url: e.target.value })} placeholder="https://…" />
              </div>
              {i.logo_url && <Button variant="ghost" size="sm" onClick={() => setI({ logo_url: "" })}>Voltar ao logo padrão</Button>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {([
                ["primary", "Cor principal (botões, títulos)"],
                ["accent", "Cor de apoio"],
                ["ring", "Cor de destaque ao focar"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <input type="color" className="size-10 rounded-md border border-border bg-background"
                    value={hslToHex(i[key])}
                    onChange={(e) => setI({ [key]: hexToHsl(e.target.value) } as Partial<IdentitySettings>)} />
                  <div className="flex-1">
                    <Label>{label}</Label>
                    <Input value={i[key]} onChange={(e) => setI({ [key]: e.target.value } as Partial<IdentitySettings>)} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setI({
                primary: IDENTITY_DEFAULTS.primary, accent: IDENTITY_DEFAULTS.accent, ring: IDENTITY_DEFAULTS.ring,
              })}>Restaurar cores originais</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Fontes</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Fonte dos títulos</Label>
                <Select value={i.font_heading} onValueChange={(v) => setI({ font_heading: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fonte dos textos</Label>
                <Select value={i.font_body} onValueChange={(v) => setI({ font_body: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Prévia</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border p-5 space-y-3"
                style={{ ["--primary" as any]: i.primary, ["--accent" as any]: i.accent }}>
                <h3 style={{ fontFamily: `'${i.font_heading}', system-ui, sans-serif` }} className="text-2xl font-bold text-primary">
                  Formação profissional que gera resultado
                </h3>
                <p style={{ fontFamily: `'${i.font_body}', system-ui, sans-serif` }} className="text-sm text-muted-foreground">
                  Assim ficam os títulos e os textos do site com as escolhas atuais.
                </p>
                <div className="flex gap-2">
                  <span className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Botão principal</span>
                  <span className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm">Botão de apoio</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                A prévia é aproximada. Use “Ver rascunho” para abrir o site real com as alterações ainda não publicadas.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- Página inicial */}
        <TabsContent value="home" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Capa (topo da página inicial)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden aspect-[16/7] bg-secondary grid place-items-center">
                    {h.hero_image_url
                      ? <img src={h.hero_image_url} alt="Imagem da capa" className="w-full h-full object-cover" />
                      : <span className="text-sm text-muted-foreground px-4 text-center">Usando a imagem padrão da capa</span>}
                  </div>
                  <label className="flex items-center gap-2 border border-dashed rounded-lg p-3 cursor-pointer text-sm text-muted-foreground hover:bg-secondary/50">
                    <Upload className="size-4" /> Enviar imagem da capa (1920 × 1080 px)
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], (url) => setH({ hero_image_url: url }))} />
                  </label>
                  {h.hero_image_url && <Button variant="ghost" size="sm" onClick={() => setH({ hero_image_url: "" })}>Voltar à imagem padrão</Button>}
                </div>
                <div className="space-y-3">
                  <div><Label>Selo acima do título</Label><Input value={h.hero_badge} onChange={(e) => setH({ hero_badge: e.target.value })} /></div>
                  <div><Label>Título — 1ª linha</Label><Input value={h.hero_title_1} onChange={(e) => setH({ hero_title_1: e.target.value })} /></div>
                  <div><Label>Título — linha destacada em azul</Label><Input value={h.hero_title_highlight} onChange={(e) => setH({ hero_title_highlight: e.target.value })} /></div>
                  <div><Label>Título — 3ª linha</Label><Input value={h.hero_title_2} onChange={(e) => setH({ hero_title_2: e.target.value })} /></div>
                  <div>
                    <Label>Texto abaixo do título</Label>
                    <Textarea rows={4} value={h.hero_subtitle} onChange={(e) => setH({ hero_subtitle: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Cada linha aqui vira uma linha no site.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><Label>Botão 1 — texto</Label><Input value={h.hero_cta1_label} onChange={(e) => setH({ hero_cta1_label: e.target.value })} /></div>
                <div><Label>Botão 1 — destino</Label><Input value={h.hero_cta1_href} onChange={(e) => setH({ hero_cta1_href: e.target.value })} /></div>
                <div><Label>Botão 2 — texto</Label><Input value={h.hero_cta2_label} onChange={(e) => setH({ hero_cta2_label: e.target.value })} /></div>
                <div><Label>Botão 2 — destino</Label><Input value={h.hero_cta2_href} onChange={(e) => setH({ hero_cta2_href: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Números da capa</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {h.stats.map((s, idx) => (
                <div key={idx} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Número</Label><Input type="number" value={s.end}
                      onChange={(e) => { const st = [...h.stats]; st[idx] = { ...s, end: Number(e.target.value) }; setH({ stats: st }); }} /></div>
                    <div><Label>Sufixo</Label><Input value={s.suffix ?? ""}
                      onChange={(e) => { const st = [...h.stats]; st[idx] = { ...s, suffix: e.target.value }; setH({ stats: st }); }} /></div>
                    <div><Label>Texto fixo</Label><Input value={s.custom ?? ""} placeholder="ex.: BR"
                      onChange={(e) => { const st = [...h.stats]; st[idx] = { ...s, custom: e.target.value || undefined }; setH({ stats: st }); }} /></div>
                  </div>
                  <div><Label>Legenda</Label><Input value={s.label}
                    onChange={(e) => { const st = [...h.stats]; st[idx] = { ...s, label: e.target.value }; setH({ stats: st }); }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Diferenciais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div><Label>Chapéu</Label><Input value={h.diff_eyebrow} onChange={(e) => setH({ diff_eyebrow: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Título</Label><Input value={h.diff_title} onChange={(e) => setH({ diff_title: e.target.value })} /></div>
              </div>
              <div><Label>Subtítulo</Label><Textarea rows={2} value={h.diff_subtitle} onChange={(e) => setH({ diff_subtitle: e.target.value })} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                {h.differentials.map((d, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Ícone</Label>
                        <Select value={d.icon} onValueChange={(v) => { const arr = [...h.differentials]; arr[idx] = { ...d, icon: v }; setH({ differentials: arr }); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{DIFF_ICONS.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2"><Label>Título</Label><Input value={d.title}
                        onChange={(e) => { const arr = [...h.differentials]; arr[idx] = { ...d, title: e.target.value }; setH({ differentials: arr }); }} /></div>
                    </div>
                    <div><Label>Texto</Label><Textarea rows={3} value={d.text}
                      onChange={(e) => { const arr = [...h.differentials]; arr[idx] = { ...d, text: e.target.value }; setH({ differentials: arr }); }} /></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Seções exibidas</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["show_sistec", "Faixa SISTEC / MEC"],
                ["show_eja", "Banner EJA · Conejap"],
                ["show_carrossel", "Carrossel de campanhas"],
                ["show_destaques", "Cursos em destaque"],
                ["show_incompany", "Bloco In Company"],
                ["show_cta", "Chamada final"],
                ["show_mapa", "Mapa do Brasil"],
                ["show_parceiros", "Parceiros"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                  <Switch checked={h[key]} onCheckedChange={(v) => setH({ [key]: v } as Partial<HomeSettings>)} />
                  {label}
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paginas" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Escolha a página</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(Object.keys(PAGE_LABELS) as PageKey[]).map((k) => (
                <Button key={k} variant={page === k ? "hero" : "outline"} size="sm" onClick={() => setPage(k)}>
                  {PAGE_LABELS[k]}
                </Button>
              ))}
            </CardContent>
          </Card>
          <PageBlocksEditor
            value={pages[page].draft}
            onChange={(v) => setPages((s) => ({ ...s, [page]: { ...s[page], draft: v } }))}
            onUpload={upload}
          />
        </TabsContent>

        {["menu", "contato", "midia"].map((t) => (
          <TabsContent key={t} value={t} className="mt-6">
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Esta aba entra na próxima etapa das Configurações do site.
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default function AdminSiteConfig() {
  return <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
}
