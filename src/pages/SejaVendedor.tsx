import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Users, TrendingUp, Wallet } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(3, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  whatsapp: z.string().trim().min(10, "WhatsApp inválido").max(20),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
  instagram: z.string().trim().max(60).optional().or(z.literal("")),
  pix_key: z.string().trim().max(120).optional().or(z.literal("")),
  experience: z.string().trim().max(800).optional().or(z.literal("")),
  motivation: z.string().trim().max(800).optional().or(z.literal("")),
});

const empty = {
  full_name: "", email: "", whatsapp: "", cpf: "", city: "", state: "",
  instagram: "", pix_key: "", experience: "", motivation: "",
};

const SejaVendedor = () => {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof empty, v: string) => setForm(s => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Verifique os campos");
      return;
    }
    setBusy(true);
    const payload = {
      full_name: parsed.data.full_name,
      email: parsed.data.email.toLowerCase(),
      whatsapp: parsed.data.whatsapp,
      cpf: parsed.data.cpf || null,
      city: parsed.data.city || null,
      state: parsed.data.state?.toUpperCase() || null,
      instagram: parsed.data.instagram || null,
      pix_key: parsed.data.pix_key || null,
      experience: parsed.data.experience || null,
      motivation: parsed.data.motivation || null,
      status: "pendente" as const,
    };
    const { error } = await supabase.from("seller_applications").insert(payload);
    setBusy(false);
    if (error) return toast.error("Erro ao enviar. Tente novamente.");
    setDone(true);
    toast.success("Candidatura enviada!");
  };

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center size-20 rounded-full bg-emerald-100 text-emerald-700 mb-6">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="text-3xl font-bold text-primary mb-3">Recebemos sua candidatura!</h1>
        <p className="text-muted-foreground mb-6">
          Nossa equipe vai analisar suas informações e entrar em contato pelo WhatsApp em breve com seu acesso de vendedor.
        </p>
        <Button variant="hero" onClick={() => { setForm(empty); setDone(false); }}>
          Enviar outra candidatura
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 lg:py-16">
      <div className="text-center mb-10">
        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">Programa de Vendedores Multplick</span>
        <h1 className="text-3xl md:text-4xl font-bold text-primary mt-3 mb-3">Seja um vendedor Multplick</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Indique nossos cursos profissionalizantes, conquiste alunos pela sua região e receba comissões por cada matrícula.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { i: Wallet, t: "Comissão por venda", d: "Receba via Pix a cada matrícula confirmada." },
          { i: TrendingUp, t: "Link exclusivo", d: "Cada vendedor tem código próprio para rastrear indicações." },
          { i: Users, t: "Suporte da equipe", d: "Materiais e treinamento para você vender mais." },
        ].map(({ i: Icon, t, d }) => (
          <div key={t} className="bg-card border border-border rounded-xl p-5">
            <Icon className="size-6 text-primary mb-3" />
            <p className="font-semibold text-primary">{t}</p>
            <p className="text-sm text-muted-foreground mt-1">{d}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 shadow-elegant">
        <h2 className="text-xl font-bold text-primary">Preencha seus dados</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nome completo *</Label>
            <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} required maxLength={120} />
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} required maxLength={160} />
          </div>
          <div>
            <Label>WhatsApp *</Label>
            <Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" required maxLength={20} />
          </div>
          <div>
            <Label>CPF</Label>
            <Input value={form.cpf} onChange={e => set("cpf", e.target.value)} maxLength={20} />
          </div>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr_1fr] gap-4">
          <div>
            <Label>Cidade</Label>
            <Input value={form.city} onChange={e => set("city", e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label>UF</Label>
            <Input value={form.state} onChange={e => set("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@seuusuario" maxLength={60} />
          </div>
        </div>

        <div>
          <Label>Chave Pix (para receber comissões)</Label>
          <Input value={form.pix_key} onChange={e => set("pix_key", e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" maxLength={120} />
        </div>

        <div>
          <Label>Já tem experiência com vendas? Conte um pouco.</Label>
          <Textarea value={form.experience} onChange={e => set("experience", e.target.value)} rows={3} maxLength={800} />
        </div>

        <div>
          <Label>Por que você quer ser vendedor Multplick?</Label>
          <Textarea value={form.motivation} onChange={e => set("motivation", e.target.value)} rows={3} maxLength={800} />
        </div>

        <Button type="submit" variant="hero" className="w-full" disabled={busy}>
          {busy ? "Enviando..." : "Enviar candidatura"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Ao enviar, você concorda em ser contatado pela equipe Multplick.
        </p>
      </form>
    </div>
  );
};

export default SejaVendedor;