import { Link, useSearchParams } from "react-router-dom";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

type Status = "sucesso" | "falha" | "pendente";

const CONFIG: Record<Status, { icon: any; title: string; desc: string; color: string }> = {
  sucesso:  { icon: CheckCircle2, title: "Pagamento aprovado!", desc: "Em instantes você receberá os dados de acesso no e-mail cadastrado no Mercado Pago.", color: "text-emerald-500" },
  falha:    { icon: XCircle,      title: "Pagamento não concluído", desc: "Houve um problema com seu pagamento. Tente novamente ou fale com nosso atendimento.", color: "text-destructive" },
  pendente: { icon: Clock,        title: "Pagamento pendente",      desc: "Estamos aguardando a confirmação do Mercado Pago. Você receberá um e-mail assim que for aprovado.", color: "text-amber-500" },
};

const PagamentoRetorno = ({ status }: { status: Status }) => {
  const [params] = useSearchParams();
  const curso = params.get("curso");
  const c = CONFIG[status];
  const Icon = c.icon;
  return (
    <>
      <PageHero eyebrow="Pagamento" title={c.title} description={c.desc} />
      <section className="container py-20 grid place-items-center">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-10 text-center shadow-elegant space-y-6">
          <Icon className={`size-16 mx-auto ${c.color}`} />
          {curso && <p className="text-sm text-muted-foreground">Curso: <strong className="text-foreground">{curso}</strong></p>}
          <div className="flex flex-col gap-3">
            <Button asChild variant="hero"><Link to="/cursos">Ver mais cursos</Link></Button>
            <Button asChild variant="outline"><Link to="/contato">Falar com atendimento</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
};
export default PagamentoRetorno;