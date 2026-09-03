import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Trash2, Copy, Search, FileText, UserPlus, AlertTriangle, Save, FileSignature, BellRing, ClipboardCheck, Loader2, CheckCircle2, XCircle, Sparkles, ClipboardCopy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";
import { useCommercialAccounts } from "@/hooks/useCommercialAccounts";
import { withAccount } from "@/lib/multiAccount";
import { usePortalBase } from "@/lib/portal";
import { buildStudentContractPdf } from "@/lib/contracts/studentContractPdf";

type App = {
  id: string; created_at: string; status: string; course_id: string | null; course_title: string;
  full_name: string; cpf: string | null; birth_date: string | null; rg: string | null; rg_issuer: string | null; rg_issue_date: string | null; naturalidade: string | null;
  father_name: string | null; mother_name: string | null;
  cep: string | null; street: string | null; neighborhood: string | null; city: string | null; state: string | null;
  phone: string | null; email: string;
  schooling: string | null; graduation_year: string | null; institution: string | null;
  payment_method: string | null; notes: string | null; source: string | null;
  entry_date: string | null; payment_reminder_date: string | null;
  promo_code: string | null;
  course_modality: string | null;
  seller_id: string | null;
  paid_at: string | null;
  paid_amount_cents: number | null;
};

const STATUS = [
  { v: "novo", label: "Novo" },
  { v: "pendente", label: "Pendente" },
  { v: "em_contato", label: "Em contato" },
  { v: "matriculado", label: "Matriculado" },
  { v: "cancelado", label: "Cancelado" },
];

const statusColor: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  pendente: "bg-orange-100 text-orange-800",
  em_contato: "bg-amber-100 text-amber-800",
  matriculado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-muted text-muted-foreground",
};

const payLabel = (v: string | null) => v ? ({
  pix: "PIX", boleto: "Boleto", cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito",
  transferencia: "Transferência", dinheiro: "Dinheiro", outro: "Outro",
} as Record<string,string>)[v] ?? v : "—";

