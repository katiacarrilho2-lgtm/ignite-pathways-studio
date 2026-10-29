import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { sb, getOrigem } from "@/lib/store";
import { Compass, MessageCircle, Sparkles, Ticket, Wrench, Briefcase, HeartPulse, Award, CheckCircle2 } from "lucide-react";

const WHATSAPP = "5518996841902";
export const CAMPANHA = { avista: "R$ 549,90", entrada: "R$ 200,00", parcelas: "4x de R$ 149,90" };

type Area = "tecnico" | "gestao" | "saude" | "competencia";
const AREAS: Record<Area, { titulo: string; perfil: string; desc: string; icon: any; cursos: { nome: string; link: string }[] }> = {
  tecnico: {
    titulo: "Técnico & Operacional", perfil: "Perfil Mão na Massa",
    desc: "Você gosta de resolver problemas práticos, entender como as coisas funcionam e ver o resultado do seu trabalho. Áreas técnicas pagam bem e faltam profissionais.",
    icon: Wrench,
    cursos: [
      { nome: "Técnico em Eletrotécnica", link: "/curso-regular" },
      { nome: "Técnico em Refrigeração e Climatização", link: "/curso-regular" },
      { nome: "Técnico em Segurança do Trabalho", link: "/curso-regular" },
      { nome: "Instalação de Ar-Condicionado Split (profissionalizante)", link: "/cursos" },
    ],
  },
  gestao: {
    titulo: "Gestão & Negócios", perfil: "Perfil Organizador e Líder",
    desc: "Você é organizado, se comunica bem e gosta de planejar. Empresas de todos os tamanhos precisam de gente assim no escritório, no comercial e na logística.",
    icon: Briefcase,
    cursos: [
      { nome: "Técnico em Administração", link: "/curso-regular" },
      { nome: "Técnico em Logística", link: "/curso-regular" },
      { nome: "Técnico em Recursos Humanos", link: "/curso-regular" },
      { nome: "Técnico em Marketing", link: "/curso-regular" },
    ],
  },
  saude: {
    titulo: "Cuidado & Saúde", perfil: "Perfil Cuidador",
    desc: "Você tem empatia, paciência e gosta de ajudar pessoas. A área da saúde e do cuidado cresce todo ano e oferece emprego em todo o Brasil.",
    icon: HeartPulse,
    cursos: [
      { nome: "Técnico em Cuidador de Idosos", link: "/curso-regular" },
      { nome: "Técnico em Enfermagem", link: "/curso-regular" },
      { nome: "Técnico em Análises Clínicas", link: "/curso-regular" },
      { nome: "Técnico em Nutrição e Dietética", link: "/curso-regular" },
    ],
  },
  competencia: {
    titulo: "Técnico por Competência", perfil: "Perfil Experiente",
    desc: "Você já tem prática na sua profissão. Pela Lei 9.394/96 (art. 41), sua experiência pode ser reconhecida e virar diploma técnico, com avaliação e documentação.",
    icon: Award,
    cursos: [
      { nome: "Técnico por Competência — sua área de atuação", link: "/curso-por-competencia" },
      { nome: "Técnico Regular EAD (se preferir a grade completa)", link: "/curso-regular" },
    ],
  },
};

