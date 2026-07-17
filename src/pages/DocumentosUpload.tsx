import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Upload, FileText, Loader2, Clock, ShieldCheck, XCircle, Trash2, Save, ClipboardList, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/multplick-logo.png";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN = `${SUPABASE_URL}/functions/v1/student-docs-public`;

type DocType =
  | "diploma_certificado" | "historico_tecnico" | "rg" | "cpf"
  | "titulo_eleitor" | "quitacao_eleitoral" | "reservista" | "comprovante_residencia"
  | "foto_3x4" | "prova_escrita" | "anexo_extra";

const DOCS: { key: DocType; label: string; desc: string; opcional?: boolean }[] = [
  { key: "diploma_certificado", label: "Diploma ou certificado", desc: "Registrado pelo órgão competente do Sistema de Ensino ou revalidado por instituição brasileira" },
  { key: "historico_tecnico", label: "Histórico Nível Técnico", desc: "Com a indicação das cargas horárias das disciplinas cursadas" },
  { key: "rg", label: "Carteira de identidade", desc: "RG ou cédula de identidade de estrangeiro com indicação de permanência no País" },
  { key: "cpf", label: "CPF", desc: "Cadastro de Pessoa Física" },
  { key: "titulo_eleitor", label: "Título de eleitor", desc: "Quando brasileiro" },
  { key: "quitacao_eleitoral", label: "Prova de quitação eleitoral", desc: "Emitida pela Justiça Eleitoral, quando brasileiro" },
  { key: "reservista", label: "Prova de quitação com o Serviço Militar", desc: "Reservista, quando brasileiro" },
  { key: "comprovante_residencia", label: "Comprovante de residência", desc: "Últimos 90 dias" },
  { key: "foto_3x4", label: "Foto 3x4", desc: "Foto recente para o certificado" },
  { key: "prova_escrita", label: "Prova escrita", desc: "Prova escrita realizada durante a matrícula" },
  { key: "anexo_extra", label: "Anexo extra", desc: "Documento adicional que você precise enviar", opcional: true },
];

type DocRow = { id: string; doc_type: DocType; file_name: string | null; mime: string | null; status: string; notes: string | null };
type Profile = Partial<{
  full_name: string; cpf: string; birth_date: string; rg: string; orgao_emissor: string; rg_emissao: string;
  naturalidade: string; pai: string; mae: string; cep: string; rua: string; numero: string; bairro: string;
  cidade: string; estado: string; contact_email: string; escolaridade: string; ano_formacao: string;
  instituicao_formacao: string; curso_escolhido: string; enrollment_form_submitted_at: string;
}>;

