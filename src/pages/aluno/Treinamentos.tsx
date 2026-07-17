import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GraduationCap, ExternalLink, Video, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Training = {
  id: string; title: string; slug: string; description: string | null;
  category: string; audience: string; cover_url: string | null;
  meet_url: string | null; meet_scheduled_at: string | null;
};

const AlunoTreinamentos = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Training[]>([]);
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: trainings } = await supabase.from("trainings")
        .select("id,title,slug,description,category,audience,cover_url,meet_url,meet_scheduled_at")
        .eq("status", "publicado").order("position");
      const t = (trainings ?? []) as Training[];
      setList(t);
      const { data: meets } = await (supabase as any).from("training_meetings")
        .select("*").gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true }).limit(10);
      setMeetings(meets ?? []);
      if (t.length && user) {
        const ids = t.map(x => x.id);
        const [{ data: lessons }, { data: prog }] = await Promise.all([
          supabase.from("training_lessons").select("id,training_id").in("training_id", ids),
          supabase.from("training_progress").select("lesson_id,training_id").eq("user_id", user.id).in("training_id", ids),
        ]);
        const map: Record<string, { done: number; total: number }> = {};
        t.forEach(x => { map[x.id] = { done: 0, total: 0 }; });
        (lessons ?? []).forEach((l: any) => { map[l.training_id].total += 1; });
        (prog ?? []).forEach((p: any) => { if (map[p.training_id]) map[p.training_id].done += 1; });
        setProgress(map);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
          <GraduationCap /> Treinamentos
        </h1>
        <p className="text-sm text-muted-foreground">Aulas, materiais e encontros ao vivo para você vender mais.</p>
      </div>
      {meetings.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="size-5 text-primary" /> Próximos encontros ao vivo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {meetings.map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">📅 {new Date(m.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {m.duration_minutes}min</p>
                  {m.description && <p className="text-xs mt-1 line-clamp-2">{m.description}</p>}
                </div>
                <Button size="sm" variant="hero" asChild><a href={m.meet_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Entrar no Meet</a></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {loading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : list.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum treinamento publicado ainda.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(t => {
            const p = progress[t.id] ?? { done: 0, total: 0 };
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Card key={t.id} className="overflow-hidden hover:shadow-lg transition-smooth">
                {t.cover_url
                  ? <img src={t.cover_url} alt={t.title} className="h-36 w-full object-cover" />
                  : <div className="h-36 w-full bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center"><GraduationCap className="size-10 text-primary/40" /></div>}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{p.done}/{p.total} aulas</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="hero" className="flex-1"><Link to={`/aluno/treinamentos/${t.slug}`}><Video className="size-3.5" /> Acessar</Link></Button>
                    {t.meet_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={t.meet_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Meet</a>
                      </Button>
                    )}
                  </div>
                  {t.meet_scheduled_at && (
                    <p className="text-[11px] text-muted-foreground">
                      📅 {new Date(t.meet_scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlunoTreinamentos;