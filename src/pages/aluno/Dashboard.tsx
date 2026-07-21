import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, PlayCircle } from "lucide-react";

type Enr = {
  id: string;
  progress: number | null;
  status: string | null;
  enrolled_at: string;
  courses: { id: string; title: string; slug: string | null; cover_url: string | null } | null;
};

export default function Dashboard() {
  const [enrollments, setEnrollments] = useState<Enr[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, progress, status, enrolled_at, courses(id, title, slug, cover_url)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });
      if (!error) setEnrollments((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="size-6" />
        <h1 className="text-2xl font-bold">Meus Cursos</h1>
      </div>

      {loading && <p className="text-muted-foreground">Carregando…</p>}

      {!loading && enrollments.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Você ainda não está matriculado em nenhum curso.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((e) => {
          const c = e.courses;
          const progress = Math.max(0, Math.min(100, Number(e.progress ?? 0)));
          return (
            <Link
              key={e.id}
              to={`/aluno/curso/${e.id}`}
              className="group rounded-lg border bg-card overflow-hidden hover:shadow-lg transition"
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                {c?.cover_url ? (
                  <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <BookOpen className="size-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <PlayCircle className="size-12 text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-2">{c?.title ?? "Curso"}</h3>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{progress}% concluído</span>
                  <span className="capitalize">{e.status ?? "ativo"}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
