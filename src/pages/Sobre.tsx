import { PageHero } from "@/components/site/PageHero";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Target, Eye, Heart, Building2 } from "lucide-react";
import sobreUsina from "@/assets/sobre-usina.jpg";

const Sobre = () => (
  <>
    <PageHero eyebrow="Sobre a Multplick" title="Formação que multiplica oportunidades" description="Há anos conectando empresas, instituições de ensino e profissionais em torno de uma educação que entrega resultados reais." />
    <section className="py-20 container grid lg:grid-cols-2 gap-12 items-center">
      <img src={sobreUsina} alt="Alunos Multplick uniformizados com EPIs aprendendo automação, refrigeração e elétrica em uma usina" loading="lazy" width={1920} height={1080} className="rounded-2xl shadow-elegant" />
      <div>
        <SectionHeader eyebrow="Nossa história" title="Educação profissional com propósito" />
        <p className="text-muted-foreground leading-relaxed mb-4">
          A Multplick nasceu para preencher uma lacuna entre o mercado e a educação técnica. Formamos alunos dentro de usinas, indústrias e ambientes reais de operação — capacitando profissionais em automação, refrigeração e elétrica, com todos os EPIs e uniformes adequados.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Atuamos em parceria com escolas técnicas, EJA, cursos híbridos, profissionalizantes, graduação, pós-graduação e treinamentos em todas as Normas Regulamentadoras. Nosso modelo in company leva o professor diretamente para dentro da empresa, com acompanhamento real até a conclusão do treinamento.
        </p>
        <p className="text-xs text-muted-foreground mt-6">CNPJ 37.541.371/0001-90</p>
      </div>
    </section>

    <section className="py-20 bg-secondary/40">
      <div className="container">
        <SectionHeader eyebrow="Nosso DNA" title="Missão, Visão e Valores" center />
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Missão", text: "Multiplicar oportunidades por meio de uma formação profissional acessível, prática e conectada ao mercado." },
            { icon: Eye, title: "Visão", text: "Ser referência nacional em formação profissional para empresas, usinas e indústrias." },
            { icon: Heart, title: "Valores", text: "Excelência, proximidade, responsabilidade social e compromisso com o desenvolvimento humano." },
          ].map((i) => (
            <div key={i.title} className="p-8 rounded-2xl bg-card border border-border/60 shadow-card-soft">
              <div className="size-12 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center mb-4"><i.icon className="size-6" /></div>
              <h3 className="text-xl font-bold text-primary mb-2">{i.title}</h3>
              <p className="text-muted-foreground text-sm">{i.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-20 container">
      <SectionHeader eyebrow="Parceiros e credibilidade" title="Quem confia na Multplick" center />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {["Usinas", "Indústrias", "Faculdades", "Escolas Técnicas", "Governo"].map((p) => (
          <div key={p} className="aspect-[3/2] rounded-xl bg-silver-gradient grid place-items-center border border-border/60">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Building2 className="size-5" /> {p}
            </div>
          </div>
        ))}
      </div>
    </section>
  </>
);
export default Sobre;