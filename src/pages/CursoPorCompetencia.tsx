import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ShieldCheck, Award, FileCheck, MessageCircle, GraduationCap, Sparkles, ScrollText, BadgeCheck, Star, CreditCard, Receipt, Wallet, Landmark, Newspaper } from "lucide-react";
import { useState } from "react";
import { CampaignBanner } from "@/components/site/CampaignBanner";
import { campanhaTecnico } from "@/config/campaigns";

const WHATSAPP = "5518996841902";
const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

// Paleta laranja institucional
const ORANGE = "#0D8595";
const ORANGE_DARK = "#0B6A77";

// Catálogo do parceiro — Colégio Técnico Universal
const areas = [
  {
    title: "Área de Saúde",
    desc: "Cursos essenciais voltados ao cuidado humano e gestão da saúde.",
    items: [
      "Técnico em Enfermagem (apenas Competência)",
      "Técnico em Nutrição e Dietética",
      "Técnico em Saúde Bucal",
      "Técnico em Estética",
    ],
  },
  {
    title: "Área de Tecnologia",
    desc: "Aprenda a projetar sistemas, gerenciar redes e programar.",
    items: [
      "Técnico em Desenvolvimento de Sistemas",
      "Técnico em Informática para Internet",
      "Técnico em Redes de Computadores",
    ],
  },
  {
    title: "Área de Administração",
    desc: "Formação em gestão empresarial, logística e processos comerciais.",
    items: [
      "Técnico em Administração",
      "Técnico em Logística",
      "Técnico em Contabilidade",
      "Técnico em Recursos Humanos",
      "Técnico em Transações Imobiliárias",
    ],
  },
  {
    title: "Área de Indústria & Automação",
    desc: "Prepare-se para o setor industrial moderno com foco em tecnologia.",
    items: [
      "Técnico em Eletrotécnica",
      "Técnico em Mecânica",
      "Técnico em Automação Industrial",
      "Técnico em Eletromecânica",
    ],
  },
  {
    title: "Área de Construção Civil",
    desc: "Capacitação técnica para planejamento e acompanhamento de obras.",
    items: ["Técnico em Edificações", "Técnico em Design de Interiores"],
  },
  {
    title: "Área de Serviços & Meio Ambiente",
    desc: "Habilidades voltadas para turismo, secretariado e segurança do trabalho.",
    items: [
      "Técnico em Segurança do Trabalho",
      "Técnico em Guia de Turismo",
      "Técnico em Secretariado",
    ],
  },
];

const faqs = [
  {
    q: "O diploma do Colégio Técnico Universal tem validade nacional?",
    a: "Sim. Os cursos são cadastrados no SISTEC-MEC e reconhecidos/autorizados pelo Conselho Estadual de Educação do Pará (CEE/PA), o que garante validade plena do diploma em todo o território nacional.",
  },
  {
    q: "Como funciona a Certificação por Competência?",
    a: "É um processo fundamentado no Art. 41 da LDB (Lei nº 9.394/96): o profissional que já atua na área comprova sua experiência por documentação e passa por uma avaliação simplificada. Aprovado, recebe o diploma técnico oficial em até 48 horas, sem repetir o que já domina.",
  },
  {
    q: "Posso tirar o registro no conselho profissional (COREN, CFT, CREA) com o diploma?",
    a: "Sim. O diploma tem validade jurídica para registro profissional nos conselhos de classe, como COREN, CFT, CREA, CRA, CRQ e COFECI, respeitadas as regras específicas de cada conselho.",
  },
  {
    q: "Há algum custo extra para emissão do diploma ou certificado?",
    a: "Não. Não há taxa de matrícula surpresa nem custo adicional para emissão do certificado físico e digital — está tudo incluso no valor combinado.",
  },
  {
    q: "O curso é totalmente online ou há encontros presenciais?",
    a: "O ensino é 100% EAD, em plataforma digital moderna. Você assiste às aulas e realiza as avaliações de qualquer lugar, no seu ritmo.",
  },
  {
    q: "Quais são os pré-requisitos para fazer o curso técnico?",
    a: "Para o Técnico Regular, é necessário estar cursando ou ter concluído o ensino médio. Para o Técnico por Competência, é exigida a comprovação de pelo menos 2 anos de atuação na área desejada.",
  },
];

// Conselhos de classe reconhecedores
const conselhos = [
  { sigla: "COREN", nome: "Conselho Regional de Enfermagem" },
  { sigla: "CFT", nome: "Conselho Federal dos Técnicos Industriais" },
  { sigla: "CREA", nome: "Conselho Regional de Engenharia e Agronomia" },
  { sigla: "CRA", nome: "Conselho Regional de Administração" },
  { sigla: "CRQ", nome: "Conselho Regional de Química" },
  { sigla: "COFECI", nome: "Conselho Federal de Corretores de Imóveis" },
];

