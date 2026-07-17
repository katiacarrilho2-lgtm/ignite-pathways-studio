import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ShieldCheck, Award, FileCheck, MessageCircle, GraduationCap, Sparkles, ScrollText, BadgeCheck, Star, CreditCard, Receipt, Wallet } from "lucide-react";
import { useState } from "react";
import globaltecLogo from "@/assets/globaltec-logo.webp.asset.json";
import { CampaignBanner } from "@/components/site/CampaignBanner";
import { campanhaTecnico } from "@/config/campaigns";

const WHATSAPP = "5518996841902";
const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

// Paleta laranja da certificadora (GlobalTec)
const ORANGE = "#F26522";
const ORANGE_DARK = "#D9531A";

const areas = [
  {
    title: "Área da Saúde",
    items: [
      "Técnico em Enfermagem",
      "Técnico em Análises Clínicas",
      "Técnico em Farmácia",
      "Técnico em Radiologia",
      "Técnico em Saúde Bucal",
      "Técnico em Estética",
      "Técnico em Nutrição e Dietética",
      "Técnico em Veterinária",
      "Técnico em Cuidados de Idosos",
      "Técnico em Agente Comunitário de Saúde",
    ],
  },
  {
    title: "Administração e Gestão",
    items: [
      "Técnico em Administração",
      "Técnico em Contabilidade",
      "Técnico em Logística",
      "Técnico em Marketing",
      "Técnico em Recursos Humanos",
      "Técnico em Vendas",
      "Técnico em Qualidade",
      "Técnico em Transações Imobiliárias",
    ],
  },
  {
    title: "Tecnologia e Informática",
    items: [
      "Técnico em Desenvolvimento de Sistemas",
      "Técnico em Informática para Internet",
      "Técnico em Redes de Computadores",
      "Técnico em Design Gráfico",
    ],
  },
  {
    title: "Engenharia e Manutenção",
    items: [
      "Técnico em Eletrotécnica",
      "Técnico em Eletrônica",
      "Técnico em Automação Industrial",
      "Técnico em Eletromecânica",
      "Técnico em Refrigeração e Climatização",
      "Técnico em Soldagem",
    ],
  },
  {
    title: "Construção e Infraestrutura",
    items: [
      "Técnico em Edificações",
      "Técnico em Agrimensura",
      "Técnico em Segurança do Trabalho",
    ],
  },
  {
    title: "Serviços Especializados",
    items: [
      "Técnico em Gastronomia",
      "Técnico em Guia de Turismo",
      "Técnico em Design de Interiores",
    ],
  },
];

const faqs = [
  {
    q: "O que é um curso técnico por competência?",
    a: "É a modalidade que valida sua experiência profissional para emissão do certificado técnico reconhecido pelo MEC, sem precisar repetir o que você já domina. Você comprova suas habilidades e recebe o certificado.",
  },
  {
    q: "Quem pode fazer a certificação por competência?",
    a: "Profissionais com, no mínimo, 2 anos de experiência comprovada na área desejada. É necessário ter atuado formal ou informalmente na profissão.",
  },
  {
    q: "Quanto tempo leva para concluir?",
    a: "Após a validação da documentação, é possível concluir em até 48 horas, dependendo da análise. O processo é ágil porque você não cursa disciplinas que já domina.",
  },
  {
    q: "Como funciona a avaliação por competência?",
    a: "Analisamos sua documentação profissional e, se necessário, solicitamos evidências complementares (portfólio, projetos, declarações ou entrevista técnica) para comprovar as competências.",
  },
  {
    q: "O certificado tem validade nacional?",
    a: "Sim. O certificado é 100% reconhecido pelo MEC, com validade em todo o território nacional, aceito em concursos, conselhos de classe e empresas.",
  },
  {
    q: "Serve para concursos públicos?",
    a: "Sim, desde que o edital permita cursos técnicos de nível médio devidamente autorizados e cadastrados no MEC/SISTEC.",
  },
];

