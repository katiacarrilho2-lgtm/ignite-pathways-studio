import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, ShoppingCart, ShieldCheck, Clock, CalendarDays, Monitor, GraduationCap, BadgeCheck } from "lucide-react";
import { sb, StoreProduct, brl, precoVigente, promoValida, addToCart, captureOrigem, useStoreWhatsapp, waLink, setSeo } from "@/lib/store";
import { InteresseDialog } from "@/components/loja/InteresseDialog";
import { ProductCard } from "@/components/loja/ProductCard";

const Bloco = ({ t, v }: { t: string; v?: string | null }) => v ? (
  <div><h3 className="font-bold text-lg mb-2 text-foreground">{t}</h3><p className="text-muted-foreground whitespace-pre-line leading-relaxed">{v}</p></div>
) : null;

export default function Produto() {
  const { slug } = useParams();
  const { search } = useLocation();
  const nav = useNavigate();
  const [p, setP] = useState<StoreProduct | null | undefined>(undefined);
  const [cat, setCat] = useState<string>("");
  const [combo, setCombo] = useState<StoreProduct[]>([]);
  const [dlg, setDlg] = useState<null | "consulta" | "proposta">(null);
  const whats = useStoreWhatsapp();

  useEffect(() => { captureOrigem(search); }, [search]);
  useEffect(() => {
    (async () => {
      const { data } = await sb.from("store_products").select("*").eq("slug", slug).maybeSingle();
      setP(data ?? null);
      if (!data) return;
      setSeo(data.seo_titulo || `${data.nome} | Multplick Formação Profissional`, data.seo_descricao || data.descricao_curta, data.indexavel);
      if (data.category_id) sb.from("store_categories").select("nome").eq("id", data.category_id).maybeSingle().then(({ data: c }: any) => setCat(c?.nome ?? ""));
      if (data.tipo === "combo") {
        const { data: it } = await sb.from("store_bundle_items").select("product_id").eq("bundle_id", data.id).order("ordem");
        const ids = (it ?? []).map((i: any) => i.product_id);
        if (ids.length) { const { data: ps } = await sb.from("store_products").select("*").in("id", ids); setCombo(ps ?? []); }
      }
    })();
  }, [slug]);

  if (p === undefined) return <div className="container py-24 text-center text-muted-foreground">Carregando…</div>;
  if (!p) return <div className="container py-24 text-center space-y-4"><p className="text-xl font-semibold">Curso não encontrado.</p><Button asChild><Link to="/loja">Voltar para a loja</Link></Button></div>;

  const promo = promoValida(p);
  const preco = precoVigente(p);
  const esgotado = p.estoque != null && p.estoque <= 0;
  const podeComprar = p.tipo_venda === "compra_direta" && !!preco && !esgotado;
  const faq: { pergunta: string; resposta: string }[] = Array.isArray(p.faq) ? (p.faq as any) : [];
  const wa = waLink(whats, `Olá, gostaria de informações sobre ${p.nome}.`);
  const comprar = () => { addToCart(p.id); nav("/loja/carrinho"); };

  const Cta = () => (
    <div className="space-y-3">
      {p.tipo_venda === "consulta" && (
        <>
          <p className="text-sm bg-secondary rounded-lg p-3 text-foreground">Este curso é destinado a quem já possui experiência profissional. Consulte os requisitos antes da matrícula.</p>
          <Button variant="hero" className="w-full h-14 text-base" onClick={() => setDlg("consulta")}>{p.cta_texto || "Verificar minha experiência"}</Button>
        </>
      )}
      {p.tipo_venda === "proposta" && <Button variant="hero" className="w-full h-14 text-base" onClick={() => setDlg("proposta")}>{p.cta_texto || "Solicitar proposta"}</Button>}
      {p.tipo_venda === "compra_direta" && (podeComprar
        ? <Button variant="hero" className="w-full h-14 text-base" onClick={comprar}><ShoppingCart className="size-5" />{p.cta_texto || "Comprar agora"}</Button>
        : <p className="text-sm text-muted-foreground text-center">{esgotado ? "Vagas esgotadas no momento." : "Consulte valores com nossa equipe."}</p>)}
      <Button asChild className="w-full h-12 bg-whatsapp hover:bg-whatsapp/90 text-primary-foreground"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="size-5" />Tirar dúvidas</a></Button>
    </div>
  );

  return (
    <div className="bg-background pb-28 lg:pb-12">
      <div className="bg-hero-gradient text-primary-foreground">
        <div className="container py-10 md:py-14">
          <Link to="/loja" className="text-sm opacity-80 hover:opacity-100">← Loja</Link>
          <p className="mt-4 text-gold text-xs font-semibold uppercase tracking-widest">{[cat, p.modalidade].filter(Boolean).join(" · ")}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 max-w-3xl break-words">{p.nome}</h1>
          {p.descricao_curta && <p className="mt-3 max-w-2xl opacity-90 text-lg">{p.descricao_curta}</p>}
          {(p.mec_reconhecido || p.sistec || p.conselho_profissional) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {p.mec_reconhecido && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-foreground/15 px-3 py-1.5 rounded-full"><BadgeCheck className="size-4 text-gold" />Reconhecido pelo MEC</span>}
              {p.sistec && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-foreground/15 px-3 py-1.5 rounded-full"><BadgeCheck className="size-4 text-gold" />SISTEC</span>}
              {p.conselho_profissional && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-foreground/15 px-3 py-1.5 rounded-full"><BadgeCheck className="size-4 text-gold" />{p.conselho_profissional}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="container grid lg:grid-cols-[1fr_380px] gap-8 mt-8">
        <div className="min-w-0 space-y-8">
          <div className="aspect-[4/3] md:aspect-[16/9] rounded-2xl overflow-hidden bg-secondary">
            {p.imagem_url ? <img src={p.imagem_url} alt={p.imagem_alt || p.nome} className="size-full object-cover" /> : <div className="size-full grid place-items-center text-primary/30"><GraduationCap className="size-20" /></div>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ i: Clock, l: "Duração", v: p.duracao }, { i: ShieldCheck, l: "Carga horária", v: p.carga_horaria }, { i: CalendarDays, l: "Início", v: p.inicio }, { i: Monitor, l: "Modalidade", v: p.modalidade }]
              .filter((x) => x.v).map((x) => (
                <div key={x.l} className="p-4 rounded-xl bg-card border border-border"><x.i className="size-5 text-primary-glow mb-1" /><p className="text-xs text-muted-foreground">{x.l}</p><p className="font-semibold text-sm break-words">{x.v}</p></div>
              ))}
          </div>

          {combo.length > 0 && (
            <div className="p-5 rounded-2xl border-2 border-gold/50 bg-gold/5">
              <h2 className="font-bold text-lg mb-3">Você leva:</h2>
              <ul className="space-y-2">{combo.map((c) => <li key={c.id} className="flex items-center gap-2"><BadgeCheck className="size-5 text-gold" /><Link className="hover:underline" to={`/curso/${c.slug}`}>{c.nome}</Link></li>)}</ul>
            </div>
          )}

          <Tabs defaultValue="sobre">
            <TabsList className="w-full h-auto flex-wrap justify-start gap-1">
              {["sobre", "conteudo", "como", "certificacao", "duvidas"].map((k) => (
                <TabsTrigger key={k} value={k} className="h-10">{{ sobre: "Sobre", conteudo: "Conteúdo", como: "Como funciona", certificacao: "Certificação", duvidas: "Dúvidas" }[k]}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="sobre" className="space-y-6 pt-4">
              <Bloco t="Sobre o curso" v={p.descricao} /><Bloco t="Para quem é" v={p.para_quem} />
              <Bloco t="Pré-requisitos" v={p.pre_requisitos} /><Bloco t="Benefícios" v={p.beneficios} />
              {p.instituicao && <Bloco t="Instituição / parceiro responsável" v={p.instituicao} />}
              {!p.descricao && !p.para_quem && <p className="text-muted-foreground">Informações detalhadas em breve. Fale com um consultor pelo WhatsApp.</p>}
            </TabsContent>
            <TabsContent value="conteudo" className="pt-4"><Bloco t="Conteúdo programático" v={p.conteudo} />{!p.conteudo && <p className="text-muted-foreground">Conteúdo em atualização.</p>}</TabsContent>
            <TabsContent value="como" className="space-y-6 pt-4"><Bloco t="Metodologia" v={p.metodologia} /><Bloco t="Como funciona" v={p.como_funciona} /><Bloco t="Formas de pagamento" v={p.formas_pagamento} /></TabsContent>
            <TabsContent value="certificacao" className="space-y-6 pt-4">
              <Bloco t="Certificado" v={p.certificado_texto} />
              {p.texto_regulatorio && <Bloco t="Informações regulatórias" v={p.texto_regulatorio} />}
              {!p.certificado_texto && !p.texto_regulatorio && <p className="text-muted-foreground">Consulte nossa equipe sobre a certificação deste curso.</p>}
            </TabsContent>
            <TabsContent value="duvidas" className="pt-4 space-y-4">
              {faq.length ? faq.map((f, i) => <div key={i} className="p-4 rounded-xl bg-secondary/50"><p className="font-semibold">{f.pergunta}</p><p className="text-muted-foreground mt-1 whitespace-pre-line">{f.resposta}</p></div>)
                : <p className="text-muted-foreground">Ficou com alguma dúvida? Fale com a gente pelo WhatsApp.</p>}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border bg-card p-6 shadow-card-soft space-y-4">
          {p.tipo_venda !== "proposta" && preco ? (
            <div>
              {promo && <p className="text-sm text-muted-foreground line-through">{brl(p.preco_cents)}</p>}
              <p className="text-3xl font-extrabold text-primary">{brl(preco)}</p>
              {promo && p.promo_fim && <p className="text-xs text-muted-foreground mt-1">Oferta válida até {new Date(p.promo_fim + "T12:00").toLocaleDateString("pt-BR")}</p>}
              {p.formas_pagamento && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{p.formas_pagamento}</p>}
            </div>
          ) : null}
          <Cta />
        </aside>
      </div>

      {/* barra fixa no celular */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border p-3 flex items-center gap-3">
        {p.tipo_venda !== "proposta" && preco ? <p className="font-extrabold text-primary text-lg shrink-0">{brl(preco)}</p> : null}
        <Button variant="hero" className="flex-1 h-12" onClick={() => p.tipo_venda === "compra_direta" ? (podeComprar ? comprar() : window.open(wa, "_blank")) : setDlg(p.tipo_venda as any)}>
          {p.tipo_venda === "compra_direta" ? (podeComprar ? "Comprar" : "Consultar") : p.tipo_venda === "consulta" ? "Verificar experiência" : "Solicitar proposta"}
        </Button>
      </div>
      {dlg && <InteresseDialog tipo={dlg} open onOpenChange={(v) => !v && setDlg(null)} curso={p.nome} />}
    </div>
  );
}