// Blocos de regulamentação (Colégio Técnico Universal)
const regulamentacao = [
  {
    icon: ScrollText,
    tag: "Parecer Técnico CEE nº 412/2022",
    title: "Resolução do Conselho Estadual",
    text: "Autorização concedida pelo Conselho Estadual de Educação do Pará (CEE/PA), validando os planos de curso e a oferta na modalidade EAD.",
  },
  {
    icon: Newspaper,
    tag: "Publicado em Seção 3 - DOU",
    title: "Diário Oficial da União",
    text: "Credenciamento da escola e autorização dos cursos conforme atos normativos do Conselho Estadual de Educação do Pará (CEE/PA).",
  },
  {
    icon: Landmark,
    tag: "LDB Artigo 41 (Lei 9.394/96)",
    title: "Lei de Diretrizes e Bases",
    text: "Resguarda legalmente que o conhecimento adquirido no trabalho pode ser objeto de aferição e certificação profissional.",
  },
  {
    icon: BadgeCheck,
    tag: "Cadastro Sistec Ativo",
    title: "SISTEC-MEC",
    text: "Todos os diplomas emitidos são cadastrados no Sistema Nacional de Informações da Educação Profissional e Tecnológica (SISTEC).",
  },
];

// Pacotes de certificação por competência (1 a 4 cursos)
const pacotesCompetencia = [
  { qtd: 1, parcela: "124,99", total: "1.499,90", destaque: false },
  { qtd: 2, parcela: "224,99", total: "2.699,90", destaque: false },
  { qtd: 3, parcela: "316,66", total: "3.799,90", destaque: true },
  { qtd: 4, parcela: "383,33", total: "4.599,90", destaque: false },
];

