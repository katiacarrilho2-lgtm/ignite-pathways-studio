import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Loader2, Rocket, Image as ImageIcon, ArrowRight, ArrowLeft, ClipboardList, Eye, Square } from "lucide-react";
import { RequirePermission } from "@/components/admin/AdminLayout";

const CUIDADOR_PRESET = {
  title: "Cuidador de Idosos – 250 horas",
  category: "Cursos Profissionalizantes",
  workload: "250h",
  level: "Profissionalizante",
  depth: "Intermediário",
  numModules: 10,
  lessonsPerModule: 6,
  audience: "profissionais sem experiência prévia que desejam atuar como cuidador formal de pessoas idosas",
  extra: `Use a legislação brasileira ATUALIZADA até 2026: Estatuto da Pessoa Idosa (Lei 10.741/2003 com redação dada pela Lei 14.423/2022 — substituindo "idoso" por "pessoa idosa"), Política Nacional do Idoso (Lei 8.842/1994), CBO 5162-10 (Cuidador), LGPD (Lei 13.709/2018) no manuseio de dados de saúde, SUS (Lei 8.080/1990), Caderneta de Saúde da Pessoa Idosa (MS), NR-32 (segurança em serviços de saúde), NR-06 (EPIs), RDC ANVISA 502/2021 (ILPIs). Inclua módulos sobre: anatomia/fisiologia do envelhecimento, higiene e conforto, administração de medicamentos sob prescrição, primeiros socorros, mobilização e transferência, alimentação e disfagia, Alzheimer/Parkinson/demências, cuidados paliativos, saúde mental e prevenção de quedas, violência contra pessoa idosa e canais de denúncia (Disque 100), ética profissional, comunicação com família e equipe multidisciplinar. Inclua casos práticos, checklists e referências legais atualizadas em cada módulo.`,
};

const NR10_PRESET = {
  title: "NR-10 — Segurança em Instalações e Serviços com Eletricidade (Básico + SEP)",
  category: "Normas Regulamentadoras (NRs)",
  workload: "80h (40h Básico + 40h SEP)",
  level: "Profissionalizante",
  depth: "Intermediário",
  numModules: 10,
  lessonsPerModule: 5,
  audience: "eletricistas, técnicos, engenheiros e profissionais que intervêm em instalações elétricas energizadas ou desenergizadas, incluindo trabalhos no Sistema Elétrico de Potência (SEP)",
  extra: `CURSO 100% EAD. Siga RIGOROSAMENTE o conteúdo programático oficial da NR-10 (Portaria MTP nº 915/2019 e atualizações vigentes até 2026), cobrindo Módulo BÁSICO (40h) + Módulo COMPLEMENTAR SEP (40h). Módulos obrigatórios do BÁSICO conforme Anexo II: (1) Introdução à segurança com eletricidade; (2) Riscos em instalações e serviços com eletricidade — choque elétrico, arco elétrico, queimaduras, quedas, campos eletromagnéticos; (3) Técnicas de análise de risco (APR); (4) Medidas de controle do risco elétrico — desenergização, aterramento funcional (TN, TT, IT), equipotencialização, seccionamento automático, dispositivos DR, extra baixa tensão, barreiras e invólucros, bloqueios e impedimentos (LOTO); (5) Normas técnicas brasileiras — ABNT NBR-5410, NBR-14039, NBR-5419; (6) Regulamentações do MTE — NR-10, NR-06, NR-05, NR-33, NR-35; (7) EPCs; (8) EPIs específicos para atividades com eletricidade; (9) Rotinas de trabalho — procedimentos, permissão de trabalho, ordens de serviço; (10) Documentação de instalações elétricas — prontuário; (11) Riscos adicionais — altura, ambientes confinados, áreas classificadas, umidade, condições atmosféricas; (12) Proteção e combate a incêndio — CO2, PQS; (13) Acidentes de origem elétrica — causas diretas e indiretas, discussão de casos; (14) Primeiros socorros — RCP, queimaduras, hemorragias, imobilização. Módulos do COMPLEMENTAR SEP (40h) conforme Anexo III: organização do SEP, riscos típicos do SEP e prevenção, técnicas de trabalho sob tensão e em proximidade, trabalhos em linhas aéreas e subterrâneas, equipamentos e ferramental para SEP, sistema de proteção coletiva, EPI para SEP, posturas e vestuário para o SEP, segurança com veículos e transporte de pessoas/equipamentos, sinalização e isolamento de áreas, liberação de instalação para serviço e para operação, treinamento em técnicas de remoção, atendimento e transporte de acidentados. Cite SEMPRE fontes oficiais (MTP, NBRs, publicações da FUNDACENTRO). Use exemplos práticos brasileiros, checklists de campo, procedimentos de LOTO, tabelas de distâncias mínimas (Anexo I da NR-10) e ilustrações mentais para vídeos. Cada módulo deve preparar o aluno para PROVA de 5 questões e emissão do CERTIFICADO com conteúdo programático conforme padrão MTE (data, carga horária, nome do instrutor, conteúdo ministrado, aproveitamento).`,
};

