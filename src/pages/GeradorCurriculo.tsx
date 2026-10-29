import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sb, getOrigem } from "@/lib/store";
import { FileText, Download, Plus, Trash2, MessageCircle, GraduationCap, Sparkles } from "lucide-react";

const WHATSAPP = "5518996841902";

type Exp = { cargo: string; empresa: string; periodo: string; atividades: string };
type Form = { nome: string; whatsapp: string; email: string; cidade_uf: string; cargo: string; objetivo: string; formacao: string; cursos: string; habilidades: string; idiomas: string };

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(100),
  whatsapp: z.string().refine((v) => v.replace(/\D/g, "").length >= 10, "WhatsApp inválido"),
  email: z.string().trim().email("E-mail inválido").max(255),
  cidade_uf: z.string().trim().min(2, "Informe cidade/UF").max(80),
  cargo: z.string().trim().min(2, "Informe o cargo desejado").max(100),
});

function gerarPdf(f: Form, exps: Exp[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18;
  let y = 0;
  doc.setFillColor(15, 32, 68);
  doc.rect(0, 0, W, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(f.nome.trim(), M, 18);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.setTextColor(212, 175, 55);
  doc.text(f.cargo.trim(), M, 26);
  doc.setTextColor(230, 230, 230); doc.setFontSize(9.5);
  doc.text(`${f.whatsapp}  •  ${f.email.trim()}  •  ${f.cidade_uf.trim()}`, M, 34);
  y = 54;

  const section = (titulo: string) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setTextColor(15, 32, 68); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(titulo.toUpperCase(), M, y);
    doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.6); doc.line(M, y + 1.8, W - M, y + 1.8);
    y += 8;
  };
  const para = (t: string, bold = false, size = 10) => {
    doc.setTextColor(40, 40, 40); doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    const lines = doc.splitTextToSize(t, W - 2 * M);
    for (const l of lines) { if (y > 282) { doc.addPage(); y = 20; } doc.text(l, M, y); y += size * 0.5; }
    y += 1.5;
  };
  const list = (t: string) => t.split(/\n|;/).map((s) => s.trim()).filter(Boolean).forEach((s) => para(`•  ${s}`));

  if (f.objetivo.trim()) { section("Objetivo profissional"); para(f.objetivo.trim()); y += 3; }
  const ex = exps.filter((e) => e.cargo.trim() || e.empresa.trim());
  if (ex.length) {
    section("Experiência profissional");
    ex.forEach((e) => {
      para(`${e.cargo.trim()}${e.empresa.trim() ? " — " + e.empresa.trim() : ""}`, true, 10.5);
      if (e.periodo.trim()) { doc.setTextColor(110, 110, 110); doc.setFontSize(9); doc.text(e.periodo.trim(), M, y - 1); y += 4; }
      if (e.atividades.trim()) para(e.atividades.trim());
      y += 2;
    });
  }
  if (f.formacao.trim()) { section("Formação"); list(f.formacao); y += 3; }
  if (f.cursos.trim()) { section("Cursos e qualificações"); list(f.cursos); y += 3; }
  if (f.habilidades.trim()) { section("Habilidades"); list(f.habilidades); y += 3; }
  if (f.idiomas.trim()) { section("Idiomas"); list(f.idiomas); }

  doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
  doc.text("Currículo gerado gratuitamente em multplick.live", W / 2, 292, { align: "center" });
  doc.save(`Curriculo-${f.nome.trim().split(" ")[0]}.pdf`);
}

