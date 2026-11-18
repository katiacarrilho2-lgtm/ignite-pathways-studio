import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Rocket, Save, Trash2, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { uploadCourseImage } from "@/lib/courseMedia";
import { SECTION_REFRIGERACAO, REFRIGERACAO_DEFAULTS, RefrigeracaoSettings, mergeRefrigeracao, Plano } from "@/lib/refrigeracaoPage";

const Inner = () => {
  const [s, setS] = useState<RefrigeracaoSettings>(REFRIGERACAO_DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("draft, published").eq("section", SECTION_REFRIGERACAO).maybeSingle()
      .then(({ data }) => { const d: any = data; if (d) setS(mergeRefrigeracao({ ...(d.published ?? {}), ...(d.draft ?? {}) })); });
  }, []);

  const set = (p: Partial<RefrigeracaoSettings>) => setS((x) => ({ ...x, ...p }));
  const setPlano = (k: "competencia" | "regular", p: Partial<Plano>) => setS((x) => ({ ...x, [k]: { ...x[k], ...p } }));

  const save = async (publish: boolean) => {
    setBusy(true);
    const payload: any = { section: SECTION_REFRIGERACAO, draft: s };
    if (publish) { payload.published = s; payload.published_at = new Date().toISOString(); }
    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "section" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(publish ? "Publicado! Já aparece na página." : "Rascunho salvo.");
  };

  const addFotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUp(true);
    try {
      const novas: { url: string; legenda: string }[] = [];
      for (const f of Array.from(files)) novas.push({ url: await uploadCourseImage(f, "site/refrigeracao"), legenda: "" });
      setS((x) => ({ ...x, fotos: [...x.fotos, ...novas] }));
      toast.success("Fotos adicionadas. Clique em Publicar para aparecer.");
    } catch (e: any) { toast.error(e.message); } finally { setUp(false); }
  };

  const uploadVideo = async (file?: File) => {
    if (!file) return;
    if (file.size > 600 * 1024 * 1024) return toast.error("Vídeo acima de 600 MB");
    setUp(true);
    const path = `site/refrigeracao/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("course-videos").upload(path, file, { contentType: file.type });
    if (error) { setUp(false); return toast.error(error.message); }
    const { data } = await supabase.storage.from("course-videos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUp(false);
    if (data?.signedUrl) { set({ video_arquivo: data.signedUrl, video_youtube: "" }); toast.success("Vídeo enviado. Clique em Publicar."); }
  };

  const PlanoEditor = ({ k, label }: { k: "competencia" | "regular"; label: string }) => {
    const p = s[k];
    return (
      <Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div><Label>Nome da modalidade</Label><Input value={p.titulo} onChange={(e) => setPlano(k, { titulo: e.target.value })} /></div>
          <div><Label>Frase de chamada</Label><Input value={p.subtitulo} onChange={(e) => setPlano(k, { subtitulo: e.target.value })} /></div>
          <div><Label>Para quem é</Label><Textarea value={p.publico} onChange={(e) => setPlano(k, { publico: e.target.value })} /></div>
          <div><Label>Benefícios (um por linha)</Label><Textarea rows={4} value={p.beneficios} onChange={(e) => setPlano(k, { beneficios: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Preço à vista</Label><Input placeholder="R$ 549,90" value={p.preco_avista} onChange={(e) => setPlano(k, { preco_avista: e.target.value })} /></div>
            <div><Label>Parcelado</Label><Input placeholder="ou 12x de R$ 59,90" value={p.preco_parcelado} onChange={(e) => setPlano(k, { preco_parcelado: e.target.value })} /></div>
          </div>
          <div><Label>Link de pagamento InfinitePay</Label><Input placeholder="https://checkout.infinitepay.io/..." value={p.link_pagamento} onChange={(e) => setPlano(k, { link_pagamento: e.target.value.trim() })} />
            <p className="text-xs text-muted-foreground mt-1">Crie o link no app InfinitePay e cole aqui. Vazio = botão de pagar some.</p></div>
          <div><Label>Mensagem do WhatsApp</Label><Input value={p.whatsapp_msg} onChange={(e) => setPlano(k, { whatsapp_msg: e.target.value })} /></div>
        </CardContent></Card>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Página Refrigeração</h1><p className="text-sm text-muted-foreground">Troque vídeo, fotos, preços e links de pagamento quando quiser.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href="/refrigeracao?preview=1" target="_blank" rel="noreferrer"><Eye className="size-4" /> Ver rascunho</a></Button>
          <Button variant="outline" disabled={busy} onClick={() => save(false)}><Save className="size-4" /> Salvar rascunho</Button>
          <Button disabled={busy || up} onClick={() => save(true)}><Rocket className="size-4" /> Publicar</Button>
        </div>
      </div>

      <Card><CardHeader><CardTitle>Topo da página</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div><Label>Título</Label><Input value={s.titulo} onChange={(e) => set({ titulo: e.target.value })} /></div>
          <div><Label>Subtítulo</Label><Textarea value={s.subtitulo} onChange={(e) => set({ subtitulo: e.target.value })} /></div>
          <div><Label>Número do WhatsApp (com DDI e DDD)</Label><Input value={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="flex items-center gap-3"><Switch checked={s.campanha_ativa} onCheckedChange={(v) => set({ campanha_ativa: v })} /><Label>Mostrar faixa de campanha</Label></div>
          {s.campanha_ativa && <Input value={s.campanha_texto} onChange={(e) => set({ campanha_texto: e.target.value })} />}
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Vídeo de destaque (primeira tela)</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div><Label>Link do YouTube</Label><Input placeholder="https://youtube.com/..." value={s.video_youtube} onChange={(e) => set({ video_youtube: e.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild disabled={up}><label className="cursor-pointer"><Upload className="size-4" /> {up ? "Enviando..." : "Carregar vídeo do computador"}<input type="file" accept="video/*" hidden onChange={(e) => uploadVideo(e.target.files?.[0])} /></label></Button>
            {s.video_arquivo && <><span className="text-sm text-muted-foreground">Vídeo do computador carregado</span><Button size="sm" variant="ghost" onClick={() => set({ video_arquivo: "" })}><Trash2 className="size-4" /> Remover</Button></>}
          </div>
          <p className="text-xs text-muted-foreground">Se houver link do YouTube, ele tem prioridade.</p>
        </CardContent></Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {PlanoEditor({ k: "competencia", label: "Técnico por Competência" })}
        {PlanoEditor({ k: "regular", label: "Técnico Regular" })}
      </div>

      <Card><CardHeader><CardTitle>Galeria de fotos (alunos e treinamentos)</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Button variant="outline" asChild disabled={up} className="w-fit"><label className="cursor-pointer"><Upload className="size-4" /> {up ? "Enviando..." : "Adicionar fotos"}<input type="file" accept="image/*" multiple hidden onChange={(e) => addFotos(e.target.files)} /></label></Button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {s.fotos.map((f, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <img src={f.url} alt="" className="w-full aspect-[4/3] object-cover" />
                <div className="p-2 grid gap-2">
                  <Input placeholder="Legenda" value={f.legenda} onChange={(e) => set({ fotos: s.fotos.map((x, j) => j === i ? { ...x, legenda: e.target.value } : x) })} />
                  <Button size="sm" variant="ghost" onClick={() => set({ fotos: s.fotos.filter((_, j) => j !== i) })}><Trash2 className="size-4" /> Remover</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Dúvidas frequentes</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {s.faqs.map((f, i) => (
            <div key={i} className="grid gap-2 border rounded-lg p-3">
              <Input placeholder="Pergunta" value={f.q} onChange={(e) => set({ faqs: s.faqs.map((x, j) => j === i ? { ...x, q: e.target.value } : x) })} />
              <Textarea placeholder="Resposta" value={f.a} onChange={(e) => set({ faqs: s.faqs.map((x, j) => j === i ? { ...x, a: e.target.value } : x) })} />
              <Button size="sm" variant="ghost" className="w-fit" onClick={() => set({ faqs: s.faqs.filter((_, j) => j !== i) })}><Trash2 className="size-4" /> Remover</Button>
            </div>
          ))}
          <Button variant="outline" className="w-fit" onClick={() => set({ faqs: [...s.faqs, { q: "", a: "" }] })}><Plus className="size-4" /> Adicionar pergunta</Button>
        </CardContent></Card>
    </div>
  );
};

export default function AdminRefrigeracao() {
  return <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
}