// Conselhos de classe reconhecedores
const conselhos = [
  { sigla: "COFECI", nome: "Conselho Federal de Corretores de Imóveis" },
  { sigla: "CFTA", nome: "Conselho Federal dos Técnicos Agrícolas" },
  { sigla: "CFO", nome: "Conselho Federal de Odontologia" },
  { sigla: "COREN", nome: "Conselho Regional de Enfermagem" },
];

// Pacotes de certificação por competência (1 a 4 cursos)
const pacotesCompetencia = [
  { qtd: 1, parcela: "124,99", total: "1.499,90", destaque: false },
  { qtd: 2, parcela: "224,99", total: "2.699,90", destaque: false },
  { qtd: 3, parcela: "316,66", total: "3.799,90", destaque: true },
  { qtd: 4, parcela: "383,33", total: "4.599,90", destaque: false },
];

// Planos do Técnico Regular (com base no site oficial GlobalTec)
const planosRegular = [
  {
    titulo: "Conclusão em 12 meses",
    subtitulo: "Cursos de 800 a 1.000 horas",
    parcelado: { label: "12x", valor: "147,00" },
    aVista: "1.200,00",
    cartao: "1.600,00",
    destaque: true,
  },
  {
    titulo: "Conclusão em 18 meses",
    subtitulo: "Cursos com 1.200 horas ou mais",
    parcelado: { label: "18x", valor: "147,00" },
    aVista: "1.900,00",
    cartao: "2.500,00",
    destaque: false,
  },
];