export default function GeradorCurriculo() {
  const [f, setF] = useState<Form>({ nome: "", whatsapp: "", email: "", cidade_uf: "", cargo: "", objetivo: "", formacao: "", cursos: "", habilidades: "", idiomas: "" });
  const [exps, setExps] = useState<Exp[]>([{ cargo: "", empresa: "", periodo: "", atividades: "" }]);
  const [pronto, setPronto] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const setExp = (i: number, k: keyof Exp, v: string) => setExps(exps.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const gerar = async () => {
    const r = schema.safeParse(f);
    if (!r.success) { toast.error(r.error.issues[0].message); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    const o = getOrigem();
    await sb.rpc("store_registrar_interesse", {
      _tipo: "consulta",
      _dados: { nome: f.nome.trim(), whatsapp: f.whatsapp.replace(/\D/g, ""), email: f.email.trim(), cidade_uf: f.cidade_uf.trim(),
        curso: `Gerador de currículo: ${f.cargo.trim()}`, profissao: f.cargo.trim(), polo: o.polo, consultor: o.consultor, campanha: o.campanha || "gerador-curriculo", origem: "gerador-curriculo" },
    }).then(({ error }: any) => error && console.warn("lead não salvo", error.message));
    try { gerarPdf(f, exps); toast.success("Currículo baixado!"); setPronto(true); }
    catch { toast.error("Não foi possível gerar o PDF. Tente novamente."); }
    setBusy(false);
  };

  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    `Olá! Vim pelo site da Multplick, fiz meu currículo no Gerador de Currículo. Meu nome é ${f.nome.trim()}, de ${f.cidade_uf.trim()}, e busco vaga de ${f.cargo.trim()}. Quero conhecer cursos para melhorar meu currículo.`
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      <section className="container max-w-2xl py-10 md:py-16">
        <div className="text-center mb-8 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary"><FileText className="size-4" />Grátis · PDF na hora</span>
          <h1 className="text-3xl md:text-4xl font-bold">Gerador de Currículo Multplick</h1>
          <p className="text-muted-foreground">Preencha seus dados e baixe um currículo profissional em PDF, pronto para enviar.</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-elegant space-y-6">
          <div className="space-y-3">
            <p className="font-semibold">Dados pessoais</p>
            <div className="space-y-1"><Label>Nome completo *</Label><Input className="h-12" maxLength={100} value={f.nome} onChange={set("nome")} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>WhatsApp *</Label><Input className="h-12" inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
              <div className="space-y-1"><Label>E-mail *</Label><Input className="h-12" type="email" maxLength={255} value={f.email} onChange={set("email")} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cidade / UF *</Label><Input className="h-12" maxLength={80} value={f.cidade_uf} onChange={set("cidade_uf")} placeholder="Presidente Prudente/SP" /></div>
              <div className="space-y-1"><Label>Cargo desejado *</Label><Input className="h-12" maxLength={100} value={f.cargo} onChange={set("cargo")} placeholder="Ex.: Auxiliar administrativo" /></div>
            </div>
            <div className="space-y-1"><Label>Objetivo profissional</Label><Textarea maxLength={600} value={f.objetivo} onChange={set("objetivo")} placeholder="Em poucas linhas, o que você busca." /></div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Experiência profissional</p>
            {exps.map((e, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input placeholder="Cargo" maxLength={100} value={e.cargo} onChange={(ev) => setExp(i, "cargo", ev.target.value)} />
                  <Input placeholder="Empresa" maxLength={100} value={e.empresa} onChange={(ev) => setExp(i, "empresa", ev.target.value)} />
                </div>
                <Input placeholder="Período (ex.: 03/2022 – atual)" maxLength={60} value={e.periodo} onChange={(ev) => setExp(i, "periodo", ev.target.value)} />
                <Textarea placeholder="Principais atividades" maxLength={800} value={e.atividades} onChange={(ev) => setExp(i, "atividades", ev.target.value)} />
                {exps.length > 1 && <Button variant="ghost" size="sm" onClick={() => setExps(exps.filter((_, j) => j !== i))}><Trash2 className="size-4" />Remover</Button>}
              </div>
            ))}
            {exps.length < 6 && <Button variant="outline" onClick={() => setExps([...exps, { cargo: "", empresa: "", periodo: "", atividades: "" }])}><Plus className="size-4" />Adicionar experiência</Button>}
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Formação e qualificações <span className="text-xs font-normal text-muted-foreground">(um item por linha)</span></p>
            <div className="space-y-1"><Label>Formação</Label><Textarea maxLength={800} value={f.formacao} onChange={set("formacao")} placeholder="Ensino Médio completo – Escola X (2020)" /></div>
            <div className="space-y-1"><Label>Cursos</Label><Textarea maxLength={800} value={f.cursos} onChange={set("cursos")} placeholder="NR-10 – Multplick (2025)" /></div>
            <div className="space-y-1"><Label>Habilidades</Label><Textarea maxLength={600} value={f.habilidades} onChange={set("habilidades")} placeholder="Pacote Office&#10;Atendimento ao cliente" /></div>
            <div className="space-y-1"><Label>Idiomas</Label><Input maxLength={200} value={f.idiomas} onChange={set("idiomas")} placeholder="Inglês básico" /></div>
          </div>

          <Button className="w-full h-14 text-base" onClick={gerar} disabled={busy}><Download className="size-5" />{busy ? "Gerando…" : "Gerar e baixar meu currículo"}</Button>
          <p className="text-xs text-muted-foreground text-center">Seus dados são usados apenas para gerar o currículo e enviar oportunidades de cursos.</p>
        </div>

        {pronto && (
          <div className="mt-6 rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center space-y-4">
            <GraduationCap className="size-12 mx-auto text-primary" />
            <h2 className="text-xl font-bold">Quer turbinar seu currículo e se destacar nas vagas?</h2>
            <p className="text-muted-foreground">Conheça os cursos profissionalizantes e técnicos da Multplick com certificação.</p>
            <Button asChild variant="whatsapp" className="w-full h-auto min-h-14 py-3 text-base whitespace-normal">
              <a href={waUrl} target="_blank" rel="noreferrer"><MessageCircle className="size-5" />Falar com a Multplick pelo WhatsApp</a>
            </Button>
            <Button asChild variant="outline" className="w-full"><a href="/teste-vocacional"><Sparkles className="size-4" />Fazer o Teste Vocacional grátis</a></Button>
          </div>
        )}
      </section>
    </div>
  );
}
