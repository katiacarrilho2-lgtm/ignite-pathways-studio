import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCrmSellers } from "@/hooks/useCrmSellers";
import { fmtBRL } from "@/lib/crm";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, ExternalLink, UserMinus, Search } from "lucide-react";
import { toast } from "sonner";

export default function CrmEquipe() {
  const { user, isMaster, loading } = useAuth();
  const { sellers } = useCrmSellers();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [crmMemberIds, setCrmMemberIds] = useState<Set<string>>(new Set());
  const [superAdminIds, setSuperAdminIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: e }, { data: perms }, { data: roles }] = await Promise.all([
        supabase.from("crm_leads").select("*"),
        supabase.from("crm_lead_events").select("autor_id, tipo, created_at"),
        supabase.from("user_permissions").select("user_id").eq("permission", "manage_leads"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setLeads(l ?? []); setEvents(e ?? []);
      const supers = new Set<string>((roles ?? []).filter((r: any) => r.role === "super_admin").map((r: any) => r.user_id));
      const members = new Set<string>([
        ...((perms ?? []).map((p: any) => p.user_id)),
        ...supers,
      ]);
      setSuperAdminIds(supers);
      setCrmMemberIds(members);
    })();
  }, [tick]);

  const openAdd = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, avatar_url")
      .order("display_name");
    if (error) return toast.error(error.message);
    setCandidates((data ?? []).filter((p: any) => !crmMemberIds.has(p.user_id)));
    setSearchTerm("");
    setAddOpen(true);
  };

  const promote = async (uid: string, name: string) => {
    if (!user) return;
    setBusyId(uid);
    // Garante cargo 'editor' (para passar pelo gate isStaff do admin)
    const { data: existingRoles } = await supabase
      .from("user_roles").select("role").eq("user_id", uid);
    const hasAnyStaffRole = (existingRoles ?? []).some((r: any) =>
      ["super_admin", "admin", "editor"].includes(r.role),
    );
    if (!hasAnyStaffRole) {
      const { error: rErr } = await supabase
        .from("user_roles").insert({ user_id: uid, role: "editor" });
      if (rErr) { setBusyId(null); return toast.error(`Cargo: ${rErr.message}`); }
    }
    // Concede a permissão manage_leads (única necessária para o CRM)
    const { error: pErr } = await supabase
      .from("user_permissions")
      .insert({ user_id: uid, permission: "manage_leads", granted_by: user.id });
    if (pErr && !String(pErr.message).toLowerCase().includes("duplicate")) {
      setBusyId(null); return toast.error(`Permissão: ${pErr.message}`);
    }
    toast.success(`${name} adicionado ao CRM`);
    setBusyId(null);
    setAddOpen(false);
    setTick(t => t + 1);
  };

  const removeFromCrm = async (uid: string, name: string) => {
    if (superAdminIds.has(uid)) return toast.error("Super admin não pode ser removido.");
    if (!confirm(`Remover ${name} do CRM? Os leads dele continuarão registrados.`)) return;
    setBusyId(uid);
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", uid)
      .eq("permission", "manage_leads");
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(`${name} removido do CRM`);
    setTick(t => t + 1);
  };

  const rows = useMemo(() => sellers.map(s => {
    const myLeads = leads.filter(l => l.owner_id === s.user_id);
    const myEvents = events.filter(e => e.autor_id === s.user_id);
    const wa = myEvents.filter(e => e.tipo === "whatsapp").length;
    const notes = myEvents.filter(e => e.tipo === "anotacao").length;
    const matric = myLeads.filter(l => l.estagio === "matriculado");
    const last = myEvents.length ? new Date(Math.max(...myEvents.map(e => new Date(e.created_at).getTime()))) : null;
    return {
      ...s, total: myLeads.length, matric: matric.length,
      vendido: matric.reduce((sum, l) => sum + (l.valor_cents || 0), 0),
      atendimentos: wa + notes, wa, notes, last,
    };
  }).sort((a, b) => b.vendido - a.vendido), [sellers, leads, events]);

  if (loading) return <div className="p-8">Carregando…</div>;
  if (!isMaster) return <Navigate to="/admin/crm" replace />;

  const filteredCandidates = candidates.filter((c: any) =>
    !searchTerm
      ? true
      : `${c.display_name || ""} ${c.email || ""}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">Visão completa da atividade da equipe. Cada vendedor enxerga apenas o próprio pipeline; você vê tudo.</p>
        <Button onClick={openAdd}><Plus className="size-4" />Adicionar vendedor</Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Vendedor</th>
              <th className="text-center p-3">Leads</th>
              <th className="text-center p-3">Matrículas</th>
              <th className="text-right p-3">Vendido</th>
              <th className="text-center p-3">Atendimentos</th>
              <th className="text-center p-3">WhatsApp</th>
              <th className="text-center p-3">Anotações</th>
              <th className="text-left p-3">Última atividade</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.user_id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {r.avatar_url ? <img src={r.avatar_url} alt="" className="size-7 rounded-full object-cover" /> : <div className="size-7 rounded-full bg-primary/15 text-primary text-xs grid place-items-center font-bold">{r.display_name.slice(0,1).toUpperCase()}</div>}
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {r.display_name}
                        {superAdminIds.has(r.user_id) && <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">master</span>}
                        {!superAdminIds.has(r.user_id) && crmMemberIds.has(r.user_id) && <span className="text-[10px] uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">CRM</span>}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{r.kind}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center">{r.total}</td>
                <td className="text-center font-semibold text-emerald-600">{r.matric}</td>
                <td className="text-right font-bold text-emerald-700">{fmtBRL(r.vendido)}</td>
                <td className="text-center">{r.atendimentos}</td>
                <td className="text-center">{r.wa}</td>
                <td className="text-center">{r.notes}</td>
                <td className="text-left text-xs text-muted-foreground">{r.last ? r.last.toLocaleString("pt-BR") : "—"}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Abrir pipeline deste vendedor"
                      onClick={() => navigate(`/admin/crm?owner=${r.user_id}`)}>
                      <ExternalLink className="size-4" />
                    </Button>
                    {!superAdminIds.has(r.user_id) && crmMemberIds.has(r.user_id) && (
                      <Button size="sm" variant="ghost" className="text-destructive" title="Remover do CRM"
                        disabled={busyId === r.user_id}
                        onClick={() => removeFromCrm(r.user_id, r.display_name)}>
                        <UserMinus className="size-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">Nenhum vendedor cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar vendedor ao CRM</DialogTitle>
            <DialogDescription>
              Selecione um usuário já cadastrado. Ele passa a ter um CRM individual (vê apenas os próprios leads). Você continua vendo tudo.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-9" />
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border border border-border rounded-lg">
            {filteredCandidates.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário disponível.</p>
            )}
            {filteredCandidates.map((c: any) => (
              <div key={c.user_id} className="p-3 flex items-center gap-3">
                {c.avatar_url
                  ? <img src={c.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                  : <div className="size-8 rounded-full bg-primary/15 text-primary text-xs grid place-items-center font-bold">{(c.display_name || c.email || "?").slice(0,1).toUpperCase()}</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.display_name || c.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
                <Button size="sm" disabled={busyId === c.user_id} onClick={() => promote(c.user_id, c.display_name || c.email)}>
                  Adicionar
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}