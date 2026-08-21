import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Eye, EyeOff, Copy, Trash2, Pencil, KeyRound, ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Vault = {
  id: string;
  servico: string;
  categoria: string;
  login: string | null;
  senha: string | null;
  url: string | null;
  notas: string | null;
};

const CATEGORIAS = [
  { v: "rede_social", l: "Rede social" },
  { v: "anuncios", l: "Anúncios" },
  { v: "ferramenta", l: "Ferramenta" },
  { v: "email", l: "E-mail" },
  { v: "site", l: "Site / Hospedagem" },
  { v: "outro", l: "Outro" },
];

const empty: Partial<Vault> = { servico: "", categoria: "rede_social", login: "", senha: "", url: "", notas: "" };

export default function MarketingCofre() {
  const [rows, setRows] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [edit, setEdit] = useState<Partial<Vault> | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("mkt_vault").select("*").order("servico");
    setLoading(false);
    if (error) { setDenied(true); return; }
    setRows((data ?? []) as Vault[]);
  }
  useEffect(() => { load(); }, []);

  async function salvar() {
    if (!edit?.servico?.trim()) { toast.error("Informe o serviço"); return; }
    const payload = {
      servico: edit.servico,
      categoria: edit.categoria ?? "outro",
      login: edit.login ?? null,
      senha: edit.senha ?? null,
      url: edit.url ?? null,
      notas: edit.notas ?? null,
    };
    const { error } = edit.id
      ? await supabase.from("mkt_vault").update(payload).eq("id", edit.id)
      : await supabase.from("mkt_vault").insert(payload);
    if (error) { toast.error(error.message); return; }
    setEdit(null);
    toast.success("Acesso salvo");
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este acesso?")) return;
    const { error } = await supabase.from("mkt_vault").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  function copiar(txt: string | null, label: string) {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copiado`);
  }

  if (denied) {
    return (
      <Card className="p-12 text-center">
        <ShieldAlert className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">O cofre de acessos é restrito a administradores.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-3">
        <KeyRound className="size-5 text-primary" />
        <div>
          <div className="text-sm font-semibold">Cofre de acessos</div>
          <p className="text-xs text-muted-foreground">Senhas das contas de marketing. Visível apenas para administradores.</p>
        </div>
        <Button className="ml-auto" size="sm" onClick={() => setEdit({ ...empty })}><Plus className="size-4" />Novo acesso</Button>
      </Card>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin size-6 text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Nenhum acesso cadastrado ainda.</Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{r.servico}</span>
                <Badge variant="secondary" className="text-[10px]">{CATEGORIAS.find((c) => c.v === r.categoria)?.l ?? r.categoria}</Badge>
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => setEdit(r)}><Pencil className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => excluir(r.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14">Login</span>
                  <span className="truncate flex-1">{r.login || "—"}</span>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => copiar(r.login, "Login")}><Copy className="size-3" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14">Senha</span>
                  <span className="truncate flex-1 font-mono">{reveal[r.id] ? (r.senha || "—") : "••••••••"}</span>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => setReveal((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                    {reveal[r.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => copiar(r.senha, "Senha")}><Copy className="size-3" /></Button>
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="size-3" />Abrir painel
                  </a>
                )}
                {r.notas && <p className="text-muted-foreground pt-1 whitespace-pre-wrap">{r.notas}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar acesso" : "Novo acesso"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Serviço</Label>
                  <Input value={edit.servico ?? ""} onChange={(e) => setEdit({ ...edit, servico: e.target.value })} placeholder="Instagram Multplick" />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={edit.categoria} onValueChange={(v) => setEdit({ ...edit, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Login / e-mail</Label>
                  <Input value={edit.login ?? ""} onChange={(e) => setEdit({ ...edit, login: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Senha</Label>
                  <Input value={edit.senha ?? ""} onChange={(e) => setEdit({ ...edit, senha: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">URL do painel</Label>
                <Input value={edit.url ?? ""} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="https://" />
              </div>
              <div>
                <Label className="text-xs">Notas (2FA, recuperação, etc.)</Label>
                <Textarea rows={3} value={edit.notas ?? ""} onChange={(e) => setEdit({ ...edit, notas: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
