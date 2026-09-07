import { PageHero } from "@/components/site/PageHero";
import { SectionHeader } from "@/components/site/SectionHeader";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Handshake, TrendingUp } from "lucide-react";
import { z } from "zod";
import { useState } from "react";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, LICENCIADO_DEFAULTS, PageSettings } from "@/lib/siteSettings";
import licenciado from "@/assets/licenciado.jpg";

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  telefone: z.string().trim().min(8).max(20),
  cidade: z.string().trim().min(2).max(80),
  mensagem: z.string().trim().max(1000).optional(),
});

const Licenciado = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { value } = useSiteSection<PageSettings>(PAGE_SECTIONS.licenciado, LICENCIADO_DEFAULTS);
  const blocks = value.blocks.map((b) =>
    b.id === "lic_intro" && !b.image_url ? { ...b, image_url: licenciado } : b
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = Object.fromEntries(new FormData(formEl).entries());
    const result = schema.safeParse(data);
    if (!result.success) {
      toast({ title: "Verifique os campos", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { nome, email, telefone, cidade, mensagem } = result.data;
    const { error } = await supabase.from("leads").insert({
      name: nome,
      email,
      phone: telefone,
      source: "licenciado",
      message: [`Cidade/Estado: ${cidade}`, mensagem ? `Mensagem: ${mensagem}` : null].filter(Boolean).join("\n"),
    });
    if (error) {
      setLoading(false);
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    setLoading(false);
    toast({ title: "Solicitação enviada!", description: "Vamos agendar uma reunião para apresentar o modelo Licenciado Multplick." });
    formEl.reset();
  };

  const form = (
    <section className="py-20 container">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <SectionHeader
            eyebrow="Próximo passo"
            title="Agende uma reunião com nossa equipe"
            subtitle="Preencha o formulário e nosso time entrará em contato para apresentar o modelo, condições e território disponível."
          />
          <div className="space-y-4">
            {[
              { icon: CalendarCheck, text: "Reunião online de aproximadamente 30 minutos" },
              { icon: Handshake, text: "Apresentação do modelo, contrato e investimento" },
              { icon: TrendingUp, text: "Projeção de resultados para sua região" },
            ].map((i) => (
              <div key={i.text} className="flex items-start gap-3">
                <i.icon className="size-5 text-primary-glow mt-0.5" />
                <span className="text-foreground">{i.text}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="bg-card rounded-2xl p-8 shadow-elegant border border-border/60 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="nome">Nome completo</Label><Input id="nome" name="nome" required maxLength={120} /></div>
            <div><Label htmlFor="telefone">WhatsApp</Label><Input id="telefone" name="telefone" required maxLength={20} /></div>
          </div>
          <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required maxLength={160} /></div>
          <div><Label htmlFor="cidade">Cidade / Estado</Label><Input id="cidade" name="cidade" required maxLength={80} /></div>
          <div>
            <Label htmlFor="mensagem">Conte um pouco sobre você (opcional)</Label>
            <Textarea id="mensagem" name="mensagem" maxLength={1000} rows={4} />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Quero agendar uma reunião"}
          </Button>
        </form>
      </div>
    </section>
  );

  return (
    <>
      <PageHero eyebrow={value.hero_eyebrow} title={value.hero_title} description={value.hero_description} />
      <SiteBlocks blocks={blocks} slots={{ form }} />
    </>
  );
};

export default Licenciado;
