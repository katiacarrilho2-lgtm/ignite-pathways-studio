import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sb, getOrigem } from "@/lib/store";
import { CheckCircle2 } from "lucide-react";

type Field = { k: string; label: string; type?: string; area?: boolean; req?: boolean };
const CONSULTA: Field[] = [
  { k: "nome", label: "Nome", req: true }, { k: "whatsapp", label: "WhatsApp", type: "tel", req: true },
  { k: "cidade_uf", label: "Cidade/UF" }, { k: "curso", label: "Curso desejado" }, { k: "profissao", label: "Profissão" },
  { k: "trabalha_na_area", label: "Trabalha atualmente na área?" }, { k: "tempo_experiencia", label: "Quanto tempo de experiência?" },
];
const PROPOSTA: Field[] = [
  { k: "empresa", label: "Empresa", req: true }, { k: "cnpj", label: "CNPJ" }, { k: "nome", label: "Responsável", req: true },
  { k: "whatsapp", label: "WhatsApp", type: "tel", req: true }, { k: "email", label: "E-mail", type: "email" }, { k: "cidade_uf", label: "Cidade/UF" },
  { k: "curso", label: "Treinamento desejado" }, { k: "colaboradores", label: "Quantidade de colaboradores", type: "number" },
  { k: "modalidade", label: "Modalidade desejada" }, { k: "necessidade", label: "Necessidade", area: true },
];

export const InteresseDialog = ({ tipo, open, onOpenChange, curso }: { tipo: "consulta" | "proposta"; open: boolean; onOpenChange: (v: boolean) => void; curso?: string }) => {
  const fields = tipo === "consulta" ? CONSULTA : PROPOSTA;
  const [f, setF] = useState<Record<string, string>>({ curso: curso ?? "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const send = async () => {
    for (const x of fields) if (x.req && !f[x.k]?.trim()) return toast.error(`Preencha: ${x.label}`);
    setBusy(true);
    const o = getOrigem();
    const { error } = await sb.rpc("store_registrar_interesse", { _tipo: tipo, _dados: { ...f, polo: o.polo, consultor: o.consultor, campanha: o.campanha } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDone(false); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tipo === "consulta" ? "Verificar minha experiência" : "Solicitar proposta"}</DialogTitle>
          <DialogDescription>{tipo === "consulta" ? "Conte um pouco sobre você. Nossa equipe analisa os requisitos e retorna pelo WhatsApp." : "Receba uma proposta personalizada para sua empresa."}</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="size-12 mx-auto text-primary-glow" />
            <p className="font-semibold text-lg">Recebemos suas informações!</p>
            <p className="text-muted-foreground text-sm">Um consultor Multplick entrará em contato em breve.</p>
            <Button className="w-full h-12" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((x) => (
              <div key={x.k} className="space-y-1">
                <Label>{x.label}{x.req && " *"}</Label>
                {x.area ? <Textarea value={f[x.k] ?? ""} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />
                  : <Input className="h-12" type={x.type ?? "text"} value={f[x.k] ?? ""} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />}
              </div>
            ))}
            <Button variant="hero" className="w-full h-12 text-base" disabled={busy} onClick={send}>{busy ? "Enviando…" : "Enviar"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
