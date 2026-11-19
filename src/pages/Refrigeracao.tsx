import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/site/Navbar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, CreditCard, MessageCircle, ShieldCheck, Snowflake, BadgeCheck, FileCheck2 } from "lucide-react";
import { youtubeIdFromUrl } from "@/lib/courseMedia";
import { SECTION_REFRIGERACAO, REFRIGERACAO_DEFAULTS, RefrigeracaoSettings, mergeRefrigeracao, Plano } from "@/lib/refrigeracaoPage";

// Paleta gelo/marinho exclusiva desta página
const NAVY = "#002f5b"; const NAVY2 = "#00376b"; const ICE = "#38d6ff"; const BLUE = "#1274bf"; const SOFT = "#ecf4fa";

const wa = (n: string, m: string) => `https://wa.me/${n}?text=${encodeURIComponent(m)}`;

const PlanoCard = ({ p, num, slug }: { p: Plano; num: string; slug: string }) => (
  <div className="rounded-2xl p-7 flex flex-col shadow-xl border-2" style={{ background: "#fff", borderColor: ICE }}>
    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>{p.subtitulo}</span>
    <h3 className="text-2xl font-extrabold mt-2" style={{ color: NAVY }}>{p.titulo}</h3>
    <p className="mt-3 text-sm" style={{ color: "#334" }}>{p.publico}</p>
    <ul className="mt-4 space-y-2 flex-1">
      {p.beneficios.split("\n").filter(Boolean).map((b) => (
        <li key={b} className="flex gap-2 text-sm" style={{ color: "#223" }}><CheckCircle2 className="size-5 shrink-0" style={{ color: BLUE }} />{b}</li>
      ))}
    </ul>
    {(p.preco_avista || p.preco_parcelado) && (
      <div className="mt-5 rounded-xl p-4 text-center" style={{ background: SOFT }}>
        {p.preco_avista && <div className="text-3xl font-extrabold" style={{ color: NAVY }}>{p.preco_avista}</div>}
        {p.preco_parcelado && <div className="text-sm mt-1" style={{ color: NAVY2 }}>{p.preco_parcelado}</div>}
      </div>
    )}
    <div className="mt-5 grid gap-2">
      {(
        <a href={`/matricula/${slug}${p.link_pagamento ? `?pagar=${encodeURIComponent(p.link_pagamento)}` : ""}`}
          className="flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-lg"
          style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`, color: "#fff" }}>
          <CreditCard className="size-5" /> Fazer minha pré-matrícula
        </a>
      )}
      <a href={wa(num, p.whatsapp_msg)} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold border-2"
        style={{ borderColor: "#1FA855", color: "#1FA855" }}>
        <MessageCircle className="size-5" /> Falar no WhatsApp
      </a>
    </div>
  </div>
);

export default function Refrigeracao() {
  const { search } = useLocation();
  const preview = new URLSearchParams(search).get("preview") === "1";
  const [s, setS] = useState<RefrigeracaoSettings>(REFRIGERACAO_DEFAULTS);

  useEffect(() => {
    document.title = "Técnico em Refrigeração e Climatização | Multplick";
    const col = preview ? "draft" : "published";
    supabase.from("site_settings").select(col).eq("section", SECTION_REFRIGERACAO).maybeSingle()
      .then(({ data }) => { const raw = (data as any)?.[col]; if (raw) setS(mergeRefrigeracao(raw)); });
  }, [preview]);

  const yt = youtubeIdFromUrl(s.video_youtube);

  return (
    <div style={{ background: SOFT }}>
      <Navbar />
      {s.campanha_ativa && s.campanha_texto && (
        <div className="pt-20 text-center py-3 font-bold" style={{ background: ICE, color: NAVY }}>❄️ {s.campanha_texto}</div>
      )}
      <section className={`${s.campanha_ativa ? "pt-10" : "pt-28"} pb-16`} style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 60%, ${BLUE} 100%)`, color: "#fff" }}>
        <div className="container grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold" style={{ background: "rgba(56,214,255,.15)", color: ICE }}>
              <Snowflake className="size-4" /> Formação exclusiva Multplick
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mt-4 leading-tight">{s.titulo}</h1>
            <p className="mt-4 text-lg opacity-90">{s.subtitulo}</p>
            <div className="flex flex-wrap gap-3 mt-6 text-sm">
              {["MEC / SISTEC", "Registro CFT/CRT", "PMOC Lei 13.589", "Válido em todo o Brasil"].map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,.1)" }}><BadgeCheck className="size-4" style={{ color: ICE }} />{t}</span>
              ))}
            </div>
            <Button asChild size="lg" className="mt-8 text-lg font-bold" style={{ background: ICE, color: NAVY }}>
              <a href="#modalidades">Escolher minha modalidade</a>
            </Button>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video" style={{ background: "#00213f", border: `3px solid ${ICE}` }}>
            {yt ? (
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt}`} title="Vídeo Multplick" allowFullScreen allow="accelerometer; autoplay; encrypted-media; picture-in-picture" />
            ) : s.video_arquivo ? (
              <video className="w-full h-full" src={s.video_arquivo} controls playsInline />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-70"><Snowflake className="size-14" style={{ color: ICE }} /><p className="mt-2">Vídeo em breve</p></div>
            )}
          </div>
        </div>
      </section>

      <section className="py-14 container">
        <h2 className="text-3xl font-extrabold text-center" style={{ color: NAVY }}>Por que ser Técnico em Refrigeração?</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {[
            [FileCheck2, "Assine PMOC", "Obrigatório por lei em prédios, hospitais, shoppings e empresas."],
            [ShieldCheck, "Registro no CFT", "Emita TRT e trabalhe como responsável técnico."],
            [BadgeCheck, "Mais contratos", "Participe de licitações e feche contratos com empresas."],
          ].map(([I, t, d]: any) => (
            <div key={t} className="rounded-2xl p-6 bg-white shadow"><I className="size-8" style={{ color: BLUE }} /><h3 className="font-bold text-lg mt-3" style={{ color: NAVY }}>{t}</h3><p className="text-sm mt-1" style={{ color: "#445" }}>{d}</p></div>
          ))}
        </div>
      </section>

      <section id="modalidades" className="py-14" style={{ background: "#fff" }}>
        <div className="container">
          <h2 className="text-3xl font-extrabold text-center" style={{ color: NAVY }}>Escolha o caminho certo para você</h2>
          <p className="text-center mt-2" style={{ color: "#556" }}>Duas modalidades, a mesma qualidade Multplick.</p>
          <div className="grid md:grid-cols-2 gap-6 mt-10 max-w-5xl mx-auto">
            <PlanoCard p={s.competencia} num={s.whatsapp} slug="tecnico-refrigeracao-climatizacao-competencia" />
            <PlanoCard p={s.regular} num={s.whatsapp} slug="tecnico-refrigeracao-climatizacao-regular" />
          </div>
        </div>
      </section>

      {s.fotos.length > 0 && (
        <section className="py-14 container">
          <h2 className="text-3xl font-extrabold text-center" style={{ color: NAVY }}>Nossos alunos e treinamentos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {s.fotos.map((f, i) => (
              <figure key={i} className="rounded-xl overflow-hidden bg-white shadow">
                <img src={f.url} alt={f.legenda || "Foto Multplick"} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                {f.legenda && <figcaption className="p-2 text-sm text-center" style={{ color: NAVY }}>{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {s.faqs.length > 0 && (
        <section className="py-14 container max-w-3xl">
          <h2 className="text-3xl font-extrabold text-center" style={{ color: NAVY }}>Dúvidas frequentes</h2>
          <Accordion type="single" collapsible className="mt-6 bg-white rounded-2xl px-5">
            {s.faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}><AccordionTrigger style={{ color: NAVY }}>{f.q}</AccordionTrigger><AccordionContent>{f.a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      <a href={wa(s.whatsapp, "Olá! Tenho interesse no Técnico em Refrigeração e Climatização.")} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 rounded-full p-4 shadow-xl" style={{ background: "#1FA855", color: "#fff" }} aria-label="WhatsApp">
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}