// Planos do Técnico Regular (Colégio Técnico Universal)
const planosRegular = [
  {
    titulo: "Técnico Regular 12 Meses",
    subtitulo: "Conciliar estudos com uma mensalidade suave e acessível.",
    mensal: "99,99",
    destaque: false,
    beneficios: [
      "Acesso integral a todas as disciplinas do portal EAD",
      "Apostilas e materiais digitais inclusos",
      "Sem taxa de matrícula ou material didático",
      "Emissão de certificado físico e digital sem custo",
      "Suporte pedagógico via fórum do aluno",
    ],
  },
  {
    titulo: "Tecnólogo 24 Meses",
    subtitulo: "Formação tecnólogo completa, 100% EAD, com diploma registrado no SISTEC-MEC.",
    mensal: "119,90",
    destaque: true,
    beneficios: [
      "Acesso integral a todas as disciplinas do portal",
      "Todo material didático digital incluso",
      "Acompanhamento por tutores especializados",
      "Diploma de tecnólogo oficial registrado no SISTEC",
      "Simulados extras de concursos públicos inclusos",
      "Plano de estudos customizado mensal",
    ],
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
        description="Valide sua experiência profissional e receba o diploma técnico com validade nacional — sem precisar cursar do zero o que você já domina."
      />

      {/* Faixa institucional da certificadora */}
      <section className="container -mt-6 mb-12">
        <div
          className="rounded-2xl border shadow-elegant p-6 md:p-8 flex flex-col md:flex-row items-center gap-6"
          style={{ backgroundColor: "#EFF7F8", borderColor: `${ORANGE}33` }}
        >
          <div
            className="shrink-0 rounded-2xl px-6 py-5 text-center text-white shadow-elegant"
            style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)` }}
          >
            <GraduationCap className="size-8 mx-auto mb-1 opacity-90" />
            <div className="text-lg font-extrabold leading-tight">Colégio Técnico</div>
            <div className="text-2xl font-extrabold tracking-wide leading-tight">UNIVERSAL</div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: ORANGE_DARK }}>
              Certificadora parceira
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-primary mt-1">
              Colégio Técnico Universal
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cursos técnicos cadastrados no SISTEC-MEC e reconhecidos/autorizados pelo Conselho Estadual de
              Educação do Pará (CEE/PA) — Parecer Técnico CEE nº 412/2022. Diplomas com validade plena em todo
              o território nacional.
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
            { icon: Clock, title: "Diploma em até 48h", text: "Emissão ágil após validação documental." },
            { icon: ShieldCheck, title: "Reconhecimento CEE/PA", text: "Cadastro no SISTEC-MEC e validade nacional." },
            { icon: Award, title: "LDB · Art. 41 (Lei 9.394/96)", text: "Base legal da certificação por competência." },
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
            { n: "3", t: "Avaliação simplificada", d: "Análise documental e teórica conforme o Art. 41 da LDB." },
            { n: "4", t: "Receba seu diploma", d: "Diploma técnico oficial registrado no SISTEC em até 48h." },
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
            Catálogo profissional
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Nossos cursos técnicos</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Formações planejadas para atender às demandas reais das empresas e dos conselhos reguladores.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas.map((a) => (
            <div
              key={a.title}
              className="p-6 rounded-xl bg-card border shadow-card-soft hover:shadow-elegant transition-smooth"
              style={{ borderColor: `${ORANGE}22` }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-5" style={{ color: ORANGE }} />
                  <h3 className="font-bold text-primary">{a.title}</h3>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${ORANGE}18`, color: ORANGE_DARK }}
                >
                  {a.items.length} cursos
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{a.desc}</p>
              <ul className="space-y-2">
                {a.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: ORANGE }} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full mt-4"
                style={{ borderColor: ORANGE, color: ORANGE_DARK }}
              >
                <a
                  href={waLink(`Olá! Gostaria de saber mais sobre os cursos de ${a.title.replace("Área de ", "")}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" /> Solicitar informações
                </a>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Regulamentação e Credenciamento */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
            Garantia legal
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Regulamentação & Validade Nacional</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Nossos cursos operam sob a égide da legislação educacional brasileira, garantindo aceitação
            nacional de ponta a ponta.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {regulamentacao.map((r) => (
            <div key={r.title} className="p-6 rounded-xl bg-card border shadow-card-soft" style={{ borderColor: `${ORANGE}33` }}>
              <div className="size-11 rounded-lg grid place-items-center mb-3 text-white" style={{ backgroundColor: ORANGE }}>
                <r.icon className="size-5" />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
                {r.tag}
              </div>
              <h3 className="font-bold text-primary mt-1">{r.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl bg-card border" style={{ borderColor: `${ORANGE}22` }}>
          <div className="flex items-center gap-2 mb-4">
            <BadgeCheck className="size-5" style={{ color: ORANGE }} />
            <h3 className="font-bold text-primary">
              Aceito e reconhecido pelos principais órgãos e conselhos reguladores
            </h3>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {conselhos.map((c) => (
              <li key={c.sigla} className="flex items-start gap-2 text-sm">
                <span
                  className="shrink-0 inline-flex items-center justify-center min-w-[64px] px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  {c.sigla}
                </span>
                <span className="text-foreground/80">{c.nome}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Banner de campanha promocional (editável em src/config/campaigns.ts) */}
      <CampaignBanner campaign={campanhaTecnico} />

      {/* Investimento — Planos e Preços */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <Badge className="mb-3" style={{ backgroundColor: `${ORANGE}22`, color: ORANGE_DARK }}>
            Investimento transparente
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Planos e Valores Especiais</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Sua qualificação cabe no bolso. Sem taxas surpresas de matrícula ou de emissão de diploma.
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
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {planosRegular.map((p) => (
              <div
                key={p.titulo}
                className="relative p-6 rounded-2xl bg-card border shadow-card-soft"
                style={{ borderColor: p.destaque ? ORANGE : `${ORANGE}33`, borderWidth: p.destaque ? 2 : 1 }}
              >
                {p.destaque && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full text-white flex items-center gap-1 whitespace-nowrap"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <Star className="size-3" /> Melhor custo-benefício
                  </span>
                )}
                <h3 className="text-xl font-bold text-primary">{p.titulo}</h3>
                <p className="text-xs text-muted-foreground">{p.subtitulo}</p>

                <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: `${ORANGE}10` }}>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-primary">R$ {p.mensal}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/mês</span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {p.beneficios.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: ORANGE }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className="w-full mt-5 text-white hover:opacity-90"
                  style={{ backgroundColor: ORANGE }}
                >
                  <a
                    href={waLink(`Olá! Quero me matricular no ${p.titulo}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4" /> Quero esse plano
                  </a>
                </Button>
              </div>
            ))}
          </div>
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
                    Registrado no SISTEC-MEC
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
                { icon: BadgeCheck, t: "Diploma com validade nacional", d: "Cadastrado no SISTEC-MEC, reconhecido pelo CEE/PA." },
                { icon: Wallet, t: "Sem taxas surpresas", d: "Sem custo extra de matrícula ou emissão de diploma." },
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
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Perguntas respondidas</h2>
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
            Seu futuro profissional começa hoje.
          </h2>
          <p className="mt-3 max-w-2xl mx-auto opacity-95">
            Fale com nossos consultores e inicie sua avaliação de competência com condições especiais de matrícula.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white hover:bg-white/90"
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
            Atendimento rápido • Resposta no mesmo dia • Diploma em até 48h
          </p>
        </div>
      </section>
    </>
  );
};

export default CursoPorCompetencia;