const CursoPorCompetencia = () => {
  const waMsg = "Olá! Tenho interesse na certificação Técnico por Competência. Pode me ajudar?";
  const [planoTab, setPlanoTab] = useState<"competencia" | "regular">("competencia");

  return (
    <>
      <PageHero
        eyebrow="Certificação em até 48h"
        title="Técnico por Competência"
        description="Valide sua experiência profissional e receba o certificado técnico reconhecido pelo MEC — sem precisar cursar do zero o que você já domina."
      />

      {/* Faixa institucional da certificadora */}
      <section className="container -mt-6 mb-12">
        <div
          className="rounded-2xl border shadow-elegant p-6 md:p-8 flex flex-col md:flex-row items-center gap-6"
          style={{ backgroundColor: "#FFF7F1", borderColor: `${ORANGE}33` }}
        >
          <img
            src={globaltecLogo.url}
            alt="GlobalTec — Colégio Técnico Global"
            className="h-20 md:h-24 w-auto shrink-0"
            loading="lazy"
          />
          <div className="flex-1 text-center md:text-left">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: ORANGE_DARK }}>
              Certificadora parceira
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-primary mt-1">
              Colégio Técnico Global — GlobalTec
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Instituição credenciada pela Resolução nº 291 de 24/05/2024 (Diário Oficial nº 35.847).
              Certificados 100% reconhecidos pelo MEC, com validade nacional.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 text-white hover:opacity-90"
            style={{ backgroundColor: ORANGE }}
          >
            <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Falar comigo
            </a>
          </Button>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="container py-8">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: Clock, title: "Em até 48h", text: "Certificação ágil após validação dos documentos." },
            { icon: ShieldCheck, title: "Reconhecido pelo MEC", text: "Certificado válido em todo o Brasil." },
            { icon: Award, title: "Lei 9.394/1996 · Art. 41", text: "Base legal da certificação por competência." },
            { icon: FileCheck, title: "Sem cursar do zero", text: "Sua experiência profissional é validada." },
          ].map((c) => (
            <div
              key={c.title}
              className="p-5 rounded-xl bg-card border shadow-card-soft"
              style={{ borderColor: `${ORANGE}33` }}
            >
              <div
                className="size-11 rounded-lg grid place-items-center mb-3 text-white"
                style={{ backgroundColor: ORANGE }}
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
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
            Passo a passo
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Como funciona a certificação</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Um processo simples, rápido e 100% conduzido por nós — você só precisa comprovar sua experiência.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { n: "1", t: "Fale com um consultor", d: "Conte em qual área você atua e há quanto tempo." },
            { n: "2", t: "Envie sua documentação", d: "Comprovantes de experiência, RG, CPF e escolaridade." },
            { n: "3", t: "Análise e validação", d: "Nossa equipe valida com a certificadora GlobalTec." },
            { n: "4", t: "Receba seu certificado", d: "Certificado técnico reconhecido pelo MEC em até 48h." },
          ].map((s) => (
            <div key={s.n} className="p-6 rounded-xl bg-card border shadow-card-soft relative overflow-hidden">
              <div
                className="absolute -top-6 -right-6 size-20 rounded-full opacity-10"
                style={{ backgroundColor: ORANGE }}
              />
              <div
                className="size-10 rounded-full grid place-items-center font-bold text-white mb-3"
                style={{ backgroundColor: ORANGE }}
              >
                {s.n}
              </div>
              <div className="font-semibold text-primary">{s.t}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cursos disponíveis */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
            Áreas contempladas
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Cursos técnicos disponíveis</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Confira as áreas em que já certificamos profissionais por competência.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas.map((a) => (
            <div
              key={a.title}
              className="p-6 rounded-xl bg-card border shadow-card-soft hover:shadow-elegant transition-smooth"
              style={{ borderColor: `${ORANGE}22` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="size-5" style={{ color: ORANGE }} />
                <h3 className="font-bold text-primary">{a.title}</h3>
              </div>
              <ul className="space-y-2">
                {a.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: ORANGE }} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Regulamentação e Credenciamento */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
            Segurança e Legalidade
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Regulamentação e Credenciamento</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Instituição com todas as autorizações necessárias para oferecer cursos técnicos de qualidade e reconhecidos pelo MEC.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Regulamentação */}
          <div className="p-6 rounded-xl bg-card border shadow-card-soft" style={{ borderColor: `${ORANGE}33` }}>
            <div className="size-11 rounded-lg grid place-items-center mb-3 text-white" style={{ backgroundColor: ORANGE }}>
              <ScrollText className="size-5" />
            </div>
            <h3 className="font-bold text-primary text-lg">Regulamentação do Colégio</h3>
            <p className="text-sm text-muted-foreground mt-2">
              O Colégio Técnico Global é devidamente regulamentado e autorizado a funcionar pela Secretaria de Educação,
              garantindo a validade nacional de todos os certificados emitidos.
            </p>
            <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: `${ORANGE}12` }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
                Resolução de Credenciamento
              </div>
              <div className="text-sm font-semibold text-primary mt-1">Resolução nº 291 — 24/05/2024</div>
              <div className="text-xs text-muted-foreground">Diário Oficial nº 35.847 · página 99</div>
            </div>
          </div>

          {/* Conselhos */}
          <div className="p-6 rounded-xl bg-card border shadow-card-soft" style={{ borderColor: `${ORANGE}33` }}>
            <div className="size-11 rounded-lg grid place-items-center mb-3 text-white" style={{ backgroundColor: ORANGE }}>
              <BadgeCheck className="size-5" />
            </div>
            <h3 className="font-bold text-primary text-lg">Credenciamento dos Cursos</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Nossos cursos contam com credenciamento junto aos principais conselhos de classe profissionais,
              assegurando o reconhecimento do mercado de trabalho.
            </p>
            <ul className="mt-4 space-y-2">
              {conselhos.map((c) => (
                <li key={c.sigla} className="flex items-start gap-2 text-sm">
                  <span
                    className="shrink-0 inline-flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {c.sigla}
                  </span>
                  <span className="text-foreground/80">{c.nome}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Lei */}
          <div className="p-6 rounded-xl bg-card border shadow-card-soft" style={{ borderColor: `${ORANGE}33` }}>
            <div className="size-11 rounded-lg grid place-items-center mb-3 text-white" style={{ backgroundColor: ORANGE }}>
              <Award className="size-5" />
            </div>
            <h3 className="font-bold text-primary text-lg">Certificação por Competência</h3>
            <p className="text-sm text-muted-foreground mt-2">
              A certificação por competência foi regulamentada no Brasil pela{" "}
              <strong>Lei nº 9.394/1996, artigo 41</strong>, permitindo que profissionais com experiência prática
              obtenham certificação técnica através da validação de suas competências.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Lei 9.394/1996", "Artigo 41", "Reconhecido MEC"].map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${ORANGE}18`, color: ORANGE_DARK }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Banner de campanha promocional (editável em src/config/campaigns.ts) */}
      <CampaignBanner campaign={campanhaTecnico} />

      {/* Investimento Acessível — Planos e Preços */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
            Investimento Acessível
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Planos e Preços</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Escolha a modalidade ideal e invista no seu futuro com condições que cabem no bolso.
          </p>
        </div>

        {/* Tabs Regular / Competência */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-full border bg-card" style={{ borderColor: `${ORANGE}33` }}>
            {[
              { id: "regular", label: "Técnico Regular" },
              { id: "competencia", label: "Técnico por Competência" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setPlanoTab(t.id as typeof planoTab)}
                className="px-5 md:px-6 py-2 text-sm font-semibold rounded-full transition-all"
                style={
                  planoTab === t.id
                    ? { backgroundColor: ORANGE, color: "white" }
                    : { color: ORANGE_DARK }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {planoTab === "regular" && (
          <>
            <div className="max-w-3xl mx-auto mb-6 p-5 rounded-xl bg-card border" style={{ borderColor: `${ORANGE}22` }}>
              <h3 className="font-bold text-primary flex items-center gap-2">
                <Clock className="size-4" style={{ color: ORANGE }} /> Carga Horária e Tempo de Conclusão
              </h3>
              <ul className="text-sm text-foreground/80 mt-2 space-y-1">
                <li>• Curso de 800 horas → conclusão em <strong>12 meses</strong></li>
                <li>• Curso de 1.000 horas → conclusão em <strong>12 meses</strong></li>
                <li>• Curso de 1.200 horas → conclusão em <strong>18 meses</strong></li>
              </ul>
              <div className="mt-4 text-sm p-3 rounded-lg" style={{ backgroundColor: `${ORANGE}12`, color: ORANGE_DARK }}>
                <strong>Matrícula:</strong> valor mínimo de <strong>R$ 150,00</strong>.
                <span className="opacity-80"> *Pix/Boleto e Cartão à vista (12x sem juros) não pagam matrícula.</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {planosRegular.map((p) => (
                <div
                  key={p.titulo}
                  className="relative p-6 rounded-2xl bg-card border shadow-card-soft"
                  style={{ borderColor: p.destaque ? ORANGE : `${ORANGE}33`, borderWidth: p.destaque ? 2 : 1 }}
                >
                  {p.destaque && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full text-white flex items-center gap-1"
                      style={{ backgroundColor: ORANGE }}
                    >
                      <Star className="size-3" /> Mais procurado
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-primary">{p.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{p.subtitulo}</p>

                  <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: `${ORANGE}10` }}>
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
                      Boleto parcelado
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-primary">{p.parcelado.label}</span>
                      <span className="text-3xl font-extrabold text-primary">R$ {p.parcelado.valor}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border" style={{ borderColor: `${ORANGE}22` }}>
                      <div className="text-[11px] flex items-center gap-1 text-muted-foreground">
                        <Receipt className="size-3" /> Pix/Boleto à vista
                      </div>
                      <div className="text-base font-bold text-primary mt-0.5">R$ {p.aVista}</div>
                    </div>
                    <div className="p-3 rounded-lg border" style={{ borderColor: `${ORANGE}22` }}>
                      <div className="text-[11px] flex items-center gap-1 text-muted-foreground">
                        <CreditCard className="size-3" /> Cartão 12x sem juros
                      </div>
                      <div className="text-base font-bold text-primary mt-0.5">R$ {p.cartao}</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-3">
                    *Pix/Boleto e Cartão à vista (12x sem juros) não pagam matrícula.
                  </p>

                  <Button
                    asChild
                    className="w-full mt-5 text-white hover:opacity-90"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <a
                      href={waLink(`Olá! Quero saber mais sobre o Técnico Regular — ${p.titulo}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-4" /> Quero esse plano
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {planoTab === "competencia" && (
          <>
            <div className="max-w-3xl mx-auto mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                Combine <strong>até 4 certificações</strong> e pague em <strong>12x no cartão</strong>. Quanto mais cursos,
                melhor o custo por certificação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {pacotesCompetencia.map((p) => (
                <div
                  key={p.qtd}
                  className="relative p-6 rounded-2xl bg-card border shadow-card-soft flex flex-col"
                  style={{ borderColor: p.destaque ? ORANGE : `${ORANGE}33`, borderWidth: p.destaque ? 2 : 1 }}
                >
                  {p.destaque && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full text-white flex items-center gap-1"
                      style={{ backgroundColor: ORANGE }}
                    >
                      <Star className="size-3" /> Mais popular
                    </span>
                  )}

                  <div className="text-center">
                    <div className="text-5xl font-extrabold" style={{ color: ORANGE }}>
                      {p.qtd}
                    </div>
                    <div className="text-sm font-semibold text-primary mt-1">
                      {p.qtd === 1 ? "Curso" : "Cursos"}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl p-4 text-center" style={{ backgroundColor: `${ORANGE}10` }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
                      Valor parcelado em 12x
                    </div>
                    <div className="text-3xl font-extrabold text-primary mt-1">R$ {p.parcela}</div>
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-[11px] text-muted-foreground">Valor Total</div>
                    <div className="text-lg font-bold text-primary">R$ {p.total}</div>
                  </div>

                  <div
                    className="mt-4 text-center text-[11px] font-semibold px-2 py-1 rounded-full mx-auto"
                    style={{ backgroundColor: `${ORANGE}18`, color: ORANGE_DARK }}
                  >
                    100% Reconhecido MEC
                  </div>

                  <Button
                    asChild
                    className="w-full mt-5 text-white hover:opacity-90"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <a
                      href={waLink(
                        `Olá! Quero o pacote de ${p.qtd} ${p.qtd === 1 ? "curso" : "cursos"} por competência (12x R$ ${p.parcela}).`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-4" /> Quero esse pacote
                    </a>
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                { icon: BadgeCheck, t: "Certificado MEC", d: "100% reconhecido pelo Ministério da Educação." },
                { icon: Wallet, t: "Sem matrícula", d: "Pagamentos no cartão em 12x sem taxas adicionais." },
                { icon: Clock, t: "Emissão em até 48h", d: "Após a validação da documentação enviada." },
              ].map((b) => (
                <div key={b.t} className="p-4 rounded-xl bg-card border text-sm" style={{ borderColor: `${ORANGE}22` }}>
                  <b.icon className="size-5 mb-2" style={{ color: ORANGE }} />
                  <div className="font-semibold text-primary">{b.t}</div>
                  <div className="text-muted-foreground">{b.d}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* FAQ */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
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
          className="rounded-2xl p-8 md:p-12 text-white text-center shadow-elegant"
          style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)` }}
        >
          <Sparkles className="size-10 mx-auto mb-3 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto para conquistar seu certificado técnico?
          </h2>
          <p className="mt-3 max-w-2xl mx-auto opacity-95">
            Tire suas dúvidas em minutos e receba um roteiro personalizado para concluir sua certificação.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-[color:var(--tw-orange,#D9531A)] hover:bg-white/90"
              style={{ color: ORANGE_DARK }}
            >
              <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> Falar agora no WhatsApp
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white bg-transparent hover:bg-white/10"
            >
              <a href="tel:+5518996841902">Ligar: (18) 99684-1902</a>
            </Button>
          </div>
          <p className="text-xs mt-6 opacity-80">
            Atendimento rápido • Resposta no mesmo dia • Certificação em até 48h
          </p>
        </div>
      </section>
    </>
  );
};

export default CursoPorCompetencia;