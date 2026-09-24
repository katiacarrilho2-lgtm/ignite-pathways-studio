import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Copy, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getReferralCode } from "@/hooks/useReferralCapture";

type Course = { id: string | null; slug: string; title: string; description: string | null; price_cents: number | null; image_url: string | null };

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  payment_method: z.string().min(1, "Selecione a forma de pagamento"),
});

const initial = {
  full_name: "", cpf: "", birth_date: "", rg: "", rg_issuer: "", rg_issue_date: "", naturalidade: "",
  father_name: "", mother_name: "",
  cep: "", street: "", neighborhood: "", city: "", state: "",
  phone: "", email: "",
  schooling: "", graduation_year: "", institution: "",
  payment_method: "", notes: "", course_modality: "", promo_code: "",
};

const titleFromSlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const Matricula = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const comboParam = (searchParams.get("combo") ?? "").trim();
  const [course, setCourse] = useState<Course | null>(null);
  const [comboCourses, setComboCourses] = useState<Course[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftKey = slug ? `matricula-draft:${slug}${comboParam ? `:${comboParam}` : ""}` : null;

  // Restaura rascunho salvo localmente (evita perder ficha se fechar a aba)
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        setForm((f) => ({ ...f, ...saved }));
        setDraftRestored(true);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Código do vendedor/afiliado: ?ref= na URL tem prioridade e trava o campo
  const refParam = (searchParams.get("ref") ?? "").trim().toUpperCase();
  const lockedReferral = /^[A-Z0-9_-]{2,30}$/.test(refParam) ? refParam : null;

  useEffect(() => {
    const referralCode = lockedReferral ?? getReferralCode();
    if (!referralCode) return;
    setForm((current) =>
      lockedReferral || !current.promo_code ? { ...current, promo_code: referralCode } : current
    );
  }, [lockedReferral, draftRestored]);

  // Salva rascunho a cada alteração (debounce curto)
  useEffect(() => {
    if (!draftKey || sent) return;
    const hasAny = Object.values(form).some((v) => (v ?? "").toString().trim() !== "");
    if (!hasAny) return;
    const t = window.setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* ignore */ }
    }, 400);
    return () => window.clearTimeout(t);
  }, [form, draftKey, sent]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) { setNotFound(true); return; }
      const fallbackCourse: Course = {
        id: null,
        slug,
        title: titleFromSlug(slug),
        description: null,
        price_cents: null,
        image_url: null,
      };

      try {
        const response = await Promise.race([
          supabase.from("courses").select("id, slug, title, description, price_cents, image_url").eq("slug", slug).maybeSingle(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
        ]);
        if (!active) return;
        if (!response) { setCourse(fallbackCourse); return; }
        const { data, error } = response;
        setCourse(error || !data ? fallbackCourse : (data as Course));
      } catch {
        if (active) setCourse(fallbackCourse);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  // Combo: busca cursos adicionais indicados via ?combo=slug1,slug2,...
  useEffect(() => {
    let active = true;
    (async () => {
      if (!comboParam) { setComboCourses([]); return; }
      const slugs = Array.from(new Set(comboParam.split(",").map(s => s.trim()).filter(Boolean)))
        .filter(s => s !== slug);
      if (slugs.length === 0) { setComboCourses([]); return; }
      const results = await Promise.all(slugs.map(async (s) => {
        try {
          const { data } = await supabase.from("courses").select("id, slug, title, description, price_cents, image_url").eq("slug", s).maybeSingle();
          return (data as Course) ?? { id: null, slug: s, title: titleFromSlug(s), description: null, price_cents: null, image_url: null };
        } catch {
          return { id: null, slug: s, title: titleFromSlug(s), description: null, price_cents: null, image_url: null } as Course;
        }
      }));
      if (active) setComboCourses(results);
    })();
    return () => { active = false; };
  }, [comboParam, slug]);

  // Campos extras criados pela equipe no painel
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [customData, setCustomData] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("enrollment_custom_fields")
        .select("id, field_key, label, field_type, placeholder, required, active, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (active) setCustomFields((data ?? []) as CustomFieldDef[]);
    })();
    return () => { active = false; };
  }, []);

  const set = (k: keyof typeof initial, v: string) => setForm(f => ({ ...f, [k]: v }));


  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado! Envie para o interessado.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    try {
      const allTitles = [course.title, ...comboCourses.map(c => c.title)];
      const isCombo = comboCourses.length > 0;
      const comboNote = isCombo
        ? `COMBO solicitado:\n${allTitles.map(t => `• ${t}`).join("\n")}\n\n`
        : "";
      const payload: any = {
        ...form,
        notes: (comboNote + (form.notes ?? "")).trim() || null,
        birth_date: form.birth_date || null,
        rg_issue_date: form.rg_issue_date || null,
        course_id: course.id,
        course_title: isCombo ? `COMBO: ${allTitles.join(" + ")}` : course.title,
        source: window.location.pathname.slice(0, 60),
      };
      const { error } = await supabase.from("enrollment_applications").insert(payload);
      if (error) throw error;
      setSent(true);
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar ficha");
    } finally { setLoading(false); }
  };

  if (notFound) {
    return (
      <section className="py-20 bg-secondary/30 min-h-[80vh]">
        <div className="container max-w-xl">
          <Card className="p-8 md:p-10 text-center space-y-4">
            <div className="mx-auto size-14 rounded-full bg-amber-100 text-amber-600 grid place-items-center">
              <AlertTriangle className="size-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Curso não encontrado</h1>
            <p className="text-muted-foreground">
              O link de pré-matrícula está inválido ou o curso foi removido. Verifique o endereço e tente novamente.
            </p>
            <Button asChild variant="hero"><Link to="/cursos">Ver cursos disponíveis</Link></Button>
          </Card>
        </div>
      </section>
    );
  }

  if (!course) return <div className="min-h-[60vh] grid place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;

  if (sent) {
    return (
      <section className="py-20 bg-secondary/30 min-h-[80vh]">
        <div className="container max-w-xl">
          <Card className="p-8 md:p-10 text-center space-y-4">
            <div className="mx-auto size-14 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Ficha enviada com sucesso!</h1>
            <p className="text-muted-foreground">
              Recebemos sua pré-matrícula para <strong>{course.title}</strong>. Nossa equipe entrará em contato em breve pelo telefone ou e-mail informado.
            </p>
            <Button asChild variant="hero"><Link to="/cursos">Ver outros cursos</Link></Button>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16 bg-secondary/30 min-h-[80vh]">
      <div className="container max-w-3xl space-y-6">
        <Card className="p-5 md:p-6 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <FileText className="size-6 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Pré-matrícula {comboCourses.length > 0 ? "— Combo de cursos" : ""}
              </p>
              <h1 className="text-lg md:text-xl font-bold text-primary">{course.title}</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="size-4" /> Copiar link
          </Button>
        </Card>

        {comboCourses.length > 0 && (
          <Card className="p-5 md:p-6 space-y-3 border-primary/30 bg-primary/5">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary/80 font-semibold">Combo de cursos</p>
              <h2 className="font-semibold text-primary">Sua matrícula inclui os cursos abaixo</h2>
              <p className="text-xs text-muted-foreground mt-1">Todos ofertados na modalidade EAD. Valores e condições combinados com o vendedor.</p>
            </div>
            <ul className="text-sm space-y-1">
              <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span><span><strong>{course.title}</strong></span></li>
              {comboCourses.map(c => (
                <li key={c.slug} className="flex items-start gap-2"><span className="text-primary font-bold">•</span><span>{c.title}</span></li>
              ))}
            </ul>
          </Card>
        )}

        <form onSubmit={submit} className="space-y-6">
          {draftRestored && (
            <Card className="p-3 md:p-4 border-emerald-300 bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              Restauramos um rascunho seu desta ficha. Continue de onde parou — salvamos automaticamente a cada campo preenchido.
            </Card>
          )}
          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold text-primary">Dados pessoais</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Nome completo *</Label><Input value={form.full_name} onChange={e=>set("full_name", e.target.value)} required /></div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e=>set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div><Label>Data de Nascimento</Label><Input type="date" value={form.birth_date} onChange={e=>set("birth_date", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={form.rg} onChange={e=>set("rg", e.target.value)} /></div>
              <div><Label>Órgão Emissor</Label><Input value={form.rg_issuer} onChange={e=>set("rg_issuer", e.target.value)} placeholder="SSP/UF" /></div>
              <div><Label>Data de Emissão</Label><Input type="date" value={form.rg_issue_date} onChange={e=>set("rg_issue_date", e.target.value)} /></div>
              <div><Label>Naturalidade</Label><Input value={form.naturalidade} onChange={e=>set("naturalidade", e.target.value)} placeholder="Cidade/UF" /></div>
            </div>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold text-primary">Filiação</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Pai</Label><Input value={form.father_name} onChange={e=>set("father_name", e.target.value)} /></div>
              <div><Label>Mãe</Label><Input value={form.mother_name} onChange={e=>set("mother_name", e.target.value)} /></div>
            </div>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold text-primary">Endereço</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>CEP</Label><Input value={form.cep} onChange={e=>set("cep", e.target.value)} placeholder="00000-000" /></div>
              <div><Label>Rua</Label><Input value={form.street} onChange={e=>set("street", e.target.value)} /></div>
              <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={e=>set("neighborhood", e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.city} onChange={e=>set("city", e.target.value)} /></div>
              <div><Label>Estado</Label><Input value={form.state} onChange={e=>set("state", e.target.value)} placeholder="UF" maxLength={2} /></div>
            </div>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold text-primary">Contatos</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Telefone *</Label><Input value={form.phone} onChange={e=>set("phone", e.target.value)} placeholder="(00) 00000-0000" /></div>
              <div><Label>E-mail *</Label><Input type="email" value={form.email} onChange={e=>set("email", e.target.value)} required /></div>
            </div>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold text-primary">Formação</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div><Label>Escolaridade</Label><Input value={form.schooling} onChange={e=>set("schooling", e.target.value)} placeholder="Ensino Médio Completo" /></div>
              <div><Label>Ano de Formação</Label><Input value={form.graduation_year} onChange={e=>set("graduation_year", e.target.value)} placeholder="2018" /></div>
              <div><Label>Nome da Instituição</Label><Input value={form.institution} onChange={e=>set("institution", e.target.value)} /></div>
            </div>
          </Card>

          <Card className="p-5 md:p-6 space-y-4">
            <h2 className="font-semibold text-primary">Curso e pagamento</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Curso</Label>
                <Input value={course.title} disabled />
              </div>
              <div>
                <Label>Forma de pagamento *</Label>
                <Select value={form.payment_method} onValueChange={v=>set("payment_method", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto bancário</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
                    <SelectItem value="transferencia">Transferência bancária</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="outro">Outro / Combinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modalidade do curso</Label>
                <Select value={form.course_modality} onValueChange={v=>set("course_modality", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competencia">Competência</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea rows={3} value={form.notes} onChange={e=>set("notes", e.target.value)} placeholder="Parcelamento desejado, dúvidas, etc." />
            </div>
            <div>
              <Label>Vendedor afiliado {lockedReferral ? "" : "(opcional)"}</Label>
              <Input
                value={form.promo_code}
                onChange={e=>set("promo_code", e.target.value.toUpperCase())}
                placeholder="Ex.: VEND-001"
                maxLength={40}
                readOnly={!!lockedReferral}
                className={lockedReferral ? "bg-secondary/60 font-mono font-semibold" : ""}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {lockedReferral
                  ? "Indicação identificada automaticamente pelo link do vendedor afiliado."
                  : "Informe o código do vendedor/afiliado que indicou este curso."}
              </p>
            </div>
          </Card>

          <Button type="submit" disabled={loading} variant="hero" className="w-full h-12 text-base">
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Enviar pré-matrícula"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="size-3" /> Seus dados são tratados com segurança e usados apenas para sua matrícula.
          </p>
        </form>
      </div>
    </section>
  );
};

export default Matricula;