import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, ExternalLink, Eye, Users } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;
const LINK = "https://multplick.live/catalogo-tecnicos-competencia";

export default function AdminCampanhaCompetencia() {
  const [visitas, setVisitas] = useState<number | null>(null);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    sb.from("campanha_visitas").select("id", { count: "exact", head: true }).eq("campanha", "catalogo-competencia")
      .then(({ count }: any) => setVisitas(count ?? 0));
    sb.from("crm_leads").select("id,nome,telefone,curso_interesse,descricao,created_at,estagio")
      .eq("origem", "catalogo-competencia").order("created_at", { ascending: false }).limit(500)
      .then(({ data }: any) => setLeads(data ?? []));
  }, []);

  const campo = (d: string, k: string) => (d || "").split("\n").find((l) => l.startsWith(k + ": "))?.slice(k.length + 2) ?? "";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Campanha · Técnicos por Competência</h1>
        <p className="text-sm text-muted-foreground">Página exclusiva para quem recebe o link. Não aparece no site nem no Google.</p>
      </div>
      <Card className="flex flex-wrap items-center gap-2 p-4">
        <code className="flex-1 break-all text-sm">{LINK}</code>
        <Button size="sm" onClick={() => { navigator.clipboard.writeText(LINK); toast.success("Link copiado"); }}><Copy className="mr-1 h-4 w-4" />Copiar link</Button>
        <Button size="sm" variant="outline" asChild><a href="/catalogo-tecnicos-competencia" target="_blank" rel="noopener"><ExternalLink className="mr-1 h-4 w-4" />Abrir página</a></Button>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><Eye className="h-4 w-4" />Visitas</div><p className="mt-1 text-3xl font-bold">{visitas ?? "…"}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />Interessados</div><p className="mt-1 text-3xl font-bold">{leads.length}</p></Card>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr>{["Data", "Nome", "WhatsApp", "Cidade", "Experiência", "Cursos", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {leads.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Ainda não há interessados.</td></tr>}
            {leads.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3">{l.nome}</td>
                <td className="p-3 whitespace-nowrap">{l.telefone}</td>
                <td className="p-3">{campo(l.descricao, "cidade")}</td>
                <td className="p-3 max-w-xs">{campo(l.descricao, "experiencia")}</td>
                <td className="p-3 max-w-xs">{l.curso_interesse}</td>
                <td className="p-3"><Button size="sm" variant="outline" asChild><a href={`https://wa.me/55${String(l.telefone || "").replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener">WhatsApp</a></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
