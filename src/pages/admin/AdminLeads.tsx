import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

const AdminLeadsInner = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const load = async () => {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setLeads(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { if (!confirm("Excluir?")) return; await supabase.from("leads").delete().eq("id", id); load(); };

  return (
    <div className="p-8 space-y-6">
      <div><h1 className="text-3xl font-bold text-primary">Leads</h1><p className="text-muted-foreground">Contatos enviados pelos formulários do site</p></div>
      <div className="bg-card border border-border rounded-xl divide-y">
        {leads.map(l => (
          <div key={l.id} className="p-4 grid md:grid-cols-[1fr_auto] gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-primary">{l.name}</span>{l.source && <span className="text-xs px-2 py-0.5 rounded bg-secondary">{l.source}</span>}</div>
              <p className="text-sm text-muted-foreground">{l.email} · {l.phone}</p>
              {l.message && <p className="text-sm mt-2 whitespace-pre-wrap">{l.message}</p>}
              <p className="text-xs text-muted-foreground mt-2">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive self-start" onClick={()=>remove(l.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {leads.length===0 && <p className="p-8 text-center text-muted-foreground">Nenhum lead ainda.</p>}
      </div>
    </div>
  );
};
const AdminLeads = () => <RequirePermission perm="manage_leads"><AdminLeadsInner /></RequirePermission>;
export default AdminLeads;