type Q = { q: string; ops: { t: string; a: Area }[] };
const QUESTOES: Q[] = [
  { q: "No seu tempo livre, o que você mais gosta de fazer?", ops: [
    { t: "Consertar ou montar coisas", a: "tecnico" }, { t: "Organizar planos e finanças", a: "gestao" },
    { t: "Ajudar amigos e família", a: "saude" }, { t: "Fazer bicos na minha profissão", a: "competencia" } ] },
  { q: "Qual ambiente de trabalho combina mais com você?", ops: [
    { t: "Obra, oficina ou campo", a: "tecnico" }, { t: "Escritório ou loja", a: "gestao" },
    { t: "Hospital, clínica ou casa de repouso", a: "saude" }, { t: "Onde eu já trabalho hoje", a: "competencia" } ] },
  { q: "Há quanto tempo você trabalha em alguma profissão?", ops: [
    { t: "Ainda não trabalho", a: "gestao" }, { t: "Menos de 1 ano", a: "tecnico" },
    { t: "De 1 a 2 anos", a: "saude" }, { t: "Mais de 2 anos", a: "competencia" } ] },
  { q: "O que mais te deixa satisfeito no fim do dia?", ops: [
    { t: "Ver algo funcionando que eu consertei", a: "tecnico" }, { t: "Bater uma meta", a: "gestao" },
    { t: "Saber que cuidei bem de alguém", a: "saude" }, { t: "Ser reconhecido pelo que já sei", a: "competencia" } ] },
  { q: "Qual matéria você mais gostava na escola?", ops: [
    { t: "Matemática ou Física", a: "tecnico" }, { t: "Português ou História", a: "gestao" },
    { t: "Biologia ou Química", a: "saude" }, { t: "Aprendi mais trabalhando", a: "competencia" } ] },
  { q: "Um amigo tem um problema. Você normalmente…", ops: [
    { t: "Pega a ferramenta e resolve", a: "tecnico" }, { t: "Ajuda a organizar e decidir", a: "gestao" },
    { t: "Escuta e dá apoio", a: "saude" }, { t: "Ensina como eu faço no trabalho", a: "competencia" } ] },
  { q: "Qual é seu maior objetivo agora?", ops: [
    { t: "Aprender uma profissão do zero", a: "tecnico" }, { t: "Primeiro emprego / jovem aprendiz", a: "gestao" },
    { t: "Trabalhar ajudando pessoas", a: "saude" }, { t: "Ter o diploma do que já faço", a: "competencia" } ] },
  { q: "Como você prefere aprender?", ops: [
    { t: "Praticando", a: "tecnico" }, { t: "Lendo e planejando", a: "gestao" },
    { t: "Observando e cuidando", a: "saude" }, { t: "Já aprendi na prática", a: "competencia" } ] },
  { q: "Você se vê daqui a 5 anos…", ops: [
    { t: "Com minha própria empresa de serviços técnicos", a: "tecnico" }, { t: "Gerente ou supervisor", a: "gestao" },
    { t: "Trabalhando na área da saúde", a: "saude" }, { t: "Registrado no conselho e ganhando mais", a: "competencia" } ] },
  { q: "Qual dessas frases é mais a sua cara?", ops: [
    { t: "Gosto de entender como tudo funciona", a: "tecnico" }, { t: "Gosto de tudo no lugar certo", a: "gestao" },
    { t: "Gosto de cuidar das pessoas", a: "saude" }, { t: "Sei fazer, só falta o papel", a: "competencia" } ] },
  { q: "Trabalhar com eletricidade, ferramentas ou máquinas te parece…", ops: [
    { t: "Muito interessante", a: "tecnico" }, { t: "Prefiro computador e papel", a: "gestao" },
    { t: "Prefiro lidar com gente", a: "saude" }, { t: "Já faço isso no dia a dia", a: "competencia" } ] },
  { q: "O que mais pesa na sua escolha de curso?", ops: [
    { t: "Ter muita vaga de emprego", a: "tecnico" }, { t: "Crescer dentro de empresas", a: "gestao" },
    { t: "Fazer a diferença na vida de alguém", a: "saude" }, { t: "Rapidez para ter o diploma", a: "competencia" } ] },
];

const ESCOLARIDADE = ["Fundamental incompleto", "Fundamental completo", "Médio cursando", "Médio completo", "Superior"];

const leadSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(100),
  whatsapp: z.string().refine((v) => { const d = v.replace(/\D/g, ""); return d.length >= 10 && d.length <= 13; }, "WhatsApp inválido"),
  cidade_uf: z.string().trim().min(2, "Informe cidade/UF").max(80),
  escolaridade: z.string().min(1, "Escolha sua escolaridade"),
});

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const calcularResultado = (respostas: Area[]): Area => {
  const c: Record<Area, number> = { tecnico: 0, gestao: 0, saude: 0, competencia: 0 };
  respostas.forEach((a) => c[a]++);
  return (Object.keys(c) as Area[]).reduce((m, k) => (c[k] > c[m] ? k : m), "tecnico" as Area);
};

