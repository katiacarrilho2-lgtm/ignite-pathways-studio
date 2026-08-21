import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

type Post = {
  id: string;
  titulo: string;
  legenda: string | null;
  rede: string;
  formato: string;
  status: string;
  scheduled_at: string | null;
  campaign_id: string | null;
  link: string | null;
};

const REDES = [
  { v: "instagram", l: "Instagram" },
  { v: "facebook", l: "Facebook" },
  { v: "tiktok", l: "TikTok" },
  { v: "youtube", l: "YouTube" },
  { v: "linkedin", l: "LinkedIn" },
  { v: "whatsapp", l: "WhatsApp" },
];
const FORMATOS = ["feed", "stories", "reels", "carrossel", "video", "anuncio"];
const STATUS = [
  { v: "ideia", l: "Ideia", cls: "bg-muted text-muted-foreground" },
  { v: "producao", l: "Em produção", cls: "bg-amber-500/15 text-amber-600" },
  { v: "agendado", l: "Agendado", cls: "bg-blue-500/15 text-blue-600" },
  { v: "publicado", l: "Publicado", cls: "bg-emerald-500/15 text-emerald-600" },
];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const emptyPost = (date?: string): Partial<Post> => ({
  titulo: "",
  legenda: "",
  rede: "instagram",
  formato: "feed",
  status: "ideia",
  scheduled_at: date ? `${date}T09:00` : null,
});

export default function MarketingSocial() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [campanhas, setCampanhas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [edit, setEdit] = useState<Partial<Post> | null>(null);

  async function load() {
    setLoading(true);
    const [{ data, error }, { data: camps }] = await Promise.all([
      supabase.from("mkt_social_posts").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("mkt_campaigns").select("id,nome").order("nome"),
    ]);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setPosts((data ?? []) as Post[]);
    setCampanhas((camps ?? []) as { id: string; nome: string }[]);
  }
  useEffect(() => { load(); }, []);

  const dias = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const porDia = useMemo(() => {
    const map: Record<string, Post[]> = {};
    posts.forEach((p) => {
      if (!p.scheduled_at) return;
      const key = p.scheduled_at.slice(0, 10);
      (map[key] ||= []).push(p);
    });
    return map;
  }, [posts]);

  async function salvar() {
    if (!edit?.titulo?.trim()) { toast.error("Informe o título"); return; }
    const payload = {
      titulo: edit.titulo,
      legenda: edit.legenda ?? null,
      rede: edit.rede ?? "instagram",
      formato: edit.formato ?? "feed",
      status: edit.status ?? "ideia",
      scheduled_at: edit.scheduled_at ? new Date(edit.scheduled_at).toISOString() : null,
      campaign_id: edit.campaign_id ?? null,
      link: edit.link ?? null,
    };
    const { error } = edit.id
      ? await supabase.from("mkt_social_posts").update(payload).eq("id", edit.id)
      : await supabase.from("mkt_social_posts").insert(payload);
    if (error) { toast.error(error.message); return; }
    setEdit(null);
    toast.success("Publicação salva");
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta publicação?")) return;
    const { error } = await supabase.from("mkt_social_posts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  const hoje = ymd(new Date());

  return (
    <div className="space-y-4">
      <Card className="p-3 flex items-center gap-2">
        <CalendarDays className="size-4 text-primary" />
        <span className="font-semibold text-sm">{MESES[cursor.getMonth()]} {cursor.getFullYear()}</span>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
        <div className="ml-auto flex items-center gap-3">
          {STATUS.map((s) => <span key={s.v} className={`text-[11px] px-2 py-0.5 rounded ${s.cls}`}>{s.l}</span>)}
          <Button size="sm" onClick={() => setEdit(emptyPost(hoje))}><Plus className="size-4" />Nova publicação</Button>
        </div>
      </Card>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin size-6 text-muted-foreground" /></div>
      ) : (
        <Card className="p-2">
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dias.map((d) => {
              const key = ymd(d);
              const doMes = d.getMonth() === cursor.getMonth();
              const list = porDia[key] ?? [];
              return (
                <div
                  key={key}
                  onDoubleClick={() => setEdit(emptyPost(key))}
                  className={`min-h-[92px] rounded-md border border-border p-1.5 text-left ${doMes ? "bg-card" : "bg-muted/30 opacity-60"} ${key === hoje ? "ring-1 ring-primary" : ""}`}
                >
                  <div className="text-[11px] font-medium text-muted-foreground">{d.getDate()}</div>
                  <div className="space-y-1 mt-1">
                    {list.map((p) => {
                      const st = STATUS.find((s) => s.v === p.status) ?? STATUS[0];
                      return (
                        <button
                          key={p.id}
                          onClick={() => setEdit({ ...p, scheduled_at: p.scheduled_at ? p.scheduled_at.slice(0, 16) : null })}
                          className={`w-full text-left text-[10px] leading-tight rounded px-1.5 py-1 truncate ${st.cls}`}
                          title={p.titulo}
                        >
                          {p.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground p-2">Dica: dê dois cliques em um dia para criar uma publicação nele.</p>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Próximas publicações</div>
        <div className="space-y-1.5">
          {posts.filter((p) => p.scheduled_at && p.scheduled_at >= new Date().toISOString()).slice(0, 10).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm border-b border-border py-1.5 last:border-0">
              <Badge variant="secondary" className="text-[10px]">{REDES.find((r) => r.v === p.rede)?.l ?? p.rede}</Badge>
              <span className="truncate">{p.titulo}</span>
              <span className="ml-auto text-xs text-muted-foreground">{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString("pt-BR") : ""}</span>
              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => excluir(p.id)}><Trash2 className="size-3.5" /></Button>
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma publicação planejada ainda.</p>}
        </div>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar publicação" : "Nova publicação"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={edit.titulo ?? ""} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Rede</Label>
                  <Select value={edit.rede} onValueChange={(v) => setEdit({ ...edit, rede: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REDES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Formato</Label>
                  <Select value={edit.formato} onValueChange={(v) => setEdit({ ...edit, formato: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FORMATOS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data e hora</Label>
                  <Input type="datetime-local" value={edit.scheduled_at ?? ""} onChange={(e) => setEdit({ ...edit, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Campanha</Label>
                  <Select value={edit.campaign_id ?? "none"} onValueChange={(v) => setEdit({ ...edit, campaign_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem campanha</SelectItem>
                      {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Legenda</Label>
                <Textarea rows={5} value={edit.legenda ?? ""} onChange={(e) => setEdit({ ...edit, legenda: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Link do post publicado</Label>
                <Input value={edit.link ?? ""} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="https://" />
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
