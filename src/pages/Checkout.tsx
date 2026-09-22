import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Info, Loader2, Lock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchLivreCourseBySlug, iniciarPagamentoLivre, LivreCourse, setPageMeta } from "@/lib/livre";
import { formatBRL, precoVigenteCents } from "@/lib/cursoLivre";
import { hideCpf, isValidCpf, maskCpf, onlyDigits } from "@/lib/cpf";

type StudentProfile = {
  full_name: string | null; cpf: string | null; birth_date: string | null;
  phone: string | null; cidade: string | null; estado: string | null; contact_email: string | null;
};

const toEmail = (u: string) => {
  const raw = u.trim();
  if (raw.includes("@")) return raw.toLowerCase();
  const m = /^([A-Za-z]{1,3})(\d+)$/.exec(raw);
  if (m) return `${m[1].toLowerCase()}${Number(m[2])}@multplick.local`;
  return `${raw.replace(/\D/g, "").padStart(3, "0")}@multplick.local`;
};

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, isStaff, loading: authLoading } = useAuth();
  const preview = params.get("preview") === "1" && isStaff;

  const [course, setCourse] = useState<LivreCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  // acesso
  const [authTab, setAuthTab] = useState("entrar");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [signup, setSignup] = useState({ full_name: "", email: "", password: "", cpf: "", birth_date: "", phone: "", cidade: "", estado: "" });
  const [busy, setBusy] = useState(false);

  // complemento de cadastro
  const [form, setForm] = useState({ full_name: "", cpf: "", birth_date: "", phone: "", cidade: "", estado: "" });

  // pedido
  const [order, setOrder] = useState<{ id?: string; order_id?: string; numero_pedido: string; valor_final_cents: number } | null>(null);
  const [pagamentoErro, setPagamentoErro] = useState<string | null>(null);
  const creating = useRef(false);

  useEffect(() => { setPageMeta("Finalizar inscrição | Multplick Formação Profissional", "Revise os dados da sua inscrição na Multplick Formação Profissional."); }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const c = slug ? await fetchLivreCourseBySlug(slug, preview) : null;
      if (alive) { setCourse(c); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [slug, preview]);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("student_profiles")
      .select("full_name, cpf, birth_date, phone, cidade, estado, contact_email")
      .eq("user_id", uid).maybeSingle();
    const p = (data ?? null) as StudentProfile | null;
    setProfile(p);
    setForm({
      full_name: p?.full_name ?? "", cpf: p?.cpf ? maskCpf(p.cpf) : "", birth_date: p?.birth_date ?? "",
      phone: p?.phone ?? "", cidade: p?.cidade ?? "", estado: p?.estado ?? "",
    });
  };

  useEffect(() => { if (user) loadProfile(user.id); }, [user?.id]);

  const cadastroCompleto = !!(profile?.full_name && profile?.cpf && profile?.birth_date && profile?.phone && profile?.cidade && profile?.estado);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(loginUser), password: loginPass.trim() });
    setBusy(false);
    if (error) return toast.error("Usuário ou senha inválidos");
    toast.success("Bem-vindo de volta!");
  };

  const criarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signup.full_name.trim().length < 3) return toast.error("Informe o nome completo.");
    if (!isValidCpf(signup.cpf)) return toast.error("CPF inválido.");
    if (signup.password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres.");
    setBusy(true);
    const { data: emUso } = await supabase.rpc("livre_cpf_em_uso", { _cpf: onlyDigits(signup.cpf) });
    if (emUso) {
      setBusy(false);
      setAuthTab("entrar");
      return toast.error("Este CPF já possui cadastro. Entre com a sua conta existente.");
    }
    const { data, error } = await supabase.auth.signUp({
      email: signup.email.trim().toLowerCase(),
      password: signup.password,
      options: { data: { full_name: signup.full_name.trim() }, emailRedirectTo: `${window.location.origin}/checkout/${slug}` },
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    const uid = data.user?.id;
    if (uid && data.session) {
      await supabase.from("student_profiles").update({
        full_name: signup.full_name.trim(), cpf: onlyDigits(signup.cpf), birth_date: signup.birth_date || null,
        phone: signup.phone, cidade: signup.cidade, estado: signup.estado.toUpperCase().slice(0, 2),
        contact_email: signup.email.trim().toLowerCase(),
      }).eq("user_id", uid);
      await loadProfile(uid);
      toast.success("Cadastro criado!");
    } else {
      toast.success("Cadastro criado! Confirme o e-mail para continuar.");
    }
    setBusy(false);
  };

  const salvarComplemento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.full_name.trim().length < 3) return toast.error("Informe o nome completo.");
    if (!isValidCpf(form.cpf)) return toast.error("CPF inválido.");
    if (!form.birth_date) return toast.error("Informe a data de nascimento.");
    if (!form.phone.trim()) return toast.error("Informe o WhatsApp.");
    if (!form.cidade.trim() || !form.estado.trim()) return toast.error("Informe cidade e estado.");
    setBusy(true);
    const { data: emUso } = await supabase.rpc("livre_cpf_em_uso", { _cpf: onlyDigits(form.cpf) });
    if (emUso) { setBusy(false); return toast.error("Este CPF já pertence a outra conta. Entre com a conta existente."); }
    const { error } = await supabase.from("student_profiles").update({
      full_name: form.full_name.trim(), cpf: onlyDigits(form.cpf), birth_date: form.birth_date,
      phone: form.phone.trim(), cidade: form.cidade.trim(), estado: form.estado.toUpperCase().slice(0, 2),
    }).eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error("Não foi possível salvar seus dados.");
    await loadProfile(user.id);
    toast.success("Dados salvos.");
  };

  const criarPedido = async () => {
    if (!course || creating.current) return;
    creating.current = true;
    setBusy(true);
    const { data, error } = await supabase.rpc("livre_criar_pedido", { _course_id: course.id });
    if (error) {
      setBusy(false);
      creating.current = false;
      return toast.error(error.message);
    }
    const res = data as unknown as { id?: string; order_id?: string; numero_pedido: string; valor_final_cents: number };
    setOrder(res);

    const orderId = res.id ?? res.order_id;
    if (orderId) {
      const pg = await iniciarPagamentoLivre(orderId);
      if (pg.url) { window.location.href = pg.url; return; }
      setPagamentoErro(pg.error ?? null);
    }
    setBusy(false);
    creating.current = false;
    toast.success("Pedido registrado.");
  };

  if (loading || authLoading) return <p className="py-24 text-center text-muted-foreground">Carregando…</p>;

  if (!course) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold text-primary">Curso indisponível</h1>
        <p className="mt-2 text-muted-foreground">Este curso não está disponível para inscrição no momento.</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/certifique-sua-experiencia">Ver cursos</Link></Button>
      </div>
    );
  }

  const vigente = precoVigenteCents(course);

  if (order) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-primary">Pedido registrado</h1>
        <p className="mt-2 text-muted-foreground">Guarde o número do seu pedido:</p>
        <p className="mt-2 text-xl font-extrabold tracking-wide text-primary">{order.numero_pedido}</p>
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Curso</span><span className="font-medium">{course.title}</span></p>
          <p className="mt-2 flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-medium">{formatBRL(order.valor_final_cents)}</span></p>
          <p className="mt-2 flex justify-between"><span className="text-muted-foreground">Situação</span><span className="font-medium">Aguardando pagamento</span></p>
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          <Info className="size-4" /> {pagamentoErro ?? "Estamos abrindo o ambiente de pagamento…"}
        </p>
        <Button
          variant="hero"
          className="mt-6 w-full"
          disabled={busy}
          onClick={async () => {
            const id = order.id ?? order.order_id;
            if (!id) return;
            setBusy(true);
            const pg = await iniciarPagamentoLivre(id);
            setBusy(false);
            if (pg.url) window.location.href = pg.url;
            else { setPagamentoErro(pg.error ?? null); toast.error(pg.error ?? "Pagamento indisponível."); }
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "PAGAR AGORA"}
        </Button>
        <Button asChild variant="outline" className="mt-3 w-full"><Link to="/aluno/compras">Ver minhas compras</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><ShoppingBag className="size-6" /> Finalizar inscrição</h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumo da compra</h2>
        <p className="mt-3 flex flex-wrap justify-between gap-2 text-base"><span className="text-muted-foreground">Curso</span><span className="font-semibold text-primary">{course.title}</span></p>
        <p className="mt-2 flex justify-between text-base"><span className="text-muted-foreground">Valor</span><span className="font-extrabold text-primary">{formatBRL(vigente)}</span></p>
        {user && (
          <>
            <p className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Aluno</span><span>{profile?.full_name ?? "—"}</span></p>
            <p className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">CPF</span><span>{hideCpf(profile?.cpf)}</span></p>
            <p className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">E-mail</span><span className="truncate">{profile?.contact_email ?? user.email}</span></p>
          </>
        )}
        {/* Espaço reservado para cupons (estrutura já existente no painel) — ativação em etapa futura. */}
      </section>

      {!user ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary"><Lock className="size-4" /> Acesse ou crie sua conta</h2>
          <Tabs value={authTab} onValueChange={setAuthTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Já tenho conta</TabsTrigger>
              <TabsTrigger value="criar">Criar cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={entrar} className="mt-4 space-y-3">
                <div><Label>E-mail ou usuário</Label><Input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} autoComplete="username" required /></div>
                <div><Label>Senha</Label><Input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} autoComplete="current-password" required /></div>
                <Button type="submit" variant="hero" className="h-12 w-full" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : "ENTRAR"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="criar">
              <form onSubmit={criarConta} className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Nome completo</Label><Input value={signup.full_name} onChange={(e) => setSignup({ ...signup, full_name: e.target.value })} required /></div>
                <div><Label>CPF</Label><Input value={signup.cpf} inputMode="numeric" onChange={(e) => setSignup({ ...signup, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" required /></div>
                <div><Label>Data de nascimento</Label><Input type="date" value={signup.birth_date} onChange={(e) => setSignup({ ...signup, birth_date: e.target.value })} required /></div>
                <div><Label>E-mail</Label><Input type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} required /></div>
                <div><Label>WhatsApp</Label><Input value={signup.phone} inputMode="tel" onChange={(e) => setSignup({ ...signup, phone: e.target.value })} required /></div>
                <div><Label>Cidade</Label><Input value={signup.cidade} onChange={(e) => setSignup({ ...signup, cidade: e.target.value })} required /></div>
                <div><Label>Estado (UF)</Label><Input value={signup.estado} maxLength={2} onChange={(e) => setSignup({ ...signup, estado: e.target.value.toUpperCase() })} required /></div>
                <div className="sm:col-span-2"><Label>Crie uma senha</Label><Input type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} autoComplete="new-password" required /></div>
                <Button type="submit" variant="hero" className="h-12 sm:col-span-2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : "CRIAR CADASTRO"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </section>
      ) : !cadastroCompleto ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold text-primary">Complete seus dados</h2>
          <p className="text-sm text-muted-foreground">Precisamos apenas do que ainda está faltando.</p>
          <form onSubmit={salvarComplemento} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div><Label>CPF</Label><Input value={form.cpf} inputMode="numeric" onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" required /></div>
            <div><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required /></div>
            <div><Label>WhatsApp</Label><Input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} required /></div>
            <div><Label>Estado (UF)</Label><Input value={form.estado} maxLength={2} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} required /></div>
            <Button type="submit" variant="hero" className="h-12 sm:col-span-2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : "SALVAR E CONTINUAR"}</Button>
          </form>
        </section>
      ) : (
        <section className="mt-6">
          <Button onClick={criarPedido} variant="hero" size="lg" className="h-14 w-full text-base" disabled={busy}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : "CONTINUAR PARA PAGAMENTO"}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Info className="size-4" /> Pagamento será habilitado na próxima etapa. Agora seu pedido fica registrado como aguardando pagamento.
          </p>
          <button type="button" onClick={() => nav(`/certifique-sua-experiencia/${course.slug}${preview ? "?preview=1" : ""}`)} className="mx-auto mt-4 block text-sm text-muted-foreground underline">
            Voltar ao curso
          </button>
        </section>
      )}
    </div>
  );
};

export default Checkout;
