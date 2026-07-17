import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const EjaConejapBanner = () => {
  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[hsl(215_70%_18%)] text-primary-foreground p-8 md:p-12 shadow-elegant">
          <div className="absolute -top-16 -left-16 size-64 rounded-full bg-primary-glow/15 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 size-72 rounded-full bg-primary-glow/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="size-20 md:size-24 shrink-0 rounded-2xl bg-primary-glow/15 border border-primary-glow/40 grid place-items-center shadow-glow">
              <GraduationCap className="size-12 md:size-14 text-primary-glow" />
            </div>
            <div className="flex-1">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] uppercase text-primary-glow mb-2">
                <ShieldCheck className="size-3.5" /> EJA · Certificado com validade nacional
              </span>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight">
                Conclua o Ensino Fundamental ou Médio com a Multplick
              </h2>
              <p className="mt-3 text-primary-foreground/85 max-w-2xl text-base md:text-lg">
                Programa 100% EAD, com base na LDB (Lei nº 9.394/96), certificado
                registrado por instituição credenciada e validade em todo o Brasil.
              </p>
            </div>
            <Button asChild size="lg" variant="silver" className="shrink-0 h-14 px-8 text-base shadow-elegant">
              <Link to="/eja">
                Conheça o programa EJA <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};