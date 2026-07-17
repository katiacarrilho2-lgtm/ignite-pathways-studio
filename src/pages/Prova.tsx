import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, AlertTriangle, PartyPopper, XCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";

type Exam = {
  id: string; application_id: string; course_title: string; status: string;
  score: number | null; passed: boolean | null; duration_minutes: number; passing_score: number;
  access_token: string; started_at: string | null; completed_at: string | null;
  candidate_name: string | null;
};
type Question = { id: string; position: number; text: string; options: string[]; correct_index: number };
type App = { full_name: string };

type Phase = "loading" | "intro" | "countdown" | "running" | "done" | "error";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Prova() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [exam, setExam] = useState<Exam | null>(null);
  const [app, setApp] = useState<App | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const submittedRef = useRef(false);

  // load
  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: ex } = await supabase.from("enrollment_exams").select("*").eq("access_token", token).maybeSingle();
      if (!ex) { setPhase("error"); return; }
      setExam(ex as Exam);
      const { data: qs } = await supabase.from("enrollment_exam_questions").select("*").eq("exam_id", ex.id).order("position");
      setQuestions((qs ?? []) as Question[]);
      const { data: a } = await supabase.from("enrollment_applications").select("full_name").eq("id", ex.application_id).maybeSingle();
      setApp((a as App) ?? { full_name: (ex as any).candidate_name ?? "Candidato(a)" });
      if (ex.status === "completed") {
        setResult({ score: ex.score ?? 0, passed: !!ex.passed });
        setPhase("done");
      } else {
        setPhase("intro");
      }
    })();
  }, [token]);

  // countdown 3-2-1
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { startExam(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // timer
  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) { submit(true); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  const startExam = async () => {
    if (!exam) return;
    setSecondsLeft(exam.duration_minutes * 60);
    setPhase("running");
    await supabase.from("enrollment_exams").update({ status: "in_progress", started_at: new Date().toISOString() }).eq("id", exam.id);
  };

  const submit = async (timeUp = false) => {
    if (!exam || submittedRef.current) return;
    submittedRef.current = true;
    const total = questions.length;
    const points = 100 / total;
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct_index) correct++; });
    const score = Math.round(correct * points);
    const passed = score >= exam.passing_score;
    await supabase.from("enrollment_exams").update({
      status: "completed", score, passed, completed_at: new Date().toISOString(),
    }).eq("id", exam.id);
    setResult({ score, passed });
    setPhase("done");
    if (timeUp) toast.warning("Tempo esgotado! Prova finalizada automaticamente.");
  };

  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  if (phase === "loading") return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin" /></div>;

  if (phase === "error") return (
    <div className="min-h-screen grid place-items-center bg-secondary/30 p-4">
      <Card className="p-8 max-w-md text-center">
        <AlertTriangle className="size-12 mx-auto text-amber-500 mb-3" />
        <h1 className="text-xl font-bold">Prova não encontrada</h1>
        <p className="text-muted-foreground text-sm mt-2">Verifique o link enviado pela secretaria.</p>
      </Card>
    </div>
  );

  if (phase === "intro" && exam && app) return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-primary/5 to-secondary/30 p-4">
      <Card className="p-8 md:p-10 max-w-xl w-full space-y-5 text-center animate-in fade-in zoom-in duration-500">
        <div className="mx-auto size-16 rounded-full bg-primary/10 grid place-items-center"><GraduationCap className="size-8 text-primary" /></div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Prova de avaliação</p>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Olá, {app.full_name}!</h1>
          <p className="text-muted-foreground mt-1">Curso: <strong>{exam.course_title}</strong></p>
        </div>
        <div className="text-left bg-secondary/40 rounded-lg p-4 text-sm space-y-2">
          <p>📌 <strong>{questions.length} questões</strong> de múltipla escolha.</p>
          <p>⏱️ Você terá <strong>{exam.duration_minutes} minutos</strong> para concluir a prova.</p>
          <p>🎯 Cada acerto vale <strong>{Math.round(100/questions.length)} pontos</strong>. Precisa de <strong>{exam.passing_score} pontos</strong> para passar.</p>
          <p>⚠️ Ao iniciar, o cronômetro <strong>não pode ser pausado</strong>.</p>
        </div>
        <Button size="lg" variant="hero" className="w-full" onClick={() => { setCountdown(3); setPhase("countdown"); }}>
          Iniciar prova
        </Button>
      </Card>
    </div>
  );

  if (phase === "countdown") return (
    <div className="min-h-screen grid place-items-center bg-primary text-primary-foreground">
      <div key={countdown} className="text-[12rem] md:text-[18rem] font-black animate-in zoom-in fade-in duration-700">
        {countdown > 0 ? countdown : "Vai!"}
      </div>
    </div>
  );

  if (phase === "running" && exam) {
    const q = questions[current];
    return (
      <div className="min-h-screen bg-secondary/30">
        <header className="sticky top-0 z-10 bg-card border-b">
          <div className="container max-w-3xl py-3 flex items-center justify-between gap-4">
            <div className="text-sm font-medium">{app?.full_name}</div>
            <div className={`flex items-center gap-2 font-mono font-bold ${secondsLeft < 60 ? "text-destructive animate-pulse" : ""}`}>
              <Clock className="size-4" /> {fmt(secondsLeft)}
            </div>
          </div>
          <Progress value={(answered / questions.length) * 100} className="h-1 rounded-none" />
        </header>
        <main className="container max-w-3xl py-6 space-y-4">
          <p className="text-sm text-muted-foreground">Questão {current + 1} de {questions.length} · {answered} respondidas</p>
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold leading-relaxed">{q.text}</h2>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button key={i} type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all flex gap-3 items-start ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}>
                    <span className={`size-7 shrink-0 rounded-full grid place-items-center font-bold text-sm ${selected ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{"ABCD"[i]}</span>
                    <span className="pt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          <div className="flex gap-2 justify-between">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Anterior</Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => c + 1)}>Próxima</Button>
            ) : (
              <Button variant="hero" onClick={() => submit(false)}>Finalizar prova</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {questions.map((qq, i) => (
              <button key={qq.id} onClick={() => setCurrent(i)}
                className={`size-8 rounded text-xs font-bold ${i === current ? "bg-primary text-primary-foreground" : answers[qq.id] !== undefined ? "bg-emerald-500/20 text-emerald-700" : "bg-secondary"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (phase === "done" && result) {
    if (result.passed) {
      return (
        <div className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-500/10 to-primary/10 p-4 overflow-hidden relative">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute top-0 animate-[fall_3s_linear_infinite]"
              style={{ left: `${(i * 3.3) % 100}%`, animationDelay: `${(i % 10) * 0.3}s`, fontSize: 24 }}>
              {["🎉","✨","🎊","⭐"][i % 4]}
            </div>
          ))}
          <style>{`@keyframes fall{0%{transform:translateY(-50px) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}`}</style>
          <Card className="p-10 max-w-md text-center space-y-4 relative z-10 animate-in zoom-in duration-700">
            <PartyPopper className="size-16 mx-auto text-emerald-500 animate-bounce" />
            <h1 className="text-4xl font-black text-emerald-600">Parabéns!</h1>
            <p className="text-muted-foreground">{app?.full_name}, você foi aprovado!</p>
            <div className="text-6xl font-black text-primary">{result.score}<span className="text-xl text-muted-foreground">/100</span></div>
            <p className="text-sm text-muted-foreground">Procure a secretaria para concluir sua matrícula.</p>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen grid place-items-center bg-secondary/30 p-4">
        <Card className="p-10 max-w-md text-center space-y-4 animate-in zoom-in duration-500">
          <XCircle className="size-16 mx-auto text-rose-500" />
          <h1 className="text-3xl font-bold text-rose-600">Não foi dessa vez…</h1>
          <div className="text-5xl font-black text-muted-foreground">{result.score}<span className="text-xl">/100</span></div>
          <p className="text-muted-foreground">Tente uma próxima vez! <br/><strong>Agende a reprova na secretaria.</strong></p>
        </Card>
      </div>
    );
  }

  return null;
}