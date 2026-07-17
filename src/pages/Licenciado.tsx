import { PageHero } from "@/components/site/PageHero";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, CalendarCheck, Coins, Handshake, TrendingUp, Users } from "lucide-react";
import { z } from "zod";
import { useState } from "react";
import licenciado from "@/assets/licenciado.jpg";

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  telefone: z.string().trim().min(8).max(20),
  cidade: z.string().trim().min(2).max(80),
  mensagem: z.string().trim().max(1000).optional(),
});

const benefits = [
  { icon: Coins, title: "Comissões atrativas", text: "Modelo de receita recorrente sobre cada matrícula realizada na sua região." },
  { icon: TrendingUp, title: "Catálogo completo", text: "Revenda cursos técnicos, NRs, graduação, pós-graduação e EJA com a marca Multplick." },
  { icon: Users, title: "Suporte comercial", text: "Materiais de venda, treinamento de equipe e acompanhamento dedicado." },
  { icon: Briefcase, title: "Território exclusivo", text: "Atue como representante oficial Multplick em sua cidade ou região." },
];

const Licenciado = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const result = schema.safeParse(data);
    if (!result.success) {
      toast({ title: "Verifique os campos", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Solicitação enviada!", description: "Vamos agendar uma reunião para apresentar o modelo Licenciado Multplick." });
      e.currentTarget.reset();
    }, 800);
  };

  return (
    <>
      <PageHero
        eyebrow="Programa Licenciado"
        title="Seja um Licenciado Multplick"
        description="Construa um negócio sólido na área da educação revendendo nosso portfólio completo de cursos em sua região."
      />

      <section className="py-20 container grid lg:grid-cols-2 gap-12 items-center">
        <img src={licenciado} alt="Parceria Licenciado Multplick" loading="lazy" className="rounded-2xl shadow-elegant" width={1920} height={1080} />
        <div>
          <SectionHeader eyebrow="Por que ser Licenciado" title="Um modelo de negócio com lucro recorrente e marca forte" />
          <p className="text-muted-foreground leading-relaxed mb-4">
            O programa Licenciado Multplick foi desenhado para empreendedores que querem atuar no mercado de educação profissional com baixo investimento inicial, alta margem e o suporte de uma marca consolidada.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Você revende todo o catálogo Multplick — cursos técnicos, NRs, graduação, pós-graduação, EJA e treinamentos in company — recebendo comissões por cada aluno matriculado.
          </p>
        </div>
      </section>

      <section className="py-20 bg-secondary/40">
        <div className="container">
          <SectionHeader eyebrow="Benefícios" title="O que você recebe ao se tornar Licenciado" center />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="p-8 rounded-2xl bg-card border border-border/60 shadow-card-soft hover:shadow-elegant transition-smooth">
                <div className="size-12 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center mb-4">
                  <b.icon className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
    </>
  );
};

export default Licenciado;