import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Rocket, RotateCcw, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { uploadCourseImage } from "@/lib/courseMedia";
import {
  IDENTITY_DEFAULTS, IdentitySettings, SECTION_IDENTITY, FONT_OPTIONS,
  applyIdentity, hexToHsl, hslToHex,
} from "@/lib/siteSettings";

const Inner = () => {
  const [form, setForm] = useState<IdentitySettings>(IDENTITY_DEFAULTS);
  const [published, setPublished] = useState<IdentitySettings>(IDENTITY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("site_settings").select("draft, published").eq("section", SECTION_IDENTITY).maybeSingle();
    const pub = { ...IDENTITY_DEFAULTS, ...((data?.published as object) ?? {}) } as IdentitySettings;
    const dr = { ...pub, ...((data?.draft as object) ?? {}) } as IdentitySettings;
    setPublished(pub);
    setForm(dr);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (patch: Partial<IdentitySettings>) => setForm((f) => ({ ...f, ...patch }));

  const saveDraft = async () => {
    setBusy(true);
    const { error } = await supabase.from("site_settings")
      .upsert({ section: SECTION_IDENTITY, draft: form as any }, { onConflict: "section" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rascunho salvo. Use “Ver rascunho” para conferir no site.");
  };

  const publish = async () => {
    setBusy(true);
    const { error } = await supabase.from("site_settings").upsert(
      { section: SECTION_IDENTITY, draft: form as any, published: form as any, published_at: new Date().toISOString() },
      { onConflict: "section" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    setPublished(form);
    applyIdentity(form);
    toast.success("Publicado no site.");
  };

  const restore = () => { setForm(published); toast.success("Rascunho voltou para a versão publicada."); };

  const pickLogo = async (file: File) => {
    try {
      setBusy(true);
      const url = await uploadCourseImage(file, "site");
      set({ logo_url: url });
      toast.success("Logo enviado");
    } catch (e: any) { toast.error(e.message ?? "Falha no upload"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Settings className="size-7" /> Configurações do site</h1>
          <p className="text-muted-foreground">Edite o site público da Multplick. Nada muda para o visitante até você publicar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/?preview=1", "_blank")}><Eye className="size-4" /> Ver rascunho</Button>
          <Button variant="outline" onClick={restore} disabled={busy}><RotateCcw className="size-4" /> Descartar alterações</Button>
          <Button variant="outline" onClick={saveDraft} disabled={busy}><Save className="size-4" /> Salvar rascunho</Button>
          <Button variant="hero" onClick={publish} disabled={busy}><Rocket className="size-4" /> Publicar</Button>
        </div>
      </div>

      <Tabs defaultValue="identidade">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="home">Página inicial</TabsTrigger>
          <TabsTrigger value="paginas">Páginas</TabsTrigger>
          <TabsTrigger value="menu">Menu e rodapé</TabsTrigger>
          <TabsTrigger value="contato">Contato e redes</TabsTrigger>
          <TabsTrigger value="midia">Mídia</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary/40 p-4 grid place-items-center min-h-28">
                {form.logo_url
                  ? <img src={form.logo_url} alt="Logo do site" className="max-h-20 w-auto" />
                  : <span className="text-sm text-muted-foreground">Usando o logo padrão da Multplick</span>}
              </div>
              <label className="flex items-center gap-2 border border-dashed rounded-lg p-3 cursor-pointer text-sm text-muted-foreground hover:bg-secondary/50">
                <Upload className="size-4" /> Enviar novo logo (PNG com fundo transparente)
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])} />
              </label>
              <div>
                <Label>Ou informe o endereço da imagem</Label>
                <Input value={form.logo_url} onChange={(e) => set({ logo_url: e.target.value })} placeholder="https://…" />
              </div>
              {form.logo_url && (
                <Button variant="ghost" size="sm" onClick={() => set({ logo_url: "" })}>Voltar ao logo padrão</Button>
              )}
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
                    value={hslToHex(form[key])}
                    onChange={(e) => set({ [key]: hexToHsl(e.target.value) } as Partial<IdentitySettings>)} />
                  <div className="flex-1">
                    <Label>{label}</Label>
                    <Input value={form[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<IdentitySettings>)} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set({
                primary: IDENTITY_DEFAULTS.primary, accent: IDENTITY_DEFAULTS.accent, ring: IDENTITY_DEFAULTS.ring,
              })}>Restaurar cores originais</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Fontes</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Fonte dos títulos</Label>
                <Select value={form.font_heading} onValueChange={(v) => set({ font_heading: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fonte dos textos</Label>
                <Select value={form.font_body} onValueChange={(v) => set({ font_body: v })}>
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
                style={{ ["--primary" as any]: form.primary, ["--accent" as any]: form.accent }}>
                <h3 style={{ fontFamily: `'${form.font_heading}', system-ui, sans-serif` }} className="text-2xl font-bold text-primary">
                  Formação profissional que gera resultado
                </h3>
                <p style={{ fontFamily: `'${form.font_body}', system-ui, sans-serif` }} className="text-sm text-muted-foreground">
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

        {["home", "paginas", "menu", "contato", "midia"].map((t) => (
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
