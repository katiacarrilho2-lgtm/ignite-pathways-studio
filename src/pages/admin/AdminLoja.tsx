import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Copy, Trash2, Download, Eye, Upload, Store, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { uploadCourseImage } from "@/lib/courseMedia";
import { downloadCsv, brlCsv, dateCsv } from "@/lib/exportCsv";
import { sb, brl, precoVigente, promoValida, OBJETIVOS, TIPO_VENDA_LABEL, StoreProduct, StoreCategory, StoreBanner } from "@/lib/store";
import { hideCpf } from "@/lib/cpf";

const toCents = (v: string) => { if (!v?.trim()) return null; const n = Number(v.replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : Math.round(n * 100); };
const fromCents = (c?: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const STATUS: Record<string, string> = { aguardando_pagamento: "Aguardando pagamento", pago: "Pago", cancelado: "Cancelado", expirado: "Expirado", estornado: "Estornado" };

const ImgField = ({ label, value, onChange, hint }: { label: string; value?: string | null; onChange: (v: string) => void; hint: string }) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {value && <img src={value} alt="Pré-visualização" className="max-h-40 rounded-lg border border-border object-cover" />}
      <div className="flex gap-2">
        <Input value={value ?? ""} placeholder="URL da imagem" onChange={(e) => onChange(e.target.value)} />
        <Button type="button" variant="outline" disabled={busy} asChild>
          <label className="cursor-pointer"><Upload className="size-4" />{busy ? "…" : "Enviar"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return; setBusy(true);
              try { onChange(await uploadCourseImage(f, "loja")); } catch (er: any) { toast.error(er.message); } finally { setBusy(false); }
            }} /></label>
        </Button>
      </div>
    </div>
  );
};

const F = ({ l, children }: { l: string; children: React.ReactNode }) => <div className="space-y-1"><Label>{l}</Label>{children}</div>;

/* ================= PRODUTOS ================= */
const EMPTY: any = { nome: "", slug: "", tipo: "curso", tipo_venda: "compra_direta", disponivel_loja: false, destaque: false, ordem: 100, promo_ativa: false, mec_reconhecido: false, sistec: false, indexavel: true, objetivos: [], faq: [] };

