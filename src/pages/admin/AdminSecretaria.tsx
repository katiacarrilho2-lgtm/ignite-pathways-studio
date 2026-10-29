import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, UserCheck, ClipboardList, Users2, CalendarCheck, FileCheck2, Search } from "lucide-react";
import { buildWhatsappLink } from "@/lib/crm";
import { toast } from "sonner";

type Aluno = {
  user_id: string; nome: string; phone: string | null; curso: string | null;
  ultimo: string | null; concluidas: number;
};

const DAY = 86400000;

export default function AdminSecretaria() {
  const [rows, setRows] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState("7");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: enrs, error } = await supabase.from("enrollments").select("user_id, course_id");
      if (error) { toast.error(error.message); setLoading(false); return; }
      const userIds = Array.from(new Set((enrs ?? []).map((e: any) => e.user_id).filter(Boolean)));
      const courseIds = Array.from(new Set((enrs ?? []).map((e: any) => e.course_id).filter(Boolean)));
      if (!userIds.length) { setRows([]); setLoading(false); return; }
      const [{ data: sps }, { data: profs }, { data: cs }, { data: prog }] = await Promise.all([
        supabase.from("student_profiles").select("user_id, full_name, phone, phone1, phone2").in("user_id", userIds),
        supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
        courseIds.length ? supabase.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
        supabase.from("lesson_progress").select("user_id, updated_at, completed").in("user_id", userIds),
      ]);
      const sp = new Map((sps ?? []).map((s: any) => [s.user_id, s]));
      const pf = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const cm = new Map((cs ?? []).map((c: any) => [c.id, c.title]));
      const last = new Map<string, string>(); const done = new Map<string, number>();
      for (const p of (prog ?? []) as any[]) {
        if (!last.has(p.user_id) || p.updated_at > last.get(p.user_id)!) last.set(p.user_id, p.updated_at);
        if (p.completed) done.set(p.user_id, (done.get(p.user_id) ?? 0) + 1);
      }
      setRows(userIds.map((uid) => {
        const s: any = sp.get(uid); const p: any = pf.get(uid);
        const e: any = (enrs ?? []).find((x: any) => x.user_id === uid);
        return {
          user_id: uid as string,
          nome: s?.full_name || p?.display_name || "Aluno",
          phone: s?.phone1 || s?.phone || s?.phone2 || null,
          curso: e ? (cm.get(e.course_id) as string) ?? null : null,
          ultimo: last.get(uid as string) ?? null,
          concluidas: done.get(uid as string) ?? 0,
        };
      }));
      setLoading(false);
    })();
  }, []);

  const inativos = useMemo(() => {
    const lim = Number(dias);
    return rows.filter((r) => {
      const d = r.ultimo ? (Date.now() - new Date(r.ultimo).getTime()) / DAY : Infinity;
      if (dias === "nunca" ? r.ultimo !== null : d < lim) return false;
      return !q || r.nome.toLowerCase().includes(q.toLowerCase()) || (r.curso ?? "").toLowerCase().includes(q.toLowerCase());
    }).sort((a, b) => (a.ultimo ?? "").localeCompare(b.ultimo ?? ""));
  }, [rows, dias, q]);

  const chamar = (r: Aluno) => {
    const dd = r.ultimo ? Math.floor((Date.now() - new Date(r.ultimo).getTime()) / DAY) : null;
    const msg = dd !== null
      ? `Olá ${r.nome.split(" ")[0]}, tudo bem? Notamos que você não acessa o curso ${r.curso ?? ""} na Multplick há ${dd} dias. Estamos aqui para te ajudar a continuar seus estudos!`
      : `Olá ${r.nome.split(" ")[0]}, tudo bem? Vimos que você ainda não começou o curso ${r.curso ?? ""} na Multplick. Precisa de ajuda para acessar?`;
    window.open(r.phone ? buildWhatsappLink(r.phone, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const atalhos = [
    { to: "/admin/alunos", label: "Alunos e fichas", icon: UserCheck },
    { to: "/admin/pre-matriculas", label: "Pré-matrículas", icon: ClipboardList },
    { to: "/admin/turmas", label: "Turmas", icon: Users2 },
    { to: "/admin/chamada", label: "Lista de chamada", icon: CalendarCheck },
    { to: "/admin/certificacao", label: "Certificados", icon: FileCheck2 },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Secretaria Escolar</h1>
        <p className="text-muted-foreground">Tudo da secretaria em um só lugar.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {atalhos.map((a) => (
          <Link key={a.to} to={a.to} className="bg-card border border-border rounded-xl p-4 hover:border-primary flex flex-col gap-2">
            <a.icon className="size-5 text-primary" /><span className="text-sm font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2 className="font-semibold text-primary">Alunos que não estão estudando ({inativos.length})</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative"><Search className="size-4 absolute left-2 top-3 text-muted-foreground" />
              <Input className="pl-8 w-56" placeholder="Buscar aluno ou curso" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <Select value={dias} onValueChange={setDias}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Sem estudar há 7+ dias</SelectItem>
                <SelectItem value="15">Sem estudar há 15+ dias</SelectItem>
                <SelectItem value="30">Sem estudar há 30+ dias</SelectItem>
                <SelectItem value="nunca">Nunca assistiu aula</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr><th className="p-2">Aluno</th><th className="p-2">Curso</th><th className="p-2">Último estudo</th><th className="p-2">Aulas concluídas</th><th className="p-2 text-right">Ação</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inativos.map((r) => (
                  <tr key={r.user_id}>
                    <td className="p-2 font-medium">{r.nome}<div className="text-xs text-muted-foreground">{r.phone ?? "sem telefone"}</div></td>
                    <td className="p-2">{r.curso ?? "—"}</td>
                    <td className="p-2">{r.ultimo ? new Date(r.ultimo).toLocaleString("pt-BR") : <Badge variant="secondary">Nunca</Badge>}</td>
                    <td className="p-2">{r.concluidas}</td>
                    <td className="p-2 text-right"><Button size="sm" variant="whatsapp" onClick={() => chamar(r)}><MessageCircle className="size-4 mr-1" />WhatsApp</Button></td>
                  </tr>
                ))}
                {inativos.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum aluno nessa situação.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
