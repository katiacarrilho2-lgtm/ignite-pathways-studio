import { PageHero } from "@/components/site/PageHero";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, EJA_DEFAULTS, PageSettings } from "@/lib/siteSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck, GraduationCap, Clock, Award, FileCheck, MessageCircle,
  BookOpen, Users, Landmark, ScrollText, Building2, Wifi, Sparkles,
  Briefcase, School, BadgeCheck, CheckCircle2, Scale, MapPin, Copy, Timer, Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import certFrente from "@/assets/eja-certificado-frente.jpeg.asset.json";
import certHistorico from "@/assets/eja-certificado-historico.jpeg.asset.json";

const WHATSAPP = "5518996841902";
const waLink = (m: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(m)}`;

// Paleta institucional — neutros quentes com destaques em dourado (parceiro).
// O azul é usado apenas em títulos e no CTA final; o dourado sinaliza credencial/parceria.
const NAVY = "hsl(215 70% 18%)";
// Paleta âmbar/laranja — mais quente e vibrante, mantendo ar institucional
const GOLD = "#F59E0B";        // âmbar 500
const GOLD_DARK = "#C2410C";   // laranja escuro (orange-700)
const CREAM = "#FFF8EE";       // fundo neutro quente
const CREAM_SOFT = "#FDE9C8";  // detalhes/borda âmbar suave

const areas = [
  { icon: BookOpen, t: "Linguagens e Códigos", d: "Língua Portuguesa, Literatura, Artes, Educação Física e Língua Estrangeira." },
  { icon: Landmark, t: "Ciências Humanas", d: "História, Geografia, Filosofia e Sociologia." },
  { icon: Award, t: "Ciências da Natureza", d: "Biologia, Física e Química." },
  { icon: FileCheck, t: "Matemática e suas Tecnologias", d: "Matemática aplicada ao cotidiano e ao mundo do trabalho." },
];

const passos = [
  { n: "1", t: "Fale com um consultor", d: "Enviamos o passo a passo pelo WhatsApp e tiramos suas dúvidas." },
  { n: "2", t: "Envie sua documentação", d: "RG, CPF, comprovante de endereço e histórico escolar (o que tiver)." },
  { n: "3", t: "Estude na plataforma", d: "Acesso 100% online, materiais em vídeo, apostilas e avaliações no seu ritmo." },
  { n: "4", t: "Receba seu certificado", d: "Certificado de conclusão registrado, com validade em todo o território nacional." },
];

const beneficios = [
  { icon: Wifi, t: "100% EAD", d: "Estude de onde estiver, no seu horário — celular, tablet ou computador." },
  { icon: Clock, t: "Conclusão a partir de 6 meses", d: "Cronograma flexível conforme sua rotina e dedicação." },
  { icon: Users, t: "Suporte pedagógico dedicado", d: "Tutores e equipe de atendimento acompanhando toda a sua jornada." },
  { icon: Briefcase, t: "Abre portas no mercado", d: "Requisito mínimo para concursos, faculdade, promoções e novas vagas." },
  { icon: School, t: "Prossiga para faculdade", d: "Certificado aceito para ingresso em graduação, técnico e ENEM." },
  { icon: BadgeCheck, t: "Documento com registro", d: "Emissão de histórico escolar e certificado oficial em nome do aluno." },
];

const faqs = [
  {
    q: "O que é o EJA?",
    a: "EJA (Educação de Jovens e Adultos) é uma modalidade de ensino prevista na Lei nº 9.394/1996 (LDB) que permite a jovens e adultos concluírem o Ensino Fundamental ou o Ensino Médio, mesmo que não tenham completado a idade regular ou tenham interrompido os estudos.",
  },
  {
    q: "Quem pode se matricular?",
    a: "Para concluir o Ensino Fundamental, é necessário ter no mínimo 15 anos completos. Para o Ensino Médio, o aluno deve ter no mínimo 18 anos completos, conforme determina a legislação educacional brasileira.",
  },
  {
    q: "Em quanto tempo consigo concluir?",
    a: "A partir de 6 meses, dependendo do nível de dedicação e do aproveitamento das avaliações. Como é EAD, você define o seu ritmo dentro do prazo regulamentar.",
  },
  {
    q: "O certificado é reconhecido pelo MEC?",
    a: "Sim. O curso é ofertado por instituição credenciada pela Secretaria de Educação e o certificado é emitido nos termos da Lei nº 9.394/1996, com validade em todo o território nacional para fins de concurso, matrícula em cursos superiores, técnicos e apresentação em qualquer órgão público ou empresa privada.",
  },
  {
    q: "Serve para faculdade e concursos?",
    a: "Sim. O certificado de conclusão do Ensino Médio via EJA tem exatamente a mesma validade do ensino regular — pode ser usado para faculdade, técnico, ENEM, concursos públicos e apresentação em empresas.",
  },
  {
    q: "Preciso ir presencialmente em algum momento?",
    a: "Não é obrigatório. O curso é 100% EAD, com aulas, materiais e provas realizados diretamente na plataforma online. Todo o suporte é feito por WhatsApp, e-mail e portal do aluno.",
  },
  {
    q: "Quais documentos preciso enviar?",
    a: "RG e CPF, comprovante de residência, foto 3x4 (digital) e o histórico escolar do último ano cursado (se tiver). Nossa equipe orienta você em cada etapa.",
  },
  {
    q: "Como recebo o certificado?",
    a: "Após a conclusão de todas as disciplinas e avaliações, o certificado e o histórico escolar são emitidos digitalmente, com registro na instituição credenciada, podendo ser enviados também de forma impressa.",
  },
];

const Eja = () => {
  const waMsg = "Olá! Tenho interesse no EJA (Ensino Fundamental / Médio) da Multplick. Pode me ajudar?";

  // Cupom promocional válido apenas no dia — expira à meia-noite
  const today = new Date();
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const promoCode = `EJA799-${yyyymmdd}`;
  const promoMsg = `Olá! Quero garantir a promoção do EJA por R$ 799,00.\n\nMeu código de desconto: ${promoCode}\n(válido somente hoje)`;

  const [copied, setCopied] = useState(false);
  const copyPromo = async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      toast.success("Código copiado! Envie no WhatsApp para garantir o desconto.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  // Contagem regressiva até meia-noite
  const endOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);
  const [remaining, setRemaining] = useState(endOfDay - Date.now());
  useEffect(() => {
    const t = setInterval(() => setRemaining(endOfDay - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endOfDay]);
  const hh = String(Math.max(0, Math.floor(remaining / 3600000))).padStart(2, "0");
  const mm = String(Math.max(0, Math.floor((remaining % 3600000) / 60000))).padStart(2, "0");
  const ss = String(Math.max(0, Math.floor((remaining % 60000) / 1000))).padStart(2, "0");

  return (
    <>
      <PageHero eyebrow={site.hero_eyebrow} title={site.hero_title} description={site.hero_description} />
      <SiteBlocks blocks={site.blocks} slots={{ conteudo: (<>

      {/* Faixa de parceria institucional (dourada) */}
      <section className="container -mt-6 mb-12">
        <div
          className="relative rounded-2xl shadow-elegant p-6 md:p-8 grid md:grid-cols-[auto_1fr_auto] items-center gap-6 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${CREAM} 0%, #FFFFFF 60%, ${CREAM_SOFT} 100%)`,
            border: `1px solid ${GOLD}66`,
          }}
        >
          {/* fita dourada superior */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})` }} />
          <div
            className="size-16 md:size-20 rounded-2xl grid place-items-center shadow-elegant"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: "#fff" }}
          >
            <GraduationCap className="size-9" />
          </div>
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] px-2.5 py-1 rounded-full mb-2"
              style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK }}>
              <ShieldCheck className="size-3.5" /> Parceiro Educacional Multplick
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-primary">
              EJA com instituição credenciada e certificado de validade nacional
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              A Multplick atua como <strong>parceira educacional</strong> — a certificação é emitida por escola credenciada
              pela Secretaria de Educação, nos termos da <strong>LDB (Lei nº 9.394/1996)</strong> e da <strong>Resolução CNE/CEB nº 3/2010</strong>.
            </p>
          </div>
          <Button
            asChild size="lg"
            className="shrink-0 hover:opacity-90 shadow-elegant"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: "#fff" }}
          >
            <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Falar com um consultor
            </a>
          </Button>
        </div>
      </section>

      {/* Oferta relâmpago — código copiável + contagem regressiva */}
      <section className="container mb-12">
        <div
          className="relative rounded-2xl p-6 md:p-8 shadow-elegant overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #FFFFFF 0%, ${CREAM} 100%)`,
            border: `2px dashed ${GOLD}`,
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_DARK})` }} />

          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] px-2.5 py-1 rounded-full mb-3"
                style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>
                <Tag className="size-3.5" /> Oferta válida somente hoje
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary leading-tight">
                EJA por <span style={{ color: GOLD_DARK }}>apenas R$ 799</span> — condição especial do dia
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Copie o <strong>código promocional</strong> abaixo e envie no WhatsApp para o consultor.
                Ele confirma o desconto e negocia a melhor forma de pagamento para você.
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: GOLD_DARK }}>
                <Timer className="size-4 animate-pulse" />
                Expira em <span className="tabular-nums text-primary">{hh}:{mm}:{ss}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Caixa do código piscando */}
              <button
                type="button"
                onClick={copyPromo}
                className="group relative rounded-xl px-5 py-5 text-left transition-smooth hover:shadow-elegant"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}15, ${GOLD}30)`,
                  border: `2px solid ${GOLD}`,
                }}
              >
                <span className="absolute inset-0 rounded-xl animate-pulse pointer-events-none" style={{ boxShadow: `0 0 0 4px ${GOLD}22` }} />
                <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: GOLD_DARK }}>
                  Seu código de desconto
                </div>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="text-xl md:text-2xl font-black tracking-wider text-primary tabular-nums select-all animate-pulse">
                    {promoCode}
                  </span>
                  <span
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: "#fff" }}
                  >
                    <Copy className="size-3.5" /> {copied ? "Copiado!" : "Copiar"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Clique no código para copiar automaticamente.
                </div>
              </button>

              <Button
                asChild size="lg"
                className="w-full hover:opacity-95 shadow-elegant"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: "#fff" }}
              >
                <a href={waLink(promoMsg)} target="_blank" rel="noopener noreferrer" onClick={() => { void copyPromo(); }}>
                  <MessageCircle className="size-4" /> Enviar código no WhatsApp
                </a>
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                * Proposta com validade até o final do dia. Após esse período, o consultor pode reavaliar a condição.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="container py-8">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: Clock, title: "A partir de 6 meses", text: "Cronograma flexível, no seu ritmo." },
            { icon: ShieldCheck, title: "Reconhecido em todo o Brasil", text: "Certificado válido nos termos da LDB." },
            { icon: Wifi, title: "100% EAD", text: "Estude pelo celular, tablet ou computador." },
            { icon: BadgeCheck, title: "Certificado registrado", text: "Emitido por instituição credenciada." },
          ].map((c) => (
            <div key={c.title} className="p-5 rounded-xl bg-card border shadow-card-soft transition-smooth hover:shadow-elegant">
              <div
                className="size-11 rounded-lg grid place-items-center mb-3"
                style={{ backgroundColor: `${GOLD}18`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}
              >
                <c.icon className="size-5" />
              </div>
              <div className="font-semibold text-primary">{c.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>Passo a passo</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Como funciona o EJA na Multplick</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Um processo simples, transparente e conduzido por uma equipe pedagógica dedicada.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {passos.map((s) => (
            <div key={s.n} className="relative p-6 rounded-xl bg-card border shadow-card-soft overflow-hidden">
              <div className="absolute -top-6 -right-6 size-24 rounded-full opacity-[0.06]" style={{ backgroundColor: GOLD }} />
              <div
                className="size-10 rounded-full grid place-items-center font-bold mb-3"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: "#fff" }}
              >
                {s.n}
              </div>
              <div className="font-semibold text-primary">{s.t}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Áreas do conhecimento */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>Matriz curricular</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Áreas do conhecimento</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            A matriz do EJA segue as diretrizes da Base Nacional Comum Curricular (BNCC), organizada em quatro grandes áreas.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {areas.map((a) => (
            <div key={a.t} className="p-6 rounded-xl bg-card border shadow-card-soft flex gap-4 transition-smooth hover:shadow-elegant">
              <div
                className="size-11 shrink-0 rounded-lg grid place-items-center"
                style={{ backgroundColor: `${GOLD}18`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}
              >
                <a.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-primary">{a.t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Por que escolher o EJA do Grupo Multplick */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>
            Benefícios reais
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">
            Por que escolher o EJA do <span style={{ color: GOLD_DARK }}>Grupo Multplick</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto italic">
            A Multplick não emite o certificado diretamente — atuamos como <strong>parceira educacional</strong>,
            oferecendo suporte, plataforma e acompanhamento pedagógico, enquanto a certificação é feita por
            instituição credenciada pela Secretaria de Educação.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {beneficios.map((b) => (
            <div key={b.t} className="p-6 rounded-xl bg-card border shadow-card-soft transition-smooth hover:shadow-elegant hover:-translate-y-0.5">
              <div
                className="size-11 rounded-lg grid place-items-center mb-3"
                style={{ backgroundColor: `${GOLD}18`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}
              >
                <b.icon className="size-5" />
              </div>
              <div className="font-semibold text-primary">{b.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{b.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Certificado + Legalidade */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>
            <ShieldCheck className="size-3.5 mr-1 inline" /> Certificado com validade nacional
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Seu certificado, com toda a credibilidade</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Emitido por instituição credenciada, com registro em histórico escolar e validade
            em todo o território nacional.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8 items-center">
          <div
            className="rounded-2xl overflow-hidden shadow-elegant"
            style={{
              border: `1px solid ${GOLD}66`,
              background: `linear-gradient(135deg, ${CREAM} 0%, #FFFFFF 100%)`,
            }}
          >
            <div className="p-3 md:p-4 grid gap-3">
              <figure>
                <img
                  src={certFrente.url}
                  alt="Modelo oficial do certificado de conclusão do Ensino Médio — EJA"
                  loading="lazy"
                  className="w-full h-auto rounded-lg border"
                  style={{ borderColor: `${GOLD}55` }}
                />
                <figcaption className="text-center text-[11px] mt-1.5 font-semibold" style={{ color: GOLD_DARK }}>
                  Frente — Certificado de conclusão
                </figcaption>
              </figure>
              <figure>
                <img
                  src={certHistorico.url}
                  alt="Modelo oficial do histórico escolar — EJA"
                  loading="lazy"
                  className="w-full h-auto rounded-lg border"
                  style={{ borderColor: `${GOLD}55` }}
                />
                <figcaption className="text-center text-[11px] mt-1.5 font-semibold" style={{ color: GOLD_DARK }}>
                  Verso — Histórico escolar completo
                </figcaption>
              </figure>
            </div>
            <div className="px-4 pb-4 text-center text-[11px]" style={{ color: GOLD_DARK }}>
              * Modelo do documento oficial emitido pela instituição parceira credenciada,
              em nome do aluno após a conclusão de todas as disciplinas.
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-card border shadow-card-soft">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="size-5" style={{ color: GOLD_DARK }} />
                <h3 className="font-bold text-primary">Base legal</h3>
              </div>
              <ul className="text-sm text-foreground/80 space-y-2">
                <li className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>Lei nº 9.394/1996 (LDB)</strong> — Lei de Diretrizes e Bases da Educação Nacional, artigos 37 e 38 (EJA).</span></li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>Resolução CNE/CEB nº 3/2010</strong> — Diretrizes Operacionais para a EJA.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>Parecer CNE/CEB nº 6/2010</strong> — reconhecimento nacional dos certificados.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>Portaria de credenciamento</strong> da Secretaria de Educação, publicada em Diário Oficial.</span></li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-card border shadow-card-soft">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="size-5" style={{ color: GOLD_DARK }} />
                <h3 className="font-bold text-primary">Órgãos fiscalizadores</h3>
              </div>
              <ul className="text-sm text-foreground/80 space-y-2">
                <li className="flex gap-2"><Building2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>MEC</strong> — Ministério da Educação (regulação nacional).</span></li>
                <li className="flex gap-2"><Building2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>CNE / CEB</strong> — Conselho Nacional de Educação / Câmara de Educação Básica.</span></li>
                <li className="flex gap-2"><Building2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} /><span><strong>Secretaria Estadual de Educação</strong> — credenciamento e fiscalização da instituição.</span></li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border shadow-card-soft" style={{ borderColor: `${GOLD}66`, background: `${GOLD}10` }}>
              <div className="flex items-center gap-2 mb-1">
                <ScrollText className="size-5" style={{ color: GOLD_DARK }} />
                <h3 className="font-bold text-primary">O que consta no seu certificado</h3>
              </div>
              <ul className="text-sm text-foreground/80 mt-1 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                <li>• Nome completo do aluno</li>
                <li>• RG e CPF</li>
                <li>• Nível concluído (Fundamental ou Médio)</li>
                <li>• Data de conclusão</li>
                <li>• Registro na instituição</li>
                <li>• Assinatura do diretor e secretário</li>
                <li>• Base legal (LDB · Art. 38)</li>
                <li>• Selo institucional e histórico anexo</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Público ideal */}
      <section className="container py-12">
        <div
          className="rounded-2xl p-8 md:p-10 grid md:grid-cols-3 gap-6"
          style={{
            background: `linear-gradient(135deg, ${CREAM} 0%, #FFFFFF 100%)`,
            border: `1px solid ${GOLD}44`,
          }}
        >
          <div className="md:col-span-1">
            <Badge className="mb-3" style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>
              Para quem é
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">O EJA é para você que…</h2>
          </div>
          <ul className="md:col-span-2 grid sm:grid-cols-2 gap-3 text-sm">
            {[
              "Parou os estudos e quer concluir com rapidez.",
              "Precisa do Ensino Médio para prestar concurso.",
              "Quer ingressar em uma faculdade ou curso técnico.",
              "Foi promovido no trabalho e precisa comprovar escolaridade.",
              "Não tem tempo para aulas presenciais fixas.",
              "Quer voltar a estudar com apoio pedagógico dedicado.",
            ].map((t) => (
              <li key={t} className="flex gap-2 p-3 rounded-lg bg-card border">
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: GOLD_DARK }} />
                <span className="text-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <Badge className="mb-3" style={{ backgroundColor: `${GOLD}22`, color: GOLD_DARK, border: `1px solid ${GOLD}55` }}>
            Dúvidas frequentes
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Perguntas frequentes</h2>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA final */}
      <section className="container py-16">
        <div
          className="rounded-2xl p-8 md:p-12 text-white text-center shadow-elegant relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, hsl(215 70% 28%) 100%)` }}
        >
          <div className="absolute -top-16 -left-16 size-64 rounded-full opacity-20" style={{ backgroundColor: GOLD }} />
          <div className="absolute -bottom-20 -right-16 size-72 rounded-full opacity-10" style={{ backgroundColor: GOLD }} />
          <div className="relative">
            <Sparkles className="size-10 mx-auto mb-3" style={{ color: GOLD }} />
            <h2 className="text-3xl md:text-4xl font-bold">Pronto para concluir seus estudos?</h2>
            <p className="mt-3 max-w-2xl mx-auto opacity-95">
              Fale com um consultor agora e receba o passo a passo completo para começar
              seu EJA na Multplick.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="hover:opacity-95" style={{ backgroundColor: GOLD, color: NAVY }}>
                <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> Falar no WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white/10">
                <a href="tel:+5518996841902"><MapPin className="size-4" /> Ligar: (18) 99684-1902</a>
              </Button>
            </div>
            <p className="text-xs mt-6 opacity-80">
              Atendimento humano · Resposta no mesmo dia · Suporte pedagógico durante todo o curso
            </p>
          </div>
        </div>
      </section>
      </>) }} />
    </>
  );
};

export default Eja;
