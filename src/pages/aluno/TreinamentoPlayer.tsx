import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, CheckCircle2, ExternalLink, Loader2, PlayCircle, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Training = {
  id: string; title: string; slug: string; description: string | null;
  meet_url: string | null; meet_scheduled_at: string | null;
};
type Lesson = {
  id: string; title: string; description: string | null;
  video_url: string | null; video_kind: string; position: number;
};

const youtubeEmbed = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

const TreinamentoPlayer = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [training, setTraining] = useState<Training | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data: t } = await supabase.from("trainings").select("id,title,slug,description,meet_url,meet_scheduled_at").eq("slug", slug).maybeSingle();
      if (!t) { setLoading(false); return; }
      setTraining(t as Training);
      const { data: ls } = await supabase.from("training_lessons").select("id,title,description,video_url,video_kind,position").eq("training_id", t.id).order("position");
      const list = (ls ?? []) as Lesson[];
      setLessons(list);
      setCurrent(list[0] ?? null);
      if (user) {
        const { data: p } = await supabase.from("training_progress").select("lesson_id").eq("user_id", user.id).eq("training_id", t.id);
        setDone(new Set((p ?? []).map((x: any) => x.lesson_id)));
      }
      setLoading(false);
    })();
  }, [slug, user]);

  useEffect(() => {
    (async () => {
      setVideoSrc(null);
      if (!current?.video_url) return;
      if (current.video_kind === "upload") {
        const { data, error } = await supabase.storage.from("course-videos").createSignedUrl(current.video_url, 60 * 60 * 4);
        if (error) return toast({ title: "Erro ao carregar vídeo", description: error.message, variant: "destructive" });
        setVideoSrc(data.signedUrl);
      } else if (current.video_kind === "youtube") {
        setVideoSrc(youtubeEmbed(current.video_url) ?? current.video_url);
      } else {
        setVideoSrc(current.video_url);
      }
    })();
  }, [current]);

  const markDone = async () => {
    if (!current || !user) return;
    if (done.has(current.id)) return;
    const { error } = await supabase.from("training_progress").insert({
      user_id: user.id, training_id: training!.id, lesson_id: current.id,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setDone(d => new Set([...d, current.id]));
    toast({ title: "Aula concluída ✓" });
    const idx = lessons.findIndex(l => l.id === current.id);
    if (idx >= 0 && lessons[idx + 1]) setCurrent(lessons[idx + 1]);
  };

  const pct = useMemo(() => lessons.length ? Math.round((done.size / lessons.length) * 100) : 0, [done, lessons]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!training) return <div className="p-10 text-center text-muted-foreground">Treinamento não encontrado.</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/aluno/treinamentos"><ArrowLeft className="size-4" /> Voltar</Link></Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">{training.title}</h1>
          {training.description && <p className="text-sm text-muted-foreground max-w-2xl mt-1">{training.description}</p>}
        </div>
        {training.meet_url && (
          <Button asChild variant="outline"><a href={training.meet_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Entrar no Meet</a></Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {(() => {
              const hasVideo = !!current?.video_url;
              if (!current) {
                return <div className="aspect-video bg-black grid place-items-center"><span className="text-muted-foreground">Selecione uma aula</span></div>;
              }
              if (!hasVideo) {
                return (
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/20 p-8 grid place-items-center min-h-[200px]">
                    <div className="text-center space-y-2">
                      <Video className="size-10 mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">Aula em formato de texto — leia o conteúdo abaixo.</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="aspect-video bg-black grid place-items-center">
                  {!videoSrc ? <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    : current.video_kind === "upload" ? <video src={videoSrc} controls className="w-full h-full" />
                    : current.video_kind === "youtube" ? <iframe src={videoSrc} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                    : <a href={videoSrc} target="_blank" rel="noreferrer" className="text-white underline">Abrir vídeo externo <ExternalLink className="inline size-3" /></a>}
                </div>
              );
            })()}
            {current && (
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{current.title}</h2>
                    {current.description && <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{current.description}</p>}
                  </div>
                  <Button variant={done.has(current.id) ? "secondary" : "hero"} onClick={markDone} disabled={done.has(current.id)}>
                    {done.has(current.id) ? <><CheckCircle2 className="size-4" /> Concluída</> : <><Check className="size-4" /> Marcar concluída</>}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Video className="size-4" /> Aulas</CardTitle>
            <div className="space-y-1 pt-1">
              <Progress value={pct} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">{done.size}/{lessons.length} concluídas · {pct}%</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[520px] overflow-y-auto">
            {lessons.map((l, i) => (
              <button key={l.id} onClick={() => setCurrent(l)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-smooth ${current?.id === l.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                {done.has(l.id) ? <CheckCircle2 className="size-4 shrink-0" /> : <PlayCircle className="size-4 shrink-0" />}
                <span className="flex-1 truncate">{i + 1}. {l.title}</span>
              </button>
            ))}
            {lessons.length === 0 && <p className="text-xs text-muted-foreground">Sem aulas ainda.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TreinamentoPlayer;