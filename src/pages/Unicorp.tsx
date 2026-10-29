import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, BadgeCheck, Building2, Search, MessageCircle, ExternalLink, FileCheck2, Clock, Laptop, GraduationCap, MapPin } from "lucide-react";
import { UNICORP_CATALOG } from "@/data/unicorpCatalog";

const WHATSAPP = "5518996841902";
const waLink = (msg: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

// Paleta institucional Unicorp — laranja da marca + grafite, CTA verde WhatsApp
const ORANGE = "#F26B1D";
const INK = "#1E1B18";
const GREEN = "#1FA855";

const SISTEC_URL = "https://sistec.mec.gov.br/consultapublicaunidadeensino";
const EMEC_URL = "https://emec.mec.gov.br/";
const RECEITA_URL = "https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp";

const registro = [
  ["Unidade", "Unicorp Cursos e Consultoria Educacional"],
  ["Código SISTEC", "49045"],
  ["CNPJ", "27.069.309/0001-94"],
  ["Modalidade", "Educação a Distância (EAD)"],
  ["Tipo de oferta", "Subsequente (após o Ensino Médio)"],
  ["Situação", "Unidade ativa · cursos registrados"],
  ["Endereço", "Rua Jobson de Almeida Sá, 16 — João Pessoa/PB, 58056-390"],
];

const faq = [
  { q: "O certificado é reconhecido? Vale no conselho da minha área?", a: "A Unicorp Cursos e Consultoria Educacional é unidade de ensino registrada no SISTEC sob o código 49045 — o sistema oficial do MEC para educação profissional — e tem cadastro no e-MEC. Você mesmo pode consultar os dois. A aceitação para registro profissional segue a regra do conselho de cada categoria, e nossa equipe confirma a do seu curso antes da matrícula." },
  { q: "Como confiro sozinho que a instituição é verdadeira?", a: "Acesse a consulta pública do SISTEC e busque por “Unicorp” ou pelo código 49045: a lista de cursos registrados aparece na hora. Confira também o CNPJ 27.069.309/0001-94 na Receita Federal. Os links estão nesta página." },
  { q: "Quem emite meu diploma: a Multplick ou a Unicorp?", a: "O diploma técnico é emitido pela Unicorp, a instituição certificadora. A Multplick é parceira: faz seu atendimento, matrícula e acompanhamento, e toda matrícula é formalizada em contrato." },
  { q: "Quais documentos são necessários?", a: "Documento de identidade com foto, CPF, comprovante de residência e certificado de conclusão do Ensino Médio (ou declaração de conclusão)." },
  { q: "É EAD ou presencial?", a: "100% EAD. Você estuda pelo computador ou celular, no seu ritmo, com acompanhamento da equipe acadêmica." },
  { q: "Quanto tempo dura e quando começo?", a: "De 8 a 14 meses, com carga horária de 1.000h a 1.440h conforme o curso. O início é imediato após a confirmação da matrícula." },
  { q: "Tem estágio obrigatório?", a: "Sim. Nos cursos técnicos da unidade Unicorp PB o Estágio Supervisionado é obrigatório e aparece na grade curricular." },
  { q: "Posso aproveitar disciplinas que já cursei?", a: "Em alguns casos sim, mediante análise de histórico e ementas. Envie seu histórico para avaliação." },
  { q: "Não achei meu curso na lista. E agora?", a: "Alguns cursos têm nome diferente no catálogo técnico. Fale com a gente no WhatsApp que localizamos o equivalente." },
];

export default function Unicorp() {
  const [q, setQ] = useState("");
  const tecnicos = useMemo(() => {
    const seen = new Set<string>();
    return UNICORP_CATALOG.filter((c) => c.category === "TÉCNICOS" && !seen.has(c.title) && seen.add(c.title))
      .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  return (
    <>
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${INK} 0%, #3A2A1E 60%, ${ORANGE} 140%)` }}>
        <div className="container py-20 md:py-28 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full" style={{ backgroundColor: `${ORANGE}33`, color: "#FFD3B5" }}>
            Faculdade parceira · Unicorp
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl font-bold text-balance">Cursos Técnicos EAD Unicorp</h1>
          <p className="mt-5 text-lg text-white/85 max-w-2xl mx-auto">
            Unidade de ensino registrada no SISTEC/MEC sob o código <b>49045</b>. Diploma técnico emitido pela Unicorp, com registros abertos para você conferir.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="text-white hover:opacity-90" style={{ backgroundColor: GREEN }}>
              <a href={waLink("Olá! Tenho interesse em um curso técnico da Unicorp.")} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> Falar com consultor</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
              <a href="#credenciamento"><ShieldCheck className="size-4" /> Ver credenciamento</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Selos de confiança */}
      <section className="container -mt-8 mb-12 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShieldCheck, t: "SISTEC nº 49045", d: "Registro oficial do MEC" },
          { icon: Building2, t: "CNPJ ativo", d: "27.069.309/0001-94" },
          { icon: Laptop, t: "100% EAD", d: "Computador ou celular" },
          { icon: Clock, t: "8 a 14 meses", d: "1.000h a 1.440h" },
        ].map((s) => (
          <div key={s.t} className="rounded-xl bg-card border shadow-elegant p-5 flex items-center gap-3">
            <div className="size-11 rounded-lg grid place-items-center text-white shrink-0" style={{ backgroundColor: ORANGE }}><s.icon className="size-5" /></div>
            <div><div className="font-bold">{s.t}</div><div className="text-sm text-muted-foreground">{s.d}</div></div>
          </div>
        ))}
      </section>

      {/* Credenciamento */}
      <section id="credenciamento" className="container py-10 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">“Será que esse diploma vale?”</h2>
          <p className="mt-3 text-muted-foreground">É a primeira dúvida de quem procura curso técnico — e com razão. Por isso deixamos os registros oficiais abertos aqui para você conferir, sem precisar falar com ninguém.</p>
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-card p-6 shadow-card-soft">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest" style={{ color: ORANGE }}><FileCheck2 className="size-4" /> Consulta pública · SISTEC / MEC</div>
            <dl className="mt-4 divide-y">
              {registro.map(([k, v]) => (
                <div key={k} className="py-2.5 grid grid-cols-3 gap-3 text-sm">
                  <dt className="text-muted-foreground">{k}</dt><dd className="col-span-2 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: GREEN }}><BadgeCheck className="size-4" /> Unidade registrada no SISTEC</div>
          </div>
          <div className="space-y-4">
            {[
              { n: "1", t: "Confira no SISTEC pelo código 49045", d: "É o registro oficial do MEC para educação profissional — é ele que os conselhos e o RH checam.", url: SISTEC_URL, l: "Abrir consulta SISTEC" },
              { n: "2", t: "Confira a instituição no e-MEC", d: "Cadastro aberto no Ministério da Educação, com nome e número de quem emite seu diploma.", url: EMEC_URL, l: "Abrir e-MEC" },
              { n: "3", t: "Confira o CNPJ na Receita Federal", d: "CNPJ 27.069.309/0001-94 — Unicorp Cursos e Consultoria Educacional.", url: RECEITA_URL, l: "Consultar CNPJ" },
              { n: "4", t: "Tudo formalizado em contrato", d: "Sua matrícula pela Multplick é feita com contrato, e nossa equipe confirma a regra do conselho do seu curso antes de você pagar.", url: waLink("Olá! Quero confirmar o registro do meu curso técnico Unicorp."), l: "Tirar dúvida no WhatsApp" },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border bg-card p-5 flex gap-4">
                <div className="size-9 rounded-full grid place-items-center font-bold text-white shrink-0" style={{ backgroundColor: INK }}>{s.n}</div>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: ORANGE }}>{s.l} <ExternalLink className="size-3.5" /></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section className="container py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2"><GraduationCap className="size-7" style={{ color: ORANGE }} /> Cursos técnicos Unicorp</h2>
            <p className="text-muted-foreground mt-1">{tecnicos.length} cursos · 100% EAD · diploma emitido pela Unicorp</p>
          </div>
          <div className="relative md:w-80">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar curso..." className="pl-9" />
          </div>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicos.map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{c.title}</h3>
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-inst-unicorp">U</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1"><Clock className="size-3.5" /> {c.duration}</div>
              <Button asChild size="sm" className="mt-4 text-white hover:opacity-90" style={{ backgroundColor: GREEN }}>
                <a href={waLink(`Olá! Quero a grade, duração e valores do ${c.title} (Unicorp).`)} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> Ver grade e valores</a>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-12 max-w-3xl">
        <h2 className="text-3xl font-bold text-center">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-6">
          {faq.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t bg-muted/40">
        <div className="container py-8 text-xs text-muted-foreground text-center space-y-1">
          <p className="flex items-center justify-center gap-1"><MapPin className="size-3.5" /> Unicorp Cursos e Consultoria Educacional · Unidade de ensino SISTEC nº 49045 · Rua Jobson de Almeida Sá, 16 — João Pessoa/PB, 58056-390 · CNPJ 27.069.309/0001-94</p>
          <p>Cursos técnicos de nível médio na modalidade a distância. A aceitação do certificado para registro profissional segue a regulamentação de cada conselho de classe. Grades e cargas horárias conforme os planos de curso vigentes, sujeitos a atualização. Atendimento e matrícula: Multplick, parceira da Unicorp.</p>
        </div>
      </footer>
    </>
  );
}
