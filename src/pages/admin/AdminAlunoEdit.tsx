import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, KeyRound, Trash2, Plus, Send, Mail, CheckCircle2, Pencil, Download, MessageCircle, Activity, Clock, Award, FileText, XCircle, ExternalLink, Copy, ClipboardList, UploadCloud } from "lucide-react";
import { Barcode } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import RepasseSection from "@/components/admin/RepasseSection";
import ParcelaComprovante from "@/components/admin/ParcelaComprovante";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import jsPDF from "jspdf";
import logoUrl from "@/assets/multplick-logo.png";
import { StudentAnexos } from "@/components/admin/StudentAnexos";
import { StudentContractDialog } from "@/components/admin/StudentContractDialog";
import { useAuth } from "@/hooks/useAuth";

type Course = { id: string; title: string };
type Enrollment = { id: string; course_id: string; status: string; progress: number; enrolled_at: string; courses: { title: string } | null };
type AffiliateSeller = {
  id: string;
  user_id: string;
  code: string;
  profile: { username: string | null; display_name: string | null; email: string | null } | null;
};
type Turma = { id: string; nome: string; courses: { title: string } | null };
type ProgressRow = {
  lesson_id: string; completed: boolean; score: number | null;
  completed_at: string | null; updated_at: string | null; created_at: string | null;
  course_lessons: {
    title: string; lesson_type: string; sort_order: number;
    course_sections: { title: string; sort_order: number; course_id: string } | null;
  } | null;
};
type Installment = {
  id: string; enrollment_id: string; numero: number; valor_cents: number;
  vencimento: string | null; status: string; paid_at: string | null;
  forma_pagamento: string | null; desconto_cents: number | null; valor_final_cents: number | null;
  comprovante_path?: string | null; comprovante_nome?: string | null;
};

type ExamRow = {
  id: string; application_id: string; course_title: string; status: string;
  score: number | null; passed: boolean | null; duration_minutes: number; passing_score: number;
  access_token: string; started_at: string | null; completed_at: string | null; created_at: string;
  candidate_name: string | null;
};
type PreApp = {
  id: string; created_at: string; status: string; course_id: string | null; course_title: string;
  full_name: string; cpf: string | null; birth_date: string | null; rg: string | null;
  rg_issuer: string | null; rg_issue_date: string | null; naturalidade: string | null;
  father_name: string | null; mother_name: string | null;
  cep: string | null; street: string | null; neighborhood: string | null; city: string | null; state: string | null;
  phone: string | null; email: string;
  schooling: string | null; graduation_year: string | null; institution: string | null;
  payment_method: string | null; notes: string | null;
  entry_date: string | null; payment_reminder_date: string | null;
  promo_code: string | null;
};

