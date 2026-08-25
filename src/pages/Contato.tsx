import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useState } from "react";

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

  return (
    <>
      <PageHero eyebrow="Contato" title="Vamos conversar?" description="Tire suas dúvidas, solicite informações de cursos ou fale com nossa equipe corporativa." />

      <section className="py-20 container grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-card rounded-2xl p-8 shadow-elegant border border-border/60">
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

        <aside className="space-y-4">
          {[
            { icon: Phone, title: "Telefone", text: "(18) 99684-1902", href: "tel:+5518996841902" },
            { icon: MessageCircle, title: "WhatsApp", text: "(18) 99684-1902", href: "https://wa.me/5518996841902" },
            { icon: Mail, title: "E-mail", text: "contato@multplick.com.br" },
            { icon: MapPin, title: "Endereço", text: "Atendimento nacional" },
          ].map((c) => (
            <a key={c.title} href={c.href ?? "#"} className="flex gap-4 p-5 rounded-xl bg-card border border-border/60 shadow-card-soft hover:shadow-elegant transition-smooth">
              <div className="size-11 shrink-0 rounded-lg bg-primary-gradient text-primary-foreground grid place-items-center"><c.icon className="size-5" /></div>
              <div>
                <div className="font-semibold text-primary">{c.title}</div>
                <div className="text-sm text-muted-foreground">{c.text}</div>
              </div>
            </a>
          ))}
        </aside>
      </section>

      <section className="container pb-20">
        <div className="rounded-2xl overflow-hidden shadow-card-soft border border-border/60 aspect-[21/9] bg-secondary">
          <iframe
            title="Multplick localização"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-46.7,-23.7,-46.5,-23.5&layer=mapnik"
            className="w-full h-full"
            loading="lazy"
          />
        </div>
      </section>
    </>
  );
};
export default Contato;