function ProdutoEditor({ p, cats, all, onClose }: { p: any; cats: StoreCategory[]; all: StoreProduct[]; onClose: (saved?: boolean) => void }) {
  const [f, setF] = useState<any>({ ...EMPTY, ...p });
  const [preco, setPreco] = useState(fromCents(p?.preco_cents));
  const [promo, setPromo] = useState(fromCents(p?.preco_promo_cents));
  const [bundle, setBundle] = useState<string[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  useEffect(() => {
    if (p?.id && p.tipo === "combo") sb.from("store_bundle_items").select("product_id").eq("bundle_id", p.id).order("ordem").then(({ data }: any) => setBundle((data ?? []).map((d: any) => d.product_id)));
    sb.from("courses").select("id,title,slug,description,image_url").order("title").then(({ data }: any) => setCourses(data ?? []));
  }, []);
  const save = async () => {
    if (!f.nome.trim()) return toast.error("Informe o nome");
    const row = { ...f, slug: slugify(f.slug || f.nome), preco_cents: toCents(preco), preco_promo_cents: toCents(promo) };
    if (row.promo_ativa && !row.preco_promo_cents) return toast.error("Informe o preço promocional");
    if (row.disponivel_loja && row.tipo_venda === "compra_direta" && !row.preco_cents) return toast.error("Produto de compra direta precisa de preço para ficar disponível");
    if (row.tipo === "combo" && bundle.length < 2) return toast.error("Um combo precisa de 2 ou mais produtos");
    ["id", "created_at", "updated_at"].forEach((k) => delete row[k]);
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    const q = p?.id ? sb.from("store_products").update(row).eq("id", p.id).select().single() : sb.from("store_products").insert(row).select().single();
    const { data, error } = await q;
    if (error) return toast.error(error.message.includes("duplicate") ? "Já existe um produto com esse endereço (slug)" : error.message);
    if (row.tipo === "combo") {
      await sb.from("store_bundle_items").delete().eq("bundle_id", data.id);
      await sb.from("store_bundle_items").insert(bundle.map((id, i) => ({ bundle_id: data.id, product_id: id, ordem: i })));
    }
    toast.success("Produto salvo"); onClose(true);
  };
  const faq: any[] = Array.isArray(f.faq) ? f.faq : [];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{p?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="flex-wrap h-auto">
            {["dados", "venda", "conteudo", "regulatorio", "seo"].map((k) => <TabsTrigger key={k} value={k}>{{ dados: "Dados", venda: "Venda / Preço", conteudo: "Conteúdo", regulatorio: "Regulatório", seo: "SEO" }[k]}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="dados" className="space-y-3 pt-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary"><Switch checked={f.disponivel_loja} onCheckedChange={(v) => set("disponivel_loja", v)} /><span className="font-semibold">Disponível na loja</span></div>
            <F l="Basear em curso existente (opcional)">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={f.course_id ?? ""} onChange={(e) => {
                const c = courses.find((x) => x.id === e.target.value);
                setF((x: any) => ({ ...x, course_id: c?.id ?? null, nome: x.nome || c?.title || "", slug: x.slug || c?.slug || "", descricao: x.descricao || c?.description || null, imagem_url: x.imagem_url || c?.image_url || null }));
              }}><option value="">— nenhum —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            </F>
            <div className="grid sm:grid-cols-2 gap-3">
              <F l="Nome *"><Input value={f.nome} onChange={(e) => set("nome", e.target.value)} /></F>
              <F l="Endereço (slug)"><Input value={f.slug} placeholder={slugify(f.nome)} onChange={(e) => set("slug", e.target.value)} /></F>
              <F l="Tipo"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}><option value="curso">Curso</option><option value="combo">Combo</option><option value="corporativo">Corporativo</option></select></F>
              <F l="Categoria"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.grupo === "corporativo" ? "Corp. · " : ""}{c.nome}</option>)}</select></F>
              <F l="Modalidade"><Input value={f.modalidade ?? ""} placeholder="EAD, Presencial, Híbrido…" onChange={(e) => set("modalidade", e.target.value)} /></F>
              <F l="Ordem"><Input type="number" value={f.ordem} onChange={(e) => set("ordem", Number(e.target.value))} /></F>
            </div>
            <div className="flex items-center gap-3"><Switch checked={f.destaque} onCheckedChange={(v) => set("destaque", v)} /><span>Destaque em "Cursos mais procurados"</span></div>
            <F l="Objetivos (cards 'Qual é o seu objetivo?')">
              <div className="flex flex-wrap gap-2">{OBJETIVOS.map((o) => { const on = (f.objetivos ?? []).includes(o.key); return (
                <button type="button" key={o.key} onClick={() => set("objetivos", on ? f.objetivos.filter((x: string) => x !== o.key) : [...(f.objetivos ?? []), o.key])}
                  className={`text-xs px-3 py-1.5 rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{o.label}</button>); })}</div>
            </F>
            <ImgField label="Imagem do produto" hint="Recomendado: 800 × 600 px (4:3) · JPG, PNG ou WebP" value={f.imagem_url} onChange={(v) => set("imagem_url", v)} />
            <F l="Texto alternativo da imagem"><Input value={f.imagem_alt ?? ""} onChange={(e) => set("imagem_alt", e.target.value)} /></F>
            {f.tipo === "combo" && (
              <F l="Produtos incluídos no combo (2 ou mais)">
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                  {all.filter((x) => x.id !== p?.id && x.tipo !== "combo").map((x) => (
                    <label key={x.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bundle.includes(x.id)} onChange={(e) => setBundle(e.target.checked ? [...bundle, x.id] : bundle.filter((b) => b !== x.id))} />{x.nome}</label>
                  ))}
                </div>
              </F>
            )}
          </TabsContent>
          <TabsContent value="venda" className="space-y-3 pt-3">
            <F l="Tipo de venda"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={f.tipo_venda} onChange={(e) => set("tipo_venda", e.target.value)}>
              {Object.entries(TIPO_VENDA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
            <div className="grid sm:grid-cols-2 gap-3">
              <F l="Preço normal (R$)"><Input value={preco} placeholder="ex.: 590,00" inputMode="decimal" onChange={(e) => setPreco(e.target.value)} /></F>
              <F l="Preço promocional (R$)"><Input value={promo} inputMode="decimal" onChange={(e) => setPromo(e.target.value)} /></F>
              <F l="Início da promoção"><Input type="date" value={f.promo_inicio ?? ""} onChange={(e) => set("promo_inicio", e.target.value)} /></F>
              <F l="Fim da promoção"><Input type="date" value={f.promo_fim ?? ""} onChange={(e) => set("promo_fim", e.target.value)} /></F>
              <F l="Quantidade disponível (vazio = ilimitado)"><Input type="number" value={f.estoque ?? ""} onChange={(e) => set("estoque", e.target.value === "" ? null : Number(e.target.value))} /></F>
              <F l="Válido até (combos/ofertas)"><Input type="date" value={f.validade ?? ""} onChange={(e) => set("validade", e.target.value)} /></F>
            </div>
            <div className="flex items-center gap-3"><Switch checked={f.promo_ativa} onCheckedChange={(v) => set("promo_ativa", v)} /><span>Promoção ativa</span></div>
            <F l="Formas de pagamento (texto exibido)"><Textarea value={f.formas_pagamento ?? ""} placeholder="Deixe vazio se não quiser informar" onChange={(e) => set("formas_pagamento", e.target.value)} /></F>
            <F l="Texto do botão (opcional)"><Input value={f.cta_texto ?? ""} onChange={(e) => set("cta_texto", e.target.value)} /></F>
          </TabsContent>
          <TabsContent value="conteudo" className="space-y-3 pt-3">
            {[["descricao_curta", "Descrição curta"], ["descricao", "Descrição completa"], ["para_quem", "Para quem é"], ["pre_requisitos", "Pré-requisitos"], ["conteudo", "Conteúdos"], ["beneficios", "Benefícios"], ["metodologia", "Metodologia"], ["como_funciona", "Como funciona"], ["certificado_texto", "Certificado"], ["instituicao", "Instituição / parceiro responsável"]]
              .map(([k, l]) => <F key={k} l={l}><Textarea rows={k === "descricao_curta" ? 2 : 3} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></F>)}
            <div className="grid sm:grid-cols-3 gap-3">
              <F l="Duração"><Input value={f.duracao ?? ""} onChange={(e) => set("duracao", e.target.value)} /></F>
              <F l="Carga horária"><Input value={f.carga_horaria ?? ""} onChange={(e) => set("carga_horaria", e.target.value)} /></F>
              <F l="Início"><Input value={f.inicio ?? ""} onChange={(e) => set("inicio", e.target.value)} /></F>
            </div>
            <F l="Dúvidas frequentes">
              <div className="space-y-2">{faq.map((q, i) => (
                <div key={i} className="grid gap-1 p-2 border border-border rounded-lg">
                  <Input placeholder="Pergunta" value={q.pergunta} onChange={(e) => set("faq", faq.map((x, j) => j === i ? { ...x, pergunta: e.target.value } : x))} />
                  <Textarea placeholder="Resposta" value={q.resposta} onChange={(e) => set("faq", faq.map((x, j) => j === i ? { ...x, resposta: e.target.value } : x))} />
                  <Button variant="ghost" size="sm" onClick={() => set("faq", faq.filter((_, j) => j !== i))}>Remover</Button>
                </div>))}
                <Button variant="outline" size="sm" onClick={() => set("faq", [...faq, { pergunta: "", resposta: "" }])}><Plus className="size-4" />Adicionar dúvida</Button>
              </div>
            </F>
          </TabsContent>
          <TabsContent value="regulatorio" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">Estes selos só aparecem neste produto quando ativados aqui. Nunca são exibidos automaticamente.</p>
            <div className="flex items-center gap-3"><Switch checked={f.mec_reconhecido} onCheckedChange={(v) => set("mec_reconhecido", v)} /><span>Exibir "Reconhecido pelo MEC"</span></div>
            <div className="flex items-center gap-3"><Switch checked={f.sistec} onCheckedChange={(v) => set("sistec", v)} /><span>Exibir "SISTEC"</span></div>
            <F l="Conselho profissional (deixe vazio para não exibir)"><Input value={f.conselho_profissional ?? ""} onChange={(e) => set("conselho_profissional", e.target.value)} /></F>
            <F l="Texto regulatório"><Textarea value={f.texto_regulatorio ?? ""} onChange={(e) => set("texto_regulatorio", e.target.value)} /></F>
          </TabsContent>
          <TabsContent value="seo" className="space-y-3 pt-3">
            <F l="Título SEO"><Input value={f.seo_titulo ?? ""} onChange={(e) => set("seo_titulo", e.target.value)} /></F>
            <F l="Descrição SEO"><Textarea value={f.seo_descricao ?? ""} onChange={(e) => set("seo_descricao", e.target.value)} /></F>
            <div className="flex items-center gap-3"><Switch checked={f.indexavel} onCheckedChange={(v) => set("indexavel", v)} /><span>Indexável no Google</span></div>
            <p className="text-xs text-muted-foreground">Endereço público: /curso/{slugify(f.slug || f.nome)}</p>
          </TabsContent>
        </Tabs>
        <div className="flex gap-2 justify-end pt-2"><Button variant="ghost" onClick={() => onClose()}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function Produtos({ cats, somenteCombos, somentePromo }: { cats: StoreCategory[]; somenteCombos?: boolean; somentePromo?: boolean }) {
  const [list, setList] = useState<StoreProduct[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [q, setQ] = useState("");
  const load = () => sb.from("store_products").select("*").order("ordem").order("nome").then(({ data }: any) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.nome]));
  const rows = list.filter((p) => (!somenteCombos || p.tipo === "combo") && (!somentePromo || p.promo_ativa) && p.nome.toLowerCase().includes(q.toLowerCase()));
  const dup = async (p: StoreProduct) => {
    const { id, created_at, updated_at, ...r } = p as any;
    const { error } = await sb.from("store_products").insert({ ...r, nome: p.nome + " (cópia)", slug: p.slug + "-copia-" + Date.now().toString(36), disponivel_loja: false });
    error ? toast.error(error.message) : (toast.success("Duplicado (desativado)"), load());
  };
  const del = async (p: StoreProduct) => {
    if (!confirm(`Excluir "${p.nome}"? Pedidos antigos continuam registrados.`)) return;
    const { error } = await sb.from("store_products").delete().eq("id", p.id);
    error ? toast.error(error.message) : load();
  };
  const toggle = async (p: StoreProduct) => { await sb.from("store_products").update({ disponivel_loja: !p.disponivel_loja }).eq("id", p.id); load(); };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input className="max-w-xs" placeholder="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setEdit(somenteCombos ? { tipo: "combo", category_id: cats.find((c) => c.slug === "combos")?.id } : {})}><Plus className="size-4" />{somenteCombos ? "Novo combo" : "Novo produto"}</Button>
      </div>
      {somentePromo && <p className="text-sm text-muted-foreground">Promoções são definidas no próprio produto (aba Venda / Preço): preço promocional, datas e "Promoção ativa". Fora do período, o preço volta ao normal automaticamente.</p>}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr className="text-left">{["Produto", "Categoria", "Venda", "Preço", "Loja", ""].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="p-2 font-medium">{p.nome}{p.destaque && <span className="ml-2 text-xs text-gold">★</span>}{p.tipo === "combo" && <span className="ml-2 text-xs">(combo)</span>}</td>
              <td className="p-2">{catName[p.category_id ?? ""] ?? "—"}</td>
              <td className="p-2">{TIPO_VENDA_LABEL[p.tipo_venda]}</td>
              <td className="p-2">{p.preco_cents ? <>{promoValida(p) && <span className="line-through text-muted-foreground mr-1">{brl(p.preco_cents)}</span>}{brl(precoVigente(p))}</> : "—"}</td>
              <td className="p-2"><Switch checked={p.disponivel_loja} onCheckedChange={() => toggle(p)} /></td>
              <td className="p-2 whitespace-nowrap">
                <Button size="icon" variant="ghost" title="Ver" asChild><a href={`/curso/${p.slug}`} target="_blank" rel="noreferrer"><Eye className="size-4" /></a></Button>
                <Button size="icon" variant="ghost" title="Editar" onClick={() => setEdit(p)}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" title="Duplicar" onClick={() => dup(p)}><Copy className="size-4" /></Button>
                <Button size="icon" variant="ghost" title="Excluir" onClick={() => del(p)}><Trash2 className="size-4" /></Button>
              </td>
            </tr>))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum produto cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <ProdutoEditor p={edit} cats={cats} all={list} onClose={(s) => { setEdit(null); s && load(); }} />}
    </div>
  );
}

/* ================= CATEGORIAS ================= */
function Categorias({ cats, reload }: { cats: StoreCategory[]; reload: () => void }) {
  const [novo, setNovo] = useState({ nome: "", grupo: "loja" });
  const upd = async (id: string, patch: any) => { const { error } = await sb.from("store_categories").update(patch).eq("id", id); error ? toast.error(error.message) : reload(); };
  const add = async () => { if (!novo.nome.trim()) return; const { error } = await sb.from("store_categories").insert({ ...novo, slug: (novo.grupo === "corporativo" ? "corp-" : "") + slugify(novo.nome) }); error ? toast.error(error.message) : (setNovo({ ...novo, nome: "" }), reload()); };
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap"><Input className="max-w-xs" placeholder="Nova categoria" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-3" value={novo.grupo} onChange={(e) => setNovo({ ...novo, grupo: e.target.value })}><option value="loja">Loja</option><option value="corporativo">Corporativo</option></select>
        <Button onClick={add}><Plus className="size-4" />Adicionar</Button></div>
      {["loja", "corporativo"].map((g) => (
        <Card key={g}><CardHeader><CardTitle className="text-base">{g === "loja" ? "Categorias da loja" : "Treinamentos corporativos"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">{cats.filter((c) => c.grupo === g).map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Input defaultValue={c.nome} onBlur={(e) => e.target.value !== c.nome && upd(c.id, { nome: e.target.value })} />
              <Input type="number" className="w-20" defaultValue={c.ordem} onBlur={(e) => upd(c.id, { ordem: Number(e.target.value) })} />
              <Switch checked={c.ativo} onCheckedChange={(v) => upd(c.id, { ativo: v })} />
            </div>))}</CardContent></Card>
      ))}
    </div>
  );
}

/* ================= BANNERS ================= */
function Banners() {
  const [list, setList] = useState<StoreBanner[]>([]);
  const load = () => sb.from("store_banners").select("*").order("ordem").then(({ data }: any) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  const upd = (id: string, patch: any) => setList((l) => l.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const save = async (b: StoreBanner) => { const { id, created_at, updated_at, ...r } = b as any; const { error } = await sb.from("store_banners").update(r).eq("id", id); error ? toast.error(error.message) : toast.success("Banner salvo"); };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Banner desktop: 1920 × 720 px · Banner mobile: 1080 × 1350 px · JPG, PNG ou WebP. No link, use "whatsapp" para abrir conversa com um consultor.</p>
      <Button onClick={async () => { await sb.from("store_banners").insert({ titulo: "Novo banner", ordem: list.length + 1, ativo: false }); load(); }}><Plus className="size-4" />Novo banner</Button>
      {list.map((b) => (
        <Card key={b.id}><CardContent className="pt-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <F l="Título"><Input value={b.titulo ?? ""} onChange={(e) => upd(b.id, { titulo: e.target.value })} /></F>
            <F l="Ordem"><Input type="number" value={b.ordem} onChange={(e) => upd(b.id, { ordem: Number(e.target.value) })} /></F>
            <div className="sm:col-span-2"><F l="Subtítulo"><Textarea value={b.subtitulo ?? ""} onChange={(e) => upd(b.id, { subtitulo: e.target.value })} /></F></div>
            <F l="Botão 1 — texto"><Input value={b.botao_texto ?? ""} onChange={(e) => upd(b.id, { botao_texto: e.target.value })} /></F>
            <F l="Botão 1 — link"><Input value={b.botao_link ?? ""} onChange={(e) => upd(b.id, { botao_link: e.target.value })} /></F>
            <F l="Botão 2 — texto"><Input value={b.botao2_texto ?? ""} onChange={(e) => upd(b.id, { botao2_texto: e.target.value })} /></F>
            <F l="Botão 2 — link"><Input value={b.botao2_link ?? ""} onChange={(e) => upd(b.id, { botao2_link: e.target.value })} /></F>
            <ImgField label="Imagem desktop" hint="1920 × 720 px" value={b.imagem_desktop} onChange={(v) => upd(b.id, { imagem_desktop: v })} />
            <ImgField label="Imagem mobile" hint="1080 × 1350 px" value={b.imagem_mobile} onChange={(v) => upd(b.id, { imagem_mobile: v })} />
          </div>
          <div className="flex items-center gap-3"><Switch checked={b.ativo} onCheckedChange={(v) => upd(b.id, { ativo: v })} /><span>Ativo</span>
            <div className="ml-auto flex gap-2"><Button variant="ghost" onClick={async () => { if (confirm("Excluir banner?")) { await sb.from("store_banners").delete().eq("id", b.id); load(); } }}><Trash2 className="size-4" /></Button><Button onClick={() => save(b)}>Salvar</Button></div></div>
        </CardContent></Card>
      ))}
    </div>
  );
}

/* ================= CUPONS ================= */
function Cupons({ cats }: { cats: StoreCategory[] }) {
  const [list, setList] = useState<any[]>([]);
  const [prods, setProds] = useState<StoreProduct[]>([]);
  const [e, setE] = useState<any>(null);
  const load = () => sb.from("store_coupons").select("*").order("created_at", { ascending: false }).then(({ data }: any) => setList(data ?? []));
  useEffect(() => { load(); sb.from("store_products").select("id,nome").order("nome").then(({ data }: any) => setProds(data ?? [])); }, []);
  const save = async () => {
    const { id, created_at, updated_at, usos, ...r } = e;
    if (!r.codigo?.trim()) return toast.error("Informe o código");
    r.codigo = r.codigo.trim().toUpperCase(); r.valor = Number(String(r.valor ?? 0).replace(",", "."));
    ["inicio", "fim"].forEach((k) => !r[k] && (r[k] = null)); if (r.limite_uso === "" ) r.limite_uso = null;
    const { error } = id ? await sb.from("store_coupons").update(r).eq("id", id) : await sb.from("store_coupons").insert(r);
    error ? toast.error(error.message) : (setE(null), load());
  };
  return (
    <div className="space-y-3">
      <Button onClick={() => setE({ codigo: "", tipo: "percentual", valor: "", produtos: [], categorias: [], ativo: true })}><Plus className="size-4" />Novo cupom</Button>
      <div className="overflow-x-auto border border-border rounded-lg"><table className="w-full text-sm">
        <thead className="bg-secondary"><tr className="text-left">{["Código", "Desconto", "Validade", "Usos", "Ativo", ""].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{list.map((c) => <tr key={c.id} className="border-t border-border">
          <td className="p-2 font-mono font-semibold">{c.codigo}</td>
          <td className="p-2">{c.tipo === "percentual" ? `${c.valor}%` : brl(Math.round(c.valor * 100))}</td>
          <td className="p-2">{c.inicio ? dateCsv(c.inicio) : "—"} a {c.fim ? dateCsv(c.fim) : "—"}</td>
          <td className="p-2">{c.usos}{c.limite_uso ? ` / ${c.limite_uso}` : ""}</td>
          <td className="p-2">{c.ativo ? "Sim" : "Não"}</td>
          <td className="p-2"><Button size="icon" variant="ghost" onClick={() => setE(c)}><Pencil className="size-4" /></Button></td>
        </tr>)}{!list.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum cupom.</td></tr>}</tbody></table></div>
      {e && <Dialog open onOpenChange={(v) => !v && setE(null)}><DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cupom</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <F l="Código"><Input value={e.codigo} onChange={(x) => setE({ ...e, codigo: x.target.value.toUpperCase() })} /></F>
          <F l="Tipo"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={e.tipo} onChange={(x) => setE({ ...e, tipo: x.target.value })}><option value="percentual">Percentual (%)</option><option value="valor">Valor (R$)</option></select></F>
          <F l={e.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}><Input inputMode="decimal" value={e.valor} onChange={(x) => setE({ ...e, valor: x.target.value })} /></F>
          <F l="Limite de uso"><Input type="number" value={e.limite_uso ?? ""} onChange={(x) => setE({ ...e, limite_uso: x.target.value })} /></F>
          <F l="Data inicial"><Input type="date" value={e.inicio ?? ""} onChange={(x) => setE({ ...e, inicio: x.target.value })} /></F>
          <F l="Data final"><Input type="date" value={e.fim ?? ""} onChange={(x) => setE({ ...e, fim: x.target.value })} /></F>
        </div>
        <F l="Produtos permitidos (vazio = todos)"><div className="max-h-32 overflow-y-auto border border-border rounded p-2 space-y-1">{prods.map((p) => <label key={p.id} className="flex gap-2 text-sm"><input type="checkbox" checked={e.produtos.includes(p.id)} onChange={(x) => setE({ ...e, produtos: x.target.checked ? [...e.produtos, p.id] : e.produtos.filter((i: string) => i !== p.id) })} />{p.nome}</label>)}</div></F>
        <F l="Categorias permitidas"><div className="max-h-32 overflow-y-auto border border-border rounded p-2 space-y-1">{cats.map((c) => <label key={c.id} className="flex gap-2 text-sm"><input type="checkbox" checked={e.categorias.includes(c.id)} onChange={(x) => setE({ ...e, categorias: x.target.checked ? [...e.categorias, c.id] : e.categorias.filter((i: string) => i !== c.id) })} />{c.nome}</label>)}</div></F>
        <div className="flex items-center gap-3"><Switch checked={e.ativo} onCheckedChange={(v) => setE({ ...e, ativo: v })} /><span>Ativo</span></div>
        <Button onClick={save}>Salvar</Button>
      </DialogContent></Dialog>}
    </div>
  );
}

/* ================= PEDIDOS + DASHBOARD ================= */
function usePedidos() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = () => sb.from("store_orders").select("*, store_order_items(nome, preco_cents, product_id)").order("created_at", { ascending: false }).limit(2000).then(({ data }: any) => setOrders(data ?? []));
  useEffect(() => { load(); }, []);
  return { orders, load };
}

function Dashboard({ orders }: { orders: any[] }) {
  const today = new Date().toDateString(); const mes = new Date().toISOString().slice(0, 7);
  const pagos = orders.filter((o) => o.status === "pago");
  const sum = (a: any[]) => a.reduce((s, o) => s + o.total_cents, 0);
  const hoje = pagos.filter((o) => new Date(o.paid_at).toDateString() === today);
  const doMes = pagos.filter((o) => (o.paid_at ?? "").slice(0, 7) === mes);
  const rank = (fn: (o: any) => string[]) => { const m: Record<string, number> = {}; pagos.forEach((o) => fn(o).forEach((k) => (m[k] = (m[k] ?? 0) + 1))); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6); };
  const Stat = ({ l, v }: { l: string; v: string | number }) => <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold text-primary">{v}</p></CardContent></Card>;
  const List = ({ t, d }: { t: string; d: [string, number][] }) => <Card><CardHeader><CardTitle className="text-base">{t}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">{d.length ? d.map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></div>) : <p className="text-muted-foreground">Sem vendas ainda.</p>}</CardContent></Card>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat l="Vendas hoje" v={`${hoje.length} · ${brl(sum(hoje))}`} /><Stat l="Vendas no mês" v={`${doMes.length} · ${brl(sum(doMes))}`} />
        <Stat l="Faturamento total" v={brl(sum(pagos))} /><Stat l="Ticket médio" v={pagos.length ? brl(Math.round(sum(pagos) / pagos.length)) : "—"} />
        <Stat l="Pedidos pendentes" v={orders.filter((o) => o.status === "aguardando_pagamento").length} /><Stat l="Pedidos pagos" v={pagos.length} />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <List t="Cursos mais vendidos" d={rank((o) => (o.store_order_items ?? []).map((i: any) => i.nome))} />
        <List t="Origem das vendas" d={rank((o) => [o.origem || "loja"])} />
        <List t="Vendas por polo" d={rank((o) => [o.polo || "Matriz"])} />
      </div>
    </div>
  );
}

function Pedidos({ orders, reload, cats }: { orders: any[]; reload: () => void; cats: StoreCategory[] }) {
  const [f, setF] = useState({ status: "", de: "", ate: "", curso: "", polo: "", consultor: "", metodo: "", categoria: "" });
  const [prodCat, setProdCat] = useState<Record<string, string>>({});
  useEffect(() => { sb.from("store_products").select("id,category_id").then(({ data }: any) => setProdCat(Object.fromEntries((data ?? []).map((p: any) => [p.id, p.category_id])))); }, []);
  const rows = orders.filter((o) => (!f.status || o.status === f.status) && (!f.de || o.created_at >= f.de) && (!f.ate || o.created_at.slice(0, 10) <= f.ate)
    && (!f.curso || (o.store_order_items ?? []).some((i: any) => i.nome.toLowerCase().includes(f.curso.toLowerCase())))
    && (!f.categoria || (o.store_order_items ?? []).some((i: any) => prodCat[i.product_id] === f.categoria))
    && (!f.polo || (o.polo ?? "").includes(f.polo)) && (!f.consultor || (o.consultor ?? "").toLowerCase().includes(f.consultor.toLowerCase()))
    && (!f.metodo || (o.metodo ?? "").includes(f.metodo)));
  const exportar = () => downloadCsv(`pedidos-loja-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Pedido", "Cliente", "WhatsApp", "CPF", "Produto", "Data", "Valor", "Pagamento", "Status", "Origem", "Polo", "Consultor", "Campanha", "Cupom", "NSU InfinitePay", "Comprovante"],
    rows.map((o) => [o.numero, o.nome, o.whatsapp, o.cpf, (o.store_order_items ?? []).map((i: any) => i.nome).join(" + "), dateCsv(o.created_at), brlCsv(o.total_cents), o.metodo, STATUS[o.status], o.origem, o.polo, o.consultor, o.campanha, o.cupom_codigo, o.transaction_nsu, o.receipt_url]));
  const setStatus = async (o: any, status: string) => { if (!confirm(`Alterar pedido ${o.numero} para "${STATUS[status]}"?`)) return; const { error } = await sb.from("store_orders").update({ status }).eq("id", o.id); error ? toast.error(error.message) : reload(); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /><Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} />
        <Input placeholder="Curso" value={f.curso} onChange={(e) => setF({ ...f, curso: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}><option value="">Categoria</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        <Input placeholder="Pagamento" value={f.metodo} onChange={(e) => setF({ ...f, metodo: e.target.value })} />
        <Input placeholder="Polo" value={f.polo} onChange={(e) => setF({ ...f, polo: e.target.value })} />
        <Input placeholder="Vendedor" value={f.consultor} onChange={(e) => setF({ ...f, consultor: e.target.value })} />
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={exportar}><Download className="size-4" />Exportar CSV (Excel)</Button><Button variant="ghost" onClick={reload}><RefreshCw className="size-4" />Atualizar</Button></div>
      <div className="overflow-x-auto border border-border rounded-lg"><table className="w-full text-sm">
        <thead className="bg-secondary"><tr className="text-left">{["Pedido", "Cliente", "Produto", "Data", "Valor", "Pagamento", "Status", "Origem / Polo / Consultor", "InfinitePay", ""].map((h) => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((o) => <tr key={o.id} className="border-t border-border align-top">
          <td className="p-2 font-mono">{o.numero}</td>
          <td className="p-2">{o.nome}<br /><span className="text-xs text-muted-foreground">{o.whatsapp} · {hideCpf(o.cpf)}</span></td>
          <td className="p-2">{(o.store_order_items ?? []).map((i: any) => i.nome).join(" + ")}</td>
          <td className="p-2 whitespace-nowrap">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
          <td className="p-2 whitespace-nowrap">{brl(o.total_cents)}{o.cupom_codigo && <><br /><span className="text-xs">cupom {o.cupom_codigo}</span></>}</td>
          <td className="p-2">{o.metodo ?? "—"}</td>
          <td className="p-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.status === "pago" ? "bg-whatsapp/15 text-whatsapp" : "bg-secondary"}`}>{STATUS[o.status]}</span></td>
          <td className="p-2 text-xs">{o.origem ?? "loja"}{o.campanha && ` · ${o.campanha}`}<br />{o.polo ?? "Matriz"} · {o.consultor ?? "—"}</td>
          <td className="p-2 text-xs">{o.transaction_nsu ?? "—"}{o.receipt_url && <><br /><a className="text-primary-glow underline" href={o.receipt_url} target="_blank" rel="noreferrer">comprovante</a></>}</td>
          <td className="p-2">{o.status === "aguardando_pagamento" && <select className="h-8 rounded border border-input bg-background text-xs" value="" onChange={(e) => e.target.value && setStatus(o, e.target.value)}><option value="">Ações</option><option value="cancelado">Cancelar</option><option value="expirado">Expirar</option></select>}
            {o.status === "pago" && <select className="h-8 rounded border border-input bg-background text-xs" value="" onChange={(e) => e.target.value && setStatus(o, e.target.value)}><option value="">Ações</option><option value="estornado">Marcar estornado</option></select>}</td>
        </tr>)}{!rows.length && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nenhum pedido.</td></tr>}</tbody></table></div>
    </div>
  );
}

/* ================= PAGAMENTOS / INTEGRAÇÕES / APARÊNCIA ================= */
function Configuracoes() {
  const [s, setS] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    sb.from("store_settings").select("*").eq("id", 1).maybeSingle().then(({ data }: any) => setS(data ?? { id: 1 }));
    sb.from("store_webhook_logs").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }: any) => setLogs(data ?? []));
  }, []);
  if (!s) return null;
  const save = async () => { const { error } = await sb.from("store_settings").upsert({ id: 1, whatsapp: s.whatsapp, infinitepay_handle: s.infinitepay_handle?.replace(/^\$/, "") || null, modo: s.modo, updated_at: new Date().toISOString() }); error ? toast.error(error.message) : toast.success("Configurações salvas"); };
  const webhook = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-infinitepay-webhook`;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle className="text-base">Pagamentos › InfinitePay</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-sm">Status: <b className={s.infinitepay_handle ? "text-whatsapp" : "text-destructive"}>{s.infinitepay_handle ? "CONFIGURADO" : "NÃO CONFIGURADO"}</b></p>
        <F l="InfiniteTag (seu usuário InfinitePay, sem o $)"><Input value={s.infinitepay_handle ?? ""} placeholder="ex.: multplick" onChange={(e) => setS({ ...s, infinitepay_handle: e.target.value })} /></F>
        <p className="text-xs text-muted-foreground">A InfinitePay identifica a conta pela InfiniteTag. O valor é sempre calculado no servidor e o pagamento só é aceito após consulta oficial à InfinitePay.</p>
        <F l="Endereço de notificação (webhook) — gerado automaticamente"><Input readOnly value={webhook} onFocus={(e) => e.target.select()} /></F>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Loja › WhatsApp</CardTitle></CardHeader><CardContent className="space-y-3">
        <F l="Número do WhatsApp da loja (com DDD)"><Input value={s.whatsapp ?? ""} placeholder="5518996841902" onChange={(e) => setS({ ...s, whatsapp: e.target.value.replace(/\D/g, "") })} /></F>
        <p className="text-xs text-muted-foreground">Vazio = usa o número oficial já existente no site. Mensagem dos produtos: "Olá, gostaria de informações sobre [NOME DO CURSO]."</p>
        <Button onClick={save}>Salvar configurações</Button>
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Integrações</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
        <p><b>Links de polo/licenciado:</b> adicione <code>?polo=SLUG-DO-POLO</code> e/ou <code>?ref=CODIGO-DO-CONSULTOR</code> e <code>&utm_campaign=NOME</code> a qualquer link da loja. A venda fica registrada no pedido e no financeiro do polo.</p>
        <p><b>Agente Rebecca / IA:</b> consulta segura <code>store_catalogo_ia</code> — devolve só produtos ativos com preço vigente do cadastro e link direto.</p>
        <p className="font-semibold pt-2">Últimos avisos de pagamento recebidos</p>
        <div className="max-h-56 overflow-y-auto text-xs space-y-1">{logs.length ? logs.map((l) => <div key={l.id} className="flex gap-2"><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span><b>{l.resultado}</b><span className="truncate">{l.order_nsu}</span></div>) : <p className="text-muted-foreground">Nenhum aviso ainda.</p>}</div>
      </CardContent></Card>
    </div>
  );
}

const Inner = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get("aba") ?? "dashboard";
  const [cats, setCats] = useState<StoreCategory[]>([]);
  const loadCats = () => sb.from("store_categories").select("*").order("grupo").order("ordem").then(({ data }: any) => setCats(data ?? []));
  useEffect(() => { loadCats(); }, []);
  const { orders, load } = usePedidos();
  const tabs = useMemo(() => [["dashboard", "Dashboard"], ["produtos", "Produtos"], ["categorias", "Categorias"], ["combos", "Combos"], ["banners", "Banners"], ["promocoes", "Promoções"], ["cupons", "Cupons"], ["pedidos", "Pedidos"], ["config", "Pagamentos · Aparência · Integrações"]], []);
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap"><Store className="size-7 text-primary" /><div><h1 className="text-2xl font-bold">Configurações › Loja</h1><p className="text-sm text-muted-foreground">Produtos, preços, banners, cupons, pedidos e pagamentos da loja online.</p></div>
        <Button asChild variant="outline" className="ml-auto"><a href="/loja" target="_blank" rel="noreferrer"><Eye className="size-4" />Ver loja</a></Button></div>
      <Tabs value={tab} onValueChange={(v) => setParams({ aba: v })}>
        <TabsList className="flex-wrap h-auto justify-start">{tabs.map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}</TabsList>
        <TabsContent value="dashboard" className="pt-4"><Dashboard orders={orders} /></TabsContent>
        <TabsContent value="produtos" className="pt-4"><Produtos cats={cats} /></TabsContent>
        <TabsContent value="categorias" className="pt-4"><Categorias cats={cats} reload={loadCats} /></TabsContent>
        <TabsContent value="combos" className="pt-4"><Produtos cats={cats} somenteCombos /></TabsContent>
        <TabsContent value="banners" className="pt-4"><Banners /></TabsContent>
        <TabsContent value="promocoes" className="pt-4"><Produtos cats={cats} somentePromo /></TabsContent>
        <TabsContent value="cupons" className="pt-4"><Cupons cats={cats} /></TabsContent>
        <TabsContent value="pedidos" className="pt-4"><Pedidos orders={orders} reload={load} cats={cats} /></TabsContent>
        <TabsContent value="config" className="pt-4"><Configuracoes /></TabsContent>
      </Tabs>
    </div>
  );
};

export default function AdminLoja() {
  return <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
}
