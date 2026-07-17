import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Activity } from "lucide-react";
import { toast } from "sonner";

type Row = {
  enrollment_id: string;
  user_id: string;
  progress: number;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  course_title: string;
  course_category: string;
  student_name: string | null;
  student_email: string | null;
};

const Inner = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id, user_id, progress, status, enrolled_at, completed_at,
          courses ( title, category ),
          profiles:user_id ( display_name, email )
        `)
        .order("enrolled_at", { ascending: false });
      if (error) { toast.error(error.message); setLoading(false); return; }
      // profiles relation may not auto-resolve without FK; fetch profiles separately as fallback
      const userIds = Array.from(new Set((data ?? []).map((d: any) => d.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds)
        : { data: [] as any[] };
      const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const mapped: Row[] = (data ?? []).map((d: any) => ({
        enrollment_id: d.id,
        user_id: d.user_id,
        progress: d.progress,
        status: d.status,
        enrolled_at: d.enrolled_at,
        completed_at: d.completed_at,
        course_title: d.courses?.title ?? "—",
        course_category: d.courses?.category ?? "",
        student_name: pmap.get(d.user_id)?.display_name ?? null,
        student_email: pmap.get(d.user_id)?.email ?? null,
      }));
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    const term = q.toLowerCase().trim();
    if (!term) return true;
    return [r.student_name, r.student_email, r.course_title].some(v => (v ?? "").toLowerCase().includes(term));
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Activity className="size-7" /> Andamento dos alunos</h1>
          <p className="text-muted-foreground">Acompanhe o progresso de cada matrícula.</p>
        </div>
        <Input placeholder="Buscar aluno ou curso…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Aluno</th>
              <th className="text-left p-3">Curso</th>
              <th className="text-left p-3 w-64">Progresso</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Matrícula</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum resultado.</td></tr>}
            {filtered.map(r => (
              <tr key={r.enrollment_id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="font-medium text-primary">{r.student_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.student_email}</div>
                </td>
                <td className="p-3">
                  <div className="font-medium">{r.course_title}</div>
                  <div className="text-xs text-muted-foreground">{r.course_category}</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Progress value={r.progress} className="h-2 flex-1" />
                    <span className="text-xs font-medium w-10 text-right">{r.progress}%</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${r.status === "concluido" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                    {r.status === "concluido" ? "Concluído" : "Em andamento"}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(r.enrolled_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminAndamento = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminAndamento;