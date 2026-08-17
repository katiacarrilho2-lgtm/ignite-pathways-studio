import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Upload, Loader2, Clock, XCircle, Trash2, Download, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import logo from "@/assets/multplick-logo.png.asset.json";
import { DOC_TYPES, EXTRA_DOC_TYPE } from "@/lib/studentDocs";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN = `${SUPABASE_URL}/functions/v1/student-docs-public`;
const H = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

type DocRow = { id: string; doc_type: string; file_name: string | null; status: string; notes: string | null; created_at: string };
type Info = { student: { name: string | null; email: string | null; phone: string | null }; label: string | null; expires_at: string; documents: DocRow[] };

const badge = (s: string) => {
  const map: Record<string, { c: string; icon: any; label: string }> = {
    aprovado: { c: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Aprovado" },
    rejeitado: { c: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Recusado" },
    enviado: { c: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock, label: "Em análise" },
  };
  const cfg = map[s] ?? { c: "bg-secondary text-muted-foreground border-border", icon: Clock, label: "Pendente" };
  const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.c}`}><Icon className="size-3" />{cfg.label}</span>;
};

export default function DocumentosUpload() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch(`${FN}?action=info&token=${encodeURIComponent(token || "")}`, { headers: H });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Link inválido"); setInfo(null); } else { setInfo(j); setErr(null); }
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const upload = async (docType: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo maior que 10 MB");
    setBusy(docType);
    try {
      const fd = new FormData();
      fd.append("doc_type", docType);
      fd.append("file", file);
      const r = await fetch(`${FN}?action=upload&token=${encodeURIComponent(token || "")}`, { method: "POST", headers: H, body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha no envio");
      toast.success("Documento enviado!");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este arquivo?")) return;
    const r = await fetch(`${FN}?action=delete&token=${encodeURIComponent(token || "")}`, {
      method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error);
    load();
  };

  const download = async (id: string) => {
    const r = await fetch(`${FN}?action=download&token=${encodeURIComponent(token || "")}&id=${id}`, { headers: H });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error);
    window.open(j.url, "_blank");
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (err) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div><XCircle className="size-10 text-destructive mx-auto mb-3" /><p className="font-semibold">{err}</p>
      <p className="text-sm text-muted-foreground">Solicite um novo link à secretaria.</p></div>
    </div>
  );

  const byType = (t: string) => info!.documents.find((d) => d.doc_type === t);
  const extras = info!.documents.filter((d) => d.doc_type === EXTRA_DOC_TYPE);

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto p-6 flex items-center gap-3">
          <img src={logo.url} alt="Multplick" className="h-9 w-auto" />
          <div>
            <h1 className="text-xl font-bold">Envio de documentos</h1>
            <p className="text-sm opacity-80">{info!.label || info!.student.name || "Anexe seus documentos abaixo"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold mb-1">Orientações</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
            <li>Envie <b>de preferência em PDF</b> — a aprovação é mais rápida.</li>
            <li>Fotos JPG/PNG são aceitas, desde que legíveis e sem cortes.</li>
            <li>Tamanho máximo de 10 MB por arquivo.</li>
          </ul>
        </div>

        <h2 className="font-bold text-primary text-lg">Documentos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_TYPES.map((t) => {
            const d = byType(t.key);
            const border = d?.status === "aprovado" ? "border-l-emerald-500" : d?.status === "rejeitado" ? "border-l-destructive" : d ? "border-l-blue-500" : "border-l-muted";
            return (
              <div key={t.key} className={`rounded-xl border border-border border-l-4 ${border} bg-card p-4 space-y-2`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{t.label}</p>
                  {d ? badge(d.status) : badge("pendente")}
                </div>
                {d?.file_name && <p className="text-xs text-muted-foreground break-all">{d.file_name}</p>}
                <p className="text-xs text-muted-foreground">{t.desc}</p>
                {d?.status === "rejeitado" && d.notes && <p className="text-xs text-destructive"><b>Motivo:</b> {d.notes}</p>}
                <div className="flex items-center gap-2 pt-1">
                  {d ? (
                    <>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => download(d.id)}><Download className="size-4" /> Baixar</Button>
                      {d.status !== "aprovado" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d.id)}><Trash2 className="size-4" /></Button>}
                    </>
                  ) : (
                    <label className="flex-1 inline-flex items-center justify-center gap-2 text-sm cursor-pointer rounded-lg border border-dashed px-3 py-2 hover:bg-secondary/60">
                      {busy === t.key ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {busy === t.key ? "Enviando…" : "Anexar"}
                      <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" disabled={busy === t.key}
                        onChange={(e) => e.target.files?.[0] && upload(t.key, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-primary text-lg">Documentos adicionais</h2>
          {extras.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2 truncate"><FileText className="size-4 text-muted-foreground" />{d.file_name}</span>
              <div className="flex items-center gap-2">
                {badge(d.status)}
                <Button size="sm" variant="ghost" onClick={() => download(d.id)}><Download className="size-4" /></Button>
                {d.status !== "aprovado" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d.id)}><Trash2 className="size-4" /></Button>}
              </div>
            </div>
          ))}
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-dashed px-4 py-2 hover:bg-secondary/60">
            {busy === EXTRA_DOC_TYPE ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar documento adicional
            <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" disabled={busy === EXTRA_DOC_TYPE}
              onChange={(e) => e.target.files?.[0] && upload(EXTRA_DOC_TYPE, e.target.files[0])} />
          </label>
        </div>

        <p className="text-xs text-muted-foreground pb-8">Link válido até {new Date(info!.expires_at).toLocaleDateString("pt-BR")}.</p>
      </main>
    </div>
  );
}