function FormField({ k, label, type = "text", cls = "", value, onChange }:
  { k: string; label: string; type?: string; cls?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={cls}>
      <Label htmlFor={k} className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <Input id={k} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const statusBadge = (s: string) => {
  const map: Record<string, { c: string; icon: any; label: string }> = {
    aprovado: { c: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Aprovado" },
    rejeitado: { c: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Rejeitado" },
    enviado: { c: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock, label: "Em análise" },
  };
  const cfg = map[s] ?? { c: "bg-secondary text-muted-foreground border-border", icon: Clock, label: "Pendente" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.c}`}>
      <Icon className="size-3" />{cfg.label}
    </span>
  );
};

export default function DocumentosUpload() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<{ student: { name: string | null; email: string | null }; expires_at: string; documents: DocRow[]; profile: Profile } | null>(null);
  const [busy, setBusy] = useState<DocType | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [savingForm, setSavingForm] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${FN}?action=info&token=${encodeURIComponent(token || "")}`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Link inválido"); setInfo(null); }
      else {
        setInfo(j); setErr(null);
        const p = j.profile ?? {};
        setForm({
          nome_completo: p.full_name ?? "", cpf: p.cpf ?? "", data_nascimento: p.birth_date ?? "",
          rg: p.rg ?? "", orgao_emissor: p.orgao_emissor ?? "", rg_emissao: p.rg_emissao ?? "",
          naturalidade: p.naturalidade ?? "", pai: p.pai ?? "", mae: p.mae ?? "",
          cep: p.cep ?? "", rua: p.rua ?? "", numero: p.numero ?? "", bairro: p.bairro ?? "",
          cidade: p.cidade ?? "", estado: p.estado ?? "", email: p.contact_email ?? "",
          escolaridade: p.escolaridade ?? "", ano_formacao: p.ano_formacao ?? "",
          instituicao_formacao: p.instituicao_formacao ?? "", curso_escolhido: p.curso_escolhido ?? "",
        });
      }
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const saveForm = async () => {
    setSavingForm(true);
    try {
      const r = await fetch(`${FN}?action=form&token=${encodeURIComponent(token || "")}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha");
      toast.success("Formulário salvo!");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingForm(false); }
  };

  const byType = (t: DocType) => info?.documents.find(d => d.doc_type === t);

  const upload = async (type: DocType, file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo maior que 10MB");
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) return toast.error("Envie PDF, PNG ou JPG");
    setBusy(type);
    try {
      const fd = new FormData();
      fd.append("doc_type", type);
      fd.append("file", file);
      const r = await fetch(`${FN}?action=upload&token=${encodeURIComponent(token || "")}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha no envio");
      toast.success("Documento enviado!");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const remove = async (type: DocType) => {
    if (!confirm("Remover este documento?")) return;
    try {
      const r = await fetch(`${FN}?action=delete&token=${encodeURIComponent(token || "")}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: type }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha");
      toast.success("Removido");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const downloadDoc = async (id: string) => {
    try {
      const r = await fetch(`${FN}?action=download&token=${encodeURIComponent(token || "")}&id=${encodeURIComponent(id)}`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha");
      window.open(j.url, "_blank");
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-secondary/30"><Loader2 className="animate-spin size-6 text-primary" /></div>;

  if (err) return (
    <div className="min-h-screen grid place-items-center bg-secondary/30 p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <XCircle className="mx-auto size-12 text-destructive mb-3" />
        <h1 className="text-xl font-bold mb-1">Link indisponível</h1>
        <p className="text-sm text-muted-foreground">{err}</p>
        <p className="text-xs text-muted-foreground mt-4">Peça um novo link ao atendimento.</p>
      </div>
    </div>
  );

  const done = DOCS.filter(d => !d.opcional && byType(d.key)).length;
  const total = DOCS.filter(d => !d.opcional).length;
  const pct = Math.round((done / total) * 100);

  const setF = (k: string, v: string) => setForm(s => ({ ...s, [k]: v }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/30 via-background to-primary/5">
      {/* header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <img src={logo} alt="Multplick" className="h-9 w-auto" />
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-600" /> Envio seguro
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary mb-3">
            <Upload className="size-3.5" /> Portal de documentos do aluno
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Olá{info?.student?.name ? `, ${info.student.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Envie os documentos abaixo para finalizarmos sua matrícula. Você pode substituir qualquer arquivo antes da nossa análise. Aceitamos <strong>PDF, PNG ou JPG</strong> (até 10MB por arquivo).
          </p>
        </div>

        {/* progress card */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Seu progresso</p>
              <p className="text-xs text-muted-foreground">{done} de {total} documentos obrigatórios enviados</p>
            </div>
            <span className="text-2xl font-bold text-primary tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Formulário de matrícula */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Formulário de matrícula</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Preencha seus dados. Você pode salvar e voltar depois para alterar antes da análise.</p>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField value={form["nome_completo"] ?? ""} onChange={(v)=>setF("nome_completo", v)} k="nome_completo" label="Nome completo" cls="md:col-span-2" />
            <FormField value={form["cpf"] ?? ""} onChange={(v)=>setF("cpf", v)} k="cpf" label="CPF" />
            <FormField value={form["data_nascimento"] ?? ""} onChange={(v)=>setF("data_nascimento", v)} k="data_nascimento" label="Data de nascimento" type="date" />
            <FormField value={form["rg"] ?? ""} onChange={(v)=>setF("rg", v)} k="rg" label="RG" />
            <FormField value={form["orgao_emissor"] ?? ""} onChange={(v)=>setF("orgao_emissor", v)} k="orgao_emissor" label="Órgão emissor" />
            <FormField value={form["rg_emissao"] ?? ""} onChange={(v)=>setF("rg_emissao", v)} k="rg_emissao" label="Data de emissão do RG" type="date" />
            <FormField value={form["naturalidade"] ?? ""} onChange={(v)=>setF("naturalidade", v)} k="naturalidade" label="Naturalidade" cls="md:col-span-2" />
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-foreground">Filiação</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField value={form["pai"] ?? ""} onChange={(v)=>setF("pai", v)} k="pai" label="Nome do pai" />
            <FormField value={form["mae"] ?? ""} onChange={(v)=>setF("mae", v)} k="mae" label="Nome da mãe" />
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-foreground">Endereço</h3>
          <div className="grid gap-4 md:grid-cols-6">
            <FormField value={form["cep"] ?? ""} onChange={(v)=>setF("cep", v)} k="cep" label="CEP" cls="md:col-span-2" />
            <FormField value={form["rua"] ?? ""} onChange={(v)=>setF("rua", v)} k="rua" label="Rua" cls="md:col-span-3" />
            <FormField value={form["numero"] ?? ""} onChange={(v)=>setF("numero", v)} k="numero" label="Nº" />
            <FormField value={form["bairro"] ?? ""} onChange={(v)=>setF("bairro", v)} k="bairro" label="Bairro" cls="md:col-span-2" />
            <FormField value={form["cidade"] ?? ""} onChange={(v)=>setF("cidade", v)} k="cidade" label="Cidade" cls="md:col-span-3" />
            <FormField value={form["estado"] ?? ""} onChange={(v)=>setF("estado", v)} k="estado" label="Estado" />
            <FormField value={form["email"] ?? ""} onChange={(v)=>setF("email", v)} k="email" label="E-mail" type="email" cls="md:col-span-6" />
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-foreground">Formação</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField value={form["escolaridade"] ?? ""} onChange={(v)=>setF("escolaridade", v)} k="escolaridade" label="Escolaridade" />
            <FormField value={form["ano_formacao"] ?? ""} onChange={(v)=>setF("ano_formacao", v)} k="ano_formacao" label="Ano de formação" />
            <FormField value={form["instituicao_formacao"] ?? ""} onChange={(v)=>setF("instituicao_formacao", v)} k="instituicao_formacao" label="Nome da instituição" />
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-foreground">Curso escolhido</h3>
          <FormField value={form["curso_escolhido"] ?? ""} onChange={(v)=>setF("curso_escolhido", v)} k="curso_escolhido" label="Curso" />

          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            {info?.profile?.enrollment_form_submitted_at ? (
              <p className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Formulário enviado — você ainda pode alterar e salvar novamente.</p>
            ) : <span className="text-xs text-muted-foreground">Depois de preencher, clique em salvar.</span>}
            <button onClick={saveForm} disabled={savingForm}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60">
              {savingForm ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar formulário
            </button>
          </div>
        </section>

        <h2 className="text-lg font-bold text-foreground mb-3">Documentos</h2>

        {/* documents grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {DOCS.map(d => {
            const r = byType(d.key);
            const uploading = busy === d.key;
            const approved = r?.status === "aprovado";
            return (
              <div key={d.key} className={`rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${approved ? "border-emerald-200 bg-emerald-50/30" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground">{d.label}</h3>
                      {d.opcional && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">opcional</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                  </div>
                  {statusBadge(r?.status || "pendente")}
                </div>

                {r?.notes && (
                  <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                    <strong>Observação da equipe:</strong> {r.notes}
                  </div>
                )}

                {r ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 p-2.5">
                    <button onClick={() => downloadDoc(r.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-primary transition" title="Ver / baixar">
                      <FileText className="size-4 text-primary shrink-0" />
                      <span className="text-xs truncate">{r.file_name || "arquivo enviado"}</span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => downloadDoc(r.id)} className="text-muted-foreground hover:text-primary transition p-1" title="Ver / baixar">
                        <Download className="size-4" />
                      </button>
                      {!approved && (
                        <button onClick={() => remove(d.key)} className="text-muted-foreground hover:text-destructive transition p-1" title="Remover">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}

                {!approved && (
                  <label className="mt-3 block cursor-pointer">
                    <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden"
                      disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) upload(d.key, f); e.currentTarget.value = ""; }} />
                    <span className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
                      {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      {r ? "Substituir arquivo" : "Anexar arquivo"}
                    </span>
                  </label>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Após o envio, nossa equipe irá conferir cada documento. Você pode fechar esta página e voltar depois com o mesmo link.
        </p>
      </main>
    </div>
  );
}