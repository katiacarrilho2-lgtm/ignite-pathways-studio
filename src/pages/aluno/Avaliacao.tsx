import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { baixarCertificadoPdf } from "@/lib/certificadoPdf";

type Questao = {
  question_id: string;
  ordem: number;
  enunciado: string;
  alternativas: string[];
  resposta_pos: number | null;
  correta: boolean | null;
  correta_pos: number | null;
  explicacao: string | null;
};

type Tentativa = {
  attempt_id: string;
  status: string;
  tentativa: number;
  expira_em: string | null;
  nota: number | null;
  acertos: number | null;
  total_questoes: number | null;
  aprovado: boolean | null;
  nota_minima: number;
  mostrar_respostas: boolean;
  questoes: Questao[];
};

type Status = {
  liberado: boolean;
  motivo?: string;
  aprovado?: boolean;
  tentativas_usadas?: number;
  tentativas_permitidas?: number;
  qtd_questoes?: number;
  nota_minima?: number;
  tempo_minutos?: number | null;
  instrucoes?: string | null;
  questoes_disponiveis?: number;
  tentativa_aberta?: string | null;
};

const Avaliacao = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [curso, setCurso] = useState<string>("");
  const [status, setStatus] = useState<Status | null>(null);
  const [tent, setTent] = useState<Tentativa | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState(false);
  const [agora, setAgora] = useState(Date.now());

  const carregarStatus = useCallback(async () => {
    if (!courseId) return;
    const [{ data: c }, { data: st, error }] = await Promise.all([
      supabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
      supabase.rpc("exam_status_curso", { _course_id: courseId }),
    ]);
    setCurso((c as any)?.title ?? "Avaliação");
    if (error) toast.error(error.message);
    setStatus((st ?? null) as unknown as Status);
    setLoading(false);
  }, [courseId]);

  useEffect(() => { carregarStatus(); }, [carregarStatus]);

  const abrirTentativa = async (attemptId: string) => {
    const { data, error } = await supabase.rpc("exam_tentativa", { _attempt_id: attemptId });
    if (error) return toast.error(error.message);
    const t = data as unknown as Tentativa;
    setTent(t);
    const primeiraSemResposta = t.questoes.findIndex((q) => q.resposta_pos === null);
    setIdx(t.status === "em_andamento" && primeiraSemResposta >= 0 ? primeiraSemResposta : 0);
  };

  const iniciar = async () => {
    if (!courseId) return;
    setAcao(true);
    const { data, error } = await supabase.rpc("exam_iniciar_tentativa", { _course_id: courseId });
    setAcao(false);
    if (error) return toast.error(error.message);
    await abrirTentativa(data as unknown as string);
  };

  // Relógio da prova
  useEffect(() => {
    if (!tent?.expira_em || tent.status !== "em_andamento") return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tent?.expira_em, tent?.status]);

  const restante = useMemo(() => {
    if (!tent?.expira_em || tent.status !== "em_andamento") return null;
    return Math.max(0, Math.floor((new Date(tent.expira_em).getTime() - agora) / 1000));
  }, [tent?.expira_em, tent?.status, agora]);

  const [baixandoCert, setBaixandoCert] = useState(false);
  const baixarCertificado = async (attemptId: string) => {
    setBaixandoCert(true);
    const { data } = await supabase
      .from("certificates")
      .select("numero,codigo_validacao,emitido_em,status,nota_final,carga_horaria_horas,snapshot")
      .eq("attempt_id", attemptId)
      .maybeSingle();
    if (!data) {
      toast.info("O certificado deste curso ainda não está habilitado.");
    } else {
      try { await baixarCertificadoPdf(data as any); }
      catch { toast.error("Não foi possível gerar o PDF agora."); }
    }
    setBaixandoCert(false);
  };

  const finalizar = useCallback(async () => {
    if (!tent) return;
    setAcao(true);
    const { data, error } = await supabase.rpc("exam_finalizar", { _attempt_id: tent.attempt_id });
    setAcao(false);
    if (error) return toast.error(error.message);
    await abrirTentativa(tent.attempt_id);
    await carregarStatus();
    const r = data as any;
    toast[r?.aprovado ? "success" : "info"](r?.aprovado ? "Você foi aprovado!" : "Avaliação finalizada.");
  }, [tent?.attempt_id, carregarStatus]);

  useEffect(() => {
    if (restante === 0 && tent?.status === "em_andamento") finalizar();
  }, [restante, tent?.status, finalizar]);

  const responder = async (pos: number) => {
    if (!tent) return;
    const q = tent.questoes[idx];
    setTent({
      ...tent,
      questoes: tent.questoes.map((x) => (x.question_id === q.question_id ? { ...x, resposta_pos: pos } : x)),
    });
    const { error } = await supabase.rpc("exam_responder", {
      _attempt_id: tent.attempt_id, _question_id: q.question_id, _pos: pos,
    });
    if (error) toast.error(error.message);
  };

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;

  // ---------- Tela de resultado ----------
  if (tent && tent.status !== "em_andamento") {
    const aprovado = !!tent.aprovado;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className={`rounded-2xl border p-6 text-center ${aprovado ? "border-primary/30 bg-secondary" : "border-destructive/30 bg-destructive/5"}`}>
          {aprovado ? <CheckCircle2 className="mx-auto size-10 text-primary" /> : <XCircle className="mx-auto size-10 text-destructive" />}
          <h1 className="mt-3 text-2xl font-bold text-primary">{aprovado ? "APROVADO!" : "Não foi dessa vez"}</h1>
          <p className="mt-1 text-4xl font-bold text-foreground">{Number(tent.nota ?? 0).toFixed(1).replace(".", ",")}</p>
          <p className="text-sm text-muted-foreground">
            {tent.acertos} de {tent.total_questoes} acertos · nota mínima {tent.nota_minima}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {aprovado ? (
              <Button variant="hero" className="h-11" disabled={baixandoCert} onClick={() => baixarCertificado(tent.attempt_id)}>
                BAIXAR CERTIFICADO
              </Button>
            ) : (
              <Button variant="hero" className="h-11" onClick={() => { setTent(null); carregarStatus(); }}>
                FAZER NOVA TENTATIVA
              </Button>
            )}
            <Button asChild variant="outline" className="h-11"><Link to="/aluno/compras">Voltar</Link></Button>
          </div>
          {aprovado && <p className="mt-3 text-xs text-muted-foreground">O certificado também fica disponível em “Certificados”, na sua área do aluno.</p>}
        </div>

        {tent.mostrar_respostas && (
          <div className="space-y-3">
            {tent.questoes.map((q) => (
              <div key={q.question_id} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium">{q.ordem}. {q.enunciado}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.alternativas.map((a, i) => (
                    <li key={i} className={
                      i === q.correta_pos ? "font-semibold text-primary"
                        : i === q.resposta_pos ? "text-destructive line-through" : "text-muted-foreground"
                    }>
                      {String.fromCharCode(65 + i)}) {a}
                    </li>
                  ))}
                </ul>
                {q.explicacao && <p className="mt-2 text-xs text-muted-foreground">{q.explicacao}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Tela da prova ----------
  if (tent) {
    const q = tent.questoes[idx];
    const respondidas = tent.questoes.filter((x) => x.resposta_pos !== null).length;
    const total = tent.questoes.length;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-primary">{curso}</p>
          {restante !== null && (
            <Badge variant={restante < 60 ? "destructive" : "secondary"} className="gap-1">
              <Clock className="size-3" /> {String(Math.floor(restante / 60)).padStart(2, "0")}:{String(restante % 60).padStart(2, "0")}
            </Badge>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm text-muted-foreground">Questão {idx + 1} de {total}</p>
          <Progress value={((idx + 1) / total) * 100} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-lg font-medium leading-snug">{q.enunciado}</p>
          <div className="mt-4 space-y-2">
            {q.alternativas.map((a, i) => (
              <button
                key={i}
                onClick={() => responder(i)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  q.resposta_pos === i ? "border-primary bg-secondary" : "border-border hover:border-primary/50"
                }`}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{a}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-12 flex-1" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            <ArrowLeft className="mr-1 size-4" /> Anterior
          </Button>
          {idx < total - 1 ? (
            <Button variant="hero" className="h-12 flex-1" onClick={() => setIdx(idx + 1)}>
              Próxima <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button variant="hero" className="h-12 flex-1" disabled={acao} onClick={finalizar}>
              {acao ? <Loader2 className="size-4 animate-spin" /> : "FINALIZAR AVALIAÇÃO"}
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {respondidas} de {total} respondidas · suas respostas são salvas automaticamente.
        </p>
      </div>
    );
  }

  // ---------- Tela inicial ----------
  const st = status;
  const semTentativas = (st?.tentativas_usadas ?? 0) >= (st?.tentativas_permitidas ?? 0);
  const bancoInsuficiente = (st?.questoes_disponiveis ?? 0) < (st?.qtd_questoes ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-primary">Avaliação · {curso}</h1>

      {!st?.liberado ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="flex items-center gap-2 font-medium"><AlertCircle className="size-5 text-muted-foreground" />
            {st?.motivo === "sem_acesso"
              ? "Sua avaliação será liberada assim que o pagamento for confirmado."
              : "A avaliação deste curso ainda não está disponível."}
          </p>
          <Button asChild variant="outline" className="mt-4"><Link to="/aluno/compras">Voltar para minhas compras</Link></Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Questões: <strong className="text-foreground">{st.qtd_questoes}</strong></li>
            <li>Nota mínima: <strong className="text-foreground">{st.nota_minima}</strong></li>
            <li>Tentativas: <strong className="text-foreground">{st.tentativas_usadas} de {st.tentativas_permitidas}</strong></li>
            {st.tempo_minutos ? <li>Tempo máximo: <strong className="text-foreground">{st.tempo_minutos} minutos</strong></li> : null}
          </ul>
          {st.instrucoes && <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{st.instrucoes}</p>}

          {st.aprovado ? (
            <p className="mt-4 flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="size-5" /> Você já foi aprovado nesta avaliação.</p>
          ) : semTentativas ? (
            <p className="mt-4 text-sm text-destructive">Você já utilizou todas as tentativas disponíveis.</p>
          ) : bancoInsuficiente ? (
            <p className="mt-4 text-sm text-muted-foreground">A avaliação está sendo preparada. Tente novamente mais tarde.</p>
          ) : (
            <Button variant="hero" className="mt-5 h-12 w-full sm:w-auto" disabled={acao}
              onClick={() => (st.tentativa_aberta ? abrirTentativa(st.tentativa_aberta) : iniciar())}>
              {acao ? <Loader2 className="size-4 animate-spin" /> : st.tentativa_aberta ? "CONTINUAR AVALIAÇÃO" : "INICIAR AVALIAÇÃO"}
            </Button>
          )}
          <Button variant="ghost" className="mt-2 w-full sm:ml-2 sm:w-auto" onClick={() => navigate("/aluno/compras")}>Voltar</Button>
        </div>
      )}
    </div>
  );
};

export default Avaliacao;
