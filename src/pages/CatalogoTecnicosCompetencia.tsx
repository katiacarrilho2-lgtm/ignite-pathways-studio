import { useEffect, useMemo, useState } from "react";
import { Search, Check, MessageCircle, FileText, ClipboardCheck, Award, UserCheck, ShieldCheck } from "lucide-react";
import logo from "@/assets/multplick-logo.png";

const WHATS = "5518996841902";
const MAX = 4;

const AREAS: Record<string, string[]> = {
  "Saúde": ["Agente Comunitário de Saúde", "Análises Clínicas", "Cuidados de Idosos", "Enfermagem (exige documentação específica de experiência)", "Equipamentos Biomédicos", "Estética", "Farmácia", "Gerência em Saúde", "Nutrição e Dietética", "Veterinária"],
  "Administração e Gestão": ["Administração", "Contabilidade", "Logística", "Marketing", "Qualidade", "Recursos Humanos", "Secretaria Escolar", "Segurança do Trabalho", "Serviços Jurídicos", "Transações Imobiliárias", "Vendas", "Eventos"],
  "Tecnologia e Informática": ["Biotecnologia", "Design Gráfico", "Desenvolvimento de Sistemas", "Informática para Internet", "Redes de Computadores", "Sistemas de Energia Renovável", "Telecomunicações", "Tradução e Interpretação de Libras"],
  "Engenharia e Manutenção": ["Automação Industrial", "Eletromecânica", "Eletrotécnica", "Eletrônica", "Manutenção de Máquinas Industriais", "Máquinas Pesadas", "Metalurgia", "Refrigeração e Climatização", "Soldagem", "Manutenção de Máquinas Navais"],
  "Construção e Infraestrutura": ["Agrimensura", "Edificações", "Mineração", "Prevenção e Combate ao Incêndio", "Defesa Civil", "Trânsito"],
  "Meio Ambiente e Agropecuária": ["Agricultura", "Agropecuária", "Agroindústria", "Aquicultura", "Meio Ambiente"],
  "Serviços": ["Gastronomia", "Designer de Interiores", "Guia em Turismo"],
};
const nome = (c: string) => `Técnico em ${c}`;

const PASSOS = [
  { i: UserCheck, t: "Análise da experiência", d: "Você conta sua trajetória e a equipe verifica se o seu perfil é compatível com o curso escolhido." },
  { i: FileText, t: "Documentos", d: "A documentação de comprovação é enviada somente pelo atendimento oficial, nunca por este formulário." },
  { i: ClipboardCheck, t: "Avaliação", d: "Avaliação de competências conforme as exigências da instituição certificadora." },
  { i: Award, t: "Certificação", d: "Após aprovação, a certificação é emitida pela instituição habilitada, depois da verificação das condições e registros aplicáveis." },
];

const FAQ = [
  ["Quem pode fazer?", "Pessoas com experiência prática comprovável na área do curso. Cada caso passa por análise documental antes de qualquer etapa."],
  ["Quais documentos são pedidos?", "Em geral, documentos pessoais, comprovante de escolaridade e comprovação da experiência (ex.: carteira de trabalho, declarações). A lista exata é informada no atendimento e pode variar por curso — Enfermagem, por exemplo, exige documentação específica."],
  ["Como é a prova?", "A avaliação segue as regras da instituição certificadora e verifica os conhecimentos da área. Formato e datas são informados no atendimento."],
  ["Qual o prazo?", "Depende da análise documental, da avaliação e dos trâmites da certificadora. Não prometemos prazo fixo antes da análise do seu caso."],
  ["O que é o SISTEC?", "É o sistema do governo federal onde são registrados os cursos técnicos. Você pode consultar a situação da instituição e, após a emissão, o seu registro, conforme os registros aplicáveis."],
  ["O certificado vale para conselho de classe?", "O registro em conselho depende das regras de cada conselho. Recomendamos confirmar com o conselho da sua profissão; nossa equipe orienta no atendimento."],
];

export default function CatalogoTecnicosCompetencia() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [f, setF] = useState({ nome: "", cidade: "", exp: "", amigo: "" });
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Cursos Técnicos por Competência | Multplick";
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => { document.title = prevTitle; m.remove(); };
  }, []);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return Object.entries(AREAS).map(([a, cs]) => [a, cs.filter((c) => !t || c.toLowerCase().includes(t))] as const).filter(([, cs]) => cs.length);
  }, [q]);

  const toggle = (c: string) => {
    setAviso("");
    setSel((s) => s.includes(c) ? s.filter((x) => x !== c) : s.length >= MAX ? (setAviso(`Você pode escolher até ${MAX} cursos.`), s) : [...s, c]);
  };

  const enviar = () => {
    if (!f.nome.trim() || !f.cidade.trim() || !f.exp.trim() || sel.length === 0) {
      setAviso("Preencha nome, cidade/UF, experiência e escolha pelo menos 1 curso.");
      document.getElementById("form")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const msg = [
      "Olá, Multplick! Vim pelo Catálogo de Técnicos por Competência.",
      `Nome: ${f.nome.trim()}`, `Cidade/UF: ${f.cidade.trim()}`, `Experiência: ${f.exp.trim()}`,
      f.amigo.trim() ? `Vou fazer junto com: ${f.amigo.trim()}` : "",
      "Cursos de interesse:", ...sel.map((c, i) => `${i + 1}. ${nome(c)}`),
      "Gostaria de saber se meu perfil se encaixa.",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const input = "w-full rounded-lg border border-[hsl(215_30%_80%)] bg-background px-3 py-3 text-base text-foreground outline-none focus:border-[hsl(var(--cat-gold))]";

  return (
    <div className="cat-tc min-h-screen bg-[hsl(var(--cat-paper))] text-[hsl(var(--cat-navy))] pb-28">
      <style>{`.cat-tc{--cat-navy:216 60% 16%;--cat-gold:42 70% 52%;--cat-paper:40 30% 98%}`}</style>

      <header className="bg-[hsl(var(--cat-navy))] text-[hsl(var(--cat-paper))]">
        <div className="mx-auto max-w-5xl px-5 pt-6 pb-12">
          <img src={logo} alt="Multplick" className="h-10 w-auto" />
          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-[hsl(var(--cat-gold))]">Certificação por competência</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-5xl leading-tight">Cursos Técnicos por Competência</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg opacity-90">
            Para quem já trabalha na área e tem experiência comprovável. Seu caso passa por análise documental e avaliação conforme as exigências da instituição certificadora.
          </p>
          <a href="#cursos" className="mt-7 inline-flex rounded-full bg-[hsl(var(--cat-gold))] px-6 py-3 font-semibold text-[hsl(var(--cat-navy))]">Ver os 54 cursos</a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-serif text-2xl sm:text-3xl">Como funciona</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map(({ i: I, t, d }, n) => (
            <div key={t} className="rounded-xl border border-[hsl(var(--cat-gold)/0.4)] bg-background p-5">
              <div className="flex items-center gap-2 text-[hsl(var(--cat-gold))]"><I className="h-5 w-5" /><span className="text-sm font-bold">{n + 1}</span></div>
              <h3 className="mt-2 font-semibold">{t}</h3>
              <p className="mt-1 text-sm opacity-80">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="cursos" className="mx-auto max-w-5xl px-5">
        <h2 className="font-serif text-2xl sm:text-3xl">Catálogo de cursos</h2>
        <p className="mt-1 text-sm opacity-80">Escolha até {MAX} cursos — pode ser para você e um amigo. Selecionados: <b>{sel.length}/{MAX}</b></p>
        <div className="sticky top-0 z-10 -mx-5 mt-4 bg-[hsl(var(--cat-paper))] px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 opacity-50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar curso pelo nome" className={input + " pl-10"} />
          </div>
        </div>
        {filtradas.length === 0 && <p className="py-6 opacity-70">Nenhum curso encontrado.</p>}
        {filtradas.map(([area, cs]) => (
          <div key={area} className="mt-6">
            <h3 className="border-b-2 border-[hsl(var(--cat-gold))] pb-1 text-lg font-semibold">{area}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {cs.map((c) => {
                const on = sel.includes(c);
                return (
                  <button key={c} onClick={() => toggle(c)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${on ? "border-[hsl(var(--cat-navy))] bg-[hsl(var(--cat-navy))] text-[hsl(var(--cat-paper))]" : "border-[hsl(215_30%_85%)] bg-background"}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${on ? "border-[hsl(var(--cat-gold))] bg-[hsl(var(--cat-gold))] text-[hsl(var(--cat-navy))]" : "border-[hsl(215_30%_70%)]"}`}>{on && <Check className="h-4 w-4" />}</span>
                    <span className="text-sm font-medium">{nome(c)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section id="form" className="mx-auto mt-12 max-w-5xl px-5">
        <div className="rounded-2xl bg-background p-5 sm:p-8 shadow-sm border border-[hsl(var(--cat-gold)/0.4)]">
          <h2 className="font-serif text-2xl">Fale com a Multplick</h2>
          <p className="mt-1 text-sm opacity-80">Não pedimos CPF, RG nem documentos aqui. Isso é tratado com segurança no atendimento.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Nome*<input className={input + " mt-1"} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={80} /></label>
            <label className="text-sm font-medium">Cidade/UF*<input className={input + " mt-1"} value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} placeholder="Ex.: Presidente Prudente/SP" maxLength={60} /></label>
            <label className="text-sm font-medium sm:col-span-2">Sua experiência na área*<textarea rows={3} className={input + " mt-1"} value={f.exp} onChange={(e) => setF({ ...f, exp: e.target.value })} placeholder="Ex.: 5 anos como auxiliar de refrigeração" maxLength={300} /></label>
            <label className="text-sm font-medium sm:col-span-2">Nome do amigo (opcional)<input className={input + " mt-1"} value={f.amigo} onChange={(e) => setF({ ...f, amigo: e.target.value })} maxLength={80} /></label>
          </div>
          {sel.length > 0 && <ul className="mt-4 text-sm list-disc pl-5">{sel.map((c) => <li key={c}>{nome(c)}</li>)}</ul>}
          {aviso && <p className="mt-3 text-sm font-medium text-destructive">{aviso}</p>}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-5xl px-5">
        <h2 className="font-serif text-2xl sm:text-3xl flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-[hsl(var(--cat-gold))]" />Credenciais</h2>
        <div className="mt-4 rounded-xl bg-background p-5 border border-[hsl(215_30%_85%)] text-sm space-y-2">
          <p>A Multplick faz o atendimento e a orientação. A <b>certificação é emitida pela instituição habilitada</b>, após verificação das condições e registros aplicáveis.</p>
          <p><b>Instituição certificadora:</b> a confirmar no atendimento</p>
          <p><b>Ato de credenciamento:</b> a confirmar</p>
          <p><b>CNPJ da certificadora:</b> a confirmar</p>
          <p className="opacity-80">Você pode consultar a situação de instituições e cursos técnicos no SISTEC (sistec.mec.gov.br) e o CNPJ no site da Receita Federal.</p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-5xl px-5">
        <h2 className="font-serif text-2xl sm:text-3xl">Perguntas frequentes</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map(([p, r]) => (
            <details key={p} className="rounded-lg bg-background border border-[hsl(215_30%_85%)] p-4">
              <summary className="cursor-pointer font-semibold">{p}</summary>
              <p className="mt-2 text-sm opacity-85">{r}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[hsl(var(--cat-gold)/0.5)] bg-[hsl(var(--cat-navy))] p-3">
        <button onClick={enviar} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-[hsl(var(--cat-gold))] px-5 py-3.5 font-bold text-[hsl(var(--cat-navy))]">
          <MessageCircle className="h-5 w-5" /> Falar com a Multplick pelo WhatsApp {sel.length > 0 && `(${sel.length})`}
        </button>
      </div>
    </div>
  );
}
