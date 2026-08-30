import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, Award, MessageCircle, GraduationCap, Sparkles, ScrollText, BadgeCheck, Star, CreditCard, BookOpen, Users, Laptop, Landmark, Newspaper } from "lucide-react";
import laLogoAsset from "@/assets/la-educacao-logo.png.asset.json";

const laLogo = laLogoAsset.url;

const WHATSAPP = "5518996841902";
const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

// Paleta Faculdade LA — azul-marinho + magenta, CTA verde WhatsApp
const NAVY = "#0A2A5E";
const NAVY_DARK = "#071F45";
const MAGENTA = "#D6247C";
const GREEN = "#1FA855";

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

const planosRegular = [
  {
    titulo: "Técnico Regular 12 Meses",
    subtitulo: "Perfeito para quem busca conciliar estudos com uma mensalidade suave.",
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

const conselhos = [
  { sigla: "COREN", nome: "Conselho Regional de Enfermagem" },
  { sigla: "CFT", nome: "Conselho Federal dos Técnicos Industriais" },
  { sigla: "CREA", nome: "Conselho Regional de Engenharia e Agronomia" },
  { sigla: "CRA", nome: "Conselho Regional de Administração" },
  { sigla: "CRQ", nome: "Conselho Regional de Química" },
  { sigla: "COFECI", nome: "Conselho Federal de Corretores de Imóveis" },
];

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

const faqs = [
  {
    q: "O diploma tem validade nacional?",
    a: "Sim. Os cursos são cadastrados no SISTEC-MEC e reconhecidos/autorizados pelo Conselho Estadual de Educação do Pará (CEE/PA), garantindo validade plena em todo o território nacional.",
  },
  {
    q: "O curso é totalmente online ou há encontros presenciais?",
    a: "O Técnico Regular é 100% EAD. As aulas são gravadas, o material é digital e as avaliações modulares são realizadas online, de qualquer lugar.",
  },
  {
    q: "Quais são os pré-requisitos para fazer o curso técnico?",
    a: "É necessário estar cursando o ensino médio (modalidade concomitante) ou já tê-lo concluído (modalidade subsequente). Não é preciso experiência prévia na área.",
  },
  {
    q: "Em quanto tempo consigo concluir o curso?",
    a: "A duração varia conforme o plano escolhido: Técnico Regular em 12 meses ou Tecnólogo em 24 meses.",
  },
  {
    q: "Há algum custo extra para emissão do diploma ou certificado?",
    a: "Não. Não há taxa de matrícula surpresa nem custo adicional para a emissão do certificado físico e digital.",
  },
  {
    q: "Posso tirar o registro no conselho profissional (COREN, CFT, CREA)?",
    a: "Sim. O diploma tem validade jurídica para registro profissional nos conselhos de classe, como COREN, CFT, CREA, CRA, CRQ e COFECI, respeitadas as regras de cada conselho.",
  },
  {
    q: "Como funcionam as avaliações?",
    a: "As avaliações são modulares e agendadas online, realizadas no portal do aluno após o estudo do material de cada módulo.",
  },
  {
    q: "Terei suporte durante todo o curso?",
    a: "Sim. Você conta com tutores dedicados, suporte pedagógico no portal e atendimento da nossa equipe via WhatsApp durante toda a jornada.",
  },
];

const CursoRegular = () => {
  const waMsg = "Olá! Tenho interesse no Técnico Regular. Pode me ajudar?";

  return (
    <>
      {/* Hero institucional — azul-marinho Faculdade LA */}
      <section
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${NAVY_DARK} 0%, ${NAVY} 60%, #123B7A 100%)` }}
      >
        <div className="container py-20 md:py-28 text-center">
          <span
            className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
            style={{ backgroundColor: `${MAGENTA}22`, color: "#F8BBD9" }}
          >
            Ensino Técnico Regular
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl font-bold text-balance animate-fade-up">
            Técnico Regular & Tecnólogo
          </h1>
          <p className="mt-5 text-lg text-white/85 max-w-2xl mx-auto">
            Cursos técnicos completos, do zero ao diploma — válidos em todo o Brasil e cadastrados no
            SISTEC-MEC.
          </p>
        </div>
      </section>
      />

      {/* Faixa institucional da certificadora */}
      <section className="container -mt-6 mb-12">
        <div
          className="rounded-2xl border shadow-elegant p-6 md:p-8 flex flex-col md:flex-row items-center gap-6"
          style={{ backgroundColor: "#EEF2F9", borderColor: `${NAVY}33` }}
        >
          <div
            className="shrink-0 rounded-2xl px-6 py-5 text-center text-white shadow-elegant"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
          >
            <GraduationCap className="size-8 mx-auto mb-1 opacity-90" />
            <div className="text-lg font-extrabold leading-tight">Colégio Técnico</div>
            <div className="text-2xl font-extrabold tracking-wide leading-tight">UNIVERSAL</div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: NAVY_DARK }}>
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
            style={{ backgroundColor: NAVY }}
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
            { icon: BookOpen, title: "Do zero ao diploma", text: "Formação estruturada, sem exigir experiência prévia." },
            { icon: ShieldCheck, title: "Reconhecimento CEE/PA", text: "Cadastro no SISTEC-MEC e validade nacional." },
            { icon: Laptop, title: "Ensino 100% EAD", text: "Plataforma digital moderna, estude de qualquer lugar." },
            { icon: Users, title: "Professores especializados", text: "Especialistas, mestres e doutores com vivência de mercado." },
          ].map((c) => (
            <div
              key={c.title}
              className="p-5 rounded-xl bg-card border shadow-card-soft"
              style={{ borderColor: `${NAVY}33` }}
            >
              <div
                className="size-11 rounded-lg grid place-items-center mb-3 text-white"
                style={{ backgroundColor: NAVY }}
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
          <Badge className="mb-3" style={{ backgroundColor: `${NAVY}22`, color: NAVY_DARK }}>
            Passo a passo
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Como funciona o Técnico Regular</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Uma jornada organizada com início, meio e fim — do primeiro módulo ao diploma técnico.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { n: "1", t: "Escolha o curso", d: "Selecione a área técnica desejada e o plano de duração." },
            { n: "2", t: "Matrícula rápida", d: "Envie seus documentos e formalize a matrícula sem taxas." },
            { n: "3", t: "Estude no portal EAD", d: "Aulas gravadas, material digital e avaliações modulares online." },
            { n: "4", t: "Receba o diploma", d: "Conclusão em 12 meses (Técnico Regular) ou 24 meses (Tecnólogo), com registro no SISTEC-MEC." },
          ].map((s) => (
            <div key={s.n} className="p-6 rounded-xl bg-card border shadow-card-soft relative overflow-hidden">
              <div
                className="absolute -top-6 -right-6 size-20 rounded-full opacity-10"
                style={{ backgroundColor: NAVY }}
              />
              <div
                className="size-10 rounded-full grid place-items-center font-bold text-white mb-3"
                style={{ backgroundColor: NAVY }}
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
          <Badge className="mb-3" style={{ backgroundColor: `${NAVY}22`, color: NAVY_DARK }}>
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
              style={{ borderColor: `${NAVY}22` }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-5" style={{ color: NAVY }} />
                  <h3 className="font-bold text-primary">{a.title}</h3>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${NAVY}18`, color: NAVY_DARK }}
                >
                  {a.items.length} cursos
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{a.desc}</p>
              <ul className="space-y-2">
                {a.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: NAVY }} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full mt-4"
                style={{ borderColor: NAVY, color: NAVY_DARK }}
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

      {/* Regulamentação */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <Badge className="mb-3" style={{ backgroundColor: `${NAVY}22`, color: NAVY_DARK }}>
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
            <div key={r.title} className="p-6 rounded-xl bg-card border shadow-card-soft" style={{ borderColor: `${NAVY}33` }}>
              <div className="size-11 rounded-lg grid place-items-center mb-3 text-white" style={{ backgroundColor: NAVY }}>
                <r.icon className="size-5" />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: NAVY_DARK }}>
                {r.tag}
              </div>
              <h3 className="font-bold text-primary mt-1">{r.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl bg-card border" style={{ borderColor: `${NAVY}22` }}>
          <div className="flex items-center gap-2 mb-4">
            <BadgeCheck className="size-5" style={{ color: NAVY }} />
            <h3 className="font-bold text-primary">
              Aceito e reconhecido pelos principais órgãos e conselhos reguladores
            </h3>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {conselhos.map((c) => (
              <li key={c.sigla} className="flex items-start gap-2 text-sm">
                <span
                  className="shrink-0 inline-flex items-center justify-center min-w-[64px] px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                  style={{ backgroundColor: NAVY }}
                >
                  {c.sigla}
                </span>
                <span className="text-foreground/80">{c.nome}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Planos e Preços */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <Badge className="mb-3" style={{ backgroundColor: `${NAVY}22`, color: NAVY_DARK }}>
            Investimento transparente
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Planos e Valores Especiais</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            A sua qualificação profissional cabe no seu bolso. Sem taxas surpresas de matrícula ou emissão de diploma.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {planosRegular.map((p) => (
            <div
              key={p.titulo}
              className="relative p-6 rounded-2xl bg-card border shadow-card-soft"
              style={{ borderColor: p.destaque ? NAVY : `${NAVY}33`, borderWidth: p.destaque ? 2 : 1 }}
            >
              {p.destaque && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full text-white flex items-center gap-1 whitespace-nowrap"
                  style={{ backgroundColor: NAVY }}
                >
                  <Star className="size-3" /> Melhor custo-benefício
                </span>
              )}
              <h3 className="text-xl font-bold text-primary">{p.titulo}</h3>
              <p className="text-xs text-muted-foreground">{p.subtitulo}</p>

              <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: `${NAVY}10` }}>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-primary">R$ {p.mensal}</span>
                  <span className="text-sm font-semibold text-muted-foreground">/mês</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {p.beneficios.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: NAVY }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="w-full mt-5 text-white hover:opacity-90"
                style={{ backgroundColor: NAVY }}
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

        <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Award, t: "Diploma registrado no SISTEC", d: "Validade nacional e reconhecimento CEE/PA." },
            { icon: CreditCard, t: "Mensalidade sem surpresas", d: "Sem taxa de matrícula ou custo de material." },
            { icon: Users, t: "Suporte acadêmico", d: "Tutores dedicados do início ao fim do curso." },
          ].map((b) => (
            <div key={b.t} className="p-4 rounded-xl bg-card border text-sm" style={{ borderColor: `${NAVY}22` }}>
              <b.icon className="size-5 mb-2" style={{ color: NAVY }} />
              <div className="font-semibold text-primary">{b.t}</div>
              <div className="text-muted-foreground">{b.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <Badge className="mb-3" style={{ backgroundColor: `${NAVY}22`, color: NAVY_DARK }}>
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

      {/* CTA */}
      <section className="container py-16">
        <div
          className="rounded-2xl p-8 md:p-12 text-white text-center shadow-elegant"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
        >
          <Sparkles className="size-10 mx-auto mb-3 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold">
            Seu futuro profissional começa hoje.
          </h2>
          <p className="mt-3 max-w-2xl mx-auto opacity-95">
            Fale com nossos consultores pedagógicos e garanta condições especiais de matrícula.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white hover:bg-white/90" style={{ color: NAVY_DARK }}>
              <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> Falar agora no WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white/10">
              <a href="tel:+5518996841902">Ligar: (18) 99684-1902</a>
            </Button>
          </div>
          <p className="text-xs mt-6 opacity-80">
            Atendimento rápido • Resposta no mesmo dia • Diploma com validade nacional
          </p>
        </div>
      </section>
    </>
  );
};

export default CursoRegular;
