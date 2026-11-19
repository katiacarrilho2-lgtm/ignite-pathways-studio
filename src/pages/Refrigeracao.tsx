import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/site/Navbar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, CreditCard, MessageCircle, ShieldCheck, Snowflake, BadgeCheck, FileCheck2, Award, Clock, Wrench, Building2, Briefcase, GraduationCap, ArrowRight, Star, Gift } from "lucide-react";
import heroImg from "@/assets/refrigeracao-hero.jpg";
import { youtubeIdFromUrl } from "@/lib/courseMedia";
import { SECTION_REFRIGERACAO, REFRIGERACAO_DEFAULTS, RefrigeracaoSettings, mergeRefrigeracao, Plano } from "@/lib/refrigeracaoPage";

// Paleta gelo/marinho exclusiva desta página
const NAVY = "#002f5b"; const NAVY2 = "#00376b"; const ICE = "#38d6ff"; const BLUE = "#1274bf"; const SOFT = "#ecf4fa";

const wa = (n: string, m: string) => `https://wa.me/${n}?text=${encodeURIComponent(m)}`;

const PlanoCard = ({ p, num, slug }: { p: Plano; num: string; slug: string }) => (
  <div className="rounded-3xl p-8 flex flex-col shadow-2xl border-t-8 transition-transform hover:-translate-y-1" style={{ background: "#fff", borderColor: BLUE }}>
    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>{p.subtitulo}</span>
    <h3 className="text-3xl font-black mt-2" style={{ color: NAVY }}>{p.titulo}</h3>
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
      <section className="relative overflow-hidden text-white" style={{ background: NAVY }}>
        <img src={heroImg} alt="Técnico Multplick instalando ar-condicionado" width={1600} height={912} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY}ee 40%, ${NAVY}55 75%, transparent 100%)` }} />
        <div className={`relative container ${s.campanha_ativa ? "pt-12" : "pt-32"} pb-20 grid lg:grid-cols-2 gap-10 items-center`}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider" style={{ background: ICE, color: NAVY }}>
              <Snowflake className="size-4" /> Formação exclusiva Multplick
            </span>
            <h1 className="text-4xl md:text-6xl font-black mt-5 leading-[1.05] drop-shadow-lg">{s.titulo}</h1>
            <p className="mt-5 text-lg md:text-xl opacity-95 max-w-xl">{s.subtitulo}</p>
            <div className="grid grid-cols-2 gap-3 mt-7 text-sm max-w-lg">
              {["MEC / SISTEC", "Registro CFT/CRT", "PMOC Lei 13.589", "Válido em todo o Brasil"].map((t) => (
                <span key={t} className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-semibold backdrop-blur" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(56,214,255,.4)" }}><BadgeCheck className="size-5" style={{ color: ICE }} />{t}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              <a href="#modalidades" className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-lg font-extrabold shadow-2xl transition-transform hover:scale-105" style={{ background: ICE, color: NAVY }}>
                Quero meu diploma <ArrowRight className="size-5" />
              </a>
              <a href={wa(s.whatsapp, "Olá! Quero uma análise gratuita do meu perfil para o Técnico em Refrigeração.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-6 py-4 font-bold border-2 border-white/70 hover:bg-white/10">
                <MessageCircle className="size-5" /> Análise gratuita
              </a>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video ring-4" style={{ background: "#00213f", boxShadow: `0 0 60px ${ICE}66`, borderColor: ICE }}>
            {yt ? (
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt}`} title="Vídeo Multplick" allowFullScreen allow="accelerometer; autoplay; encrypted-media; picture-in-picture" />
            ) : s.video_arquivo ? (
              <video className="w-full h-full" src={s.video_arquivo} controls playsInline />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-80"><Snowflake className="size-14" style={{ color: ICE }} /><p className="mt-2">Vídeo em breve</p></div>
            )}
          </div>
        </div>
      </section>

      <section style={{ background: `linear-gradient(90deg, ${BLUE}, ${NAVY2})` }} className="text-white">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-6 py-8 text-center">
          {[["100%", "Online e no seu ritmo"], ["MEC", "Diploma registrado"], ["CFT", "Registro profissional"], ["Brasil", "Validade nacional"]].map(([n, t]) => (
            <div key={t}><div className="text-3xl md:text-4xl font-black" style={{ color: ICE }}>{n}</div><div className="text-sm opacity-90 mt-1">{t}</div></div>
          ))}
        </div>
      </section>

      <section className="py-16 container">
        <p className="text-center text-sm font-bold uppercase tracking-widest" style={{ color: BLUE }}>O que muda na sua carreira</p>
        <h2 className="text-3xl md:text-4xl font-black text-center mt-2" style={{ color: NAVY }}>Transforme sua experiência em diploma técnico</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {[
            [FileCheck2, "Assine PMOC", "Obrigatório por lei em prédios, hospitais, shoppings e empresas."],
            [ShieldCheck, "Registro no CFT", "Emita TRT e trabalhe como responsável técnico."],
            [Briefcase, "Mais contratos", "Participe de licitações e feche contratos com empresas."],
            [Building2, "Abra seu CNPJ técnico", "Atue com sua própria empresa de climatização."],
            [Award, "Valorização", "Cobre mais caro com o título de técnico registrado."],
            [Wrench, "Respeito do cliente", "Mostre o diploma e passe confiança em cada serviço."],
          ].map(([I, t, d]: any) => (
            <div key={t} className="group rounded-2xl p-6 bg-white shadow-lg border-t-4 transition-transform hover:-translate-y-1" style={{ borderColor: ICE }}>
              <div className="size-14 rounded-xl grid place-items-center" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}><I className="size-7 text-white" /></div>
              <h3 className="font-extrabold text-xl mt-4" style={{ color: NAVY }}>{t}</h3><p className="text-sm mt-2" style={{ color: "#445" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modalidades" className="py-14" style={{ background: "#fff" }}>
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-black text-center" style={{ color: NAVY }}>Escolha o caminho certo para você</h2>
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

      <section className="py-16 text-white" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-black text-center">Simples assim: <span style={{ color: ICE }}>4 passos</span></h2>
          <div className="grid md:grid-cols-4 gap-5 mt-10">
            {[["Análise gratuita", "Fale com a gente e veja qual modalidade é a sua."], ["Pré-matrícula", "Preencha sua ficha online em poucos minutos."], ["Estudos e avaliação", "Aulas e provas online, no seu ritmo."], ["Diploma na mão", "Receba o diploma e solicite seu registro no CFT."]].map(([t, d], i) => (
              <div key={t} className="rounded-2xl p-6 relative" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(56,214,255,.35)" }}>
                <div className="size-12 rounded-full grid place-items-center text-xl font-black" style={{ background: ICE, color: NAVY }}>{i + 1}</div>
                <h3 className="font-extrabold text-lg mt-4">{t}</h3><p className="text-sm mt-1 opacity-85">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 container">
        <div className="rounded-3xl p-8 md:p-12 grid md:grid-cols-[auto,1fr] gap-8 items-center shadow-xl" style={{ background: "#fff", border: `2px dashed ${BLUE}` }}>
          <div className="size-24 rounded-2xl grid place-items-center mx-auto" style={{ background: `linear-gradient(135deg, ${ICE}, ${BLUE})` }}><Gift className="size-12 text-white" /></div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: BLUE }}>Bônus Multplick</p>
            <h2 className="text-2xl md:text-3xl font-black mt-1" style={{ color: NAVY }}>Você ainda leva cursos de capacitação inclusos</h2>
            <div className="flex flex-wrap gap-2 mt-4">
              {["Instalação e manutenção de Split", "PMOC na prática", "Elétrica aplicada", "Apostilas completas", "Certificados"].map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: SOFT, color: NAVY }}><Star className="size-4" style={{ color: BLUE }} />{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

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

      <section className="py-16 text-white text-center" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
        <div className="container max-w-3xl">
          <GraduationCap className="size-14 mx-auto" style={{ color: ICE }} />
          <h2 className="text-3xl md:text-5xl font-black mt-4">Seu diploma técnico começa hoje</h2>
          <p className="mt-3 text-lg opacity-90 flex items-center justify-center gap-2"><Clock className="size-5" /> Vagas com condição especial por tempo limitado</p>
          <a href="#modalidades" className="inline-flex items-center gap-2 mt-8 rounded-xl px-10 py-5 text-xl font-black shadow-2xl transition-transform hover:scale-105" style={{ background: ICE, color: NAVY }}>
            Garantir minha vaga <ArrowRight className="size-6" />
          </a>
        </div>
      </section>

      <a href={wa(s.whatsapp, "Olá! Tenho interesse no Técnico em Refrigeração e Climatização.")} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 rounded-full p-4 shadow-xl" style={{ background: "#1FA855", color: "#fff" }} aria-label="WhatsApp">
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}
