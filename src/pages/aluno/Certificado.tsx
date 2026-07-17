import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Printer, Lock, Download } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/multplick-logo.png";
import sideArt from "@/assets/certificate-side.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const fmtExt = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}`;
};
const fmtPeriodo = (ini?: string | null, fim?: string | null) => {
  if (!ini || !fim) return `${fmtExt(ini)} a ${fmtExt(fim)}`;
  const a = new Date(ini); const b = new Date(fim);
  if (a.getFullYear() === b.getFullYear()) {
    if (a.getMonth() === b.getMonth())
      return `${a.getDate()} a ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`;
    return `${a.getDate()} de ${MESES[a.getMonth()]} a ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`;
  }
  return `${fmtExt(ini)} a ${fmtExt(fim)}`;
};

const Certificado = () => {
  const { enrollmentId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const frenteRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !enrollmentId) return;
    (async () => {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, enrolled_at, completed_at, progress, course_id, certificate_authorized, courses ( title, duration, passing_score )")
        .eq("id", enrollmentId).eq("user_id", user.id).maybeSingle();
      const { data: profile } = await supabase.from("student_profiles").select("full_name, cpf").eq("user_id", user.id).maybeSingle();
      if (!enr) { toast.error("Matrícula não encontrada"); setLoading(false); return; }
      const { data: company } = await supabase.from("company_settings").select("razao_social, cnpj").eq("singleton", true).maybeSingle();

      const { data: ss } = await supabase.from("course_sections").select("id, title").eq("course_id", (enr as any).course_id);
      const sectionIds = (ss ?? []).map((s: any) => s.id);
      const { data: lessons } = sectionIds.length
        ? await supabase.from("course_lessons").select("id, title, lesson_type, passing_score, section_id, sort_order").in("section_id", sectionIds).order("sort_order", { ascending: true })
        : { data: [] as any[] };
      const lessonIds = (lessons ?? []).map((l: any) => l.id);
      const { data: prog } = lessonIds.length
        ? await supabase.from("lesson_progress").select("lesson_id, completed, completed_at, score").eq("user_id", user.id).in("lesson_id", lessonIds)
        : { data: [] as any[] };

      const total = (lessons ?? []).length;
      const done = (prog ?? []).filter((p: any) => p.completed).length;
      const quizzes = (lessons ?? []).filter((l: any) => l.lesson_type === "quiz");
      const quizScores = quizzes.map((q: any) => (prog ?? []).find((p: any) => p.lesson_id === q.id)?.score ?? 0);
      const finalScore = quizScores.length ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length) : null;
      const minScore = (enr as any).courses?.passing_score ?? 70;
      const allQuizzesPassed = quizzes.every((q: any) => ((prog ?? []).find((p: any) => p.lesson_id === q.id)?.score ?? -1) >= (q.passing_score ?? minScore));

      const cronograma = (ss ?? []).map((s: any) => {
        const sl = (lessons ?? []).filter((l: any) => l.section_id === s.id);
        const datas = sl.map((l: any) => (prog ?? []).find((p: any) => p.lesson_id === l.id)?.completed_at).filter(Boolean).sort();
        return { title: s.title, lessons: sl.length, inicio: datas[0] ?? null, fim: datas.at(-1) ?? null, items: sl.map((l: any) => l.title) };
      });

      setData({
        nome: profile?.full_name ?? user.email,
        cpf: profile?.cpf ?? null,
        curso: (enr as any).courses?.title,
        duracao: (enr as any).courses?.duration,
        inicio: (enr as any).enrolled_at,
        fim: (enr as any).completed_at,
        progresso: (enr as any).progress,
        authorized: (enr as any).certificate_authorized !== false,
        empresa: company?.razao_social ?? "Multplick Educação Profissional e Corporativa",
        cnpj: (company as any)?.cnpj ?? null,
        total, done, finalScore, allQuizzesPassed, minScore, cronograma,
      });
      setLoading(false);
    })();
  }, [user, enrollmentId]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!data) return <div className="p-8">Não encontrado.</div>;

  const concluido = data.progresso >= 100;

  const baixarPDF = async () => {
    if (!frenteRef.current || !versoRef.current) return;
    setDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < 2; i++) {
        const el = i === 0 ? frenteRef.current : versoRef.current;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const img = canvas.toDataURL("image/jpeg", 0.95);
        const ratio = Math.min(pageW / (canvas.width * 0.264583), pageH / (canvas.height * 0.264583));
        const w = canvas.width * 0.264583 * ratio;
        const h = canvas.height * 0.264583 * ratio;
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      }
      const safe = (data.nome || "aluno").replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
      pdf.save(`Certificado_${safe}.pdf`);
      toast.success("Certificado baixado");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + (e?.message ?? ""));
    } finally {
      setDownloading(false);
    }
  };

  if (!data.authorized) return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <Lock className="size-12 mx-auto text-muted-foreground mb-3" />
      <h1 className="text-2xl font-bold text-primary">Certificado bloqueado</h1>
      <p className="text-muted-foreground mt-2">Pedir o certificado na secretaria.</p>
      <Button asChild className="mt-4" variant="outline"><Link to={`/aluno/curso/${enrollmentId}`}><ArrowLeft className="size-4" /> Voltar ao curso</Link></Button>
    </div>
  );

  if (!concluido) return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <Award className="size-12 mx-auto text-muted-foreground mb-3" />
      <h1 className="text-2xl font-bold text-primary">Certificado ainda não liberado</h1>
      <p className="text-muted-foreground mt-2">Conclua 100% das aulas ({data.done}/{data.total}) e tire pelo menos {data.minScore}% em todos os quizzes para gerar o certificado.</p>
      <Button asChild className="mt-4"><Link to={`/aluno/curso/${enrollmentId}`}><ArrowLeft className="size-4" /> Voltar ao curso</Link></Button>
    </div>
  );

  return (
    <div className="bg-secondary/20 min-h-screen">
      <div className="max-w-6xl mx-auto p-6 print:p-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button asChild variant="ghost" size="sm"><Link to={`/aluno/curso/${enrollmentId}`}><ArrowLeft className="size-4" /> Voltar</Link></Button>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="size-4" /> Imprimir</Button>
            <Button onClick={baixarPDF} variant="hero" disabled={downloading}><Download className="size-4" /> {downloading ? "Gerando PDF…" : "Baixar PDF"}</Button>
          </div>
        </div>

        {/* FRENTE — Certificado (modelo Multplick) */}
        <div ref={frenteRef} className="relative bg-white shadow-2xl print:shadow-none overflow-hidden mb-6"
             style={{ width: "100%", aspectRatio: "1.414 / 1" }}>
          {/* Arte lateral azul com hexágonos */}
          <img src={sideArt} alt="" aria-hidden className="absolute inset-y-0 left-0 h-full w-auto pointer-events-none select-none" />
          {/* Marca d'água */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.05]">
            <img src={logo} alt="" className="w-[55%] max-w-[600px] rotate-[-20deg]" />
          </div>

          <div className="relative h-full flex flex-col items-center pr-[4%] pl-[20%] pt-[2.5%] pb-[2%] text-center">
            <img src={logo} alt="Multplick" className="h-16 mb-1" />
            {data.cnpj && <p className="text-[10px] font-semibold tracking-wide text-foreground/80">CNPJ {data.cnpj}</p>}

            <h1 className="mt-2 font-black tracking-wider text-foreground"
                style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif", fontSize: "clamp(40px, 6.5vw, 84px)", lineHeight: 1, textShadow: "3px 3px 0 hsl(var(--primary) / 0.25)" }}>
              CERTIFICADO
            </h1>
            <p className="mt-2 text-base text-foreground/80">Certificamos que</p>

            <div className="mt-3 w-full max-w-[720px] border-b-2 border-foreground/70 pb-1">
              <p className="uppercase tracking-wide text-foreground font-black"
                 style={{ fontFamily: "'Arial Black', sans-serif", fontSize: "clamp(22px, 3vw, 38px)", lineHeight: 1.1 }}>
                {data.nome}
              </p>
            </div>

            <p className="mt-3 text-sm uppercase tracking-wider text-foreground/85">
              Concluiu com êxito o curso de {data.duracao ? <strong>{data.duracao}</strong> : "carga horária definida"}
            </p>
            <p className="mt-2 font-black uppercase tracking-wide" style={{ color: "#B11E1E", fontSize: "clamp(18px, 2.4vw, 32px)", lineHeight: 1.15 }}>
              {data.curso}
            </p>

            <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground">
              Realizado em {fmtPeriodo(data.inicio, data.fim)}
            </p>

            <div className="mt-auto w-full grid grid-cols-2 gap-12 items-end pt-4">
              <div className="text-center">
                <div className="border-t-2 border-foreground/80 pt-1 mx-auto w-full max-w-[220px] text-xs tracking-widest font-bold text-foreground">
                  ALUNO
                </div>
              </div>
              <div className="text-center">
                <div className="h-10 flex items-end justify-center">
                  <span className="text-2xl text-foreground" style={{ fontFamily: "'Brush Script MT','Lucida Handwriting',cursive" }}>
                    Euclides Joaquim
                  </span>
                </div>
                <div className="border-t-2 border-foreground/80 pt-1 mx-auto w-full max-w-[220px] text-xs tracking-widest font-bold text-foreground">
                  COORDENADOR
                </div>
              </div>
            </div>

            <p className="mt-2 text-[9px] font-semibold text-foreground/80 tracking-wide">
              ENSINO LIVRE • AUTORIZAÇÃO E VALIDADE DE CURSOS • CONFORME A LEI Nº 9394/96, O DECRETO Nº 5.154/04 E A DELIBERAÇÃO CEE 14/97
            </p>
          </div>
        </div>

        {/* VERSO — Conteúdo programático, nota e CPF */}
        <div ref={versoRef} className="relative bg-white shadow-2xl print:shadow-none overflow-hidden"
             style={{ width: "100%", aspectRatio: "1.414 / 1" }}>
          <img src={sideArt} alt="" aria-hidden className="absolute inset-y-0 left-0 h-full w-auto pointer-events-none select-none" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.05]">
            <img src={logo} alt="" className="w-[55%] max-w-[500px] rotate-[-20deg]" />
          </div>

          <div className="relative h-full pl-[22%] pr-[5%] pt-[4%] pb-[4%] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-black uppercase tracking-wide text-foreground" style={{ fontSize: "clamp(24px, 3vw, 40px)" }}>
                Conteúdo Programático
              </h2>
              <img src={logo} alt="Multplick" className="h-16" />
            </div>
            <div className="mt-2 h-1 w-full bg-primary/80 rounded" />

            <div className="mt-6 flex-1 overflow-hidden">
              <ul className="space-y-3 text-foreground" style={{ fontSize: "clamp(14px, 1.4vw, 20px)" }}>
                {data.cronograma.map((c: any, i: number) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="font-black text-primary">{String(i + 1).padStart(2, "0")}.</span>
                    <span className="font-bold uppercase tracking-wide">{c.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-[11px] text-foreground/70 text-center border-t border-foreground/20 pt-2">
              {data.empresa}{data.cnpj && <> — CNPJ {data.cnpj}</>} • Código: {enrollmentId?.slice(0, 8).toUpperCase()} • Emitido em {fmt(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificado;