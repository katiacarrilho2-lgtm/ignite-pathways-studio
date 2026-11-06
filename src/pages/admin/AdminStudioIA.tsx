import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clapperboard, Download, Loader2, Pause, Play, Wand2 } from "lucide-react";

type Cena = { titulo: string; duracao_seg: number; texto_tela: string; narracao: string; visual: string; alerta?: string };
const PILOT = "2c504a42-9a81-4b00-b3fe-2ce2d733c602";

export default function AdminStudioIA() {
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState("");
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [cenas, setCenas] = useState<Cena[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const timer = useRef<number>();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id,title").order("title");
      setCourses(data ?? []);
      const { data: l } = await supabase.from("course_lessons").select("id, course_sections(course_id)").eq("id", PILOT).maybeSingle();
      const cid = (l as any)?.course_sections?.course_id;
      if (cid) { setCourseId(cid); setLessonId(PILOT); }
    })();
  }, []);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const { data, error } = await supabase.from("course_lessons")
        .select("id,title,sort_order,content,course_sections!inner(course_id,title,sort_order)")
        .eq("course_sections.course_id", courseId);
      if (error) toast.error("Erro ao carregar aulas: " + error.message);
      const s = (data ?? []).sort((a: any, b: any) =>
        ((a.course_sections.sort_order ?? 0) - (b.course_sections.sort_order ?? 0)) || ((a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setLessons(s);
    })();
  }, [courseId]);

  useEffect(() => {
    const saved = lessonId && localStorage.getItem(`studio:${lessonId}`);
    setCenas(saved ? JSON.parse(saved) : []);
    setIdx(0); setPlaying(false);
  }, [lessonId]);

  useEffect(() => { if (lessonId && cenas.length) localStorage.setItem(`studio:${lessonId}`, JSON.stringify(cenas)); }, [cenas, lessonId]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    window.speechSynthesis?.cancel();
    if (!playing || !cenas[idx]) return;
    const u = new SpeechSynthesisUtterance(cenas[idx].narracao);
    u.lang = "pt-BR";
    u.onend = () => (idx < cenas.length - 1 ? setIdx(idx + 1) : setPlaying(false));
    window.speechSynthesis?.speak(u);
    return () => window.speechSynthesis?.cancel();
  }, [playing, idx, cenas]);

  const lesson = lessons.find((l) => l.id === lessonId);
  const course = courses.find((c) => c.id === courseId);

  const gerar = async () => {
    if (!lesson) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("studio-roteiro", {
      body: { lessonTitle: lesson.title, courseTitle: course?.title, content: lesson.content },
    });
    setLoading(false);
    if (error || data?.error) return toast.error(data?.error ?? "Não foi possível gerar o roteiro");
    setCenas(data.cenas ?? []); setIdx(0);
    toast.success(`${data.cenas?.length ?? 0} cenas criadas`);
  };

  const upd = (i: number, k: keyof Cena, v: any) => setCenas((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const total = cenas.reduce((s, c) => s + Number(c.duracao_seg || 0), 0);
  const imgs: string[] = [lesson?.content?.image_url, ...(lesson?.content?.extra_images ?? []).map((x: any) => x?.url ?? x)].filter(Boolean);

  const exportar = (fmt: "json" | "md") => {
    const body = fmt === "json" ? JSON.stringify({ curso: course?.title, aula: lesson?.title, cenas }, null, 2)
      : `# ${lesson?.title}\n\n` + cenas.map((c, i) => `## Cena ${i + 1} — ${c.titulo} (${c.duracao_seg}s)\n**Tela:** ${c.texto_tela}\n\n**Visual:** ${c.visual}\n\n**Narração:** ${c.narracao}\n${c.alerta ? `\n> ⚠ ${c.alerta}\n` : ""}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    a.download = `roteiro-${lesson?.title ?? "aula"}.${fmt}`; a.click();
  };

  const cur = cenas[idx];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Clapperboard className="h-7 w-7 text-primary" />
        <div><h1 className="text-2xl font-bold">Multplick Studio IA</h1>
          <p className="text-sm text-muted-foreground">Transforme aulas em roteiros de videoaula por cenas. O texto original da aula não é alterado.</p></div>
      </div>

      <Card className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
        <select className="h-10 rounded-md border bg-background px-3" value={courseId} onChange={(e) => { setCourseId(e.target.value); setLessonId(""); }}>
          <option value="">Escolha o curso</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
          <option value="">Escolha a aula</option>
          {lessons.map((l) => <option key={l.id} value={l.id}>{l.course_sections.title} · {l.title}</option>)}
        </select>
        <Button onClick={gerar} disabled={!lesson || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {cenas.length ? "Gerar de novo" : "Gerar roteiro"}
        </Button>
      </Card>

      {cenas.length > 0 && (
        <>
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-foreground text-background">
              {imgs.length > 0 && <img src={imgs[idx % imgs.length]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
              <div className="relative flex h-full flex-col justify-end gap-2 p-6 md:p-10">
                <span className="text-xs uppercase tracking-widest text-primary">Cena {idx + 1}/{cenas.length}</span>
                <h2 className="text-2xl font-bold md:text-4xl">{cur?.titulo}</h2>
                <p className="text-lg md:text-xl">{cur?.texto_tela}</p>
                {cur?.alerta && <p className="w-fit rounded bg-destructive px-3 py-1 text-sm text-destructive-foreground">⚠ {cur.alerta}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3">
              <Button size="sm" onClick={() => setPlaying(!playing)}>{playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}{playing ? "Pausar" : "Assistir prévia"}</Button>
              <Button size="sm" variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={idx >= cenas.length - 1} onClick={() => setIdx(idx + 1)}>Próxima</Button>
              <span className="ml-auto text-sm text-muted-foreground">Duração total ≈ {Math.floor(total / 60)}min {total % 60}s</span>
              <Button size="sm" variant="outline" onClick={() => exportar("md")}><Download className="mr-1 h-4 w-4" />Markdown</Button>
              <Button size="sm" variant="outline" onClick={() => exportar("json")}><Download className="mr-1 h-4 w-4" />JSON</Button>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground">Prévia usa a voz do próprio navegador. A narração profissional entra na próxima fase.</p>

          <div className="grid gap-4">
            {cenas.map((c, i) => (
              <Card key={i} className={`space-y-2 p-4 ${i === idx ? "ring-2 ring-primary" : ""}`} onClick={() => setIdx(i)}>
                <div className="flex gap-2">
                  <span className="pt-2 font-bold">{i + 1}.</span>
                  <Input value={c.titulo} onChange={(e) => upd(i, "titulo", e.target.value)} />
                  <Input type="number" className="w-24" value={c.duracao_seg} onChange={(e) => upd(i, "duracao_seg", Number(e.target.value))} />
                </div>
                <label className="text-xs font-medium">Texto na tela</label>
                <Input value={c.texto_tela} onChange={(e) => upd(i, "texto_tela", e.target.value)} />
                <label className="text-xs font-medium">Narração</label>
                <Textarea rows={4} value={c.narracao} onChange={(e) => upd(i, "narracao", e.target.value)} />
                <label className="text-xs font-medium">Sugestão visual</label>
                <Textarea rows={2} value={c.visual} onChange={(e) => upd(i, "visual", e.target.value)} />
                <label className="text-xs font-medium">Alerta técnico</label>
                <Input value={c.alerta ?? ""} onChange={(e) => upd(i, "alerta", e.target.value)} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
