import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

type App = {
  id: string;
  created_at: string;
  status: string;
  full_name: string;
  email: string;
  phone: string | null;
  course_title: string;
  promo_code: string | null;
  payment_method: string | null;
  notes: string | null;
};

const statusColor: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  pendente: "bg-orange-100 text-orange-800",
  em_contato: "bg-amber-100 text-amber-800",
  matriculado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-muted text-muted-foreground",
};

export default function CrmPreMatriculas() {
  const { isMaster, loading } = useAuth();
  const canAccess = isMaster;

  const [list, setList] = useState<App[]>([]);
  const [q, setQ] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("enrollment_applications")
      .select("id,created_at,status,full_name,email,phone,course_title,promo_code,payment_method,notes")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setList((data ?? []) as App[]);
  };

  useEffect(() => { if (canAccess) load(); }, [canAccess]);

  const codes = useMemo(() => {
    const s = new Set<string>();
    list.forEach(a => { if (a.promo_code) s.add(a.promo_code.toUpperCase()); });
    return Array.from(s).sort();
  }, [list]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    const c = codeFilter.toUpperCase().trim();
    return list.filter(a => {
      if (c && (a.promo_code ?? "").toUpperCase() !== c) return false;
      if (!s) return true;
      return (
        a.full_name.toLowerCase().includes(s) ||
        (a.email ?? "").toLowerCase().includes(s) ||
        a.course_title.toLowerCase().includes(s) ||
        (a.phone ?? "").toLowerCase().includes(s) ||
        (a.promo_code ?? "").toLowerCase().includes(s)
      );
    });
  }, [list, q, codeFilter]);

  const saveNotes = async (id: string) => {
    const value = (notesDraft[id] ?? "").trim() || null;
    setSavingId(id);
    const { error } = await supabase
      .from("enrollment_applications")
      .update({ notes: value })
      .eq("id", id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Observação salva — o admin verá no momento da matrícula.");
    setList(prev => prev.map(x => x.id === id ? { ...x, notes: value } : x));
    setNotesDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  if (!canAccess) return <Navigate to="/admin/crm" replace />;

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Ticket className="size-5" /> Pré-matrículas por código
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira as fichas enviadas pelo formulário público e acrescente observações para o admin efetivar a matrícula.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_260px] gap-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, e-mail, curso, telefone ou código..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div>
          <Input
            placeholder="Filtrar por código promocional"
            value={codeFilter}
            onChange={e => setCodeFilter(e.target.value.toUpperCase())}
            list="promo-codes-list"
          />
          <datalist id="promo-codes-list">
            {codes.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma pré-matrícula encontrada com esse filtro.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(a => {
          const draft = notesDraft[a.id];
          const dirty = draft !== undefined && draft !== (a.notes ?? "");
          return (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-primary">{a.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.course_title} • {new Date(a.created_at).toLocaleString("pt-BR")}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">Contato:</span> {a.email}
                    {a.phone ? ` • ${a.phone}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {a.promo_code && (
                    <Badge variant="outline" className="font-mono">{a.promo_code}</Badge>
                  )}
                  <Badge className={statusColor[a.status] ?? ""}>{a.status}</Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Descrição / observações para o admin efetivar a matrícula
                </Label>
                <Textarea
                  rows={3}
                  value={draft ?? a.notes ?? ""}
                  onChange={e => setNotesDraft(prev => ({ ...prev, [a.id]: e.target.value }))}
                  placeholder="Ex.: valor combinado, forma de pagamento, entrada recebida, condição especial, data acordada de início..."
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    disabled={!dirty || savingId === a.id}
                    onClick={() => saveNotes(a.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Save className="size-3.5" />
                    {savingId === a.id ? "Salvando..." : dirty ? "Salvar observação" : "Salvo"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}