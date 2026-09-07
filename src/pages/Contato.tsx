import { PageHero } from "@/components/site/PageHero";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useState } from "react";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, CONTATO_DEFAULTS, PageSettings } from "@/lib/siteSettings";

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  telefone: z.string().trim().min(8).max(20),
  mensagem: z.string().trim().min(5).max(1000),
});

const Contato = () => {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const curso = params.get("curso") ?? "";
  const [loading, setLoading] = useState(false);
  const { value } = useSiteSection<PageSettings>(PAGE_SECTIONS.contato, CONTATO_DEFAULTS);

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
    const { nome, email, telefone, mensagem } = result.data;
    const { error } = await supabase.from("leads").insert({
      name: nome,
      email,
      phone: telefone,
      message: mensagem,
      source: curso ? `contato: ${curso}` : "contato",
    });
    if (error) {
      setLoading(false);
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    setLoading(false);
    toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
    formEl.reset();
  };

  const form = (
    <section className="py-20 container">
      <div className="bg-card rounded-2xl p-8 shadow-elegant border border-border/60 max-w-3xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="nome">Nome</Label><Input id="nome" name="nome" required maxLength={120} /></div>
            <div><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" required maxLength={20} /></div>
          </div>
          <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required maxLength={160} /></div>
          <div>
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea id="mensagem" name="mensagem" required maxLength={1000} rows={5} defaultValue={curso ? `Tenho interesse no curso: ${curso}` : ""} />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar mensagem"}
          </Button>
        </form>
      </div>
    </section>
  );

  return (
    <>
      <PageHero eyebrow={value.hero_eyebrow} title={value.hero_title} description={value.hero_description} />
      <SiteBlocks blocks={value.blocks} slots={{ form }} />
    </>
  );
};
export default Contato;
