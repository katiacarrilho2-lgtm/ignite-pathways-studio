import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GraduationCap, Search } from "lucide-react";

type Pre = { id: string; account_id: string; polo: string; full_name: string; course_title: string; status: string; created_at: string; city: string | null; state: string | null };
type Mat = { id: string; account_id: string; polo: string; aluno: string | null; curso: string | null; status: string | null; enrolled_at: string | null };

const dataBr = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

export default function AdminRedeMatriculas() {
  const [pre, setPre] = useState<Pre[]>([]);
  const [mat, setMat] = useState<Mat[]>([]);
  const [polo, setPolo] = useState("todos");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.rpc("rede_pre_matriculas"),
        supabase.rpc("rede_matriculas"),
      ]);
      setPre((p ?? []) as any);
      setMat((m ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const polos = useMemo(() => {
    const map = new Map<string, string>();
    [...pre, ...mat].forEach((r: any) => map.set(r.account_id, r.polo));
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pre, mat]);

  const term = q.trim().toLowerCase();
  const fPre = pre.filter((r) => (polo === "todos" || r.account_id === polo) && (!term || [r.full_name, r.course_title, r.polo].some((v) => (v ?? "").toLowerCase().includes(term))));
  const fMat = mat.filter((r) => (polo === "todos" || r.account_id === polo) && (!term || [r.aluno, r.curso, r.polo].some((v) => (v ?? "").toLowerCase().includes(term))));

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
      <Button asChild variant="ghost" size="sm"><Link to="/admin/licenciados"><ArrowLeft className="size-4" /> Rede Multplick</Link></Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><GraduationCap className="size-7 text-primary" /> Matrículas da Rede</h1>
        <p className="text-muted-foreground">Somente Polos e Revendedores. As fichas da Matriz ficam em Pré-matrículas.</p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar aluno, curso ou polo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={polo} onValueChange={setPolo}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Polos</SelectItem>
            {polos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pre">
        <TabsList>
          <TabsTrigger value="pre">Pré-matrículas ({fPre.length})</TabsTrigger>
          <TabsTrigger value="mat">Matrículas ({fMat.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pre">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Fichas recebidas nos Polos</CardTitle>
              <CardDescription>Visualização da Matriz — as ações de matrícula são do próprio Polo.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Data</th><th className="pr-3">Polo</th><th className="pr-3">Aluno</th><th className="pr-3">Curso</th><th className="pr-3">Cidade</th><th>Status</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>}
                  {!loading && fPre.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma pré-matrícula na Rede.</td></tr>}
                  {fPre.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">{dataBr(r.created_at)}</td>
                      <td className="pr-3">{r.polo}</td>
                      <td className="pr-3 font-medium">{r.full_name}</td>
                      <td className="pr-3 text-muted-foreground">{r.course_title}</td>
                      <td className="pr-3 text-xs">{r.city ? `${r.city}/${r.state ?? ""}` : "—"}</td>
                      <td className="text-xs">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mat">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Matrículas efetivadas nos Polos</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Data</th><th className="pr-3">Polo</th><th className="pr-3">Aluno</th><th className="pr-3">Curso</th><th>Status</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>}
                  {!loading && fMat.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma matrícula na Rede.</td></tr>}
                  {fMat.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">{dataBr(r.enrolled_at)}</td>
                      <td className="pr-3">{r.polo}</td>
                      <td className="pr-3 font-medium">{r.aluno ?? "—"}</td>
                      <td className="pr-3 text-muted-foreground">{r.curso ?? "—"}</td>
                      <td className="text-xs">{r.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
