import { PageHero } from "@/components/site/PageHero";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useState } from "react";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, EMPRESAS_DEFAULTS, PageSettings } from "@/lib/siteSettings";

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
  const { value } = useSiteSection<PageSettings>(PAGE_SECTIONS.empresas, EMPRESAS_DEFAULTS);

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

  const form = (
    <section className="py-20 container">
      <form onSubmit={onSubmit} className="bg-card rounded-2xl p-8 shadow-elegant border border-border/60 space-y-4 max-w-3xl mx-auto">
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
  );

  return (
    <>
      <PageHero eyebrow={value.hero_eyebrow} title={value.hero_title} description={value.hero_description} />
      <SiteBlocks blocks={value.blocks} slots={{ form }} />
    </>
  );
};
export default Empresas;
