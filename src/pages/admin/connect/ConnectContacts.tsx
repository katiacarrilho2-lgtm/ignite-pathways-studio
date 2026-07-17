import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Pencil, Trash2, Search, BellOff, Users, UserPlus2,
  Sparkles, Download, RefreshCw, Smartphone, Upload, User as UserIcon, Tag as TagIcon,
} from "lucide-react";
import { useContacts, useDeleteContact, formatPhone, useTags } from "./hooks";
import { ContactDialog } from "./ContactDialog";
import { TagsManagerDialog } from "./TagsManagerDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function ConnectContacts() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: contacts = [], isLoading } = useContacts({ search });
  const { data: tags = [] } = useTags();
  const tagColor = (nome: string) => tags.find((t: any) => t.nome === nome)?.cor || "#3b82f6";
  const del = useDeleteContact();
  const nav = useNavigate();

  const totalGrupos = contacts.filter((c: any) => c.tipo === "grupo").length;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const novosUltimos7 = contacts.filter((c: any) => new Date(c.created_at).getTime() >= sevenDaysAgo).length;

  const sparkData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - i));
      return { day: day.getTime(), v: 0 };
    });
    contacts.forEach((c: any) => {
      const t = new Date(c.created_at).getTime();
      buckets.forEach(b => {
        if (t >= b.day && t < b.day + 86400000) b.v += 1;
      });
    });
    return buckets;
  }, [contacts]);

  const allChecked = contacts.length > 0 && selected.size === contacts.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(contacts.map((c: any) => c.id)));
  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const kpis = [
    { label: "Total de contatos", value: contacts.length, icon: Users, accent: "from-blue-500/15 to-blue-500/5 text-blue-600" },
    {
      label: "Novos (últimos 7 dias)", value: novosUltimos7, icon: UserPlus2,
      accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600", spark: true,
    },
    { label: "Total de grupos", value: totalGrupos, icon: Smartphone, accent: "from-violet-500/15 to-violet-500/5 text-violet-600" },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className={`p-5 bg-gradient-to-br ${k.accent}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-foreground/70">{k.label}</div>
                  <div className="text-3xl font-bold text-foreground mt-1">{k.value}</div>
                </div>
                <div className="size-11 rounded-xl bg-white/70 grid place-items-center shadow-sm">
                  <k.icon className="size-5" />
                </div>
              </div>
              {k.spark && (
                <div className="h-10 mt-2 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, WhatsApp, e-mail, cidade..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => toast.info("Sincronização de grupos será habilitada quando a conexão de WhatsApp estiver ativa.")}>
          <RefreshCw className="size-4" /> Sincronizar grupos
        </Button>
        <Button variant="outline" onClick={() => toast.info("Importação direta do WhatsApp requer conexão ativa.")}>
          <Download className="size-4" /> Puxar do WhatsApp
        </Button>
        <Button variant="outline" onClick={() => nav("/admin/connect/importar")}>
          <Upload className="size-4" /> Importar CSV
        </Button>
        <Button variant="outline" onClick={() => setTagsOpen(true)}>
          <TagIcon className="size-4" /> Etiquetas
        </Button>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" /> Novo contato
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">{selected.size}</span> selecionado(s)
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Limpar</Button>
            <Button size="sm" onClick={() => nav("/admin/connect/campanhas")}>Criar campanha com estes</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-3 w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></th>
                <th className="text-left px-4 py-3 font-medium">Nome / Telefone</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Etiquetas</th>
                <th className="text-left px-4 py-3 font-medium">Criado em</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && contacts.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Nenhum contato encontrado. Cadastre um novo ou importe da planilha.</td></tr>
              )}
              {contacts.map((c: any) => {
                const isGrupo = c.tipo === "grupo";
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-3 py-3"><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-full grid place-items-center text-white text-xs font-semibold ${isGrupo ? "bg-emerald-500" : "bg-blue-500"}`}>
                          {isGrupo ? <Users className="size-4" /> : (c.nome?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {c.nome || "(sem nome)"}
                            {c.opt_out && <BellOff className="size-3.5 text-red-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">{formatPhone(c.whatsapp)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isGrupo ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><Users className="size-3 mr-1" /> Grupo</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"><UserIcon className="size-3 mr-1" /> Contato</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).slice(0, 3).map((t: string) => (
                          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ background: tagColor(t) }}>{t}</span>
                        ))}
                        {(!c.tags || c.tags.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive"
                        onClick={() => { if (confirm("Excluir este contato?")) del.mutate(c.id, { onSuccess: () => toast.success("Contato excluído") }); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ContactDialog open={open} onOpenChange={setOpen} contact={editing} />
      <TagsManagerDialog open={tagsOpen} onOpenChange={setTagsOpen} />
    </div>
  );
}