const NR35_PRESET = {
  title: "NR-35 — Trabalho em Altura (Trabalhador + Supervisor)",
  category: "Normas Regulamentadoras (NRs)",
  workload: "16h (8h Trabalhador + 8h Supervisor)",
  level: "Profissionalizante",
  depth: "Intermediário",
  numModules: 8,
  lessonsPerModule: 5,
  audience: "trabalhadores e supervisores que executam ou coordenam atividades acima de 2 metros do nível inferior, onde haja risco de queda",
  extra: `CURSO 100% EAD. Siga RIGOROSAMENTE o conteúdo programático oficial da NR-35 (Portaria MTP nº 2.036/2023 e atualizações vigentes até 2026), cobrindo o TRABALHADOR (8h) + módulo SUPERVISOR (8h). Módulos obrigatórios do TRABALHADOR conforme Anexo I: (1) Normas e regulamentos aplicáveis ao trabalho em altura — NR-35, NR-06, NR-01, ABNT NBR-14626, NBR-14627, NBR-14628, NBR-14629, NBR-15834, NBR-16325, NBR-16489; (2) Análise de Risco (AR) e condições impeditivas — vento, chuva, tempestades, condições de saúde do trabalhador; (3) Riscos potenciais inerentes ao trabalho em altura — queda de pessoas, queda de objetos, choque contra estruturas, efeito pêndulo, trauma por suspensão inerte; (4) Medidas de prevenção e controle — hierarquia (não realizar, prevenir queda por medidas coletivas, minimizar consequências); (5) Equipamentos de Proteção Individual, coletiva e sistemas de ancoragem — cinturão paraquedista, talabartes com absorvedor, trava-quedas, capacete com jugular, ancoragens estruturais e temporárias, linhas de vida horizontais e verticais; (6) Acidentes típicos em trabalhos em altura — casos reais brasileiros; (7) Condutas em situações de emergência, incluindo noções de técnicas de resgate e de prestação de primeiros socorros — RCP, trauma por suspensão. Módulos do SUPERVISOR (adicional 8h) conforme Anexo II: gestão do trabalho em altura, planejamento operacional, análise de risco aprofundada, permissão de trabalho (PT), fiscalização das medidas de proteção, responsabilidades legais (empregador, trabalhador, supervisor), programa de proteção contra quedas, avaliação e seleção de EPI/SPIQ, treinamento e capacitação da equipe, gestão de emergências e resgate técnico em altura. Cite SEMPRE fontes oficiais (MTP, NBRs, FUNDACENTRO). Inclua checklists de inspeção pré-uso de EPI, tabelas de vida útil e descarte de equipamentos, procedimentos de PT, exemplos de andaimes, cadeirinhas suspensas, telhados, torres. Cada módulo deve preparar o aluno para PROVA de 5 questões e emissão do CERTIFICADO com conteúdo programático padrão MTE (data, carga horária, nome do instrutor, conteúdo ministrado, aproveitamento).`,
};