export default function TesteVocacional() {
  const [etapa, setEtapa] = useState<"dados" | "quiz" | "resultado">("dados");
  const [f, setF] = useState({ nome: "", whatsapp: "", cidade_uf: "", escolaridade: "" });
  const [resp, setResp] = useState<Area[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Teste Vocacional Grátis | Multplick"; }, []);

  const resultado = useMemo(() => (etapa === "resultado" ? calcularResultado(resp) : null), [etapa, resp]);
  const area = resultado ? AREAS[resultado] : null;

  const iniciar = () => {
    const r = leadSchema.safeParse(f);
    if (!r.success) return toast.error(r.error.issues[0].message);
    setEtapa("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const responder = async (a: Area) => {
    const novo = [...resp, a];
    setResp(novo);
    if (novo.length < QUESTOES.length) return;
    const res = calcularResultado(novo);
    setEtapa("resultado");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setBusy(true);
    const o = getOrigem();
    await sb.rpc("store_registrar_interesse", {
      _tipo: "consulta",
      _dados: { ...f, whatsapp: f.whatsapp.replace(/\D/g, ""), curso: `Teste vocacional: ${AREAS[res].titulo}`,
        profissao: AREAS[res].perfil, polo: o.polo, consultor: o.consultor, campanha: o.campanha || "teste-vocacional" },
    }).then(({ error }: any) => error && console.warn("lead não salvo", error.message));
    setBusy(false);
  };

  const waMsg = area
    ? `Olá! Vim pelo site da Multplick e fiz o Teste Vocacional. Meu nome é ${f.nome.trim()}, de ${f.cidade_uf.trim()}. Meu resultado foi "${area.titulo}" (${area.perfil}). Quero pegar o cupom da campanha: ${CAMPANHA.avista} à vista ou ${CAMPANHA.entrada} de entrada + ${CAMPANHA.parcelas} no boleto.`
    : "";
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      <section className="container max-w-2xl py-10 md:py-16">
        <div className="text-center mb-8 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary"><Compass className="size-4" />Grátis · 3 minutos</span>
          <h1 className="text-3xl md:text-4xl font-bold">Teste Vocacional Multplick</h1>
          <p className="text-muted-foreground">Descubra a profissão que combina com você e ganhe um cupom de desconto no seu curso.</p>
        </div>

        {etapa === "dados" && (
          <div className="rounded-2xl border bg-card p-6 shadow-elegant space-y-4">
            <p className="font-semibold">Primeiro, conte um pouco sobre você:</p>
            <div className="space-y-1"><Label>Nome completo *</Label><Input className="h-12" maxLength={100} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="space-y-1"><Label>WhatsApp *</Label><Input className="h-12" inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
            <div className="space-y-1"><Label>Cidade / UF *</Label><Input className="h-12" maxLength={80} value={f.cidade_uf} onChange={(e) => setF({ ...f, cidade_uf: e.target.value })} placeholder="Ex.: Presidente Prudente/SP" /></div>
            <div className="space-y-2"><Label>Escolaridade *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ESCOLARIDADE.map((e) => (
                  <Button key={e} type="button" variant={f.escolaridade === e ? "default" : "outline"} className="h-11 justify-start" onClick={() => setF({ ...f, escolaridade: e })}>{e}</Button>
                ))}
              </div>
            </div>
            <Button className="w-full h-14 text-base" onClick={iniciar}><Sparkles className="size-5" />Começar o teste</Button>
            <p className="text-xs text-muted-foreground text-center">Seus dados são usados apenas para enviar seu resultado e sua oferta.</p>
          </div>
        )}

        {etapa === "quiz" && (
          <div className="rounded-2xl border bg-card p-6 shadow-elegant space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Pergunta {resp.length + 1} de {QUESTOES.length}</span><span>{Math.round((resp.length / QUESTOES.length) * 100)}%</span></div>
              <Progress value={(resp.length / QUESTOES.length) * 100} />
            </div>
            <h2 className="text-xl font-bold">{QUESTOES[resp.length].q}</h2>
            <div className="grid gap-3">
              {QUESTOES[resp.length].ops.map((o) => (
                <Button key={o.t} variant="outline" className="h-auto min-h-14 whitespace-normal text-left justify-start text-base py-3 hover:border-primary" onClick={() => responder(o.a)}>{o.t}</Button>
              ))}
            </div>
            {resp.length > 0 && <Button variant="ghost" size="sm" onClick={() => setResp(resp.slice(0, -1))}>← Voltar</Button>}
          </div>
        )}

        {etapa === "resultado" && area && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-elegant text-center space-y-3">
              <area.icon className="size-14 mx-auto text-primary" />
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">{f.nome.split(" ")[0]}, seu resultado é</p>
              <h2 className="text-2xl md:text-3xl font-bold">{area.titulo}</h2>
              <p className="font-semibold">{area.perfil}</p>
              <p className="text-muted-foreground">{area.desc}</p>
            </div>

            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <h3 className="font-bold text-lg">Cursos indicados para você</h3>
              {area.cursos.map((c) => (
                <a key={c.nome} href={c.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary transition-colors">
                  <CheckCircle2 className="size-5 text-primary shrink-0" /><span className="flex-1">{c.nome}</span><span className="text-sm text-primary font-semibold">Ver curso →</span>
                </a>
              ))}
            </div>

            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1 text-sm font-bold text-primary-foreground"><Ticket className="size-4" />Cupom exclusivo do teste</span>
              <p className="text-muted-foreground">Cursos técnicos regulares com condição especial:</p>
              <p className="text-4xl font-extrabold text-primary">{CAMPANHA.avista}<span className="text-base font-medium text-muted-foreground"> à vista</span></p>
              <p className="font-semibold">ou {CAMPANHA.entrada} de entrada + {CAMPANHA.parcelas} no boleto</p>
              <Button asChild variant="whatsapp" className="w-full h-auto min-h-14 py-3 text-base whitespace-normal">
                <a href={waUrl} target="_blank" rel="noreferrer"><MessageCircle className="size-5" />Clique aqui para pegar o cupom dessa campanha</a>
              </Button>
              {busy && <p className="text-xs text-muted-foreground">Salvando seu resultado…</p>}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => { setResp([]); setEtapa("quiz"); }}>Refazer o teste</Button>
          </div>
        )}
      </section>
    </div>
  );
}
