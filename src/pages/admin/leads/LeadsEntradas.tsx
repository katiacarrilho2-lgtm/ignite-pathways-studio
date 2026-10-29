import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, MessageCircle, RefreshCw } from "lucide-react";

const sb = supabase as any;

const ORIGENS: Record<string, string> = {
  "catalogo-competencia": "Link Campanha Competência",
  "teste-vocacional": "Teste Vocacional",
  "gerador-curriculo": "Gerador de Currículo",
  loja: "Site / Loja",
  corporativo: "Empresas (proposta)",
};
const rotulo = (o?: string | null) => (o ? ORIGENS[o] ?? o : "Sem origem");

export default function LeadsEntradas() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("crm_leads").select("id,nome,telefone,email,origem,curso_interesse,descricao,estagio,created_at")
      .order("created_at", { ascending: false }).limit(1000);
    setLeads(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l) => { const k = l.origem || "—"; c[k] = (c[k] ?? 0) + 1; });
    return c;
  }, [leads]);

  const lista = leads.filter((l) =>
    (filtro === "todas" || (l.origem || "—") === filtro) &&
    (!busca || `${l.nome} ${l.telefone} ${l.email} ${l.curso_interesse}`.toLowerCase().includes(busca.toLowerCase())));

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant={filtro === "todas" ? "default" : "outline"} onClick={() => setFiltro("todas")}>Todas ({leads.length})</Button>
        {Object.entries(contagem).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
          <Button key={k} size="sm" variant={filtro === k ? "default" : "outline"} onClick={() => setFiltro(k)}>{rotulo(k === "—" ? null : k)} ({n})</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="size-4" />Atualizar</Button>
      </div>
      <Input placeholder="Buscar por nome, WhatsApp, e-mail ou curso" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md" />

      {loading ? <p className="text-muted-foreground">Carregando…</p> : lista.length === 0 ? <p className="text-muted-foreground">Nenhuma entrada.</p> : (
        <div className="space-y-2">
          {lista.map((l) => {
            const tel = String(l.telefone || "").replace(/\D/g, "").replace(/^55/, "");
            const open = aberto === l.id;
            return (
              <div key={l.id} className="rounded-lg border bg-card">
                <button className="w-full flex flex-wrap items-center gap-3 p-3 text-left" onClick={() => setAberto(open ? null : l.id)}>
                  <Badge variant="secondary">{rotulo(l.origem)}</Badge>
                  <span className="font-semibold">{l.nome}</span>
                  <span className="text-sm text-muted-foreground">{l.telefone}</span>
                  <span className="text-sm text-muted-foreground flex-1 truncate">{l.curso_interesse}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                  {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {open && (
                  <div className="border-t p-3 space-y-3">
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><dt className="inline font-medium">E-mail: </dt><dd className="inline">{l.email || "—"}</dd></div>
                      <div><dt className="inline font-medium">Etapa no CRM: </dt><dd className="inline">{l.estagio}</dd></div>
                    </dl>
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{l.descricao || "Sem dados adicionais."}</div>
                    {tel && <Button size="sm" variant="whatsapp" asChild><a href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp</a></Button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