const REPROCESS_NEXT_DELAY_MS = 15000;
const RATE_LIMIT_RETRY_DELAY_MS = 30000;
const MAX_REPROCESS_ATTEMPTS = 2;

const AdminCursoIAInner = () => {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [workload, setWorkload] = useState("80h");
  const [level, setLevel] = useState("Profissionalizante");
  const [numModules, setNumModules] = useState(6);
  const [lessonsPerModule, setLessonsPerModule] = useState(5);
  const [depth, setDepth] = useState("Intermediário");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Didático");
  const [extra, setExtra] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [includeMaterials, setIncludeMaterials] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [job, setJob] = useState<{ courseId: string; slug: string; total: number } | null>(null);
  const [progress, setProgress] = useState<{ done: number; failed: number; total: number }>({ done: 0, failed: 0, total: 0 });
  const pollRef = useRef<number | null>(null);

  // Import syllabus tab
  const [syllabus, setSyllabus] = useState("");
  const [tab, setTab] = useState<"form" | "import">("form");

  const applyCuidadorPreset = () => {
    setTitle(CUIDADOR_PRESET.title);
    setCategory(CUIDADOR_PRESET.category);
    setWorkload(CUIDADOR_PRESET.workload);
    setLevel(CUIDADOR_PRESET.level);
    setDepth(CUIDADOR_PRESET.depth);
    setNumModules(CUIDADOR_PRESET.numModules);
    setLessonsPerModule(CUIDADOR_PRESET.lessonsPerModule);
    setAudience(CUIDADOR_PRESET.audience);
    setExtra(CUIDADOR_PRESET.extra);
    setTab("form");
    toast.success("Preset aplicado! Revise e clique em Gerar Curso Completo.");
  };

  const applyPreset = (p: typeof CUIDADOR_PRESET) => {
    setTitle(p.title);
    setCategory(p.category);
    setWorkload(p.workload);
    setLevel(p.level);
    setDepth(p.depth);
    setNumModules(p.numModules);
    setLessonsPerModule(p.lessonsPerModule);
    setAudience(p.audience);
    setExtra(p.extra);
    setTab("form");
    toast.success(`Preset "${p.title}" aplicado! Revise e clique em Gerar Curso Completo.`);
  };

  useEffect(() => {
    supabase.from("course_categories").select("id,name").eq("active", true).order("sort_order")
      .then(({ data }) => {
        setCategories((data ?? []) as any);
        if (!category && data?.length) setCategory(data[0].name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = (courseId: string, total: number) => {
    setProgress({ done: 0, failed: 0, total });
    if (pollRef.current) window.clearInterval(pollRef.current);
    const tick = async () => {
      await supabase.functions.invoke("generate-course-ai", {
        body: { action: "release_stale_pending", payload: { course_id: courseId } },
      });
      const { data: secs } = await supabase.from("course_sections").select("id").eq("course_id", courseId);
      const ids = (secs ?? []).map((s: any) => s.id);
      if (!ids.length) return;
      const { data: ls } = await supabase.from("course_lessons").select("id, content").in("section_id", ids);
      const done = (ls ?? []).filter((l: any) => l.content?.ai_pending === false || l.content?.ai_pending === undefined).length;
      const failed = (ls ?? []).filter((l: any) => !!l.content?.ai_error).length;
      setProgress({ done, failed, total: (ls ?? []).length || total });
      if ((ls ?? []).length > 0 && done >= (ls ?? []).length) {
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    };
    tick();
    pollRef.current = window.setInterval(tick, 3000);
  };

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const isRateLimitError = (message: string) => /429|too many requests|rate limit|quota|limite/i.test(message);
  const isRetriableError = (message: string) =>
    /429|too many requests|rate limit|quota|limite|500|502|503|504|5\d{2}|bad gateway|gateway|service unavailable|internal server error|non-2xx|timeout|tempo esgotado|network|fetch failed|failed to fetch|temporar|edge function/i.test(message);
  const extractInvokeError = async (error: any, data?: any): Promise<string> => {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx === "object" && typeof ctx.text === "function") {
        const status = ctx.status ?? "";
        let bodyText = "";
        try { bodyText = await ctx.clone().text(); } catch { /* ignore */ }
        let bodyMsg = bodyText;
        try {
          const j = JSON.parse(bodyText);
          bodyMsg = j?.error || j?.message || j?.error_description || bodyText;
        } catch { /* not JSON */ }
        const joined = [status, bodyMsg].filter(Boolean).join(" ").trim();
        if (joined) return joined;
      }
      const ctxMsg = ctx?.error || ctx?.message;
      if (ctxMsg) return String(ctxMsg);
      if (error?.message) return String(error.message);
      if (data?.error) return String(data.error);
      return String(error ?? "Erro desconhecido");
    } catch (e: any) {
      return error?.message || String(error) || e?.message || "Erro desconhecido";
    }
  };
  const fetchFailedLessonIds = async (courseId: string) => {
    const { data: secs } = await supabase.from("course_sections").select("id").eq("course_id", courseId);
    const ids = (secs ?? []).map((s: any) => s.id);
    if (!ids.length) return [] as string[];
    const { data: lessons } = await supabase.from("course_lessons").select("id, lesson_type, content").in("section_id", ids);
    return (lessons ?? [])
      .filter((l: any) => ["text", "quiz", "flip"].includes(l.lesson_type) && !!l.content?.ai_error)
      .map((l: any) => l.id as string);
  };

  const generate = async (withImages: boolean) => {
    if (!title.trim() || !category) return toast.error("Informe título e categoria");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-ai", {
        body: {
          action: "full_course",
          payload: {
            title: title.trim(),
            category, workload, level, depth, audience, tone,
            extra_prompt: extra,
            num_modules: numModules,
            lessons_per_module: lessonsPerModule,
            include_materials: includeMaterials,
            include_image_prompts: withImages,
            model,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const courseId = (data as any).course_id;
      const slug = (data as any).slug;
      const total = (data as any).total_lessons;
      setJob({ courseId, slug, total });
      startPolling(courseId, total);
      toast.success("Curso criado! A IA está gerando o conteúdo em segundo plano.");
    } catch (e: any) {
      const m = e?.message || String(e);
      if (m.includes("429")) toast.error("Limite da IA atingido. Aguarde um pouco e tente novamente.");
      else if (m.includes("402")) toast.error("Créditos de IA esgotados. Adicione créditos para continuar.");
      else toast.error(m);
    } finally { setSubmitting(false); }
  };

  const parsedPreview = (() => {
    const lines = syllabus.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const mods: { title: string; lessons: string[] }[] = [];
    let cur: { title: string; lessons: string[] } | null = null;
    const isMod = (s: string) => /^#{1,3}\s/.test(s) || /^(m[oó]dulo|unidade|cap[ií]tulo|parte|module|section)\b/i.test(s);
    const strip = (s: string) => s.replace(/^[-*•·●▪►▶→]+\s*/, "").replace(/^(\d+[\.\)]\s*)+/, "").replace(/^#+\s*/, "").trim();
    for (const l of lines) {
      if (isMod(l)) {
        const t = strip(l.replace(/^(m[oó]dulo|unidade|cap[ií]tulo|parte|module|section)\s*\d*\s*[-–:.)]*\s*/i, "")) || strip(l);
        cur = { title: t || `Módulo ${mods.length + 1}`, lessons: [] };
        mods.push(cur);
      } else {
        const t = strip(l.replace(/^aulas?\s*\d*\s*[-–:.)]*\s*/i, ""));
        if (!t) continue;
        if (!cur) { cur = { title: "Módulo 1", lessons: [] }; mods.push(cur); }
        cur.lessons.push(t);
      }
    }
    return mods.filter((m) => m.lessons.length > 0);
  })();

  const importSyllabus = async () => {
    if (!title.trim() || !category) return toast.error("Informe título e categoria");
    if (!syllabus.trim()) return toast.error("Cole o conteúdo programático");
    if (!parsedPreview.length) return toast.error("Nenhum módulo/aula reconhecido no texto");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-ai", {
        body: {
          action: "import_syllabus",
          payload: {
            title: title.trim(), category, workload, level, depth, audience, tone,
            extra_prompt: extra, include_materials: includeMaterials, model,
            syllabus,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const courseId = (data as any).course_id;
      const slug = (data as any).slug;
      const total = (data as any).total_lessons;
      setJob({ courseId, slug, total });
      startPolling(courseId, total);
      toast.success(`Curso criado a partir de ${parsedPreview.length} módulos! Conteúdo sendo gerado em segundo plano.`);
    } catch (e: any) {
      const m = e?.message || String(e);
      if (m.includes("429")) toast.error("Limite da IA atingido.");
      else if (m.includes("402")) toast.error("Créditos de IA esgotados.");
      else toast.error(m);
    } finally { setSubmitting(false); }
  };

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const reprocessFailures = async () => {
    console.log("[reprocessFailures] clicked", { courseId: job?.courseId });
    toast.info("Iniciando reprocessamento...");
    if (!job?.courseId) { toast.error("Job ausente — gere um curso primeiro."); return; }
    setSubmitting(true);
    try {
      await supabase.functions.invoke("generate-course-ai", {
        body: { action: "release_stale_pending", payload: { course_id: job.courseId } },
      });
      const ids = await fetchFailedLessonIds(job.courseId);
      if (ids.length === 0) { toast.info("Nenhuma falha pendente."); return; }
      let ok = 0, processed = 0;
      for (const lessonId of ids) {
        processed++;
        const MAX_ATTEMPTS = 4;
        let attempt = 0;
        let succeeded = false;
        let lastErrorMsg = "";
        while (attempt < MAX_ATTEMPTS && !succeeded) {
          attempt++;
          try {
            const { data, error } = await supabase.functions.invoke("generate-course-ai", {
              body: { action: "reprocess_failures", payload: { course_id: job.courseId, lesson_ids: [lessonId], sync: true } },
            });
            if (error) {
              throw new Error(await extractInvokeError(error, data));
            }
            if ((data as any)?.error) throw new Error((data as any).error);
            succeeded = true;
            ok++;
            toast.success(`Aula ${processed}/${ids.length} reprocessada${attempt > 1 ? ` (tentativa ${attempt})` : ""}.`);
          } catch (e: any) {
            lastErrorMsg = e?.message || String(e);
            if (isRetriableError(lastErrorMsg) && attempt < MAX_ATTEMPTS) {
              const waitMs = 30000 + (attempt - 1) * 15000; // 30s, 45s, 60s
              toast.info(`Limite da IA atingido. Aguardando ${Math.round(waitMs / 1000)}s para tentar novamente... (tentativa ${attempt}/${MAX_ATTEMPTS})`);
              await delay(waitMs);
            } else {
              break;
            }
          }
        }
        if (!succeeded) {
          const retriable = isRetriableError(lastErrorMsg);
          toast.error(
            retriable
              ? `Aula ${processed}/${ids.length} falhou após ${attempt} tentativa(s). Erro: ${lastErrorMsg}`
              : `Aula ${processed}/${ids.length} — ERRO FATAL (não-retriável): ${lastErrorMsg}`,
            { duration: 15000 }
          );
          console.error(`[reprocessFailures] lesson ${lessonId} failed:`, lastErrorMsg);
        }
        if (processed < ids.length) {
          toast.info("Aguardando 20s antes da próxima aula...");
          await delay(20000);
        }
      }
      toast.message(`Reprocesso finalizado: ${ok}/${ids.length} concluída(s).`);
      startPolling(job.courseId, progress.total || job.total);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || String(e)}`);
    } finally { setSubmitting(false); }
  };

  const cancelGeneration = async () => {
    if (!job?.courseId) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-ai", {
        body: { action: "cancel_generation", payload: { course_id: job.courseId } },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (pollRef.current) window.clearInterval(pollRef.current);
      toast.success(`${(data as any)?.cancelled ?? 0} geração(ões) cancelada(s).`);
      startPolling(job.courseId, progress.total || job.total);
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally { setCancelling(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost"><Link to="/admin/cursos"><ArrowLeft className="size-4" /> Voltar</Link></Button>
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Sparkles className="size-7 text-primary" /> Gerador de Cursos IA</h1>
          <p className="text-muted-foreground text-sm">Crie cursos completos automaticamente com Gemini 2.5 Flash. Tudo editável depois.</p>
        </div>
      </div>

      {!job && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-primary">Preset pronto: Cuidador de Idosos – 250h</p>
            <p className="text-xs text-muted-foreground">Pré-preenche título, módulos e prompt com legislação atualizada (Lei 14.423/2022, LGPD, NR-32, RDC 502/2021).</p>
          </div>
          <Button variant="hero" size="sm" onClick={applyCuidadorPreset}>
            <Sparkles className="size-4" /> Usar preset
          </Button>
        </div>
      )}

      {!job && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-yellow-900">⚡ NR-10 — Básico + SEP (80h)</p>
              <p className="text-xs text-yellow-800">Conteúdo oficial Anexos II e III (Portaria MTP 915/2019), prova 5 questões/módulo, certificado padrão MTE.</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => applyPreset(NR10_PRESET)}>
              <Sparkles className="size-4" /> Usar
            </Button>
          </div>
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-yellow-900">🪜 NR-35 — Trabalhador + Supervisor (16h)</p>
              <p className="text-xs text-yellow-800">Conteúdo oficial Anexos I e II (Portaria MTP 2.036/2023), prova 5 questões/módulo, certificado padrão MTE.</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => applyPreset(NR35_PRESET)}>
              <Sparkles className="size-4" /> Usar
            </Button>
          </div>
        </div>
      )}

      {!job && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="form"><Sparkles className="size-4 mr-2" /> Gerar do zero</TabsTrigger>
            <TabsTrigger value="import"><ClipboardList className="size-4 mr-2" /> Importar Conteúdo Programático</TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome do curso *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Cuidador de Idosos – 250 horas" />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Carga horária</Label>
              <Input value={workload} onChange={(e) => setWorkload(e.target.value)} placeholder="Ex: 80h, 250 horas" />
            </div>
            <div>
              <Label>Nível *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Livre", "Profissionalizante", "Técnico", "Graduação", "Pós-graduação", "Corporativo", "EJA"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profundidade *</Label>
              <Select value={depth} onValueChange={setDepth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Básico", "Intermediário", "Avançado"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de módulos: <strong>{numModules}</strong></Label>
              <Slider min={3} max={12} step={1} value={[numModules]} onValueChange={(v) => setNumModules(v[0])} className="mt-3" />
            </div>
            <div>
              <Label>Aulas por módulo: <strong>{lessonsPerModule}</strong></Label>
              <Slider min={3} max={10} step={1} value={[lessonsPerModule]} onValueChange={(v) => setLessonsPerModule(v[0])} className="mt-3" />
            </div>
            <div>
              <Label>Tom</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Didático", "Formal", "Técnico"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo IA</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (recomendado, custo baixo)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (mais caro, mais profundo)</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Público-alvo (opcional)</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex: profissionais da saúde sem experiência prévia" />
            </div>
            <div className="md:col-span-2">
              <Label>Instruções adicionais (opcional)</Label>
              <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Ex: incluir legislação trabalhista, NRs aplicáveis, casos práticos do SUS..." />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <label className="flex items-center gap-2">
              <Switch checked={includeMaterials} onCheckedChange={setIncludeMaterials} />
              <span className="text-sm">Sugerir material complementar (normas, leis, manuais, artigos)</span>
            </label>
            <p className="text-xs text-muted-foreground">
              A IA não gera URLs de YouTube — apenas sugestões de temas. Para vídeos reais, anexe links manualmente no Course Builder ou use a integração com a API do YouTube.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="hero" size="lg" disabled={submitting} onClick={() => generate(false)}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Gerar Curso Completo
            </Button>
            <Button variant="outline" size="lg" disabled={submitting} onClick={() => generate(true)}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />} Gerar Curso Completo + Prompts de Imagem
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A geração roda em segundo plano. Você pode fechar esta aba e voltar depois — o curso continuará sendo gerado.
          </p>
          </TabsContent>

          <TabsContent value="import" className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome do curso *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Instalação de Ar Condicionado Split" />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carga horária</Label>
                <Input value={workload} onChange={(e) => setWorkload(e.target.value)} placeholder="Ex: 80h" />
              </div>
              <div>
                <Label>Nível</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Livre","Profissionalizante","Técnico","Graduação","Pós-graduação","Corporativo","EJA"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profundidade</Label>
                <Select value={depth} onValueChange={setDepth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Básico","Intermediário","Avançado"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Conteúdo programático *</Label>
              <Textarea
                rows={14}
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                placeholder={`Cole sua estrutura, por exemplo:\n\nMódulo 1 - Introdução\n  Aula 1: Conceitos básicos\n  Aula 2: Histórico\n\nMódulo 2 - Instalação\n  Aula 1: Ferramentas\n  Aula 2: Procedimentos`}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Aceita "Módulo", "Unidade", "Capítulo", "Parte", "Module" ou cabeçalhos com #. Aulas como bullets, numeradas ou linhas simples.
              </p>
            </div>

            {parsedPreview.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Eye className="size-4" /> Pré-visualização: {parsedPreview.length} módulos, {parsedPreview.reduce((a, m) => a + m.lessons.length, 0)} aulas
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {parsedPreview.map((m, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-medium">📘 {m.title}</div>
                      <ul className="ml-6 list-disc text-muted-foreground">
                        {m.lessons.map((l, j) => <li key={j}>{l}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="hero" size="lg" disabled={submitting} onClick={importSyllabus}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Criar Curso e Gerar Conteúdo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O curso e a estrutura são criados imediatamente. Conteúdo, quizzes, flashcards e vídeos são gerados em segundo plano.
            </p>
          </TabsContent>
        </Tabs>
      )}

      {job && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-primary">Gerando: {title}</h2>
          <Progress value={percent} />
          <p className="text-sm text-muted-foreground">
            {progress.done} de {progress.total} itens finalizados ({percent}%)
            {progress.failed > 0 ? ` · ${progress.failed} falha(s)` : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            {progress.failed > 0 && (
              <Button
                variant="outline"
                disabled={submitting || cancelling}
                onClick={reprocessFailures}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Reprocessar Apenas Falhas
              </Button>
            )}
            {(progress.total > 0 && progress.done < progress.total) || cancelling ? (
              <Button variant="destructive" disabled={cancelling || submitting} onClick={cancelGeneration}>
                {cancelling ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} Cancelar Geração
              </Button>
            ) : null}
            <Button variant="hero" onClick={() => nav(`/admin/cursos/${job.courseId}/conteudo`)}>
              Abrir no Course Builder <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => { setJob(null); setProgress({ done: 0, failed: 0, total: 0 }); setTitle(""); }}>
              Gerar outro curso
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminCursoIA = () => <RequirePermission perm="manage_courses"><AdminCursoIAInner /></RequirePermission>;
export default AdminCursoIA;