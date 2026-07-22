import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Pencil, ArrowLeft, GripVertical, ChevronDown, ChevronRight,
  Video, FileText, HelpCircle, RotateCw, Rows, Upload, Loader2, Eye, Send, Lock,
  Sparkles, Download, Image as ImageIcon, Square,
} from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Link as RLink } from "react-router-dom";
import { ImageDropZone } from "@/components/admin/ImageDropZone";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { LessonAttachmentsEditor, type Attachment } from "@/components/admin/LessonAttachmentsEditor";
import { AiGenerateDialog, type AiOptions } from "@/components/admin/AiGenerateDialog";
import { LessonImageAiDialog } from "@/components/admin/LessonImageAiDialog";
import { YoutubePickerDialog, type YoutubeVideo } from "@/components/admin/YoutubePickerDialog";
import { exportCourseJson } from "@/lib/courseExport";
import { supabase as sb } from "@/integrations/supabase/client";

const DRAFT_PREFIX = "lesson-draft:v1:";
const draftKeyFor = (e: Partial<Lesson> & { _new_section_id?: string } | null) =>
  !e ? null : e.id ? `${DRAFT_PREFIX}id:${e.id}` : `${DRAFT_PREFIX}new:${e.section_id}:${e.lesson_type}`;

const HISTORY_PREFIX = "lesson-history:v1:";
const HISTORY_MAX = 10;
const REPROCESS_NEXT_DELAY_MS = 15000;
const RATE_LIMIT_RETRY_DELAY_MS = 30000;
const MAX_REPROCESS_ATTEMPTS = 2;
type HistoryEntry = { savedAt: number; data: any };
const historyKeyFor = (lessonId?: string | null) => (lessonId ? `${HISTORY_PREFIX}${lessonId}` : null);
const readHistory = (lessonId?: string | null): HistoryEntry[] => {
  const k = historyKeyFor(lessonId); if (!k) return [];
  try { return JSON.parse(localStorage.getItem(k) || "[]") as HistoryEntry[]; } catch { return []; }
};
const pushHistory = (lessonId: string | undefined, data: any) => {
  const k = historyKeyFor(lessonId); if (!k) return;
  try {
    const list = readHistory(lessonId);
    const last = list[0];
    const snap = JSON.stringify(data);
    if (last && JSON.stringify(last.data) === snap) return;
    list.unshift({ savedAt: Date.now(), data });
    localStorage.setItem(k, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {/* quota */}
};

type Lesson = {
  id: string;
  section_id: string;
  title: string;
  lesson_type: "video" | "text" | "quiz" | "flip" | "accordion";
  sort_order: number;
  content: any;
  video_path: string | null;
  duration_seconds: number | null;
  passing_score: number;
};
type Section = { id: string; course_id: string; title: string; sort_order: number; ai_meta?: any; lessons: Lesson[] };

const TYPE_META: Record<Lesson["lesson_type"], { icon: any; label: string }> = {
  video: { icon: Video, label: "Vídeo" },
  text: { icon: FileText, label: "Texto" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  flip: { icon: RotateCw, label: "Cartões flip" },
  accordion: { icon: Rows, label: "Acordeão" },
};

const normalizeLessonContentForSave = (lessonType: Lesson["lesson_type"] | undefined, content: any = {}) => {
  if (lessonType === "text" || lessonType === "video") {
    const html = content.html ?? content.body ?? content.content_html ?? "";
    return { ...content, html, body: html };
  }
  if (lessonType === "quiz") {
    const questions = content.questions ?? content.quiz ?? [];
    return { ...content, questions, quiz: questions.map((q: any) => ({ ...q, answer: q.answer ?? q.correct ?? 0 })) };
  }
  if (lessonType === "flip") {
    const items = content.items ?? content.flashcards ?? [];
    return { ...content, items, flashcards: items };
  }
  return content ?? {};
};

const Inner = () => {
  const { courseId } = useParams();
  const { isMaster } = useAuth();
  const [course, setCourse] = useState<{ title: string; passing_score: number; published: boolean; live_url: string | null; live_label: string | null } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Partial<Lesson> & { _new_section_id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>("");
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const dirty = !!editing && JSON.stringify(editing) !== originalSnapshot;
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [aiTarget, setAiTarget] = useState<{ kind: "lesson"; lessonId: string; title: string } | { kind: "module"; sectionId: string; title: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [imgAiTarget, setImgAiTarget] = useState<{ lessonId: string; title: string } | null>(null);
  const [imgAiBusy, setImgAiBusy] = useState(false);
  const [ytPickerOpen, setYtPickerOpen] = useState(false);
  const [reprocessingFailures, setReprocessingFailures] = useState(false);
  const [cancellingGeneration, setCancellingGeneration] = useState(false);
  // uploadingImg keeps the dropzone hint state in sync with the upload
  void uploadingImg;

  const load = async (opts?: { force?: boolean }) => {
    if (!courseId) return;
    // Bloqueia revalidação automática se houver alterações não salvas no editor
    if (dirtyRef.current && !opts?.force) {
      console.warn("[builder] load() ignorado — há alterações não salvas no editor.");
      return;
    }
    const [{ data: c }, { data: ss }, { data: ls }] = await Promise.all([
      supabase.from("courses").select("title, passing_score, published, live_url, live_label").eq("id", courseId).maybeSingle(),
      supabase.from("course_sections").select("*").eq("course_id", courseId).order("sort_order"),
      supabase.from("course_lessons").select("*").order("sort_order"),
    ]);
    setCourse(c as any);
    const sList = (ss ?? []).map((s: any) => ({ ...s, lessons: (ls ?? []).filter((l: any) => l.section_id === s.id) }));
    setSections(sList as Section[]);
    if (sList.length && Object.keys(expanded).length === 0) {
      setExpanded(Object.fromEntries(sList.map((s: any) => [s.id, true])));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    supabase.functions.invoke("generate-course-ai", {
      body: { action: "release_stale_pending", payload: { course_id: courseId } },
    }).then(({ data }: any) => {
      if ((data?.released ?? 0) > 0) {
        toast.info(`${data.released} geração(ões) presas foram marcadas como Falhou.`);
        load({ force: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const isRateLimitError = (message: string) => /429|too many requests|rate limit|quota|limite/i.test(message);
  const isRetriableError = (message: string) =>
    /429|too many requests|rate limit|quota|limite|500|502|503|504|5\d{2}|bad gateway|gateway|service unavailable|internal server error|non-2xx|timeout|tempo esgotado|network|fetch failed|failed to fetch|temporar|edge function/i.test(message);
  // Extracts the real error message from a supabase.functions.invoke error,
  // including reading the underlying Response body when available so the
  // toast shows the actual API message (e.g. "429 Insufficient Quota").
  const extractInvokeError = async (error: any, data?: any): Promise<string> => {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx === "object" && typeof ctx.text === "function") {
        // ctx is a Response — try to parse the body
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
  const fetchFailedLessonIds = async () => {
    if (!courseId) return [] as string[];
    const { data: courseSections } = await supabase.from("course_sections").select("id").eq("course_id", courseId);
    const sectionIds = (courseSections ?? []).map((s: any) => s.id);
    if (!sectionIds.length) return [] as string[];
    const { data: lessons } = await supabase.from("course_lessons").select("id, lesson_type, content").in("section_id", sectionIds);
    return (lessons ?? [])
      .filter((l: any) => ["text", "quiz", "flip"].includes(l.lesson_type) && !!l.content?.ai_error)
      .map((l: any) => l.id as string);
  };

  const reprocessFailedLessons = async () => {
    console.log("[reprocessFailedLessons] clicked", { courseId });
    toast.info("Iniciando reprocessamento...");
    if (!courseId) { toast.error("courseId ausente — recarregue a página."); return; }
    setReprocessingFailures(true);
    const patchLessonContent = (lessonId: string, patch: Record<string, any>) => {
      setSections((prev) => prev.map((sec) => ({
        ...sec,
        lessons: sec.lessons.map((l: any) =>
          l.id === lessonId
            ? { ...l, content: { ...(l.content ?? {}), ...patch } }
            : l,
        ),
      })) as Section[]);
    };
    try {
      await supabase.functions.invoke("generate-course-ai", {
        body: { action: "release_stale_pending", payload: { course_id: courseId } },
      });
      const ids = await fetchFailedLessonIds();
      if (ids.length === 0) { toast.info("Nenhuma aula com falha encontrada."); return; }
      let ok = 0, processed = 0;
      for (const lessonId of ids) {
        processed++;
        // Marca como "Gerando..." na UI antes de chamar a API
        patchLessonContent(lessonId, { ai_pending: true, ai_error: null });
        const MAX_ATTEMPTS = 4;
        let attempt = 0;
        let succeeded = false;
        let lastErrorMsg = "";
        while (attempt < MAX_ATTEMPTS && !succeeded) {
          attempt++;
          try {
            const { data, error } = await supabase.functions.invoke("generate-course-ai", {
              body: { action: "reprocess_failures", payload: { course_id: courseId, lesson_ids: [lessonId], sync: true } },
            });
            if (error) {
              throw new Error(await extractInvokeError(error, data));
            }
            if ((data as any)?.error) throw new Error((data as any).error);
            succeeded = true;
            ok++;
            patchLessonContent(lessonId, { ai_pending: false, ai_error: null });
            toast.success(`Aula ${processed}/${ids.length} reprocessada${attempt > 1 ? ` (tentativa ${attempt})` : ""}.`);
          } catch (e: any) {
            lastErrorMsg = e?.message || String(e);
            const retriable = isRetriableError(lastErrorMsg);
            if (retriable && attempt < MAX_ATTEMPTS) {
              const waitMs = 30000 + (attempt - 1) * 15000; // 30s, 45s, 60s
              toast.info(`Limite da IA atingido. Aguardando ${Math.round(waitMs / 1000)}s para tentar novamente... (tentativa ${attempt}/${MAX_ATTEMPTS})`);
              patchLessonContent(lessonId, { ai_pending: true, ai_error: null });
              await delay(waitMs);
            } else {
              break;
            }
          }
        }
        if (!succeeded) {
          patchLessonContent(lessonId, { ai_pending: false, ai_error: lastErrorMsg });
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
      await load({ force: true });
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || String(e)}`);
    } finally {
      setReprocessingFailures(false);
    }
  };

  const cancelGeneration = async () => {
    if (!courseId) return;
    setCancellingGeneration(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-ai", {
        body: { action: "cancel_generation", payload: { course_id: courseId } },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${(data as any)?.cancelled ?? 0} geração(ões) cancelada(s).`);
      await load({ force: true });
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally {
      setCancellingGeneration(false);
    }
  };

  // beforeunload — avisa o usuário ao tentar sair com alterações não salvas
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "Existem alterações não salvas. Deseja realmente sair?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Salva rascunho em localStorage a cada alteração
  useEffect(() => {
    if (!editing || !dirty) return;
    const key = draftKeyFor(editing);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ data: editing, savedAt: Date.now() }));
    } catch {/* quota */}
  }, [editing, dirty]);

  const addSection = async () => {
    const title = prompt("Nome da seção:")?.trim();
    if (!title || !courseId) return;
    const next = (sections.at(-1)?.sort_order ?? 0) + 10;
    const { error } = await supabase.from("course_sections").insert({ course_id: courseId, title, sort_order: next });
    if (error) toast.error(error.message); else { toast.success("Seção criada"); load(); }
  };
  const renameSection = async (s: Section) => {
    const title = prompt("Renomear seção:", s.title)?.trim();
    if (!title) return;
    const { error } = await supabase.from("course_sections").update({ title }).eq("id", s.id);
    if (error) toast.error(error.message); else load();
  };
  const removeSection = async (s: Section) => {
    if (!confirm(`Excluir seção "${s.title}" e todas as aulas dentro?`)) return;
    const { error } = await supabase.from("course_sections").delete().eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };
  const removeLesson = async (l: Lesson) => {
    if (!confirm(`Excluir aula "${l.title}"?`)) return;
    const { error } = await supabase.from("course_lessons").delete().eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  const runAi = async (opts: AiOptions) => {
    if (!aiTarget) return;
    setAiBusy(true);
    try {
      if (aiTarget.kind === "lesson") {
        const payload: any = { options: opts, lesson_id: aiTarget.lessonId };
        const { data, error } = await sb.functions.invoke("generate-course-ai", {
          body: { action: "lesson", payload },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success("Geração iniciada. Atualize em alguns segundos.");
        setAiTarget(null);
        setTimeout(() => load(), 2000);
      } else {
        // ----- Fila SEQUENCIAL por aula (uma de cada vez) -----
        const sectionId = aiTarget.sectionId;
        const section = sections.find((s) => s.id === sectionId);
        const lessonQueue = (section?.lessons ?? [])
          .filter((l: any) => ["text", "quiz", "flip"].includes(l.lesson_type));
        if (!lessonQueue.length) {
          toast.warning("Nenhuma aula gerável neste módulo.");
          setAiTarget(null);
          return;
        }
        setAiTarget(null);
        toast.info(`Iniciando geração sequencial: ${lessonQueue.length} aula(s).`);
        const patchLessonContent = (lessonId: string, patch: Record<string, any>) => {
          setSections((prev) => prev.map((sec) => ({
            ...sec,
            lessons: sec.lessons.map((l: any) =>
              l.id === lessonId ? { ...l, content: { ...(l.content ?? {}), ...patch } } : l,
            ),
          })) as Section[]);
        };
        let ok = 0, idx = 0;
        for (const l of lessonQueue) {
          idx++;
          patchLessonContent(l.id, { ai_pending: true, ai_error: null });
          const MAX_ATTEMPTS = 4;
          let attempt = 0, succeeded = false, lastErrorMsg = "";
          while (attempt < MAX_ATTEMPTS && !succeeded) {
            attempt++;
            try {
              const { data, error } = await sb.functions.invoke("generate-course-ai", {
                body: { action: "lesson", payload: { lesson_id: l.id, options: opts, sync: true } },
              });
              if (error) throw new Error(await extractInvokeError(error, data));
              if ((data as any)?.error) throw new Error((data as any).error);
              succeeded = true; ok++;
              patchLessonContent(l.id, { ai_pending: false, ai_error: null });
              toast.success(`Aula ${idx}/${lessonQueue.length} concluída${attempt > 1 ? ` (tentativa ${attempt})` : ""}.`);
            } catch (e: any) {
              lastErrorMsg = e?.message || String(e);
              if (isRetriableError(lastErrorMsg) && attempt < MAX_ATTEMPTS) {
                const waitMs = 30000 + (attempt - 1) * 15000;
                toast.info(`Limite/erro temporário. Aguardando ${Math.round(waitMs / 1000)}s... (tentativa ${attempt}/${MAX_ATTEMPTS})`);
                await delay(waitMs);
              } else { break; }
            }
          }
          if (!succeeded) {
            patchLessonContent(l.id, { ai_pending: false, ai_error: lastErrorMsg });
            const retriable = isRetriableError(lastErrorMsg);
            toast.error(retriable
              ? `Aula ${idx}/${lessonQueue.length} falhou após ${attempt} tentativa(s): ${lastErrorMsg}`
              : `Aula ${idx}/${lessonQueue.length} — ERRO FATAL (não-retriável): ${lastErrorMsg}`,
              { duration: 15000 });
            console.error(`[runAi module] lesson ${l.id} failed:`, lastErrorMsg);
          }
          if (idx < lessonQueue.length) await delay(20000);
        }
        toast.message(`Geração do módulo finalizada: ${ok}/${lessonQueue.length} concluída(s).`);
        await load({ force: true });
      }
    } catch (e: any) {
      const m = e?.message || String(e);
      if (m.includes("429")) toast.error("Limite da IA atingido. Tente novamente em instantes.");
      else if (m.includes("402")) toast.error("Créditos de IA esgotados.");
      else toast.error(m);
    } finally { setAiBusy(false); }
  };

  const runImageAi = async (images: string[], extraPrompt: string) => {
    if (!imgAiTarget) return;
    setImgAiBusy(true);
    try {
      const { data, error } = await sb.functions.invoke("generate-course-ai", {
        body: {
          action: "lesson_from_image",
          payload: { lesson_id: imgAiTarget.lessonId, images, extra_prompt: extraPrompt },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Análise da imagem iniciada. Conteúdo será atualizado em instantes.");
      setImgAiTarget(null);
      setTimeout(() => load(), 2500);
    } catch (e: any) {
      const m = e?.message || String(e);
      if (m.includes("429")) toast.error("Limite da IA atingido. Tente novamente em instantes.");
      else if (m.includes("402")) toast.error("Créditos de IA esgotados.");
      else toast.error(m);
    } finally { setImgAiBusy(false); }
  };

  const openNewLesson = (sectionId: string, type: Lesson["lesson_type"]) => {
    const base: any = {
      section_id: sectionId,
      lesson_type: type,
      title: "",
      passing_score: 70,
      content: type === "text" ? { html: "" }
        : type === "quiz" ? { questions: [{ question: "", options: ["", "", "", ""], correct: 0 }] }
        : type === "flip" ? { items: [{ front: "", back: "" }] }
        : type === "accordion" ? { items: [{ title: "", body: "" }] }
        : {},
    };
    // Recupera rascunho local, se existir
    const key = draftKeyFor(base);
    let restored: any = null;
    try {
      const raw = key ? localStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && confirm("Encontramos um rascunho local não salvo desta aula. Deseja recuperá-lo?")) {
          restored = parsed.data;
        } else if (key) localStorage.removeItem(key);
      }
    } catch {/* ignore */}
    const initial = restored ?? base;
    setOriginalSnapshot(restored ? "__restored__" : JSON.stringify(initial));
    setEditing(initial);
    setAutoSavedAt(null);
  };
  const openEditLesson = (l: Lesson) => {
    const base = { ...l };
    const key = draftKeyFor(base);
    let restored: any = null;
    try {
      const raw = key ? localStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && JSON.stringify(parsed.data) !== JSON.stringify(base)) {
          if (confirm("Encontramos um rascunho local com alterações não salvas desta aula. Deseja recuperá-lo?")) {
            restored = parsed.data;
          } else if (key) localStorage.removeItem(key);
        }
      }
    } catch {/* ignore */}
    const initial = restored ?? base;
    setOriginalSnapshot(restored ? "__restored__" : JSON.stringify(initial));
    setEditing(initial);
    setAutoSavedAt(null);
  };

  const saveLesson = useCallback(async (opts?: { silent?: boolean; keepOpen?: boolean }) => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      if (!opts?.silent) toast.error("Título obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: editing.title.trim(),
        lesson_type: editing.lesson_type,
        section_id: editing.section_id,
        content: normalizeLessonContentForSave(editing.lesson_type as Lesson["lesson_type"], editing.content),
        video_path: editing.video_path ?? null,
        duration_seconds: editing.duration_seconds ?? null,
        passing_score: editing.passing_score ?? 70,
      };
      let savedId = editing.id as string | undefined;
      if (editing.id) {
        const { error } = await supabase.from("course_lessons").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const siblings = sections.find(s => s.id === editing.section_id)?.lessons ?? [];
        payload.sort_order = ((siblings.at(-1)?.sort_order) ?? 0) + 10;
        const { data: inserted, error } = await supabase.from("course_lessons").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        savedId = (inserted as any)?.id;
      }
      // Limpa rascunho local
      const key = draftKeyFor(editing);
      if (key) try { localStorage.removeItem(key); } catch {/* */}
      // Push em histórico (até 10 versões)
      const histId = (editing.id as string | undefined) ?? savedId;
      if (histId) pushHistory(histId, { ...editing, id: histId });

      if (opts?.silent) {
        setAutoSavedAt(new Date());
        // Mantém edição aberta; reseta snapshot para limpar isDirty
        if (!editing.id && savedId) {
          const next = { ...editing, id: savedId } as any;
          setEditing(next);
          setOriginalSnapshot(JSON.stringify(next));
        } else {
          setOriginalSnapshot(JSON.stringify(editing));
        }
        return;
      }
      toast.success("Aula salva");
      if (!opts?.keepOpen) {
        setOriginalSnapshot(JSON.stringify(editing));
        setEditing(null);
      }
      await load({ force: true });
    } catch (e: any) {
      if (!opts?.silent) toast.error(e.message);
      else console.warn("[autosave] falhou:", e?.message);
    }
    finally { setSaving(false); }
  }, [editing, sections]);

  // Autosave a cada 15s quando dirty (só para aulas já existentes — evita criar registros fantasmas)
  useEffect(() => {
    if (!editing || !editing.id || !dirty) return;
    const t = setInterval(() => {
      if (dirtyRef.current) saveLesson({ silent: true, keepOpen: true });
    }, 15_000);
    return () => clearInterval(t);
  }, [editing, dirty, saveLesson]);

  // Salva ao ocultar a aba ou perder o foco da janela (evita perder edição ao trocar de aba/app)
  useEffect(() => {
    if (!editing || !editing.id) return;
    const flush = () => { if (dirtyRef.current) saveLesson({ silent: true, keepOpen: true }); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    window.addEventListener("blur", flush);
    return () => {
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("blur", flush);
    };
  }, [editing, saveLesson]);

  const onVideoUpload = async (file: File) => {
    if (!editing || !courseId) return;
    if (file.size > 600 * 1024 * 1024) return toast.error("Vídeo acima de 600MB. Comprima antes de enviar.");
    setSaving(true);
    try {
      const path = `${courseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      // try to read duration in browser
      const dur = await new Promise<number | null>((res) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = URL.createObjectURL(file);
        v.onloadedmetadata = () => { res(Math.round(v.duration)); URL.revokeObjectURL(v.src); };
        v.onerror = () => res(null);
      });
      setEditing({ ...editing, video_path: path, duration_seconds: dur ?? editing.duration_seconds ?? null });
      toast.success("Vídeo enviado");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const uploadLessonImage = async (file: File): Promise<string | null> => {
    if (!editing || !courseId) return null;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return null; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem acima de 5 MB"); return null; }
    setUploadingImg(true);
    try {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `lessons/${courseId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("course-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("course-images").getPublicUrl(path);
      toast.success("Imagem enviada");
      return pub.publicUrl;
    } catch (e: any) { toast.error(e.message); return null; }
    finally { setUploadingImg(false); }
  };

  const uploadLessonMaterial = async (file: File): Promise<{ url: string; mime: string } | null> => {
    if (!editing || !courseId) return null;
    if (file.size > 20 * 1024 * 1024) { toast.error("Arquivo acima de 20 MB"); return null; }
    try {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `lessons/${courseId}/materials/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("course-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("course-images").getPublicUrl(path);
      toast.success("Arquivo enviado");
      return { url: pub.publicUrl, mime: file.type };
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const setPassing = async (val: number) => {
    if (!courseId) return;
    const v = Math.max(0, Math.min(100, val));
    setCourse(c => c ? { ...c, passing_score: v } : c);
    await supabase.from("courses").update({ passing_score: v }).eq("id", courseId);
  };

  const setLiveUrl = async (val: string) => {
    if (!courseId) return;
    setCourse(c => c ? { ...c, live_url: val } : c);
    await supabase.from("courses").update({ live_url: val || null }).eq("id", courseId);
  };
  const setLiveLabel = async (val: string) => {
    if (!courseId) return;
    setCourse(c => c ? { ...c, live_label: val } : c);
    await supabase.from("courses").update({ live_label: val || null }).eq("id", courseId);
  };

  const togglePublish = async () => {
    if (!courseId || !course) return;
    if (!course.published) {
      const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0);
      if (sections.length === 0 || totalLessons === 0) {
        return toast.error("Adicione pelo menos 1 seção e 1 aula antes de publicar.");
      }
    }
    const next = !course.published;
    const { error } = await supabase.from("courses").update({ published: next }).eq("id", courseId);
    if (error) return toast.error(error.message);
    setCourse({ ...course, published: next });
    toast.success(next ? "Curso publicado! Já aparece para os alunos." : "Curso despublicado (rascunho).");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost"><Link to="/admin/cursos"><ArrowLeft className="size-4" /> Voltar</Link></Button>
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              {course?.title ?? "Curso"}
              {course && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {course.published ? "Publicado" : "Rascunho"}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">Construa o conteúdo: seções e aulas.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm flex-wrap justify-end">
          <Label className="text-xs text-muted-foreground">Nota mínima para certificado</Label>
          <Input type="number" min={0} max={100} value={course?.passing_score ?? 70} onChange={e => setPassing(Number(e.target.value))} className="w-20" />
          <Label className="text-xs text-muted-foreground ml-2">Sala ao vivo (URL Zoom/Meet)</Label>
          <Input
            type="url"
            placeholder="https://meet.google.com/..."
            value={course?.live_url ?? ""}
            onChange={e => setLiveUrl(e.target.value)}
            onBlur={e => setLiveUrl(e.target.value)}
            className="w-64"
          />
          <Button asChild size="sm" variant="outline" title="Pré-visualizar como aluno">
            <RLink to={`/admin/cursos/${courseId}/preview`} target="_blank"><Eye className="size-4" /> Pré-visualizar</RLink>
          </Button>
          <Button size="sm" variant="outline" onClick={() => courseId && exportCourseJson(courseId).catch((e:any) => toast.error(e.message))} title="Exportar curso (JSON)">
            <Download className="size-4" /> Exportar
          </Button>
          {isMaster && sections.some(s => s.lessons.some((l: any) => !!l.content?.ai_error)) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Reprocessa apenas aulas com erro ou pendentes há mais de 10 min. Não toca em aulas concluídas."
              disabled={reprocessingFailures}
              onClick={reprocessFailedLessons}
            >
              {reprocessingFailures ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />} Reprocessar Apenas Falhas
            </Button>
          )}
          {isMaster && (reprocessingFailures || cancellingGeneration || sections.some(s => s.lessons.some((l: any) => l.content?.ai_pending === true))) && (
            <Button
              size="sm"
              variant="destructive"
              title="Interrompe a fila atual e marca itens em Gerando como Falhou para destravar a tela."
              disabled={cancellingGeneration || reprocessingFailures}
              onClick={cancelGeneration}
            >
              {cancellingGeneration ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} Cancelar Geração
            </Button>
          )}
          {isMaster ? (
            <Button size="sm" variant={course?.published ? "outline" : "hero"} onClick={togglePublish}>
              <Send className="size-4" /> {course?.published ? "Despublicar" : "Publicar curso"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="size-3" /> Apenas o Master pode publicar</span>
          )}
        </div>
      </div>

      {!isMaster && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-lg p-3 flex items-center gap-2">
          <Lock className="size-4" /> Você está em modo somente leitura. Apenas o usuário Master (001) pode criar, editar ou excluir conteúdo.
        </div>
      )}

      <div className="space-y-3">
        {sections.map(s => {
          const isOpen = expanded[s.id] ?? true;
          return (
            <div key={s.id} className="bg-card border border-border rounded-xl">
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <button onClick={() => setExpanded(x => ({ ...x, [s.id]: !isOpen }))} className="p-1 hover:bg-secondary rounded">
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <GripVertical className="size-4 text-muted-foreground" />
                <span className="font-semibold flex-1">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.lessons.length} aulas</span>
                {isMaster && (
                  <Button size="sm" variant="ghost"
                    title={editing && s.lessons.some(l => l.id === editing.id) ? "Há uma aula deste módulo em edição — feche para gerar com IA" : "Gerar conteúdo do módulo com IA"}
                    disabled={!!(editing && s.lessons.some(l => l.id === editing.id))}
                    onClick={() => {
                      if (editing && s.lessons.some(l => l.id === editing.id)) { toast.warning("Há uma aula deste módulo aberta. Feche o editor antes de gerar com IA."); return; }
                      setAiTarget({ kind: "module", sectionId: s.id, title: s.title });
                    }}>
                    <Sparkles className="size-3.5 text-primary" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => renameSection(s)}><Pencil className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => removeSection(s)} className="text-destructive"><Trash2 className="size-3.5" /></Button>
              </div>
              {isOpen && (
                <div className="p-3 space-y-2">
                  {s.ai_meta?.image_prompt && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-2 text-xs flex items-start gap-2">
                      <ImageIcon className="size-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-primary mb-0.5">Prompt de imagem do módulo</div>
                        <div className="text-muted-foreground break-words">{s.ai_meta.image_prompt}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { navigator.clipboard.writeText(s.ai_meta.image_prompt); toast.success("Prompt copiado"); }}>
                        Copiar
                      </Button>
                    </div>
                  )}
                  {s.lessons.map(l => {
                    const T = TYPE_META[l.lesson_type].icon;
                    const pending = l.content?.ai_pending === true;
                    const err = l.content?.ai_error;
                    return (
                      <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40">
                        <T className="size-4 text-primary" />
                        <button onClick={() => openEditLesson(l)} className="flex-1 text-left text-sm font-medium hover:underline">{l.title}</button>
                        {pending && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Gerando...</span>}
                        {err && <span title={err} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Falhou</span>}
                        <span className="text-xs text-muted-foreground">{TYPE_META[l.lesson_type].label}</span>
                        {isMaster && (
                          <Button size="sm" variant="ghost" title={editing?.id === l.id ? "Aula em edição — feche para gerar com IA" : "Gerar com IA"}
                            disabled={editing?.id === l.id}
                            onClick={() => {
                              if (editing?.id === l.id) { toast.warning("Esta aula está aberta para edição. Feche o editor antes de gerar com IA."); return; }
                              setAiTarget({ kind: "lesson", lessonId: l.id, title: l.title });
                            }}>
                            <Sparkles className="size-3.5 text-primary" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEditLesson(l)}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removeLesson(l)} className="text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground self-center mr-1">+ Adicionar aula:</span>
                    {(Object.keys(TYPE_META) as Lesson["lesson_type"][]).map(t => {
                      const T = TYPE_META[t].icon;
                      return (
                        <Button key={t} size="sm" variant="outline" onClick={() => openNewLesson(s.id, t)}>
                          <T className="size-3.5" /> {TYPE_META[t].label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <Button onClick={addSection} variant="hero"><Plus className="size-4" /> Nova seção</Button>
      </div>

      <Dialog open={!!editing} onOpenChange={o => {
        if (o) return;
        // Auto-save antes de fechar (se houver alterações e a aula tiver título)
        if (dirty && editing?.title?.trim()) {
          saveLesson({ silent: true, keepOpen: false });
          return;
        }
        if (dirty && !editing?.title?.trim()) {
          if (!confirm("Esta aula ainda não tem título e não pode ser salva. Fechar e descartar?")) return;
        }
        if (editing) {
          const key = draftKeyFor(editing);
          if (key) try { localStorage.removeItem(key); } catch {/* */}
        }
        setOriginalSnapshot("");
        setEditing(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {editing?.id ? "Editar aula" : "Nova aula"} — {editing && TYPE_META[editing.lesson_type as Lesson["lesson_type"]]?.label}
              {saving ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Salvando…
                </span>
              ) : dirty ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  ● Editando — alterações não salvas
                </span>
              ) : autoSavedAt ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  ● Salvo às {autoSavedAt.toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  ● Pronto
                </span>
              )}
              {editing?.id && (
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs"
                  onClick={() => { setHistoryList(readHistory(editing.id as string)); setHistoryOpen(true); }}>
                  Histórico ({readHistory(editing.id as string).length})
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {dirty && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2 flex items-center gap-2">
              {saving ? <Loader2 className="size-3 animate-spin" /> : null}
              {saving ? "Salvando…" : "Alterações não salvas — auto-save a cada 15s, ao trocar de aba, ao fechar a aula e ao sair da página."}
            </div>
          )}
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={editing.title ?? ""} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>

              {(editing.lesson_type === "text" || editing.lesson_type === "video") && (
                <div className="border border-border rounded-lg p-3 bg-secondary/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Vídeo do YouTube</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => setYtPickerOpen(true)}>
                      <Video className="size-3.5" /> {editing.content?.youtube?.videoId ? "Trocar vídeo" : "Buscar vídeo"}
                    </Button>
                  </div>
                  {editing.content?.youtube?.videoId ? (
                    <div className="flex items-center gap-3">
                      <img src={editing.content.youtube.thumbnail} alt="" className="w-32 aspect-video object-cover rounded" />
                      <div className="text-xs flex-1 min-w-0">
                        <div className="font-medium truncate">{editing.content.youtube.title}</div>
                        <div className="text-muted-foreground truncate">{editing.content.youtube.channel}</div>
                        <a href={editing.content.youtube.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Abrir no YouTube</a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nenhum vídeo associado. A busca usa a API oficial do YouTube — nenhuma URL é gerada pela IA.
                    </p>
                  )}
                </div>
              )}

              {editing.lesson_type === "video" && (
                <div className="space-y-2">
                  <Label>Arquivo de vídeo (MP4)</Label>
                  {editing.video_path && <p className="text-xs text-muted-foreground break-all">Atual: {editing.video_path}{editing.duration_seconds ? ` · ${Math.round(editing.duration_seconds / 60)} min` : ""}</p>}
                  <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-md border border-border hover:bg-secondary w-fit">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {editing.video_path ? "Trocar vídeo" : "Enviar vídeo"}
                    <input type="file" accept="video/mp4,video/*" className="hidden" disabled={saving}
                      onChange={e => e.target.files?.[0] && onVideoUpload(e.target.files[0])} />
                  </label>
                  <p className="text-xs text-muted-foreground">Recomendado: MP4 H.264, 10–20 min, até 500 MB.</p>
                </div>
              )}

              {editing.lesson_type === "text" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="block">Conteúdo da aula</Label>
                    {editing.id && isMaster && (
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => setImgAiTarget({ lessonId: editing.id as string, title: editing.title || "Aula" })}>
                        <ImageIcon className="size-3.5" /> Gerar a partir de imagem
                      </Button>
                    )}
                  </div>
                  <ImageDropZone onFiles={(files) => files[0] && uploadLessonImage(files[0])} multiple={false} showHint>
                    <RichTextEditor
                      value={editing.content?.html ?? editing.content?.body ?? ""}
                      onChange={(html) => setEditing(prev => prev ? { ...prev, content: { ...(prev.content ?? {}), html, body: html } } : prev)}
                      onUploadImage={uploadLessonImage}
                    />
                  </ImageDropZone>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a barra de ferramentas para formatar (negrito, cor, destaque, listas, alinhamento, fonte). Para imagens: clique no ícone de imagem na barra, arraste, ou cole (Ctrl+V). Recomendado até 1200 px de largura e 2 MB.
                  </p>
                </div>
              )}

              {editing.lesson_type === "quiz" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs">Nota mínima de aprovação (%)</Label>
                    <Input type="number" min={0} max={100} value={editing.passing_score ?? 70} className="w-20"
                      onChange={e => setEditing({ ...editing, passing_score: Number(e.target.value) })} />
                  </div>
                  {(editing.content?.questions ?? []).map((q: any, qi: number) => (
                    <div key={qi} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Pergunta {qi + 1}</span>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          const qs = [...editing.content.questions]; qs.splice(qi, 1);
                          setEditing({ ...editing, content: { ...editing.content, questions: qs } });
                        }}><Trash2 className="size-3.5" /></Button>
                      </div>
                      <Textarea rows={2} value={q.question} placeholder="Texto da pergunta"
                        onChange={e => {
                          const qs = [...editing.content.questions]; qs[qi] = { ...q, question: e.target.value };
                          setEditing({ ...editing, content: { ...editing.content, questions: qs } });
                        }} />
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" checked={q.correct === oi} onChange={() => {
                            const qs = [...editing.content.questions]; qs[qi] = { ...q, correct: oi };
                            setEditing({ ...editing, content: { ...editing.content, questions: qs } });
                          }} />
                          <Input value={opt} placeholder={`Alternativa ${oi + 1}`}
                            onChange={e => {
                              const qs = [...editing.content.questions]; const opts = [...q.options]; opts[oi] = e.target.value;
                              qs[qi] = { ...q, options: opts };
                              setEditing({ ...editing, content: { ...editing.content, questions: qs } });
                            }} />
                        </div>
                      ))}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    const qs = [...(editing.content?.questions ?? []), { question: "", options: ["", "", "", ""], correct: 0 }];
                    setEditing({ ...editing, content: { ...editing.content, questions: qs } });
                  }}><Plus className="size-3.5" /> Adicionar pergunta</Button>
                </div>
              )}

              {editing.lesson_type === "flip" && (
                <div className="space-y-3">
                  {(editing.content?.items ?? []).map((it: any, i: number) => (
                    <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Cartão {i + 1}</span>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          const items = [...editing.content.items]; items.splice(i, 1);
                          setEditing({ ...editing, content: { ...editing.content, items } });
                        }}><Trash2 className="size-3.5" /></Button>
                      </div>
                      <Textarea rows={3} placeholder="Frente" value={it.front}
                        onChange={e => { const items = [...editing.content.items]; items[i] = { ...it, front: e.target.value }; setEditing({ ...editing, content: { ...editing.content, items } }); }} />
                      <Textarea rows={3} placeholder="Verso" value={it.back}
                        onChange={e => { const items = [...editing.content.items]; items[i] = { ...it, back: e.target.value }; setEditing({ ...editing, content: { ...editing.content, items } }); }} />
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    const items = [...(editing.content?.items ?? []), { front: "", back: "" }];
                    setEditing({ ...editing, content: { ...editing.content, items } });
                  }}><Plus className="size-3.5" /> Adicionar cartão</Button>
                </div>
              )}

              {editing.lesson_type === "accordion" && (
                <div className="space-y-3">
                  {(editing.content?.items ?? []).map((it: any, i: number) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Item {i + 1}</span>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          const items = [...editing.content.items]; items.splice(i, 1);
                          setEditing({ ...editing, content: { ...editing.content, items } });
                        }}><Trash2 className="size-3.5" /></Button>
                      </div>
                      <Input placeholder="Título" value={it.title}
                        onChange={e => { const items = [...editing.content.items]; items[i] = { ...it, title: e.target.value }; setEditing({ ...editing, content: { ...editing.content, items } }); }} />
                      <Textarea rows={3} placeholder="Conteúdo" value={it.body}
                        onChange={e => { const items = [...editing.content.items]; items[i] = { ...it, body: e.target.value }; setEditing({ ...editing, content: { ...editing.content, items } }); }} />
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    const items = [...(editing.content?.items ?? []), { title: "", body: "" }];
                    setEditing({ ...editing, content: { ...editing.content, items } });
                  }}><Plus className="size-3.5" /> Adicionar item</Button>
                </div>
              )}

              <LessonAttachmentsEditor
                value={(editing.content?.attachments ?? []) as Attachment[]}
                onChange={(attachments) =>
                  setEditing(prev => prev ? { ...prev, content: { ...(prev.content ?? {}), attachments } } : prev)
                }
                onUploadFile={uploadLessonMaterial}
              />

              <Button onClick={() => saveLesson()} variant="hero" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar aula
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AiGenerateDialog
        open={!!aiTarget}
        onOpenChange={(o) => !o && setAiTarget(null)}
        title={aiTarget?.kind === "module" ? `Gerar conteúdo do módulo: ${aiTarget.title}` : `Gerar conteúdo da aula: ${aiTarget?.title ?? ""}`}
        description={aiTarget?.kind === "module" ? "A IA vai gerar/regerar o conteúdo de TODAS as aulas deste módulo (texto, quiz, flashcards). Pode levar alguns minutos." : "A IA vai gerar/regerar o conteúdo desta aula. Conteúdo atual será substituído."}
        busy={aiBusy}
        onConfirm={runAi}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Histórico de versões (últimas 10)</DialogTitle></DialogHeader>
          {historyList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma versão salva ainda. As versões são registradas a cada salvamento.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {historyList.map((h, i) => (
                <div key={i} className="flex items-center justify-between gap-2 border border-border rounded-md p-2 text-sm">
                  <div>
                    <div className="font-medium">{i === 0 ? "Versão atual" : `Versão -${i}`}</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.savedAt).toLocaleString()} — “{(h.data?.title ?? "sem título").slice(0, 60)}”</div>
                  </div>
                  <Button size="sm" variant="outline" disabled={i === 0} onClick={() => {
                    if (!confirm("Restaurar esta versão? O conteúdo atual será substituído (você ainda poderá salvar para confirmar).")) return;
                    setEditing(h.data);
                    setOriginalSnapshot("__restored__");
                    setHistoryOpen(false);
                    toast.success("Versão restaurada. Revise e clique em Salvar.");
                  }}>Restaurar</Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LessonImageAiDialog
        open={!!imgAiTarget}
        onOpenChange={(o) => !o && setImgAiTarget(null)}
        lessonTitle={imgAiTarget?.title ?? ""}
        onConfirm={runImageAi}
        busy={imgAiBusy}
      />

      <YoutubePickerDialog
        open={ytPickerOpen}
        onOpenChange={setYtPickerOpen}
        initialQuery={editing?.content?.ai_meta?.youtube?.youtube_query ?? editing?.content?.youtube_query ?? editing?.title ?? ""}
        current={editing?.content?.youtube ?? null}
        onPick={(v: YoutubeVideo, q: string) => {
          if (!editing) return;
          const prevMeta = (editing.content?.ai_meta as any) ?? {};
          setEditing({
            ...editing,
            content: {
              ...(editing.content ?? {}),
              youtube: {
                videoId: v.videoId, title: v.title, channel: v.channel,
                thumbnail: v.thumbnail, url: v.url, duration_seconds: v.duration_seconds,
              },
              ai_meta: {
                ...prevMeta,
                youtube: {
                  youtube_query: q,
                  selected_video_id: v.videoId,
                  selected_at: new Date().toISOString(),
                  source: "manual",
                },
              },
            },
          });
          setYtPickerOpen(false);
          toast.success("Vídeo selecionado. Lembre-se de salvar a aula.");
        }}
        onClear={() => {
          if (!editing) return;
          const c = { ...(editing.content ?? {}) };
          delete (c as any).youtube;
          setEditing({ ...editing, content: c });
          setYtPickerOpen(false);
        }}
      />
    </div>
  );
};

const AdminCursoBuilder = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminCursoBuilder;