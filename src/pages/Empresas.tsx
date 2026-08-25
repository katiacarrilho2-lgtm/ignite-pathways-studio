import { PageHero } from "@/components/site/PageHero";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useState } from "react";
import { Briefcase, TrendingUp, Users, ShieldCheck, Quote } from "lucide-react";

const schema = z.object({
  empresa: z.string().trim().min(2, "Informe a empresa").max(120),
  responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  telefone: z.string().trim().min(8, "Telefone inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(160),
  funcionarios: z.string().trim().min(1, "Informe a quantidade").max(10),
  treinamento: z.string().trim().min(5, "Descreva o treinamento").max(800),
});

const Empresas = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const data = Object.fromEntries(form.entries());
    const result = schema.safeParse(data);
    if (!result.success) {
      toast({ title: "Verifique os campos", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { empresa, responsavel, telefone, email, funcionarios, treinamento } = result.data;
    const { error } = await supabase.from("leads").insert({
      name: responsavel,
      email,
      phone: telefone,
      source: "empresas",
      message: [
        `Empresa: ${empresa}`,
        `Funcionários: ${funcionarios}`,
        `Treinamento: ${treinamento}`,
      ].join("\n"),
    });
    if (error) {
      setLoading(false);
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    setLoading(false);
    toast({ title: "Solicitação enviada!", description: "Nossa equipe entrará em contato em breve." });
    formEl.reset();
  };

  return (
    <>
      <PageHero eyebrow="Área para Empresas" title="Convênios e treinamentos corporativos" description="Soluções customizadas em capacitação para RH, segurança do trabalho e desenvolvimento de equipes." />

      <section className="py-20 container grid lg:grid-cols-2 gap-12">
        <div>
          <SectionHeader eyebrow="Vantagens" title="Por que firmar convênio com a Multplick" />
          <div className="space-y-5">
            {[
              { icon: TrendingUp, title: "Produtividade", text: "Colaboradores capacitados reduzem retrabalho e aumentam a eficiência operacional." },
              { icon: ShieldCheck, title: "Conformidade", text: "Todas as NRs e exigências legais aplicáveis ao seu setor, em dia." },
              { icon: Users, title: "Retenção de talentos", text: "Educação como benefício corporativo fortalece o employer branding." },
              { icon: Briefcase, title: "Custos otimizados", text: "Mensalidades reduzidas e turmas exclusivas para colaboradores e dependentes." },
            ].map((v) => (
              <div key={v.title} className="flex gap-4 p-5 rounded-xl bg-card border border-border/60 shadow-card-soft">
                <div className="size-12 shrink-0 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center"><v.icon className="size-6" /></div>
                <div>
                  <h4 className="font-bold text-primary">{v.title}</h4>
                  <p className="text-sm text-muted-foreground">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="bg-card rounded-2xl p-8 shadow-elegant border border-border/60 space-y-4 h-fit sticky top-24">
          <h3 className="text-2xl font-bold text-primary">Cadastre sua empresa</h3>
          <p className="text-sm text-muted-foreground">Preencha o formulário e receba uma proposta personalizada.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="empresa">Empresa</Label><Input id="empresa" name="empresa" required maxLength={120} /></div>
            <div><Label htmlFor="responsavel">Responsável</Label><Input id="responsavel" name="responsavel" required maxLength={120} /></div>
            <div><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" required maxLength={20} /></div>
            <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required maxLength={160} /></div>
            <div><Label htmlFor="funcionarios">Funcionários</Label><Input id="funcionarios" name="funcionarios" type="number" min={1} required /></div>
            <div><Label htmlFor="treinamento">Tipo de treinamento</Label><Input id="treinamento" name="treinamento" required maxLength={120} /></div>
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Solicitar Proposta"}
          </Button>
        </form>
      </section>

      <section className="py-20 bg-secondary/40">
        <div className="container">
          <SectionHeader eyebrow="Cases" title="Resultados que falam por si" center />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { empresa: "Usina Solar Energia", text: "Reduzimos 40% dos afastamentos com o programa de NRs Multplick." },
              { empresa: "Indústria Metalmecânica BR", text: "Capacitamos 120 colaboradores em soldagem industrial em 90 dias." },
              { empresa: "Logística Norte", text: "O convênio educacional ajudou a reter nossos talentos operacionais." },
            ].map((c) => (
              <div key={c.empresa} className="p-8 rounded-2xl bg-card border border-border/60 shadow-card-soft">
                <Quote className="size-8 text-primary-glow mb-3" />
                <p className="text-foreground italic mb-4">"{c.text}"</p>
                <div className="text-sm font-semibold text-primary">{c.empresa}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
export default Empresas;