const FORMAS_PAGAMENTO = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Boleto", "PIX"] as const;
const safeCents = (v: number | null | undefined) => Number.isFinite(Number(v)) ? Number(v) : 0;
const brl = (c: number | null | undefined) => (safeCents(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const calcIdade = (d?: string | null) => {
  if (!d) return "";
  const b = new Date(d); const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 ? String(a) : "";
};

const Inner = () => {
  const { activeAccountId } = useCommercialAccounts();
  const { hasPermission, isSuperAdmin } = useAuth();
  const canIssueBoleto = isSuperAdmin || hasPermission("issue_boletos") || hasPermission("manage_courses");
  const canSettleBoleto = isSuperAdmin || hasPermission("settle_boletos") || hasPermission("manage_courses");
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const initialTab = (location.hash || "").replace("#", "") || "dados";
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({ username: "", display_name: "", email: "" });
  const [sp, setSp] = useState<any>({});
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [allTurmas, setAllTurmas] = useState<{ id: string; nome: string }[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [preApps, setPreApps] = useState<PreApp[]>([]);
  const [affiliateSellers, setAffiliateSellers] = useState<AffiliateSeller[]>([]);
  const [savingPreId, setSavingPreId] = useState<string | null>(null);

  // dialogs
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState("");
  const [addTurmaOpen, setAddTurmaOpen] = useState(false);
  const [newTurmaId, setNewTurmaId] = useState("");
  const [addParcOpen, setAddParcOpen] = useState(false);
  const [parcEnrId, setParcEnrId] = useState("");
  const [parcValor, setParcValor] = useState("");
  const [parcVenc, setParcVenc] = useState("");
  const [parcNumero, setParcNumero] = useState("1");
  const [parcQtd, setParcQtd] = useState("1");
  const [parcTipoValor, setParcTipoValor] = useState<"total" | "parcela">("parcela");
  const [resetPw, setResetPw] = useState("");
  const [sendingLogin, setSendingLogin] = useState(false);

  // edição avançada da parcela
  const [editing, setEditing] = useState<Installment | null>(null);
  const [editForma, setEditForma] = useState<string>("PIX");
  const [editDesconto, setEditDesconto] = useState<string>("0");
  const [editVenc, setEditVenc] = useState<string>("");
  const [editValor, setEditValor] = useState<string>("0");
  const [editStatus, setEditStatus] = useState<string>("aberto");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (i: Installment) => {
    setEditing(i);
    setEditForma(i.forma_pagamento ?? "PIX");
    setEditDesconto((safeCents(i.desconto_cents) / 100).toFixed(2).replace(".", ","));
    setEditVenc(i.vencimento ? i.vencimento.slice(0, 10) : "");
    setEditValor((safeCents(i.valor_cents) / 100).toFixed(2).replace(".", ","));
    setEditStatus(i.status ?? "aberto");
  };

  const descontoCents = (() => {
    const n = Number(String(editDesconto).replace(/\./g, "").replace(",", "."));
    if (!isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  })();
  const valorOrigCents = (() => {
    const n = Number(String(editValor).replace(/\./g, "").replace(",", "."));
    if (!isFinite(n) || n < 0) return safeCents(editing?.valor_cents);
    return Math.round(n * 100);
  })();
  const valorFinalCents = Math.max(0, valorOrigCents - descontoCents);

  const salvarEdicao = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const patch: any = {
      forma_pagamento: editForma,
      desconto_cents: descontoCents,
      valor_cents: valorOrigCents,
      valor_final_cents: valorFinalCents,
      vencimento: editVenc || null,
      status: editStatus,
    };
    if (editStatus === "pago" && !editing.paid_at) patch.paid_at = new Date().toISOString();
    if (editStatus !== "pago") patch.paid_at = null;
    const { error } = await supabase.from("installments").update(patch).eq("id", editing.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Recebimento atualizado");
    setEditing(null);
    load();
  };

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: prof }, { data: spd }, { data: enrs }, { data: tas }, { data: ats }, { data: cs }] = await Promise.all([
      supabase.from("profiles").select("username, display_name, email").eq("user_id", userId).maybeSingle(),
      supabase.from("student_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("enrollments").select("id,course_id,status,progress,enrolled_at, courses(title)").eq("user_id", userId).order("enrolled_at", { ascending: false }),
      supabase.from("turma_alunos").select("turma_id, turmas(id, nome, courses(title))").eq("user_id", userId),
      supabase.from("turmas").select("id, nome").order("nome"),
      supabase.from("courses").select("id,title").eq("active", true).order("title"),
    ]);
    setProfile(prof ?? { username: "", display_name: "", email: "" });
    setSp(spd ?? { user_id: userId });
    setEnrollments(((enrs ?? []) as any));
    setTurmas(((tas ?? []) as any[]).map((t: any) => ({ id: t.turmas?.id, nome: t.turmas?.nome, courses: t.turmas?.courses })).filter((t: any) => t.id));
    setAllTurmas((ats ?? []) as any);
    setAllCourses((cs ?? []) as any);
    // Carrega afiliados e perfis separadamente. Assim, uma relação embutida
    // indisponível no cache da API não deixa o seletor silenciosamente vazio.
    const { data: activeAffiliates, error: affiliatesError } = await supabase
      .from("affiliates")
      .select("id,user_id,code")
      .eq("status", "ativo")
      .order("code");
    if (affiliatesError) {
      setAffiliateSellers([]);
      toast.error(`Não foi possível carregar os afiliados: ${affiliatesError.message}`);
    } else {
      const affiliateUserIds = (activeAffiliates ?? []).map((affiliate) => affiliate.user_id);
      const { data: affiliateProfiles, error: profilesError } = affiliateUserIds.length
        ? await supabase
            .from("profiles")
            .select("user_id,username,display_name,email")
            .in("user_id", affiliateUserIds)
        : { data: [], error: null };
      if (profilesError) {
        toast.error(`Não foi possível carregar os nomes dos afiliados: ${profilesError.message}`);
      }
      const profilesByUserId = new Map(
        (affiliateProfiles ?? []).map((affiliateProfile) => [affiliateProfile.user_id, affiliateProfile]),
      );
      setAffiliateSellers((activeAffiliates ?? []).map((affiliate) => ({
        ...affiliate,
        profile: profilesByUserId.get(affiliate.user_id) ?? null,
      })));
    }
    const enrIds = (enrs ?? []).map((e: any) => e.id);
    if (enrIds.length) {
      const { data: ins } = await supabase.from("installments").select("*").in("enrollment_id", enrIds).order("vencimento");
      setInstallments((ins ?? []) as any);
    } else setInstallments([]);

    // Provas enviadas: buscar pelas fichas de pré-matrícula do aluno (por e-mail
    // do cadastro ou do perfil), e depois puxar todos os exames vinculados.
    const emails = Array.from(new Set([
      (spd as any)?.contact_email,
      (prof as any)?.email,
    ].filter(Boolean).map((e: string) => e.toLowerCase())));
    const nameGuess = (spd as any)?.full_name || (prof as any)?.display_name || null;
    let apps: any[] | null = null;
    if (emails.length) {
      const { data } = await supabase
        .from("enrollment_applications")
        .select("*").in("email", emails).order("created_at", { ascending: false });
      apps = data ?? [];
    }
    if ((!apps || apps.length === 0) && nameGuess) {
      const { data } = await supabase
        .from("enrollment_applications")
        .select("*").ilike("full_name", nameGuess).order("created_at", { ascending: false });
      apps = data ?? [];
    }
    if (apps) {
      setPreApps((apps ?? []) as PreApp[]);
      // Auto-prefill "Dados" a partir da pré-matrícula mais recente quando o
      // cadastro do aluno ainda estiver vazio (aluno criado direto da ficha).
      const latest = (apps ?? [])[0] as PreApp | undefined;
      if (latest) {
        setSp((s: any) => {
          const base = s ?? { user_id: userId };
          const pick = (cur: any, val: any) => (cur === undefined || cur === null || cur === "" ? (val ?? cur) : cur);
          return {
            ...base,
            full_name: pick(base.full_name, latest.full_name),
            cpf: pick(base.cpf, latest.cpf),
            rg: pick(base.rg, latest.rg),
            birth_date: pick(base.birth_date, latest.birth_date),
            phone1: pick(base.phone1, latest.phone),
            contact_email: pick(base.contact_email, latest.email),
            cep: pick(base.cep, latest.cep),
            rua: pick(base.rua, latest.street),
            bairro: pick(base.bairro, latest.neighborhood),
            cidade: pick(base.cidade, latest.city),
            estado: pick(base.estado, latest.state),
            responsavel_nome: pick(base.responsavel_nome, latest.mother_name || latest.father_name),
            observacoes: pick(base.observacoes, latest.notes),
          };
        });
      }
      const appIds = (apps ?? []).map((a: any) => a.id);
      if (appIds.length) {
        const { data: exs } = await supabase
          .from("enrollment_exams")
          .select("*")
          .in("application_id", appIds)
          .order("created_at", { ascending: false });
        setExams((exs ?? []) as ExamRow[]);
      } else setExams([]);
    } else { setExams([]); setPreApps([]); }

    // Progresso por aula
    const { data: lp } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed, score, completed_at, updated_at, created_at, course_lessons(title, lesson_type, sort_order, course_sections(title, sort_order, course_id))")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setProgressRows(((lp ?? []) as any));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const setSpField = (k: string, v: any) => setSp((s: any) => ({ ...s, [k]: v }));

  const fetchCep = async (cep: string): Promise<{ logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null> => {
    const clean = (cep || "").replace(/\D/g, "");
    if (clean.length !== 8) return null;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const j = await res.json();
      if (j?.erro) return null;
      return j;
    } catch { return null; }
  };

  const autofillSpFromCep = async () => {
    const j = await fetchCep(sp.cep ?? "");
    if (!j) return toast.error("CEP não encontrado");
    setSp((s: any) => ({
      ...s,
      rua: j.logradouro || s.rua,
      bairro: j.bairro || s.bairro,
      cidade: j.localidade || s.cidade,
      estado: j.uf || s.estado,
    }));
    toast.success("Endereço preenchido pelo CEP");
  };

  const autofillPreFromCep = async (id: string, cep: string) => {
    const j = await fetchCep(cep);
    if (!j) return toast.error("CEP não encontrado");
    setPreApps(list => list.map(a => a.id === id ? {
      ...a,
      street: j.logradouro || a.street,
      neighborhood: j.bairro || a.neighborhood,
      city: j.localidade || a.city,
      state: j.uf || a.state,
    } : a));
    toast.success("Endereço preenchido pelo CEP");
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      full_name: sp.full_name ?? null,
      phone1: sp.phone1 ?? null, phone2: sp.phone2 ?? null,
      contact_email: sp.contact_email ?? null,
      cpf: sp.cpf ?? null, rg: sp.rg ?? null,
      cep: sp.cep ?? null, rua: sp.rua ?? null, numero: sp.numero ?? null,
      bairro: sp.bairro ?? null, cidade: sp.cidade ?? null, estado: sp.estado ?? null,
      birth_date: sp.birth_date || null, sexo: sp.sexo ?? null,
      polo: sp.polo ?? null, status: sp.status ?? "ativo",
      vendedor: sp.vendedor ?? null, data_final: sp.data_final || null,
      liberar_apostila: !!sp.liberar_apostila,
      certificado_liberado: !!sp.certificado_liberado,
      bolsista: !!sp.bolsista,
      foto_url: sp.foto_url ?? null,
      responsavel_nome: sp.responsavel_nome ?? null,
      responsavel_rg: sp.responsavel_rg ?? null,
      responsavel_cpf: sp.responsavel_cpf ?? null,
      observacoes: sp.observacoes ?? null,
    };
    // Campos vindos da pré-matrícula (mantidos se já existirem no sp)
    (payload as any).orgao_emissor = sp.orgao_emissor ?? null;
    (payload as any).rg_emissao = sp.rg_emissao || null;
    (payload as any).naturalidade = sp.naturalidade ?? null;
    (payload as any).pai = sp.pai ?? null;
    (payload as any).mae = sp.mae ?? null;
    (payload as any).escolaridade = sp.escolaridade ?? null;
    (payload as any).ano_formacao = sp.ano_formacao ?? null;
    (payload as any).instituicao_formacao = sp.instituicao_formacao ?? null;
    (payload as any).curso_escolhido = sp.curso_escolhido ?? null;
    const { error } = await supabase.from("student_profiles").upsert(payload, { onConflict: "user_id" });
    if (!error && sp.full_name && sp.full_name !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: sp.full_name }).eq("user_id", userId);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    // O afiliado é vinculado à matrícula. A comissão só nasce quando uma
    // parcela for efetivamente marcada como paga pelo trigger do banco.
    if (enrollments.length) {
      const affiliateId = affiliateSellers.find((affiliate) => affiliate.user_id === sp.vendedor)?.id ?? null;
      const { error: affiliateError } = await supabase
        .from("enrollments")
        .update({ affiliate_id: affiliateId })
        .in("id", enrollments.map((enrollment) => enrollment.id));
      if (affiliateError) {
        toast.error("Cadastro salvo, mas falhou ao vincular o afiliado às matrículas.");
        return;
      }
    }
    toast.success("Cadastro salvo!");
    load();
  };

  const addCourse = async () => {
    if (!newCourseId || !userId) return;
    const affiliateId = affiliateSellers.find((affiliate) => affiliate.user_id === sp.vendedor)?.id ?? null;
    const { error } = await supabase.from("enrollments").insert(withAccount({ user_id: userId, course_id: newCourseId, affiliate_id: affiliateId }, activeAccountId));
    if (error) {
      if ((error as any).code === "23505" || /duplicate key/i.test(error.message)) {
        toast.info("Aluno já está matriculado nesse curso.");
        setAddCourseOpen(false); setNewCourseId(""); load();
        return;
      }
      return toast.error(error.message);
    }
    toast.success("Curso adicionado!"); setAddCourseOpen(false); setNewCourseId(""); load();
  };
  const changeCourse = async (enrollmentId: string, courseId: string) => {
    const { error } = await supabase.from("enrollments").update({ course_id: courseId }).eq("id", enrollmentId);
    if (error) {
      if ((error as any).code === "23505" || /duplicate key/i.test(error.message)) return toast.info("Aluno já está matriculado nesse curso.");
      return toast.error(error.message);
    }
    toast.success("Curso alterado!"); load();
  };

  const removeEnr = async (id: string) => {
    if (!confirm("Remover este curso?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); load();
  };

  const addTurma = async () => {
    if (!newTurmaId || !userId) return;
    const { error } = await supabase.from("turma_alunos").insert(withAccount({ user_id: userId, turma_id: newTurmaId }, activeAccountId));
    if (error) return toast.error(error.message);
    toast.success("Vinculado!"); setAddTurmaOpen(false); setNewTurmaId(""); load();
  };
  const removeTurma = async (turmaId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("turma_alunos").delete().eq("user_id", userId).eq("turma_id", turmaId);
    if (error) return toast.error(error.message);
    toast.success("Removido"); load();
  };

  const addParcela = async () => {
    if (!parcEnrId || !parcValor) return toast.error("Selecione o curso e informe o valor");
    const valorInformado = Math.round(parseFloat(parcValor.replace(/\./g, "").replace(",", ".")) * 100);
    if (!isFinite(valorInformado) || valorInformado <= 0) return toast.error("Valor inválido");
    const qtd = Math.max(1, parseInt(parcQtd) || 1);
    const valorParcela = parcTipoValor === "total" ? Math.round(valorInformado / qtd) : valorInformado;

    // próximo número disponível para essa matrícula
    const existentes = installments.filter(i => i.enrollment_id === parcEnrId);
    const baseNumero = existentes.reduce((m, i) => Math.max(m, i.numero || 0), 0);

    // gera vencimentos mensais a partir da data informada
    const rows: any[] = [];
    const base = parcVenc ? new Date(parcVenc + "T12:00:00") : null;
    for (let k = 0; k < qtd; k++) {
      let venc: string | null = null;
      if (base) {
        const d = new Date(base);
        d.setMonth(d.getMonth() + k);
        venc = d.toISOString().slice(0, 10);
      }
      rows.push(withAccount({
        enrollment_id: parcEnrId,
        numero: baseNumero + k + 1,
        valor_cents: valorParcela,
        vencimento: venc,
      }, activeAccountId));
    }
    const { error } = await supabase.from("installments").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(qtd > 1 ? `${qtd} parcelas criadas!` : "Parcela criada!");
    setAddParcOpen(false);
    setParcEnrId(""); setParcValor(""); setParcVenc(""); setParcNumero("1"); setParcQtd("1"); load();
  };
  const togglePago = async (i: Installment) => {
    const novo = i.status === "pago" ? "aberto" : "pago";
    const { error } = await supabase.from("installments").update({
      status: novo, paid_at: novo === "pago" ? new Date().toISOString() : null,
    }).eq("id", i.id);
    if (error) return toast.error(error.message);
    load();
  };
  const removeParc = async (id: string) => {
    if (!confirm("Excluir parcela?")) return;
    await supabase.from("installments").delete().eq("id", id); load();
  };

  const loadLogoDataUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const baixarRecibo = async (i: Installment) => {
    const e = enrollments.find(x => x.id === i.enrollment_id);
    const studentName = sp.full_name || profile.display_name || "—";
    const studentEmail = sp.contact_email || profile.email || "—";
    const courseTitle = e?.courses?.title ?? "—";

    const NAVY = [10, 36, 78] as const;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, W, 110, "F");
    const logo = await loadLogoDataUrl();
    if (logo) {
      try { doc.addImage(logo, "PNG", W / 2 - 60, 22, 120, 60, undefined, "FAST"); } catch {}
    } else {
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(26);
      doc.text("MULTPLICK", W / 2, 60, { align: "center" });
    }

    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("Multplick Formação Profissional", W / 2, 140, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
    doc.text("CNPJ: 37.541.371/0001-90", W / 2, 156, { align: "center" });

    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]); doc.setLineWidth(1);
    doc.line(60, 180, W - 60, 180);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("RECIBO DE PAGAMENTO", W / 2, 215, { align: "center" });
    doc.line(60, 235, W - 60, 235);

    const reciboNumero = `${String(i.numero ?? 0).padStart(3, "0")}/${new Date().getFullYear()}`;
    const valorRecebido = safeCents(i.valor_final_cents ?? i.valor_cents);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(`Recibo nº ${reciboNumero}`, 60, 260);
    doc.text(`Valor: ${brl(valorRecebido)}`, W - 60, 260, { align: "right" });

    const dataPag = i.paid_at ? new Date(i.paid_at) : new Date();
    const bodyY = 300;
    doc.setTextColor(30, 30, 30); doc.setFontSize(12);
    const body = `Recebemos de ${studentName} a importância de ${brl(valorRecebido)}, referente à parcela ${i.numero} do curso "${courseTitle}", pago em ${dataPag.toLocaleDateString("pt-BR")}.`;
    const lines = doc.splitTextToSize(body, W - 120);
    doc.text(lines, 60, bodyY, { lineHeightFactor: 1.6 });

    const detailY = bodyY + lines.length * 20 + 30;
    const detalhes: [string, string][] = [
      ["Aluno", studentName],
      ["E-mail", studentEmail],
      ["Curso", courseTitle],
      ["Parcela", String(i.numero ?? "—")],
      ["Valor original", brl(i.valor_cents)],
      ["Desconto", brl(i.desconto_cents ?? 0)],
      ["Valor recebido", brl(valorRecebido)],
      ["Forma de pagamento", i.forma_pagamento ?? "—"],
      ["Data do pagamento", dataPag.toLocaleDateString("pt-BR")],
    ];
    doc.setFontSize(11);
    detalhes.forEach((row, idx) => {
      const y = detailY + idx * 22;
      doc.setFillColor(idx % 2 === 0 ? 245 : 255, idx % 2 === 0 ? 247 : 255, idx % 2 === 0 ? 250 : 255);
      doc.rect(60, y - 14, W - 120, 22, "F");
      doc.setFont("helvetica", "bold"); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(row[0], 72, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40);
      doc.text(row[1], 220, y);
    });

    const footerY = H - 130;
    try {
      const { SIGNATURE_PNG } = await import("@/lib/corporativo/signatureImage");
      doc.addImage(SIGNATURE_PNG, "PNG", W / 2 - 55, footerY - 55, 110, 55, undefined, "FAST");
    } catch { /* ignore */ }
    doc.setDrawColor(180, 180, 180);
    doc.line(W / 2 - 130, footerY, W / 2 + 130, footerY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
    doc.text("Assinatura — Multplick Formação Profissional", W / 2, footerY + 14, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text("Recibo referente à prestação de serviços educacionais.", W / 2, H - 70, { align: "center" });
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, H - 40, W, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(9);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, W / 2, H - 16, { align: "center" });

    const safe = (s: string | null | undefined) => (s ?? "aluno").replace(/[^a-z0-9]+/gi, "_");
    doc.save(`recibo_${safe(studentName)}_parc${i.numero}.pdf`);
  };

  const enviarWhats = (i: Installment) => {
    const e = enrollments.find(x => x.id === i.enrollment_id);
    const studentName = sp.full_name || profile.display_name || "";
    const courseTitle = e?.courses?.title ?? "";
    const msg = `Olá ${studentName}, segue em anexo o recibo de pagamento do curso ${courseTitle}. Atenciosamente, equipe Multplick.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  // ============ BOLETO (admin) ============
  const [boletoLoadingId, setBoletoLoadingId] = useState<string | null>(null);
  const [bulkBoletoLoading, setBulkBoletoLoading] = useState(false);

  const buildPayer = () => ({
    name: sp.full_name || profile.display_name || "",
    email: sp.contact_email || profile.email || "",
    cpf: sp.cpf || "",
    address: {
      zip_code: sp.cep || "",
      street_name: sp.rua || "",
      street_number: sp.numero || "S/N",
      neighborhood: sp.bairro || "",
      city: sp.cidade || "",
      federal_unit: sp.estado || "",
    },
  });

  const validatePayer = (p: ReturnType<typeof buildPayer>) => {
    if (!p.name || !p.email || !p.cpf) return "Nome, e-mail e CPF do aluno são obrigatórios (aba Dados).";
    const a = p.address;
    if (!a.zip_code || !a.street_name || !a.neighborhood || !a.city || !a.federal_unit)
      return "Endereço do aluno incompleto (aba Dados): CEP, rua, bairro, cidade e UF.";
    return null;
  };

  const gerarBoletoAdmin = async (i: Installment, opts?: { silent?: boolean }) => {
    const payer = buildPayer();
    const err = validatePayer(payer);
    if (err) { toast.error(err); return null; }
    setBoletoLoadingId(i.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-boleto", {
        body: { installment_id: i.id, due_date: i.vencimento?.slice(0, 10), payer },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const link = (data as any)?.pdf_url || (data as any)?.init_point;
      if (!opts?.silent) {
        if (link) {
          try { window.open(link, "_blank", "noopener,noreferrer"); } catch {}
          try { await navigator.clipboard?.writeText(link); } catch {}
          toast.success(`Boleto da parcela ${i.numero} gerado! Link aberto em nova aba e copiado.`);
        } else {
          toast.success(`Boleto da parcela ${i.numero} gerado!`);
        }
      }
      return data as { digitable_line?: string; pdf_url?: string; due_date?: string };
    } catch (e: any) {
      toast.error(`Parcela ${i.numero}: ${e?.message ?? "erro ao gerar"}`);
      return null;
    } finally { setBoletoLoadingId(null); }
  };

  const gerarEEnviarWhats = async (i: Installment) => {
    const data = await gerarBoletoAdmin(i);
    if (!data) return;
    const phone = String(sp.phone1 || "").replace(/\D/g, "");
    const studentName = sp.full_name || profile.display_name || "";
    const e = enrollments.find(x => x.id === i.enrollment_id);
    const courseTitle = e?.courses?.title ?? "";
    const venc = data.due_date ? new Date(data.due_date).toLocaleDateString("pt-BR") : "";
    const msg = [
      `Olá ${studentName}! Segue o boleto da parcela ${i.numero} do curso ${courseTitle}.`,
      `Valor: ${brl(i.valor_final_cents ?? i.valor_cents)}`,
      venc ? `Vencimento: ${venc}` : "",
      "",
      data.pdf_url ? `PDF do boleto: ${data.pdf_url}` : "",
      data.digitable_line ? `Linha digitável: ${data.digitable_line}` : "",
      "",
      "Multplick Educação.",
    ].filter(Boolean).join("\n");
    const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const gerarBoletosEmMassa = async () => {
    const abertas = installments.filter(i => i.status !== "pago");
    if (abertas.length === 0) return toast.info("Nenhuma parcela em aberto.");
    if (!confirm(`Gerar boleto para ${abertas.length} parcela(s) em aberto?`)) return;
    const payer = buildPayer();
    const err = validatePayer(payer);
    if (err) return toast.error(err);
    setBulkBoletoLoading(true);
    let ok = 0, fail = 0;
    const links: string[] = [];
    for (const i of abertas) {
      const d = await gerarBoletoAdmin(i, { silent: true });
      if (d) { ok++; if (d.pdf_url) links.push(`Parc. ${i.numero}: ${d.pdf_url}`); }
      else fail++;
    }
    setBulkBoletoLoading(false);
    toast.success(`${ok} boleto(s) gerado(s)${fail ? ` (${fail} falharam)` : ""}`);
    if (links.length && confirm("Enviar todos os links por WhatsApp ao aluno?")) {
      const phone = String(sp.phone1 || "").replace(/\D/g, "");
      const msg = `Olá ${sp.full_name || ""}! Seguem os boletos das suas parcelas em aberto:\n\n${links.join("\n")}\n\nMultplick Educação.`;
      const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const resetPassword = async () => {
    const cleanPassword = resetPw.trim();
    if (!cleanPassword || cleanPassword.length < 4) return toast.error("Senha mínima de 4 caracteres");
    if (!userId) return;
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ user_id: userId, password: cleanPassword }),
    });
    const out = await res.json();
    if (!res.ok) return toast.error(out.error || "Erro");
    setResetPw(cleanPassword);
    toast.success(`Senha redefinida! Login: ${out.username || profile.username}`);
  };

  const setPreField = (id: string, k: keyof PreApp, v: any) =>
    setPreApps(prev => prev.map(a => a.id === id ? { ...a, [k]: v } as PreApp : a));

  const savePreApp = async (a: PreApp) => {
    setSavingPreId(a.id);
    const { error } = await supabase.from("enrollment_applications").update({
      full_name: a.full_name, cpf: a.cpf, rg: a.rg, rg_issuer: a.rg_issuer, rg_issue_date: a.rg_issue_date || null,
      birth_date: a.birth_date || null, naturalidade: a.naturalidade,
      father_name: a.father_name, mother_name: a.mother_name,
      cep: a.cep, street: a.street, neighborhood: a.neighborhood, city: a.city, state: a.state,
      phone: a.phone, email: a.email,
      schooling: a.schooling, graduation_year: a.graduation_year, institution: a.institution,
      payment_method: a.payment_method, promo_code: a.promo_code,
      notes: a.notes, status: a.status,
      entry_date: a.entry_date || null, payment_reminder_date: a.payment_reminder_date || null,
    }).eq("id", a.id);
    setSavingPreId(null);
    if (error) return toast.error(error.message);
    toast.success("Pré-matrícula salva");
  };

  const formatPreAppForClipboard = (a: PreApp) => {
    const date = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "";
    const rows: [string, string | null | undefined][] = [
      ["Curso", a.course_title],
      ["Nome completo", a.full_name],
      ["CPF", a.cpf],
      ["RG", a.rg],
      ["Órgão emissor", a.rg_issuer],
      ["Emissão do RG", date(a.rg_issue_date)],
      ["Data de nascimento", date(a.birth_date)],
      ["Naturalidade", a.naturalidade],
      ["Pai", a.father_name],
      ["Mãe", a.mother_name],
      ["Telefone", a.phone],
      ["E-mail", a.email],
      ["CEP", a.cep],
      ["Rua", a.street],
      ["Bairro", a.neighborhood],
      ["Cidade", a.city],
      ["Estado", a.state],
      ["Escolaridade", a.schooling],
      ["Ano de formação", a.graduation_year],
      ["Instituição", a.institution],
      ["Forma de pagamento", a.payment_method],
      ["Código promocional", a.promo_code],
      ["Data de entrada", date(a.entry_date)],
      ["Lembrete de pagamento", date(a.payment_reminder_date)],
      ["Observações", a.notes],
    ];
    return [
      "Ficha de pré-matrícula",
      ...rows
        .map(([label, value]) => [label, String(value ?? "").trim()] as const)
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`),
    ].join("\n");
  };

  const writeClipboardText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    }
  };

  const copyPreToProfile = async (a: PreApp) => {
    if (!userId) return;
    const copiedToClipboard = await writeClipboardText(formatPreAppForClipboard(a));
    // Only pre-registration fields, overwriting when there is data in the ficha.
    const pick = (preVal: any, spVal: any) =>
      (preVal !== null && preVal !== undefined && String(preVal).trim() !== "") ? preVal : (spVal ?? null);
    const payload: Record<string, any> = {
      user_id: userId,
      full_name: pick(a.full_name, sp?.full_name),
      cpf: pick(a.cpf, sp?.cpf),
      rg: pick(a.rg, sp?.rg),
      orgao_emissor: pick(a.rg_issuer, sp?.orgao_emissor),
      rg_emissao: pick(a.rg_issue_date, sp?.rg_emissao),
      birth_date: pick(a.birth_date, sp?.birth_date),
      naturalidade: pick(a.naturalidade, sp?.naturalidade),
      pai: pick(a.father_name, sp?.pai),
      mae: pick(a.mother_name, sp?.mae),
      phone1: pick(a.phone, sp?.phone1),
      contact_email: pick(a.email, sp?.contact_email),
      cep: pick(a.cep, sp?.cep),
      rua: pick(a.street, sp?.rua),
      bairro: pick(a.neighborhood, sp?.bairro),
      cidade: pick(a.city, sp?.cidade),
      estado: pick(a.state, sp?.estado),
      escolaridade: pick(a.schooling, sp?.escolaridade),
      ano_formacao: pick(a.graduation_year, sp?.ano_formacao),
      instituicao_formacao: pick(a.institution, sp?.instituicao_formacao),
      curso_escolhido: pick(a.course_title, sp?.curso_escolhido),
      observacoes: pick(a.notes, sp?.observacoes),
    };
    // Optimistic UI update so the Dados tab shows the copied values immediately.
    setSp((prev: any) => ({ ...(prev ?? {}), ...payload }));
    setTab("dados");
    const { error } = await supabase
      .from("student_profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast.error(`Falha ao salvar: ${error.message}`);
      return;
    }
    if (payload.full_name && payload.full_name !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: payload.full_name }).eq("user_id", userId);
    }
    if (copiedToClipboard) toast.success("Dados copiados para Ctrl+V e cadastro salvo!");
    else toast.warning("Cadastro salvo, mas o navegador bloqueou o Ctrl+V. Selecione os campos e copie manualmente.");
    await load();
  };

  const sendLoginEmail = async () => {
    if (!sp.contact_email) return toast.error("Preencha o e-mail do aluno na aba Dados antes.");
    const cleanPassword = resetPw.trim();
    if (!cleanPassword || cleanPassword.length < 4) return toast.error("Digite a senha que será enviada (use a mesma do reset).");
    setResetPw(cleanPassword);
    setSendingLogin(true);
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-student-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ user_id: userId, password: cleanPassword, email: sp.contact_email, name: sp.full_name }),
    });
    const out = await res.json().catch(() => ({}));
    setSendingLogin(false);
    if (!res.ok) return toast.error(out.error || "Email ainda não está configurado. Configure o domínio em Cloud → Emails.");
    toast.success("E-mail enviado!");
  };

  if (loading) return <div className="p-10 text-muted-foreground">Carregando…</div>;

  const totalPago = installments.filter(i => i.status === "pago").reduce((s, i) => s + i.valor_cents, 0);
  const totalAberto = installments.filter(i => i.status !== "pago").reduce((s, i) => s + i.valor_cents, 0);
  const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin/alunos"><ArrowLeft className="size-4" /> Voltar</Link></Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{sp.full_name || profile.display_name || "Aluno"}</h1>
            <p className="text-sm text-muted-foreground">Login: <span className="font-mono">{profile.username}</span></p>
          </div>
        </div>
        <StudentContractDialog
          student={{
            full_name: sp.full_name || profile.display_name || "",
            cpf: sp.cpf, rg: sp.rg,
            address: [sp.rua, sp.numero, sp.bairro].filter(Boolean).join(", ") || null,
            city: sp.cidade, state: sp.estado,
            phone: sp.phone1,
            email: sp.contact_email || profile.email,
          }}
          courses={enrollments.map(e => e.courses?.title).filter(Boolean) as string[]}
          defaultValorTotal={installments.length ? money(installments.reduce((s, i) => s + i.valor_cents, 0)) : ""}
          defaultParcelas={installments.length ? `${installments.length}x` : ""}
          defaultValorParcela={installments.length ? money(installments[0].valor_cents) : ""}
          defaultPrimeiroVenc={installments.find(i => i.vencimento)?.vencimento ?? ""}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-10 w-full max-w-6xl">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="pre-matricula">Pré-matrícula</TabsTrigger>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="progresso">Progresso</TabsTrigger>
          <TabsTrigger value="provas">Provas</TabsTrigger>
          <TabsTrigger value="turmas">Turmas</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          <TabsTrigger value="repasse">Repasse</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="login">Enviar Login</TabsTrigger>
        </TabsList>

        {/* DADOS */}
        <TabsContent value="dados" className="space-y-6 mt-6">
          <section className="bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/20 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Acesso do aluno</h2>
              <span className="text-xs text-muted-foreground">Envie esses dados ao aluno para acessar a área <span className="font-mono">/aluno/login</span></span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Login (usuário)</Label>
                <Input value={profile.username ?? ""} disabled className="font-mono" />
              </div>
              <div>
                <Label>Senha</Label>
              <Input value={resetPw} onChange={e=>setResetPw(e.target.value)} onBlur={() => setResetPw(p => p.trim())} placeholder="Digite a senha do aluno" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" className="w-full" onClick={()=>{
                  const pw = Math.random().toString(36).slice(-8);
                  setResetPw(pw);
                }}>Gerar</Button>
                <Button type="button" variant="hero" className="w-full" onClick={resetPassword}><CheckCircle2 className="size-4" /> Salvar senha</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" disabled={!profile.username || !resetPw.trim()} onClick={()=>{
                const txt = `Login: ${profile.username}\nSenha: ${resetPw.trim()}\nAcesse: ${window.location.origin}/aluno/login`;
                navigator.clipboard.writeText(txt); toast.success("Credenciais copiadas!");
              }}><Copy className="size-4" /> Copiar login e senha</Button>
              <Button type="button" variant="outline" size="sm" disabled={!profile.username || !resetPw.trim() || !sp.phone1} onClick={()=>{
                const phone = String(sp.phone1 || "").replace(/\D/g, "");
                const msg = `Olá ${sp.full_name || ""}! Seu acesso à área do aluno Multplick:\n\nLogin: ${profile.username}\nSenha: ${resetPw.trim()}\n\nAcesse: ${window.location.origin}/aluno/login`;
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
              }}><MessageCircle className="size-4" /> Enviar por WhatsApp</Button>
              <Button type="button" variant="outline" size="sm" disabled={!sp.contact_email || !resetPw.trim() || sendingLogin} onClick={sendLoginEmail}>
                <Mail className="size-4" /> {sendingLogin ? "Enviando…" : "Enviar por e-mail"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">A senha só é gravada ao clicar em <strong>Salvar senha</strong>. Por segurança, ela não fica visível depois de sair da tela.</p>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Identificação</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><Label>Nome completo *</Label><Input value={sp.full_name ?? ""} onChange={e=>setSpField("full_name", e.target.value)} /></div>
              <div><Label>Login</Label><Input value={profile.username ?? ""} disabled className="font-mono" /></div>
              <div><Label>Fone 1</Label><Input value={sp.phone1 ?? ""} onChange={e=>setSpField("phone1", e.target.value)} placeholder="(00) 00000-0000" /></div>
              <div><Label>Fone 2</Label><Input value={sp.phone2 ?? ""} onChange={e=>setSpField("phone2", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={sp.contact_email ?? ""} onChange={e=>setSpField("contact_email", e.target.value)} /></div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Documentos</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>CPF</Label><Input value={sp.cpf ?? ""} onChange={e=>setSpField("cpf", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={sp.rg ?? ""} onChange={e=>setSpField("rg", e.target.value)} /></div>
              <div><Label>Órgão emissor</Label><Input value={sp.orgao_emissor ?? ""} onChange={e=>setSpField("orgao_emissor", e.target.value)} placeholder="SSP/UF" /></div>
              <div><Label>Data de expedição do RG</Label><Input type="date" value={sp.rg_emissao ?? ""} onChange={e=>setSpField("rg_emissao", e.target.value)} /></div>
              <div><Label>Naturalidade</Label><Input value={sp.naturalidade ?? ""} onChange={e=>setSpField("naturalidade", e.target.value)} placeholder="Cidade/UF" /></div>
              <div><Label>Data de nascimento</Label><Input type="date" value={sp.birth_date ?? ""} onChange={e=>setSpField("birth_date", e.target.value)} /></div>
              <div><Label>Idade</Label><Input value={calcIdade(sp.birth_date)} disabled /></div>
              <div>
                <Label>Sexo</Label>
                <Select value={sp.sexo ?? ""} onValueChange={v=>setSpField("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Endereço</h2>
            <div className="grid md:grid-cols-6 gap-4">
              <div className="md:col-span-1"><Label>CEP</Label><Input value={sp.cep ?? ""} onChange={e=>setSpField("cep", e.target.value)} onBlur={autofillSpFromCep} onKeyDown={e=>{ if (e.key === "Enter") { e.preventDefault(); autofillSpFromCep(); } }} placeholder="00000-000" /></div>
              <div className="md:col-span-3"><Label>Rua</Label><Input value={sp.rua ?? ""} onChange={e=>setSpField("rua", e.target.value)} /></div>
              <div className="md:col-span-1"><Label>Número</Label><Input value={sp.numero ?? ""} onChange={e=>setSpField("numero", e.target.value)} /></div>
              <div className="md:col-span-1"><Label>Estado</Label><Input value={sp.estado ?? ""} onChange={e=>setSpField("estado", e.target.value)} maxLength={2} /></div>
              <div className="md:col-span-2"><Label>Bairro</Label><Input value={sp.bairro ?? ""} onChange={e=>setSpField("bairro", e.target.value)} /></div>
              <div className="md:col-span-4"><Label>Cidade</Label><Input value={sp.cidade ?? ""} onChange={e=>setSpField("cidade", e.target.value)} /></div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Responsável</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>Nome</Label><Input value={sp.responsavel_nome ?? ""} onChange={e=>setSpField("responsavel_nome", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={sp.responsavel_rg ?? ""} onChange={e=>setSpField("responsavel_rg", e.target.value)} /></div>
              <div><Label>CPF</Label><Input value={sp.responsavel_cpf ?? ""} onChange={e=>setSpField("responsavel_cpf", e.target.value)} /></div>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Acadêmico</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>Polo</Label><Input value={sp.polo ?? ""} onChange={e=>setSpField("polo", e.target.value)} placeholder="Ex: MULTPLICK//Três Lagoas" /></div>
              <div>
                <Label>Status</Label>
                <Select value={sp.status ?? "ativo"} onValueChange={v=>setSpField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="trancado">Trancado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor afiliado</Label>
                <Select value={sp.vendedor ?? "__none__"} onValueChange={v=>setSpField("vendedor", v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar afiliado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem afiliado —</SelectItem>
                    {affiliateSellers.map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.user_id}>
                        {affiliate.profile?.display_name ?? affiliate.profile?.email ?? affiliate.user_id.slice(0, 8)}
                        {affiliate.profile?.username ? ` · ${affiliate.profile.username}` : ""}
                        {` · ${affiliate.code}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Somente afiliados ativos aparecem. A comissão será gerada quando a parcela for paga.</p>
              </div>
              <div><Label>Data final do curso</Label><Input type="date" value={sp.data_final ?? ""} onChange={e=>setSpField("data_final", e.target.value)} /></div>
              <div className="flex items-center justify-between border border-border rounded-md px-3"><Label>Liberar apostila</Label><Switch checked={!!sp.liberar_apostila} onCheckedChange={v=>setSpField("liberar_apostila", v)} /></div>
              <div className="flex items-center justify-between border border-border rounded-md px-3"><Label>Certificado liberado</Label><Switch checked={!!sp.certificado_liberado} onCheckedChange={v=>setSpField("certificado_liberado", v)} /></div>
              <div className="flex items-center justify-between border border-border rounded-md px-3"><Label>Aluno bolsista</Label><Switch checked={!!sp.bolsista} onCheckedChange={v=>setSpField("bolsista", v)} /></div>
              <div className="md:col-span-2"><Label>Foto (URL)</Label><Input value={sp.foto_url ?? ""} onChange={e=>setSpField("foto_url", e.target.value)} placeholder="https://..." /></div>
            </div>
            <div><Label>Observações</Label><Textarea rows={4} value={sp.observacoes ?? ""} onChange={e=>setSpField("observacoes", e.target.value)} /></div>
          </section>

          <div className="flex justify-end gap-3 sticky bottom-4">
            <Button onClick={save} variant="hero" disabled={saving} size="lg"><Save className="size-4" /> {saving ? "Salvando…" : "Salvar cadastro"}</Button>
          </div>
        </TabsContent>

        {/* PRÉ-MATRÍCULA */}
        <TabsContent value="pre-matricula" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><ClipboardList className="size-4" /> Fichas de pré-matrícula ({preApps.length})</h2>
              <p className="text-xs text-muted-foreground">Dados enviados pelo formulário público. Complete o que faltar e salve — depois use “Copiar para o cadastro” para preencher automaticamente a aba Dados.</p>
            </div>
          </div>

          {preApps.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              Nenhuma ficha de pré-matrícula vinculada ao e-mail deste aluno.
            </div>
          )}

          {preApps.map(a => (
            <section key={a.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-primary">{a.course_title}</div>
                  <div className="text-xs text-muted-foreground">
                    Enviada em {new Date(a.created_at).toLocaleString("pt-BR")} • status: {a.status}
                    {a.promo_code ? ` • código ${a.promo_code}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyPreToProfile(a)}>
                    <UploadCloud className="size-4" /> Copiar para o cadastro
                  </Button>
                  <Button size="sm" variant="hero" onClick={() => savePreApp(a)} disabled={savingPreId === a.id}>
                    <Save className="size-4" /> {savingPreId === a.id ? "Salvando…" : "Salvar ficha"}
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><Label>Nome completo</Label><Input value={a.full_name ?? ""} onChange={e=>setPreField(a.id, "full_name", e.target.value)} /></div>
                <div><Label>Data de nascimento</Label><Input type="date" value={a.birth_date ?? ""} onChange={e=>setPreField(a.id, "birth_date", e.target.value)} /></div>
                <div><Label>CPF</Label><Input value={a.cpf ?? ""} onChange={e=>setPreField(a.id, "cpf", e.target.value)} /></div>
                <div><Label>RG</Label><Input value={a.rg ?? ""} onChange={e=>setPreField(a.id, "rg", e.target.value)} /></div>
                <div><Label>Órgão emissor</Label><Input value={a.rg_issuer ?? ""} onChange={e=>setPreField(a.id, "rg_issuer", e.target.value)} /></div>
                <div><Label>Emissão do RG</Label><Input type="date" value={a.rg_issue_date ?? ""} onChange={e=>setPreField(a.id, "rg_issue_date", e.target.value)} /></div>
                <div><Label>Naturalidade</Label><Input value={a.naturalidade ?? ""} onChange={e=>setPreField(a.id, "naturalidade", e.target.value)} /></div>
                <div><Label>Pai</Label><Input value={a.father_name ?? ""} onChange={e=>setPreField(a.id, "father_name", e.target.value)} /></div>
                <div><Label>Mãe</Label><Input value={a.mother_name ?? ""} onChange={e=>setPreField(a.id, "mother_name", e.target.value)} /></div>
                <div><Label>Telefone</Label><Input value={a.phone ?? ""} onChange={e=>setPreField(a.id, "phone", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>E-mail</Label><Input value={a.email ?? ""} onChange={e=>setPreField(a.id, "email", e.target.value)} /></div>
              </div>

              <div className="grid md:grid-cols-6 gap-3">
                <div className="md:col-span-1"><Label>CEP</Label><Input value={a.cep ?? ""} onChange={e=>setPreField(a.id, "cep", e.target.value)} onBlur={()=>autofillPreFromCep(a.id, a.cep ?? "")} onKeyDown={e=>{ if (e.key === "Enter") { e.preventDefault(); autofillPreFromCep(a.id, a.cep ?? ""); } }} placeholder="00000-000" /></div>
                <div className="md:col-span-3"><Label>Rua</Label><Input value={a.street ?? ""} onChange={e=>setPreField(a.id, "street", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Bairro</Label><Input value={a.neighborhood ?? ""} onChange={e=>setPreField(a.id, "neighborhood", e.target.value)} /></div>
                <div className="md:col-span-4"><Label>Cidade</Label><Input value={a.city ?? ""} onChange={e=>setPreField(a.id, "city", e.target.value)} /></div>
                <div className="md:col-span-1"><Label>UF</Label><Input maxLength={2} value={a.state ?? ""} onChange={e=>setPreField(a.id, "state", e.target.value)} /></div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Escolaridade</Label><Input value={a.schooling ?? ""} onChange={e=>setPreField(a.id, "schooling", e.target.value)} /></div>
                <div><Label>Instituição</Label><Input value={a.institution ?? ""} onChange={e=>setPreField(a.id, "institution", e.target.value)} /></div>
                <div><Label>Ano de conclusão</Label><Input value={a.graduation_year ?? ""} onChange={e=>setPreField(a.id, "graduation_year", e.target.value)} /></div>
                <div><Label>Forma de pagamento</Label><Input value={a.payment_method ?? ""} onChange={e=>setPreField(a.id, "payment_method", e.target.value)} /></div>
                <div><Label>Data de entrada</Label><Input type="date" value={a.entry_date ?? ""} onChange={e=>setPreField(a.id, "entry_date", e.target.value)} /></div>
                <div><Label>Lembrete de cobrança</Label><Input type="date" value={a.payment_reminder_date ?? ""} onChange={e=>setPreField(a.id, "payment_reminder_date", e.target.value)} /></div>
              </div>

              <div>
                <Label>Observações da ficha</Label>
                <Textarea rows={4} value={a.notes ?? ""} onChange={e=>setPreField(a.id, "notes", e.target.value)} placeholder="Anexe qualquer informação adicional (valor combinado, condições, etc.)" />
              </div>
            </section>
          ))}
        </TabsContent>

        {/* CURSOS */}
        <TabsContent value="cursos" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Cursos matriculados ({enrollments.length})</h2>
            <Button onClick={() => setAddCourseOpen(true)} variant="hero"><Plus className="size-4" /> Adicionar curso</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60"><tr><th className="text-left p-3">Curso</th><th className="text-left p-3">Progresso</th><th className="text-left p-3">Status</th><th className="text-left p-3">Data</th><th></th></tr></thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3 font-medium min-w-[260px]">
                      <Select value={e.course_id} onValueChange={(v) => { if (v !== e.course_id) changeCourse(e.id, v); }}>
                        <SelectTrigger><SelectValue placeholder={e.courses?.title ?? "Selecione"} /></SelectTrigger>
                        <SelectContent>
                          {allCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">{e.progress}%</td>
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">{e.status}</span></td>
                    <td className="p-3 text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeEnr(e.id)}><Trash2 className="size-4" /></Button></td>
                  </tr>
                ))}
                {enrollments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum curso.</td></tr>}
              </tbody>
            </table>
          </div>

          <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar curso</DialogTitle></DialogHeader>
              <Select value={newCourseId} onValueChange={setNewCourseId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{allCourses.filter(c => !enrollments.some(e => e.course_id === c.id)).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={addCourse} variant="hero">Matricular</Button>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* PROGRESSO */}
        <TabsContent value="progresso" className="space-y-6 mt-6">
          {enrollments.length === 0 && (
            <p className="text-muted-foreground text-sm">Aluno ainda não está matriculado em nenhum curso.</p>
          )}
          {enrollments.map(enr => {
            const courseId = enr.course_id;
            const rows = progressRows
              .filter(r => r.course_lessons?.course_sections?.course_id === courseId)
              .sort((a, b) => {
                const sa = a.course_lessons?.course_sections?.sort_order ?? 0;
                const sb = b.course_lessons?.course_sections?.sort_order ?? 0;
                if (sa !== sb) return sa - sb;
                return (a.course_lessons?.sort_order ?? 0) - (b.course_lessons?.sort_order ?? 0);
              });
            const done = rows.filter(r => r.completed).length;
            const scores = rows.map(r => r.score).filter((s): s is number => typeof s === "number");
            const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
            const last = rows
              .map(r => r.updated_at || r.completed_at || r.created_at)
              .filter(Boolean)
              .sort()
              .pop();
            return (
              <section key={enr.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/40 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-primary flex items-center gap-2"><Activity className="size-4" /> {enr.courses?.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {done} aula(s) registrada(s) · Último acesso: {last ? new Date(last).toLocaleString("pt-BR") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {avg !== null && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Award className="size-3.5" /> Nota média: <span className="font-semibold text-foreground">{avg}%</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <Progress value={enr.progress} className="h-2 flex-1" />
                      <span className="text-xs font-medium w-10 text-right">{enr.progress}%</span>
                    </div>
                  </div>
                </div>
                {rows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma atividade ainda neste curso.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/30 text-xs">
                      <tr>
                        <th className="text-left p-3">Módulo</th>
                        <th className="text-left p-3">Aula</th>
                        <th className="text-left p-3">Tipo</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Nota</th>
                        <th className="text-left p-3"><Clock className="size-3.5 inline" /> Data/hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const when = r.completed_at || r.updated_at || r.created_at;
                        return (
                          <tr key={r.lesson_id} className="border-t border-border">
                            <td className="p-3 text-muted-foreground">{r.course_lessons?.course_sections?.title ?? "—"}</td>
                            <td className="p-3 font-medium">{r.course_lessons?.title ?? "—"}</td>
                            <td className="p-3 text-xs uppercase text-muted-foreground">{r.course_lessons?.lesson_type ?? "—"}</td>
                            <td className="p-3">
                              {r.completed ? (
                                <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-800">Concluída</span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">Em andamento</span>
                              )}
                            </td>
                            <td className="p-3">{typeof r.score === "number" ? `${r.score}%` : "—"}</td>
                            <td className="p-3 text-xs text-muted-foreground">{when ? new Date(when).toLocaleString("pt-BR") : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </TabsContent>

        {/* TURMAS */}
        <TabsContent value="turmas" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Turmas do aluno ({turmas.length})</h2>
            <Button onClick={() => setAddTurmaOpen(true)} variant="hero"><Plus className="size-4" /> Vincular a turma</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60"><tr><th className="text-left p-3">Turma</th><th className="text-left p-3">Curso</th><th></th></tr></thead>
              <tbody>
                {turmas.map(t => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-3 font-medium">{t.nome}</td>
                    <td className="p-3 text-muted-foreground">{t.courses?.title ?? "—"}</td>
                    <td className="p-3 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeTurma(t.id)}><Trash2 className="size-4" /></Button></td>
                  </tr>
                ))}
                {turmas.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Aluno não está em nenhuma turma. Crie turmas em /admin/turmas.</td></tr>}
              </tbody>
            </table>
          </div>
          <Dialog open={addTurmaOpen} onOpenChange={setAddTurmaOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Vincular a uma turma</DialogTitle></DialogHeader>
              <Select value={newTurmaId} onValueChange={setNewTurmaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>{allTurmas.filter(t => !turmas.some(x => x.id === t.id)).map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={addTurma} variant="hero">Vincular</Button>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* PROVAS */}
        <TabsContent value="provas" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Provas enviadas ({exams.length})</h2>
            <p className="text-xs text-muted-foreground">
              Provas geradas a partir das fichas de pré-matrícula deste aluno.
            </p>
          </div>
          {exams.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma prova enviada para este aluno.
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(ex => {
                const url = `${window.location.origin}/prova/${ex.access_token}`;
                const done = ex.status === "completed";
                const pass = !!ex.passed;
                return (
                  <div key={ex.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-primary" />
                          <span className="font-semibold text-primary">{ex.course_title}</span>
                          {done ? (
                            pass ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="size-3.5" /> Aprovado
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                                <XCircle className="size-3.5" /> Reprovado
                              </span>
                            )
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              {ex.status === "in_progress" ? "Em andamento" : "Pendente"}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Gerada em {new Date(ex.created_at).toLocaleString("pt-BR")}
                          {ex.completed_at && ` · Concluída em ${new Date(ex.completed_at).toLocaleString("pt-BR")}`}
                        </div>
                      </div>
                      <div className="text-right">
                        {done ? (
                          <div className="text-3xl font-black text-primary leading-none">
                            {ex.score ?? 0}
                            <span className="text-sm text-muted-foreground font-normal">/100</span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Aguardando resposta</div>
                        )}
                        <div className="text-[11px] text-muted-foreground">
                          Mínimo: {ex.passing_score} · Tempo: {ex.duration_minutes} min
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" /> Abrir prova
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado!"); }}
                      >
                        <Copy className="size-3.5" /> Copiar link
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* REPASSE */}
        <TabsContent value="repasse" className="space-y-4 mt-6">
          <RepasseSection
            enrollments={enrollments.map(e => ({ id: e.id, courses: e.courses }))}
            installmentsCount={(id) => installments.filter(i => i.enrollment_id === id).length}
          />
        </TabsContent>

        {/* PARCELAS */}
        <TabsContent value="parcelas" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Total recebido</p><p className="text-2xl font-bold text-green-700">{money(totalPago)}</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Em aberto</p><p className="text-2xl font-bold text-amber-700">{money(totalAberto)}</p></div>
            <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-end gap-2 flex-wrap">
              <Button onClick={gerarBoletosEmMassa} variant="outline" disabled={bulkBoletoLoading}>
                <Barcode className="size-4 mr-1" /> {bulkBoletoLoading ? "Gerando…" : "Boletos em massa"}
              </Button>
              <Button onClick={() => setAddParcOpen(true)} variant="hero"><Plus className="size-4" /> Nova parcela</Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60"><tr><th className="text-left p-3">#</th><th className="text-left p-3">Curso</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Vencimento</th><th className="text-left p-3">Status</th><th className="text-right p-3 min-w-64">Ações</th></tr></thead>
              <tbody>
                {installments.map(i => {
                  const e = enrollments.find(x => x.id === i.enrollment_id);
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="p-3">{i.numero}</td>
                      <td className="p-3">{e?.courses?.title ?? "—"}</td>
                      <td className="p-3">
                        {money(safeCents(i.valor_final_cents ?? i.valor_cents))}
                        {safeCents(i.desconto_cents) > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground line-through">{money(i.valor_cents)}</span>
                        )}
                      </td>
                      <td className="p-3">{i.vencimento ? new Date(i.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-3">
                        <button onClick={() => canSettleBoleto ? togglePago(i) : toast.error("Você não tem permissão para baixar boletos")} className={`px-2 py-1 rounded text-xs ${i.status === "pago" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} ${!canSettleBoleto ? "opacity-60 cursor-not-allowed" : ""}`}>
                          {i.status === "pago" ? "Pago" : "Em aberto"}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(i)} title="Editar recebimento" aria-label="Editar recebimento">
                            <Pencil className="size-4" />
                          </Button>
                          {i.status !== "pago" && canIssueBoleto && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => gerarBoletoAdmin(i)} disabled={boletoLoadingId === i.id} title="Gerar boleto">
                                <Barcode className="size-4 mr-1" /> {boletoLoadingId === i.id ? "…" : "Boleto"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => gerarEEnviarWhats(i)} disabled={boletoLoadingId === i.id} title="Gerar boleto e enviar por WhatsApp" className="text-emerald-600 hover:text-emerald-700">
                                <MessageCircle className="size-4 mr-1" /> Boleto+Zap
                              </Button>
                            </>
                          )}
                          {i.status === "pago" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => baixarRecibo(i)} title="Baixar recibo em PDF">
                                <Download className="size-4 mr-1" /> Recibo
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => enviarWhats(i)} title="Enviar via WhatsApp" className="text-emerald-600 hover:text-emerald-700">
                                <MessageCircle className="size-4 mr-1" /> WhatsApp
                              </Button>
                              <ParcelaComprovante installmentId={i.id} comprovantePath={i.comprovante_path} onChanged={load} />
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeParc(i.id)} title="Excluir"><Trash2 className="size-4" /></Button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
                {installments.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma parcela lançada.</td></tr>}
              </tbody>
            </table>
          </div>

          <Dialog open={addParcOpen} onOpenChange={setAddParcOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Novas parcelas</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Curso (matrícula)</Label>
                  <Select value={parcEnrId} onValueChange={setParcEnrId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{enrollments.map(e => <SelectItem key={e.id} value={e.id}>{e.courses?.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantidade de parcelas</Label>
                    <Input type="number" min={1} value={parcQtd} onChange={e=>setParcQtd(e.target.value)} />
                  </div>
                  <div>
                    <Label>1º Vencimento</Label>
                    <Input type="date" value={parcVenc} onChange={e=>setParcVenc(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Tipo do valor informado</Label>
                  <Select value={parcTipoValor} onValueChange={(v) => setParcTipoValor(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parcela">Valor por parcela</SelectItem>
                      <SelectItem value="total">Valor total (dividir pelas parcelas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input value={parcValor} onChange={e=>setParcValor(e.target.value)} placeholder="100,00" />
                </div>
                {parcQtd && parcValor && (
                  <p className="text-xs text-muted-foreground">
                    Serão criadas <strong>{Math.max(1, parseInt(parcQtd) || 1)}</strong> parcela(s)
                    {parcVenc ? <> com vencimentos mensais a partir de <strong>{new Date(parcVenc+"T12:00:00").toLocaleDateString("pt-BR")}</strong></> : ""}.
                    Você pode editar cada parcela depois.
                  </p>
                )}
                <Button onClick={addParcela} variant="hero" className="w-full">Lançar parcelas</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal de edição avançada */}
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Detalhes do Recebimento</DialogTitle>
                <DialogDescription>
                  {sp.full_name || profile.display_name || "Aluno não informado"} • Parcela {editing?.numero ?? "—"} • {enrollments.find(x => x.id === editing?.enrollment_id)?.courses?.title ?? "Curso não informado"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={editForma} onValueChange={setEditForma}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input type="date" value={editVenc} onChange={(e) => setEditVenc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">aberto</SelectItem>
                        <SelectItem value="pago">pago</SelectItem>
                        <SelectItem value="atrasado">atrasado</SelectItem>
                        <SelectItem value="cancelado">cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor Original da Parcela (R$)</Label>
                  <Input inputMode="decimal" value={editValor} onChange={(e) => setEditValor(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input inputMode="decimal" value={editDesconto} onChange={(e) => setEditDesconto(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-primary">Valor Final Recebido</Label>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-2xl font-bold text-primary">
                    {brl(valorFinalCents)}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</Button>
                <Button onClick={salvarEdicao} disabled={savingEdit}>{savingEdit ? "Salvando…" : "Salvar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ENVIAR LOGIN */}
        <TabsContent value="login" className="space-y-6 mt-6">
          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><KeyRound className="size-4" /> Redefinir senha</h2>
            <p className="text-sm text-muted-foreground">Defina uma nova senha para o aluno. Use esta mesma senha no envio por e-mail abaixo.</p>
            <div className="flex gap-2 max-w-md">
              <Input value={resetPw} onChange={e=>setResetPw(e.target.value)} onBlur={() => setResetPw(p => p.trim())} placeholder="Nova senha" />
              <Button variant="outline" onClick={() => setResetPw(Math.random().toString(36).slice(-6))}>Gerar</Button>
            </div>
            <Button onClick={resetPassword} variant="hero"><CheckCircle2 className="size-4" /> Salvar nova senha</Button>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Mail className="size-4" /> Enviar login por e-mail</h2>
            <p className="text-sm text-muted-foreground">Enviaremos para <strong>{sp.contact_email || "— preencha o e-mail na aba Dados —"}</strong> com login (<span className="font-mono">{profile.username}</span>) e a senha digitada acima.</p>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <strong>Importante:</strong> o envio de e-mails depende da configuração do domínio em <em>Cloud → Emails</em>. Caso ainda não esteja configurado, a primeira tentativa exibirá um aviso e te guiará pelo passo a passo.
            </div>
            <Button onClick={sendLoginEmail} variant="hero" disabled={sendingLogin}><Send className="size-4" /> {sendingLogin ? "Enviando…" : "Enviar login agora"}</Button>
          </section>
        </TabsContent>

        {/* ANEXOS */}
        <TabsContent value="anexos" className="space-y-4 mt-6">
          {userId && (
            <StudentAnexos
              userId={userId}
              studentName={sp.full_name || profile.display_name}
              studentEmail={sp.contact_email || profile.email}
              studentPhone={sp.phone1}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AdminAlunoEdit = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminAlunoEdit;
