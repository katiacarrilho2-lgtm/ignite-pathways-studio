import { Award } from "lucide-react";

const Certificados = () => (
  <div className="p-8 space-y-6">
    <div><h1 className="text-3xl font-bold text-primary">Certificados</h1><p className="text-muted-foreground">Seus certificados aparecerão aqui ao concluir um curso.</p></div>
    <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
      <Award className="size-12 mx-auto mb-3" />
      <p>Nenhum certificado emitido ainda.</p>
      <p className="text-xs mt-2">Disponível em breve — após concluir um curso com aprovação na prova.</p>
    </div>
  </div>
);
export default Certificados;