import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, Trash2, FolderLock, Search } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { logAudit } from "@/lib/audit";

type Doc = { id: string; nome: string; categoria: string; department_id: string | null; file_path: string; mime: string | null; size_bytes: number | null; descricao: string | null; restrito: boolean; created_at: string };

const CATEGORIAS = ["administracao", "contratos", "financeiro", "pedagogico", "rh", "juridico", "marketing", "outros"];
const kb = (n: number | null) => (!n ? "—" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const Inner = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [depts, setDepts] = useState<{ id: string; nome: string }[]>([]);
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("todas");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ categoria: "administracao", restrito: false });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [d, dp] = await Promise.all([
      supabase.from("internal_documents" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("departments" as any).select("id,nome").eq("ativo", true).order("sort_order"),
    ]);
    setDocs((d.data ?? []) as any); setDepts((dp.data ?? []) as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const enviar = async () => {
    if (!file) return toast.error("Selecione o arquivo");
    setBusy(true);
    const path = `${user?.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("internal-docs").upload(path, file, { upsert: false });
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("internal_documents" as any).insert({
      nome: form.nome || file.name, categoria: form.categoria || "administracao",
      department_id: form.department_id || null, file_path: path, mime: file.type || null,
      size_bytes: file.size, descricao: form.descricao || null, restrito: !!form.restrito, created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    logAudit("Documentos Internos", "enviou documento", form.nome || file.name);
    toast.success("Documento enviado");
    setOpen(false); setForm({ categoria: "administracao", restrito: false }); setFile(null); load();
  };

  const baixar = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("internal-docs").createSignedUrl(d.file_path, 300);
    if (error || !data) return toast.error("Não foi possível gerar o link");
    logAudit("Documentos Internos", "baixou documento", d.nome, d.id);
    window.open(data.signedUrl, "_blank");
  };

  const excluir = async (d: Doc) => {
    if (!confirm(`Excluir "${d.nome}"?`)) return;
    await supabase.storage.from("internal-docs").remove([d.file_path]);
    await supabase.from("internal_documents" as any).delete().eq("id", d.id);
    logAudit("Documentos Internos", "excluiu documento", d.nome, d.id);
    load();
  };

  const lista = docs.filter(d =>
    (fCat === "todas" || d.categoria === fCat) &&
    (!busca || d.nome.toLowerCase().includes(busca.toLowerCase()) || (d.descricao ?? "").toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderLock className="size-6" /> Documentos Internos</h1>
          <p className="text-sm text-muted-foreground">Arquivos administrativos com acesso restrito à equipe</p>
        </div>
        <Button onClick={() => setOpen(true)}><Upload className="size-4" /> Enviar documento</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar documento…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={fCat} onValueChange={setFCat}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas as categorias</SelectItem>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-2">Nome</th><th className="text-left p-2">Categoria</th><th className="text-left p-2">Tamanho</th><th className="text-left p-2">Enviado</th><th /></tr>
          </thead>
          <tbody>
            {lista.map(d => (
              <tr key={d.id} className="border-t border-border">
                <td className="p-2">
                  <p className="font-medium">{d.nome} {d.restrito && <Badge variant="destructive" className="ml-1">restrito</Badge>}</p>
                  {d.descricao && <p className="text-xs text-muted-foreground">{d.descricao}</p>}
                </td>
                <td className="p-2"><Badge variant="secondary">{d.categoria}</Badge></td>
                <td className="p-2">{kb(d.size_bytes)}</td>
                <td className="p-2">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => baixar(d)}><Download className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir(d)}><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum documento.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setFile(null); setForm({ categoria: "administracao", restrito: false }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enviar documento interno</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Arquivo</Label>
              <Input ref={inputRef} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div><Label>Nome</Label><Input value={form.nome ?? ""} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder={file?.name ?? "Nome do documento"} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Departamento</Label>
                <Select value={form.department_id ?? ""} onValueChange={v => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Geral" /></SelectTrigger>
                  <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao ?? ""} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.restrito} onCheckedChange={v => setForm({ ...form, restrito: v })} />
              <span className="text-sm">Restrito à direção</span>
            </div>
          </div>
          <DialogFooter><Button onClick={enviar} disabled={busy}>{busy ? "Enviando…" : "Enviar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminDocumentosInternos() {
  return <RequirePermission perm="mod_documentos_internos"><Inner /></RequirePermission>;
}
