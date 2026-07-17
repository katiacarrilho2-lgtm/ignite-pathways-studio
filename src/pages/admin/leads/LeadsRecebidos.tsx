import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";

const SITUACOES = [
  { v: "reengajar", label: "Reengajar" },
  { v: "lista_espera", label: "Lista de espera" },
  { v: "aguardando_proxima_turma", label: "Aguardando próxima turma" },
  { v: "ja_atendido", label: "Já atendido" },
  { v: "arquivado", label: "Arquivado" },
];

export default function LeadsRecebidos() {
  const [leads, setLeads] = useState<any[]>([]);
  const load = async () => {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setLeads(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    load();
  };

  const enviarBanco = async (l: any, situacao: string) => {
    const { error } = await (supabase.from("leads_bank" as any) as any).insert({
      nome: l.name || "(sem nome)",
      email: l.email,
      whatsapp: l.phone,
      curso_interesse: l.source || null,
      situacao,
      origem: "site",
      notas: l.message || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Enviado para o Banco de Leads");
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Recebidos pelos formulários do site</h2>
        <p className="text-sm text-muted-foreground">Contatos vindos das páginas públicas. Envie para o Banco de Leads para nunca perder o histórico.</p>
      </div>
      <div className="bg-card border border-border rounded-xl divide-y">
        {leads.map(l => (
          <div key={l.id} className="p-4 grid md:grid-cols-[1fr_auto] gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-primary">{l.name}</span>
                {l.source && <span className="text-xs px-2 py-0.5 rounded bg-secondary">{l.source}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{l.email} · {l.phone}</p>
              {l.message && <p className="text-sm mt-2 whitespace-pre-wrap">{l.message}</p>}
              <p className="text-xs text-muted-foreground mt-2">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col md:items-end gap-2">
              <div className="flex flex-wrap gap-1">
                {SITUACOES.map(s => (
                  <Button key={s.v} size="sm" variant="outline"
                    onClick={() => enviarBanco(l, s.v)}
                    className="text-xs h-7">
                    <ArrowRightCircle className="size-3 mr-1" />{s.label}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="text-destructive self-end" onClick={() => remove(l.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {leads.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum lead ainda.</p>}
      </div>
    </div>
  );
}