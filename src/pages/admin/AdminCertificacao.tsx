import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Eye, Download, FileCheck2, Search, ChevronLeft, Loader2, Clock, User, Link2, Copy, Plus } from "lucide-react";
import { toast } from "sonner";

type LinkRow = { id: string; token: string; user_id: string; student_name: string | null; student_email: string | null; created_at: string; expires_at: string; revoked: boolean };
type DocRow = {
  id: string; user_id: string; doc_type: string; file_name: string | null; file_path: string;
  mime: string | null; status: string; notes: string | null; created_at: string; reviewed_at: string | null;
};
type Profile = Record<string, any> | null;

const DOC_LABELS: Record<string, string> = {
  diploma_certificado: "Diploma ou certificado",
  historico_tecnico: "Histórico Nível Técnico",
  rg: "Carteira de identidade (RG)",
  cpf: "CPF",
  titulo_eleitor: "Título de eleitor",
  quitacao_eleitoral: "Quitação eleitoral",
  reservista: "Reservista (serviço militar)",
  comprovante_residencia: "Comprovante de residência",
  comprovante_pagamento: "Comprovante de pagamento",
  historico_escolar: "Histórico escolar",
  foto_3x4: "Foto 3x4",
};

const statusPill = (s: string) => {
  const map: Record<string, string> = {
    aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejeitado: "bg-red-100 text-red-700 border-red-200",
    enviado: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${map[s] ?? "bg-secondary text-muted-foreground border-border"}`}>{s === "aprovado" ? "Aprovado" : s === "rejeitado" ? "Rejeitado" : s === "enviado" ? "Em análise" : s}</span>;
};

export default function AdminCertificacao() {
  const { hasPermission, isSuperAdmin, isCertificadora } = useAuth();
  const canAccess = isSuperAdmin || isCertificadora || hasPermission("manage_certification");

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<(LinkRow & { docs: DocRow[]; profile: Profile })[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; mime: string; name: string } | null>(null);
  const [rejectFor, setRejectFor] = useState<DocRow | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [linksModal, setLinksModal] = useState(false);
  const [certLinks, setCertLinks] = useState<LinkRow[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkEmail, setNewLinkEmail] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => { if (canAccess) load(); }, [canAccess]);

  async function load() {
    setLoading(true);
    const { data: links } = await supabase
      .from("document_upload_links")
      .select("id, token, user_id, student_name, student_email, created_at, expires_at, revoked")
      .eq("for_certification", true)
      .order("created_at", { ascending: false });
    setCertLinks((links ?? []) as LinkRow[]);
    const uniq = new Map<string, LinkRow>();
    (links ?? []).forEach((l: any) => { if (l.user_id && !uniq.has(l.user_id)) uniq.set(l.user_id, l); });
    const userIds = Array.from(uniq.keys());
    if (userIds.length === 0) { setStudents([]); setLoading(false); return; }
    const [{ data: docs }, { data: profiles }] = await Promise.all([
      supabase.from("student_documents").select("*").in("user_id", userIds).order("created_at", { ascending: false }),
      supabase.from("student_profiles").select("*").in("user_id", userIds),
    ]);
    const byUser = new Map<string, DocRow[]>();
    (docs ?? []).forEach((d: any) => {
      const arr = byUser.get(d.user_id) ?? [];
      arr.push(d as DocRow);
      byUser.set(d.user_id, arr);
    });
    const profByUser = new Map<string, Profile>();
    (profiles ?? []).forEach((p: any) => profByUser.set(p.user_id, p));
    const merged = Array.from(uniq.values()).map(l => ({
      ...l,
      docs: byUser.get(l.user_id) ?? [],
      profile: profByUser.get(l.user_id) ?? null,
    })).filter(s => s.docs.length > 0 || s.profile?.enrollment_form_submitted_at);
    setStudents(merged);
    setLoading(false);
  }

  async function createCertLink() {
    setCreatingLink(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 8);
      const syntheticUserId = crypto.randomUUID();
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("document_upload_links").insert({
        token,
        user_id: syntheticUserId,
        student_name: newLinkName.trim() || null,
        student_email: newLinkEmail.trim() || null,
        for_certification: true,
        created_by: userRes?.user?.id ?? null,
      }).select("id, token, user_id, student_name, student_email, created_at, expires_at, revoked").single();
      if (error) throw error;
      setCertLinks(prev => [data as LinkRow, ...prev]);
      setNewLinkName(""); setNewLinkEmail("");
      toast.success("Link criado! Copie e envie ao aluno.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao criar link");
    } finally {
      setCreatingLink(false);
    }
  }

  function linkUrl(token: string) {
    return `${window.location.origin}/documentos/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(linkUrl(token));
      toast.success("Link copiado");
    } catch { toast.error("Não foi possível copiar"); }
  }

  async function revokeLink(id: string) {
    const { error } = await supabase.from("document_upload_links").update({ revoked: true }).eq("id", id);
    if (error) return toast.error(error.message);
    setCertLinks(prev => prev.map(l => l.id === id ? { ...l, revoked: true } : l));
    toast.success("Link revogado");
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return students;
    return students.filter(s =>
      (s.student_name ?? "").toLowerCase().includes(t) ||
      (s.student_email ?? "").toLowerCase().includes(t) ||
      (s.profile?.full_name ?? "").toLowerCase().includes(t) ||
      (s.profile?.cpf ?? "").toLowerCase().includes(t)
    );
  }, [students, q]);

  async function openPreview(d: DocRow) {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(d.file_path, 300);
    if (error || !data) return toast.error("Falha ao gerar visualização");
    setPreview({ url: data.signedUrl, mime: d.mime ?? "application/octet-stream", name: d.file_name ?? d.doc_type });
  }

  async function downloadDoc(d: DocRow) {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(d.file_path, 120, { download: d.file_name ?? undefined });
    if (error || !data) return toast.error("Falha ao baixar");
    window.open(data.signedUrl, "_blank");
  }

  async function approve(d: DocRow) {
    const { error } = await supabase.from("student_documents")
      .update({ status: "aprovado", notes: null, reviewed_at: new Date().toISOString() }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Documento aprovado");
    load();
  }
  async function reject() {
    if (!rejectFor) return;
    if (!rejectNote.trim()) return toast.error("Escreva o motivo");
    const { error } = await supabase.from("student_documents")
      .update({ status: "rejeitado", notes: rejectNote.trim(), reviewed_at: new Date().toISOString() }).eq("id", rejectFor.id);
    if (error) return toast.error(error.message);
    toast.success("Documento rejeitado");
    setRejectFor(null); setRejectNote(""); load();
  }

  if (!canAccess) {
    return <div className="p-10 text-center text-muted-foreground">Você não tem permissão para acessar esta área.</div>;
  }

  const active = selected ? students.find(s => s.user_id === selected) : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><FileCheck2 className="size-5" /></div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Certificação e Documentação para Conselhos</h1>
          <p className="text-sm text-muted-foreground">Analise os documentos enviados pelos alunos, visualize antes de aprovar e baixe os aprovados.</p>
        </div>
      </header>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : active ? (
        <StudentDetail
          student={active}
          onBack={() => setSelected(null)}
          onPreview={openPreview}
          onDownload={downloadDoc}
          onApprove={approve}
          onReject={(d) => { setRejectFor(d); setRejectNote(d.notes ?? ""); }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou CPF" className="pl-9" />
            </div>
            <Button onClick={() => setLinksModal(true)} className="gap-2"><Link2 className="size-4" /> Links de certificação</Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Apenas alunos enviados por um <strong>link de certificação</strong> aparecem aqui. Alunos regulares da plataforma não são incluídos.</p>
          <div className="grid gap-3">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground p-8 text-center bg-card rounded-xl border border-border">Nenhum aluno enviou documentos ainda. Crie um <strong>link de certificação</strong> e envie ao aluno.</p>}
            {filtered.map(s => {
              const total = s.docs.length;
              const approved = s.docs.filter(d => d.status === "aprovado").length;
              const pending = s.docs.filter(d => d.status === "enviado").length;
              const rejected = s.docs.filter(d => d.status === "rejeitado").length;
              return (
                <button key={s.user_id} onClick={() => setSelected(s.user_id)} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/60 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0"><User className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{s.profile?.full_name || s.student_name || "Aluno"}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.student_email} {s.profile?.cpf ? `· CPF ${s.profile.cpf}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {pending > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1"><Clock className="size-3" />{pending} em análise</span>}
                      {approved > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="size-3" />{approved} ok</span>}
                      {rejected > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><XCircle className="size-3" />{rejected} rejeitado</span>}
                      <span className="text-xs text-muted-foreground">{total} doc(s)</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b"><DialogTitle className="truncate">{preview?.name}</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0 bg-secondary/40">
            {preview && (preview.mime.startsWith("image/") ? (
              <img src={preview.url} alt={preview.name} className="w-full h-full object-contain" />
            ) : (
              <iframe src={preview.url} className="w-full h-full" title={preview.name} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejectFor} onOpenChange={o => !o && setRejectFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rejeitar documento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (o aluno verá esta mensagem)</Label>
            <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={4} placeholder="Ex.: Foto ilegível, envie novamente com melhor resolução." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectFor(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={reject}>Rejeitar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Links de certificação */}
      <Dialog open={linksModal} onOpenChange={setLinksModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Links de Certificação</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Gere um link e envie ao aluno. Ele preenche o formulário e envia os documentos direto pra sua aba.</p>
          <div className="rounded-xl border border-border p-4 bg-secondary/30 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do aluno (opcional)</Label>
                <Input value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="Ex.: Maria Silva" />
              </div>
              <div>
                <Label className="text-xs">E-mail (opcional)</Label>
                <Input value={newLinkEmail} onChange={e => setNewLinkEmail(e.target.value)} placeholder="aluno@email.com" />
              </div>
            </div>
            <Button onClick={createCertLink} disabled={creatingLink} className="gap-2">
              {creatingLink ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Gerar novo link
            </Button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-2 mt-2">
            {certLinks.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum link criado ainda.</p>}
            {certLinks.map(l => {
              const expired = new Date(l.expires_at) < new Date();
              return (
                <div key={l.id} className="rounded-lg border border-border p-3 bg-card">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{l.student_name || "Aluno sem nome"}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.student_email || "sem e-mail"}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-1 font-mono">{linkUrl(l.token)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {l.revoked && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">revogado</span>}
                      {!l.revoked && expired && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">expirado</span>}
                      <Button size="sm" variant="outline" onClick={() => copyLink(l.token)}><Copy className="size-4" /></Button>
                      {!l.revoked && <Button size="sm" variant="ghost" onClick={() => revokeLink(l.id)} className="text-red-600">Revogar</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentDetail({ student, onBack, onPreview, onDownload, onApprove, onReject }: {
  student: LinkRow & { docs: DocRow[]; profile: Profile };
  onBack: () => void;
  onPreview: (d: DocRow) => void;
  onDownload: (d: DocRow) => void;
  onApprove: (d: DocRow) => void;
  onReject: (d: DocRow) => void;
}) {
  const p = student.profile ?? {};
  const row = (label: string, value: any) => (
    <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-sm text-foreground truncate">{value || <span className="text-muted-foreground italic">—</span>}</p></div>
  );
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Voltar</button>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4">Formulário de matrícula</h2>
        {!p.enrollment_form_submitted_at && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">Aluno ainda não enviou o formulário.</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {row("Nome completo", p.full_name)}
          {row("CPF", p.cpf)}
          {row("Data de nascimento", p.birth_date)}
          {row("RG", p.rg)}
          {row("Órgão emissor", p.orgao_emissor)}
          {row("Data emissão", p.rg_emissao)}
          {row("Naturalidade", p.naturalidade)}
          {row("Pai", p.pai)}
          {row("Mãe", p.mae)}
          {row("CEP", p.cep)}
          {row("Rua", p.rua)}
          {row("Bairro", p.bairro)}
          {row("Cidade", p.cidade)}
          {row("Estado", p.estado)}
          {row("E-mail", p.contact_email)}
          {row("Escolaridade", p.escolaridade)}
          {row("Ano de formação", p.ano_formacao)}
          {row("Instituição", p.instituicao_formacao)}
          {row("Curso escolhido", p.curso_escolhido)}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4">Documentos enviados</h2>
        {student.docs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>}
        <div className="grid gap-3">
          {student.docs.map(d => (
            <div key={d.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{DOC_LABELS[d.doc_type] ?? d.doc_type}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                </div>
                {statusPill(d.status)}
              </div>
              {d.notes && d.status === "rejeitado" && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-2"><strong>Motivo:</strong> {d.notes}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onPreview(d)}><Eye className="size-4" /> Visualizar</Button>
                <Button size="sm" variant="outline" onClick={() => onDownload(d)} disabled={d.status !== "aprovado"} title={d.status !== "aprovado" ? "Aprove antes de baixar" : ""}><Download className="size-4" /> Baixar</Button>
                {d.status !== "aprovado" && <Button size="sm" onClick={() => onApprove(d)} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="size-4" /> Aprovar</Button>}
                {d.status !== "rejeitado" && <Button size="sm" variant="destructive" onClick={() => onReject(d)}><XCircle className="size-4" /> Rejeitar</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}