const Inner = () => {
  const { activeAccountId } = useCommercialAccounts();
  const navigate = useNavigate();
  // No Portal do Polo a ficha é apenas comercial: efetivar matrícula é ação da Matriz.
  const isPolo = usePortalBase() === "/polo";
  const [list, setList] = useState<App[]>([]);
  const [courses, setCourses] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<App | null>(null);
  // Combo link builder (multi-cursos)
  const [comboSlugs, setComboSlugs] = useState<string[]>([]);
  const [comboSearch, setComboSearch] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  // Matrícula
  const [matOpen, setMatOpen] = useState(false);
  const [matApp, setMatApp] = useState<App | null>(null);
  const [matPassword, setMatPassword] = useState("");
  const [matSaving, setMatSaving] = useState(false);
  const [matResult, setMatResult] = useState<{ username: string; password: string; name: string } | null>(null);
  const [affiliateSellers, setAffiliateSellers] = useState<{ id: string; user_id: string; label: string }[]>([]);
  const randomPassword = () => Math.random().toString(36).slice(-6);

  // Contrato
  const [contractOpen, setContractOpen] = useState(false);
  const [contractApp, setContractApp] = useState<App | null>(null);
  const [cValorTotal, setCValorTotal] = useState("");
  const [cEntrada, setCEntrada] = useState("");
  const [cParcelas, setCParcelas] = useState("");
  const [cValorParcela, setCValorParcela] = useState("");
  const [cPrimeiroVenc, setCPrimeiroVenc] = useState("");
  const [cFormaPgto, setCFormaPgto] = useState("");
  const [cDataInicio, setCDataInicio] = useState("");
  const [cDataTermino, setCDataTermino] = useState("");
  const [cObs, setCObs] = useState("");
  const [cModalidade, setCModalidade] = useState<string>("");
  type ComboItem = { title: string; modality: string; workload: string };
  const [cCombo, setCCombo] = useState<ComboItem[]>([]);
  const [generatingContract, setGeneratingContract] = useState(false);

  // Prova online
  const [examOpen, setExamOpen] = useState(false);
  const [examApp, setExamApp] = useState<App | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [examExtra, setExamExtra] = useState("");
  const [examLoading, setExamLoading] = useState(false);

  const openExam = async (a: App) => {
    setExamApp(a);
    setExamExtra("");
    setExamOpen(true);
    setExamData(null);
    setExamLoading(true);
    const { data } = await supabase.from("enrollment_exams").select("*").eq("application_id", a.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setExamData(data);
    setExamLoading(false);
  };

  const generateExam = async () => {
    if (!examApp) return;
    setExamLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-enrollment-exam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ applicationId: examApp.id, courseTitle: examApp.course_title, extra: examExtra }),
      });
      const out = await res.json();
      if (!res.ok) { toast.error(out.error || "Erro ao gerar prova"); return; }
      toast.success(`Prova criada com ${out.count} questões!`);
      const { data } = await supabase.from("enrollment_exams").select("*").eq("id", out.exam_id).maybeSingle();
      setExamData(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setExamLoading(false);
    }
  };

  const copyExamLink = () => {
    if (!examData) return;
    const url = `${window.location.origin}/prova/${examData.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link da prova copiado!");
  };

  const load = async () => {
    const [{ data }, { data: affiliates, error: affiliatesError }] = await Promise.all([
      supabase.from("enrollment_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliates").select("id,user_id,code").eq("status", "ativo").order("code"),
    ]);
    setList((data ?? []) as App[]);
    if (affiliatesError) {
      toast.error(`Não foi possível carregar afiliados: ${affiliatesError.message}`);
      setAffiliateSellers([]);
    } else {
      const userIds = (affiliates ?? []).map((affiliate) => affiliate.user_id);
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("user_id,username,display_name,email").in("user_id", userIds)
        : { data: [], error: null };
      if (profilesError) toast.error(`Não foi possível carregar nomes dos afiliados: ${profilesError.message}`);
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      setAffiliateSellers((affiliates ?? []).map((affiliate) => {
        const profile = profileMap.get(affiliate.user_id);
        const name = profile?.display_name ?? profile?.email ?? affiliate.user_id.slice(0, 8);
        return { ...affiliate, label: `${name}${profile?.username ? ` · ${profile.username}` : ""} · ${affiliate.code}` };
      }));
    }
    // Lista TODOS os cursos (ativos, inativos, rascunhos) para que o admin possa
    // gerar o link de pré-matrícula mesmo antes de publicar/concluir o conteúdo.
    const { data: cs } = await supabase.from("courses").select("id,slug,title").order("title");
    setCourses(cs ?? []);
  };
  useEffect(() => { load(); }, []);

  // Carrega as datas no estado quando abre o dialog de visualização
  useEffect(() => {
    if (viewing) {
      setEntryDate(viewing.entry_date ?? "");
      setReminderDate(viewing.payment_reminder_date ?? "");
    }
  }, [viewing]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const isPending = (a: App) => a.status !== "matriculado" && a.status !== "cancelado";
  const isReminderDue = (a: App) =>
    isPending(a) && !!a.payment_reminder_date && a.payment_reminder_date <= todayISO;

  const pendingAlerts = list.filter(isReminderDue);

  const filtered = list.filter(a => {
    const s = q.toLowerCase();
    return !s || a.full_name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || a.course_title.toLowerCase().includes(s) || (a.phone ?? "").toLowerCase().includes(s);
  });

  const updateStatus = async (id: string, status: string) => {
    if (status === "matriculado") {
      if (isPolo) return toast.error("A matrícula definitiva é feita pela Matriz Multplick.");
      const app = list.find(x => x.id === id);
      if (app) {
        if (!app.course_id) return toast.error("Ficha sem curso vinculado — vincule antes de matricular.");
        openMatricular(app);
        return;
      }
    }
    const { error } = await supabase.from("enrollment_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const setSeller = async (id: string, seller_id: string | null) => {
    const { error } = await supabase.from("enrollment_applications").update({ seller_id }).eq("id", id);
    if (error) return toast.error(error.message);
    setList(prev => prev.map(x => x.id === id ? { ...x, seller_id } : x));
    toast.success("Vendedor atualizado");
  };

  const markPaid = async (a: App) => {
    if (a.paid_at) {
      if (!confirm("Já marcado como pago. Deseja limpar o pagamento?")) return;
      const { error } = await supabase.from("enrollment_applications").update({ paid_at: null, paid_amount_cents: null }).eq("id", a.id);
      if (error) return toast.error(error.message);
      setList(prev => prev.map(x => x.id === a.id ? { ...x, paid_at: null, paid_amount_cents: null } : x));
      toast.success("Pagamento removido");
      return;
    }
    const raw = window.prompt("Valor recebido (R$):", "0,00");
    if (raw == null) return;
    const cents = Math.round(Number(raw.replace(/\./g, "").replace(",", ".")) * 100);
    if (!cents || cents < 0) return toast.error("Valor inválido");
    const now = new Date().toISOString();
    const { error } = await supabase.from("enrollment_applications").update({ paid_at: now, paid_amount_cents: cents }).eq("id", a.id);
    if (error) return toast.error(error.message);
    setList(prev => prev.map(x => x.id === a.id ? { ...x, paid_at: now, paid_amount_cents: cents } : x));
    toast.success("Pagamento registrado na pré-matrícula. Para contar nas metas, dê baixa na parcela correspondente em Financeiro.");
  };

  // Auto-save edição inline da ficha
  const updateField = async (id: string, field: keyof App, value: string | null) => {
    const v = value === "" ? null : value;
    const { error } = await supabase.from("enrollment_applications").update({ [field]: v } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setList(prev => prev.map(x => x.id === id ? { ...x, [field]: v } as App : x));
    setViewing(prev => prev && prev.id === id ? { ...prev, [field]: v } as App : prev);
    toast.success("Salvo");
  };

  const saveDates = async () => {
    if (!viewing) return;
    setSavingDates(true);
    const { error } = await supabase.from("enrollment_applications")
      .update({
        entry_date: entryDate || null,
        payment_reminder_date: reminderDate || null,
      })
      .eq("id", viewing.id);
    setSavingDates(false);
    if (error) return toast.error(error.message);
    toast.success("Datas salvas");
    setViewing({ ...viewing, entry_date: entryDate || null, payment_reminder_date: reminderDate || null });
    load();
  };

  const openMatricular = (a: App) => {
    if (!a.course_id) {
      toast.error("Esta ficha não tem curso vinculado.");
      return;
    }
    setMatApp(a);
    setMatPassword(randomPassword());
    setMatResult(null);
    setMatOpen(true);
  };

  const doMatricular = async () => {
    if (!matApp || !matApp.course_id) return;
    if (!matPassword || matPassword.length < 4) return toast.error("Senha mínima de 4 caracteres");
    setMatSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sess.session?.access_token ?? ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          full_name: matApp.full_name,
          password: matPassword,
          email: matApp.email,
          phone1: matApp.phone,
          cpf: matApp.cpf,
          rg: matApp.rg,
          birth_date: matApp.birth_date,
          cep: matApp.cep,
          street: matApp.street,
          neighborhood: matApp.neighborhood,
          city: matApp.city,
          state: matApp.state,
          notes: [
            matApp.notes,
            matApp.father_name ? `Pai: ${matApp.father_name}` : null,
            matApp.mother_name ? `Mãe: ${matApp.mother_name}` : null,
            matApp.naturalidade ? `Naturalidade: ${matApp.naturalidade}` : null,
            matApp.rg_issuer ? `RG emissor: ${matApp.rg_issuer}` : null,
            matApp.rg_issue_date ? `RG emissão: ${matApp.rg_issue_date}` : null,
            matApp.schooling ? `Escolaridade: ${matApp.schooling}` : null,
            matApp.institution ? `Instituição: ${matApp.institution}` : null,
            matApp.graduation_year ? `Ano conclusão: ${matApp.graduation_year}` : null,
            matApp.payment_method ? `Forma de pagamento: ${payLabel(matApp.payment_method)}` : null,
            matApp.promo_code ? `Código promo: ${matApp.promo_code}` : null,
            matApp.course_modality ? `Modalidade: ${matApp.course_modality === "competencia" ? "Competência" : matApp.course_modality === "regular" ? "Regular" : matApp.course_modality} (EAD)` : null,
          ].filter(Boolean).join("\n") || null,
        }),
      });
      const out = await res.json();
      if (!res.ok) { setMatSaving(false); return toast.error(out.error || "Erro ao criar aluno"); }

      const affiliateId = affiliateSellers.find((affiliate) => affiliate.user_id === matApp.seller_id)?.id ?? null;
      const { error: enrErr } = await supabase
        .from("enrollments")
        .insert(withAccount({ user_id: out.user_id, course_id: matApp.course_id, seller_id: matApp.seller_id, affiliate_id: affiliateId }, activeAccountId));
      if (enrErr) { setMatSaving(false); return toast.error(enrErr.message); }

      // Copia dados pessoais para student_profiles (perfil de aluno usado no portal)
      const extraNotes = [
        matApp.naturalidade ? `Naturalidade: ${matApp.naturalidade}` : null,
        matApp.father_name ? `Pai: ${matApp.father_name}` : null,
        matApp.mother_name ? `Mãe: ${matApp.mother_name}` : null,
        matApp.rg_issuer ? `RG emissor: ${matApp.rg_issuer}` : null,
        matApp.rg_issue_date ? `RG emissão: ${matApp.rg_issue_date}` : null,
        matApp.schooling ? `Escolaridade: ${matApp.schooling}` : null,
        matApp.institution ? `Instituição: ${matApp.institution}` : null,
        matApp.graduation_year ? `Ano conclusão: ${matApp.graduation_year}` : null,
        matApp.payment_method ? `Forma de pagamento: ${payLabel(matApp.payment_method)}` : null,
        matApp.promo_code ? `Código promo: ${matApp.promo_code}` : null,
        matApp.course_modality ? `Modalidade: ${matApp.course_modality === "competencia" ? "Competência" : matApp.course_modality === "regular" ? "Regular" : matApp.course_modality} (EAD)` : null,
        matApp.notes ? `Observações do vendedor:\n${matApp.notes}` : null,
      ].filter(Boolean).join("\n") || null;

      await supabase.from("student_profiles").upsert({
        user_id: out.user_id,
        full_name: matApp.full_name,
        cpf: matApp.cpf,
        rg: matApp.rg,
        birth_date: matApp.birth_date,
        cep: matApp.cep,
        rua: matApp.street,
        bairro: matApp.neighborhood,
        cidade: matApp.city,
        estado: matApp.state,
        phone: matApp.phone,
        phone1: matApp.phone,
        contact_email: matApp.email,
        observacoes: extraNotes,
      }, { onConflict: "user_id" });

      await supabase.from("enrollment_applications")
        .update({ status: "matriculado" })
        .eq("id", matApp.id);

      setMatResult({ username: out.username, password: matPassword, name: matApp.full_name });
      toast.success("Aluno matriculado! Já aparece em Matrículas.");
      load();
      const newUserId = out.user_id;
      setTimeout(() => {
        setMatOpen(false);
        navigate(`/admin/alunos/${newUserId}#pre-matricula`);
      }, 1200);
    } finally {
      setMatSaving(false);
    }
  };

  const copyAccess = () => {
    if (!matResult) return;
    const txt = `Acesso Multplick — ${matResult.name}\nUsuário: ${matResult.username}\nSenha: ${matResult.password}\nÁrea do aluno: ${window.location.origin}/aluno/login`;
    navigator.clipboard.writeText(txt);
    toast.success("Dados copiados!");
  };

  const openContract = (a: App) => {
    setContractApp(a);
    setCValorTotal(""); setCEntrada(""); setCParcelas(""); setCValorParcela("");
    setCPrimeiroVenc(""); setCFormaPgto(a.payment_method ? payLabel(a.payment_method) : "");
    setCDataInicio(a.entry_date ?? ""); setCDataTermino(""); setCObs("");
    setCModalidade(a.course_modality ?? "");
    setCCombo([]);
    setContractOpen(true);
  };

  const fmtBR = (iso: string) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "";

  const generateContract = async () => {
    if (!contractApp) return;
    if (!cValorTotal.trim()) return toast.error("Informe o valor total do curso.");
    setGeneratingContract(true);
    try {
      const { data: company } = await supabase.from("company_settings")
        .select("razao_social, cnpj, endereco, cidade, uf, responsavel_nome, responsavel_cargo")
        .eq("singleton", true).maybeSingle();

      const addrParts = [contractApp.street, contractApp.neighborhood].filter(Boolean).join(", ");
      const pdf = buildStudentContractPdf({
        full_name: contractApp.full_name,
        cpf: contractApp.cpf,
        rg: contractApp.rg,
        address: addrParts || null,
        city: contractApp.city,
        state: contractApp.state,
        phone: contractApp.phone,
        email: contractApp.email,
        course_title: contractApp.course_title,
        course_modality: cModalidade || contractApp.course_modality || null,
        combo_items: cCombo.length > 0
          ? [
              { title: contractApp.course_title, modality: cModalidade || contractApp.course_modality || null, workload: null },
              ...cCombo.filter(i => i.title.trim()).map(i => ({ title: i.title.trim(), modality: i.modality || null, workload: i.workload || null })),
            ]
          : null,
        valor_total: cValorTotal,
        entrada: cEntrada || null,
        parcelas: cParcelas || null,
        valor_parcela: cValorParcela || null,
        primeiro_vencimento: fmtBR(cPrimeiroVenc) || null,
        forma_pagamento: cFormaPgto || null,
        data_inicio: fmtBR(cDataInicio) || null,
        data_termino: fmtBR(cDataTermino) || null,
        observacoes: cObs || null,
        escola_razao: company?.razao_social ?? "Multplick Educação Profissional e Corporativa",
        escola_cnpj: company?.cnpj ?? null,
        escola_endereco: company?.endereco ?? null,
        escola_cidade: company?.cidade ?? null,
        escola_uf: company?.uf ?? null,
        representante_nome: company?.responsavel_nome ?? "Kátia Joaquim",
        representante_cargo: company?.responsavel_cargo ?? "Diretora Comercial",
      });
      const safe = contractApp.full_name.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40);
      pdf.save(`Contrato_${safe}.pdf`);
      toast.success("Contrato gerado!");
      setContractOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar contrato");
    } finally {
      setGeneratingContract(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta ficha?")) return;
    const { error } = await supabase.from("enrollment_applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ficha excluída");
    load();
  };

  const copyFormLink = async (slug: string) => {
    const url = `${window.location.origin}/matricula/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const copyFichaData = async (a: App) => {
    const fmt = (iso: string | null) =>
      iso ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—";
    const v = (x: string | null | undefined) => (x && String(x).trim() ? x : "—");
    const modalidade =
      a.course_modality === "competencia" ? "Competência (EAD)" :
      a.course_modality === "regular" ? "Regular (EAD)" :
      v(a.course_modality);
    const txt = [
      `FICHA DE MATRÍCULA — ${a.course_title}`,
      `Data da ficha: ${new Date(a.created_at).toLocaleString("pt-BR")}`,
      ``,
      `— DADOS PESSOAIS —`,
      `Nome: ${v(a.full_name)}`,
      `CPF: ${v(a.cpf)}`,
      `Data de nascimento: ${fmt(a.birth_date)}`,
      `RG: ${v(a.rg)}`,
      `Órgão emissor: ${v(a.rg_issuer)}`,
      `Data de emissão do RG: ${fmt(a.rg_issue_date)}`,
      `Naturalidade: ${v(a.naturalidade)}`,
      ``,
      `— FILIAÇÃO —`,
      `Pai: ${v(a.father_name)}`,
      `Mãe: ${v(a.mother_name)}`,
      ``,
      `— ENDEREÇO —`,
      `CEP: ${v(a.cep)}`,
      `Rua: ${v(a.street)}`,
      `Bairro: ${v(a.neighborhood)}`,
      `Cidade: ${v(a.city)}`,
      `Estado: ${v(a.state)}`,
      ``,
      `— CONTATOS —`,
      `Telefone: ${v(a.phone)}`,
      `E-mail: ${v(a.email)}`,
      ``,
      `— FORMAÇÃO —`,
      `Escolaridade: ${v(a.schooling)}`,
      `Ano de formação: ${v(a.graduation_year)}`,
      `Instituição: ${v(a.institution)}`,
      ``,
      `— CURSO E PAGAMENTO —`,
      `Curso: ${v(a.course_title)}`,
      `Modalidade: ${modalidade}`,
      `Forma de pagamento: ${payLabel(a.payment_method)}`,
      a.promo_code ? `Código do vendedor: ${a.promo_code}` : null,
      ``,
      a.notes ? `— OBSERVAÇÕES —\n${a.notes}` : null,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Dados da ficha copiados! Cole no e-mail/WhatsApp da faculdade parceira.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const toggleComboSlug = (slug: string) => {
    setComboSlugs(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  const copyComboLink = async () => {
    if (comboSlugs.length < 2) return toast.error("Selecione pelo menos 2 cursos para montar um combo.");
    const [first, ...rest] = comboSlugs;
    const url = `${window.location.origin}/matricula/${first}?combo=${rest.join(",")}`;
    await navigator.clipboard.writeText(url);
    toast.success(`Link do combo (${comboSlugs.length} cursos) copiado!`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Pré-matrículas</h1>
        <p className="text-muted-foreground text-sm">Fichas enviadas pelo formulário público de pré-matrícula</p>
      </div>

      {pendingAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="size-4" />
            {pendingAlerts.length} aluno{pendingAlerts.length > 1 ? "s" : ""} para chamar hoje
          </div>
          <ul className="text-sm text-amber-900/90 dark:text-amber-200/90 space-y-1">
            {pendingAlerts.map(a => (
              <li key={a.id}>
                • <strong>{a.full_name}</strong> — {a.course_title} {a.phone ? `(${a.phone})` : ""} — lembrete: {new Date(a.payment_reminder_date!).toLocaleDateString("pt-BR")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-primary flex items-center gap-2"><Copy className="size-4" /> Compartilhar link do formulário</h2>
        <p className="text-xs text-muted-foreground">Escolha um curso para copiar o link da ficha e enviar por WhatsApp, e-mail, redes sociais, etc.</p>
        <Select onValueChange={copyFormLink}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione um curso para copiar o link..." /></SelectTrigger>
          <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.slug}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2"><Copy className="size-4" /> Montar link de COMBO (vários cursos)</h2>
            <p className="text-xs text-muted-foreground">Selecione 2 ou mais cursos. O interessado verá todos na mesma ficha de pré-matrícula.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{comboSlugs.length} selecionado(s)</span>
            {comboSlugs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setComboSlugs([])}>Limpar</Button>
            )}
            <Button size="sm" onClick={copyComboLink} disabled={comboSlugs.length < 2}>
              <Copy className="size-4" /> Copiar link do combo
            </Button>
          </div>
        </div>
        <Input
          placeholder="Buscar curso..."
          value={comboSearch}
          onChange={e => setComboSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="max-h-56 overflow-y-auto border border-border rounded-md divide-y divide-border">
          {courses
            .filter(c => !comboSearch.trim() || c.title.toLowerCase().includes(comboSearch.toLowerCase()))
            .map(c => {
              const checked = comboSlugs.includes(c.slug);
              const idx = comboSlugs.indexOf(c.slug);
              return (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary/40 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleComboSlug(c.slug)} />
                  <span className="flex-1">{c.title}</span>
                  {checked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">#{idx + 1}</span>}
                </label>
              );
            })}
        </div>
        {comboSlugs.length >= 2 && (
          <p className="text-[11px] text-muted-foreground">
            Curso principal (rótulo do link): <strong>{courses.find(c => c.slug === comboSlugs[0])?.title}</strong>. Os demais aparecem na ficha como parte do combo.
          </p>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, e-mail, curso, telefone..." value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Curso</th>
              <th className="text-left p-3">Contato</th>
              <th className="text-left p-3">Pagamento</th>
              <th className="text-left p-3">Vendedor</th>
              <th className="text-left p-3">Recebido</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={`border-t border-border hover:bg-secondary/30 ${isReminderDue(a) ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 font-medium text-primary">
                  <div className="flex items-center gap-2">
                    {a.full_name}
                    {a.status !== "matriculado" && a.status !== "cancelado" && (
                      <span title="Fechar e receber deste aluno">
                        <BellRing className="size-4 text-rose-600 animate-pulse" />
                      </span>
                    )}
                    {isReminderDue(a) && <AlertTriangle className="size-4 text-amber-600" />}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{a.course_title}</td>
                <td className="p-3 text-xs"><div>{a.email}</div><div className="text-muted-foreground">{a.phone}</div></td>
                <td className="p-3 text-xs">{payLabel(a.payment_method)}</td>
                <td className="p-3 text-xs">
                  <Select value={a.seller_id ?? "__none__"} onValueChange={v => setSeller(a.id, v === "__none__" ? null : v)}>
                    <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— sem vendedor —</SelectItem>
                      {affiliateSellers.map((affiliate) => <SelectItem key={affiliate.id} value={affiliate.user_id}>{affiliate.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-xs">
                  <button
                    type="button"
                    onClick={() => markPaid(a)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${a.paid_at ? "bg-emerald-100 text-emerald-800" : "bg-secondary text-muted-foreground hover:bg-primary/10"}`}
                    title={a.paid_at ? `Recebido em ${new Date(a.paid_at).toLocaleDateString("pt-BR")}` : "Marcar como pago"}
                  >
                    {a.paid_at ? `R$ ${((a.paid_amount_cents ?? 0)/100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Marcar pago"}
                  </button>
                </td>
                <td className="p-3">
                  <Select value={a.status} onValueChange={v=>updateStatus(a.id, v)}>
                    <SelectTrigger className={`h-7 text-xs w-32 ${statusColor[a.status] ?? ""}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.filter(s => !isPolo || s.v !== "matriculado").map(s => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {!isPolo && isPending(a) && a.course_id && (
                    <Button size="sm" variant="hero" onClick={() => openMatricular(a)} className="mr-1">
                      <UserPlus className="size-4" /> Matricular
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openContract(a)} className="mr-1" title="Gerar contrato">
                    <FileSignature className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openExam(a)} className="mr-1" title="Prova online">
                    <ClipboardCheck className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyFichaData(a)} className="mr-1" title="Copiar dados da ficha">
                    <ClipboardCopy className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={()=>{setViewing(a); setOpen(true);}}><Eye className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={()=>remove(a.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground"><FileText className="size-8 mx-auto mb-2 opacity-50" />Nenhuma ficha recebida ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ficha de pré-matrícula</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-5 text-sm">
              {isPolo ? (
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <div className="font-semibold text-primary flex items-center gap-2">
                    <UserPlus className="size-4" /> Ficha comercial do Polo
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    A matrícula definitiva, a aprovação e a geração do acesso do aluno são feitas pela Matriz Multplick.
                  </p>
                </div>
              ) : (
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-primary flex items-center gap-2">
                    <UserPlus className="size-4" /> Matricular este aluno
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cria o acesso ao portal, vincula ao curso e move a ficha para <b>Matriculado</b>.
                  </p>
                  {!viewing.course_id && (
                    <p className="text-xs text-destructive mt-1">Vincule um curso na seção "Curso" abaixo antes de matricular.</p>
                  )}
                  {viewing.status === "matriculado" && (
                    <p className="text-xs text-emerald-700 mt-1">Este aluno já foi matriculado.</p>
                  )}
                </div>
                <Button
                  size="lg"
                  variant="hero"
                  disabled={!viewing.course_id || viewing.status === "matriculado"}
                  onClick={() => { setOpen(false); openMatricular(viewing); }}
                >
                  <UserPlus className="size-5" /> Matricular aluno agora
                </Button>
              </div>
              )}
              <Section title="Acompanhamento (admin)">
                <div>
                  <Label className="text-xs">Data de entrada do aluno</Label>
                  <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Use quando o aluno não paga à vista.</p>
                </div>
                <div>
                  <Label className="text-xs">Lembrar de chamar em</Label>
                  <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Aparecerá um alerta no topo desta tela na data.</p>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={saveDates} disabled={savingDates}>
                    <Save className="size-4" /> {savingDates ? "Salvando..." : "Salvar datas"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyFichaData(viewing)}>
                    <ClipboardCopy className="size-4" /> Copiar dados
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setOpen(false); openContract(viewing); }}>
                    <FileSignature className="size-4" /> Gerar contrato
                  </Button>
                  {isPending(viewing) && viewing.course_id && (
                    <Button size="sm" variant="hero" onClick={() => { setOpen(false); openMatricular(viewing); }}>
                      <UserPlus className="size-4" /> Matricular agora
                    </Button>
                  )}
                </div>
              </Section>
              <Section title="Vendedor">
                <EditField label="Código promocional do vendedor" value={viewing.promo_code} field="promo_code" id={viewing.id} save={updateField} placeholder="Ex.: VEND-001" />
                <EditField label="Origem" value={viewing.source} field="source" id={viewing.id} save={updateField} />
              </Section>
              <Section title="Curso">
                <EditField label="Curso" value={viewing.course_title} field="course_title" id={viewing.id} save={updateField} />
                <EditField label="Forma de pagamento" value={viewing.payment_method} field="payment_method" id={viewing.id} save={updateField} hint={payLabel(viewing.payment_method)} />
                <div>
                  <Label className="text-xs text-muted-foreground">Modalidade do curso</Label>
                  <Select
                    value={viewing.course_modality ?? ""}
                    onValueChange={(v) => updateField(viewing.id, "course_modality", v)}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competencia">Competência</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Section>
              <Section title="Dados pessoais">
                <EditField label="Nome" value={viewing.full_name} field="full_name" id={viewing.id} save={updateField} />
                <EditField label="CPF" value={viewing.cpf} field="cpf" id={viewing.id} save={updateField} />
                <EditField label="Nascimento" value={viewing.birth_date} field="birth_date" id={viewing.id} save={updateField} type="date" />
                <EditField label="RG" value={viewing.rg} field="rg" id={viewing.id} save={updateField} />
                <EditField label="Órgão Emissor" value={viewing.rg_issuer} field="rg_issuer" id={viewing.id} save={updateField} />
                <EditField label="Emissão" value={viewing.rg_issue_date} field="rg_issue_date" id={viewing.id} save={updateField} type="date" />
                <EditField label="Naturalidade" value={viewing.naturalidade} field="naturalidade" id={viewing.id} save={updateField} />
              </Section>
              <Section title="Filiação">
                <EditField label="Pai" value={viewing.father_name} field="father_name" id={viewing.id} save={updateField} />
                <EditField label="Mãe" value={viewing.mother_name} field="mother_name" id={viewing.id} save={updateField} />
              </Section>
              <Section title="Endereço">
                <EditField label="CEP" value={viewing.cep} field="cep" id={viewing.id} save={updateField} />
                <EditField label="Rua" value={viewing.street} field="street" id={viewing.id} save={updateField} />
                <EditField label="Bairro" value={viewing.neighborhood} field="neighborhood" id={viewing.id} save={updateField} />
                <EditField label="Cidade" value={viewing.city} field="city" id={viewing.id} save={updateField} />
                <EditField label="Estado" value={viewing.state} field="state" id={viewing.id} save={updateField} />
              </Section>
              <Section title="Contatos">
                <EditField label="Telefone" value={viewing.phone} field="phone" id={viewing.id} save={updateField} />
                <EditField label="E-mail" value={viewing.email} field="email" id={viewing.id} save={updateField} />
              </Section>
              <Section title="Formação">
                <EditField label="Escolaridade" value={viewing.schooling} field="schooling" id={viewing.id} save={updateField} />
                <EditField label="Ano de Formação" value={viewing.graduation_year} field="graduation_year" id={viewing.id} save={updateField} />
                <EditField label="Instituição" value={viewing.institution} field="institution" id={viewing.id} save={updateField} />
              </Section>
              <Section title="Observações">
                <div className="md:col-span-2">
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background p-2 text-sm"
                    defaultValue={viewing.notes ?? ""}
                    onBlur={(e) => { if ((e.target.value || null) !== viewing.notes) updateField(viewing.id, "notes", e.target.value); }}
                    placeholder="Observações sobre o aluno…"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Salva automaticamente ao sair do campo.</p>
                </div>
              </Section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: matricular a partir da ficha */}
      <Dialog open={matOpen} onOpenChange={(o)=>{ setMatOpen(o); if(!o){ setMatResult(null); setMatApp(null);} }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{matResult ? "Aluno criado e matriculado" : "Matricular aluno da ficha"}</DialogTitle>
          </DialogHeader>
          {matResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-sm"><strong>Nome:</strong> {matResult.name}</p>
                <p className="text-sm"><strong>Usuário:</strong> <span className="font-mono text-base">{matResult.username}</span></p>
                <p className="text-sm"><strong>Senha:</strong> <span className="font-mono text-base">{matResult.password}</span></p>
                <p className="text-xs text-muted-foreground pt-2">A matrícula já aparece em <strong>Matrículas</strong>. Acesso em <span className="font-mono">{window.location.origin}/aluno/login</span></p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyAccess} variant="outline" className="flex-1"><Copy className="size-4" /> Copiar dados</Button>
                <Button onClick={() => setMatOpen(false)} variant="hero" className="flex-1">Concluir</Button>
              </div>
            </div>
          ) : matApp && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
                <div><strong>Aluno:</strong> {matApp.full_name}</div>
                <div><strong>Curso:</strong> {matApp.course_title}</div>
                <div className="text-xs text-muted-foreground">Será criado um login novo e a matrícula no curso será gerada automaticamente.</div>
              </div>
              <div>
                <Label>Senha de acesso do aluno</Label>
                <div className="flex gap-2">
                  <Input value={matPassword} onChange={e => setMatPassword(e.target.value)} />
                  <Button type="button" variant="outline" onClick={() => setMatPassword(randomPassword())}>Gerar</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">O número de usuário é gerado automaticamente (001, 002, 003…).</p>
              </div>
              <Button onClick={doMatricular} variant="hero" className="w-full" disabled={matSaving}>
                {matSaving ? "Matriculando..." : "Criar aluno e matricular"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: gerar contrato */}
      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar contrato — {contractApp?.full_name}</DialogTitle>
          </DialogHeader>
          {contractApp && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                <div><strong>Curso:</strong> {contractApp.course_title}</div>
                <div className="text-xs text-muted-foreground">O contrato será gerado em PDF, já com a assinatura da escola, pronto para imprimir e colher a assinatura do aluno. Todos os cursos são registrados como <strong>EAD</strong>; para cursos técnicos indique se é <strong>Competência</strong> ou <strong>Regular</strong>.</div>
              </div>

              <div>
                <Label>Modalidade do curso (aparece no contrato)</Label>
                <Select value={cModalidade} onValueChange={setCModalidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione (obrigatório para técnico)..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competencia">Competência (curso técnico por competência)</SelectItem>
                    <SelectItem value="regular">Regular (curso técnico regular)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">O contrato sempre cita EAD. Se marcar Competência/Regular, o texto da cláusula 1 é ajustado.</p>
              </div>

              <div className="rounded-lg border border-dashed border-primary/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Combo de cursos (opcional)</Label>
                    <p className="text-[11px] text-muted-foreground">Adicione outros cursos para gerar um contrato único com todos. O curso principal já está incluído.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setCCombo(prev => [...prev, { title: "", modality: "", workload: "" }])}>+ Adicionar curso</Button>
                </div>
                {cCombo.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs bg-secondary/50 rounded p-2">
                      <strong>Incluído no combo:</strong> {contractApp.course_title}
                    </div>
                    {cCombo.map((it, idx) => (
                      <div key={idx} className="grid md:grid-cols-[1fr_150px_120px_auto] gap-2 items-end">
                        <div>
                          <Label className="text-xs">Curso #{idx + 2}</Label>
                          <Input value={it.title} placeholder="Nome do curso" onChange={e => setCCombo(prev => prev.map((x,i) => i===idx ? { ...x, title: e.target.value } : x))} />
                        </div>
                        <div>
                          <Label className="text-xs">Modalidade</Label>
                          <Select value={it.modality} onValueChange={v => setCCombo(prev => prev.map((x,i) => i===idx ? { ...x, modality: v } : x))}>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="competencia">Competência</SelectItem>
                              <SelectItem value="regular">Regular</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Carga h.</Label>
                          <Input value={it.workload} placeholder="Ex.: 800h" onChange={e => setCCombo(prev => prev.map((x,i) => i===idx ? { ...x, workload: e.target.value } : x))} />
                        </div>
                        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setCCombo(prev => prev.filter((_,i) => i !== idx))}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">O valor total, entrada e parcelas abaixo se referem ao <strong>combo inteiro</strong>.</p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Valor total *</Label>
                  <Input value={cValorTotal} onChange={e => setCValorTotal(e.target.value)} placeholder="Ex.: R$ 1.200,00" />
                </div>
                <div>
                  <Label>Entrada</Label>
                  <Input value={cEntrada} onChange={e => setCEntrada(e.target.value)} placeholder="Ex.: R$ 300,00" />
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input value={cParcelas} onChange={e => setCParcelas(e.target.value)} placeholder="Ex.: 10x" />
                </div>
                <div>
                  <Label>Valor da parcela</Label>
                  <Input value={cValorParcela} onChange={e => setCValorParcela(e.target.value)} placeholder="Ex.: R$ 90,00" />
                </div>
                <div>
                  <Label>Primeiro vencimento</Label>
                  <Input type="date" value={cPrimeiroVenc} onChange={e => setCPrimeiroVenc(e.target.value)} />
                </div>
                <div>
                  <Label>Forma de pagamento</Label>
                  <Input value={cFormaPgto} onChange={e => setCFormaPgto(e.target.value)} placeholder="Ex.: Boleto, PIX, Cartão" />
                </div>
                <div>
                  <Label>Início do curso</Label>
                  <Input type="date" value={cDataInicio} onChange={e => setCDataInicio(e.target.value)} />
                </div>
                <div>
                  <Label>Término previsto</Label>
                  <Input type="date" value={cDataTermino} onChange={e => setCDataTermino(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Informações adicionais / cláusulas extras</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background p-2 text-sm"
                  value={cObs}
                  onChange={e => setCObs(e.target.value)}
                  placeholder="Ex.: descontos concedidos, materiais inclusos, condições especiais, regras de bolsa, etc."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setContractOpen(false)}>Cancelar</Button>
                <Button variant="hero" onClick={generateContract} disabled={generatingContract}>
                  <FileSignature className="size-4" /> {generatingContract ? "Gerando..." : "Gerar contrato em PDF"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: prova online */}
      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="size-5" /> Prova online — {examApp?.full_name}</DialogTitle>
          </DialogHeader>
          {examLoading && !examData ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto mb-2" /> Carregando…</div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                <div><strong>Curso:</strong> {examApp?.course_title}</div>
                <div className="text-xs text-muted-foreground">A IA gera 30 questões de múltipla escolha sobre o curso. O aluno terá 30 minutos e precisa de 70 pontos para aprovação.</div>
              </div>

              {examData ? (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase text-muted-foreground">Status da prova</span>
                      {examData.status === "completed" ? (
                        examData.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><CheckCircle2 className="size-4" /> Aprovado · {examData.score}/100</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold"><XCircle className="size-4" /> Reprovado · {examData.score}/100</span>
                        )
                      ) : examData.status === "in_progress" ? (
                        <span className="text-amber-700 font-semibold">Em andamento</span>
                      ) : (
                        <span className="text-blue-700 font-semibold">Aguardando aluno</span>
                      )}
                    </div>
                    {examData.status !== "completed" && (
                      <>
                        <div className="text-xs text-muted-foreground">Link para o aluno:</div>
                        <Input readOnly value={`${window.location.origin}/prova/${examData.access_token}`} className="text-xs" />
                        <Button size="sm" variant="outline" onClick={copyExamLink} className="w-full">
                          <Copy className="size-4" /> Copiar link da prova
                        </Button>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={generateExam} disabled={examLoading} className="w-full">
                    {examLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {examData.status === "completed" ? "Gerar nova prova (substitui anterior pendente)" : "Regenerar questões"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Detalhes adicionais para a IA (opcional)</Label>
                    <Textarea rows={3} value={examExtra} onChange={e => setExamExtra(e.target.value)} placeholder="Ex.: foco em automação industrial, nível técnico, incluir CLPs e sensores..." />
                  </div>
                  <Button variant="hero" className="w-full" onClick={generateExam} disabled={examLoading}>
                    {examLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Gerar 30 questões com IA
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="font-semibold text-primary mb-2">{title}</h3>
    <div className="grid md:grid-cols-2 gap-x-4 gap-y-2 bg-secondary/40 rounded-lg p-3">{children}</div>
  </div>
);
const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div><span className="text-xs text-muted-foreground">{label}: </span><span className="font-medium">{value || "—"}</span></div>
);

const EditField = ({
  label, value, field, id, save, type = "text", placeholder, hint,
}: {
  label: string; value: string | null; field: keyof App; id: string;
  save: (id: string, field: keyof App, v: string | null) => void | Promise<void>;
  type?: string; placeholder?: string; hint?: string;
}) => {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value, id]);
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if ((v || null) !== (value || null)) save(id, field, v); }}
        className="h-8 text-sm"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
};

const AdminPreMatriculas = () => <RequirePermission perm="manage_courses"><Inner /></RequirePermission>;
export default AdminPreMatriculas;