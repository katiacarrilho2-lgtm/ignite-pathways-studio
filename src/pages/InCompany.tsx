import { PageHero } from "@/components/site/PageHero";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlayCircle, MapPin, Users, ClipboardCheck, GraduationCap } from "lucide-react";
import inCompany from "@/assets/in-company.jpg";
import hero from "@/assets/hero-industrial.jpg";

const InCompany = () => (
  <>
    <PageHero eyebrow="Treinamentos In Company" title="Capacitação dentro da sua operação" description="Levamos professores e instrutores qualificados até sua empresa, com acompanhamento contínuo até a conclusão do treinamento." />

    <section className="py-20 container grid lg:grid-cols-2 gap-12 items-center">
      <img src={inCompany} alt="Treinamento in loco" loading="lazy" className="rounded-2xl shadow-elegant" />
      <div>
        <SectionHeader eyebrow="Como funciona" title="Método in loco Multplick" />
        <ol className="space-y-5">
          {[
            { icon: MapPin, title: "Diagnóstico", text: "Visita técnica e mapeamento das necessidades de capacitação da sua operação." },
            { icon: ClipboardCheck, title: "Planejamento", text: "Cronograma, conteúdo programático e certificações adequadas ao seu setor." },
            { icon: Users, title: "Execução in loco", text: "Professores presentes na empresa, com aulas práticas no ambiente real de trabalho." },
            { icon: GraduationCap, title: "Certificação", text: "Avaliação, emissão de certificados e suporte pós-treinamento." },
          ].map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <div className="size-12 shrink-0 rounded-xl bg-primary-gradient text-primary-foreground grid place-items-center font-bold">{i + 1}</div>
              <div>
                <h4 className="font-bold text-primary flex items-center gap-2"><s.icon className="size-4 text-primary-glow" /> {s.title}</h4>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="py-20 bg-secondary/40">
      <div className="container">
        <SectionHeader eyebrow="Vídeos" title="Conheça nossos treinamentos" center />
        <div className="grid md:grid-cols-2 gap-6">
          {[hero, inCompany].map((img, i) => (
            <div key={i} className="relative aspect-video rounded-2xl overflow-hidden shadow-elegant group cursor-pointer">
              <img src={img} alt="Treinamento Multplick" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
              <div className="absolute inset-0 bg-primary/50 grid place-items-center">
                <PlayCircle className="size-20 text-white group-hover:scale-110 transition-smooth" />
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button asChild size="lg" variant="hero"><Link to="/empresas">Solicitar treinamento in company</Link></Button>
        </div>
      </div>
    </section>
  </>
);
export default InCompany;