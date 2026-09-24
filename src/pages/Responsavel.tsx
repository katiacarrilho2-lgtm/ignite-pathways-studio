import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidCpf, maskCpf, onlyDigits } from "@/lib/cpf";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const PARENTESCOS = ["Mãe", "Pai", "Avó / Avô", "Tio(a)", "Irmão(ã)", "Tutor legal", "Outro"];

const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

type Info = { aluno: string; curso: string; enviado: boolean } | null;

const empty = {
  nome: "", cpf: "", rg: "", orgao_emissor: "", data_expedicao: "", nascimento: "", parentesco: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", whatsapp: "", email: "",
};

export default function Responsavel() {
  const { token } = useParams();
  const [info, setInfo] = useState<Info | undefined>(undefined);
  const [f, setF] = useState(empty);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Ficha do responsável | Multplick";
    supabase.rpc("guardian_form_info" as any, { _token: token }).then(({ data }) => setInfo((data as Info) ?? null));
  }, [token]);

  const set = (k: keyof typeof empty, v: string) => setF(p => ({ ...p, [k]: v }));

  const buscaCep = async (cep: string) => {
    const d = onlyDigits(cep);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then(x => x.json());
      if (!r.erro) setF(p => ({ ...p, rua: r.logradouro || p.rua, bairro: r.bairro || p.bairro, cidade: r.localidade || p.cidade, estado: r.uf || p.estado }));
    } catch { /* ignora */ }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const obrig: [keyof typeof empty, string][] = [
      ["nome", "Nome completo"], ["cpf", "CPF"], ["rg", "RG"], ["nascimento", "Data de nascimento"], ["parentesco", "Grau de parentesco"],
      ["cep", "CEP"], ["rua", "Rua"], ["numero", "Número"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["estado", "Estado"], ["whatsapp", "WhatsApp"],
    ];
    const falta = obrig.find(([k]) => !f[k].trim());
    if (falta) return toast.error(`Preencha: ${falta[1]}`);
    if (!isValidCpf(f.cpf)) return toast.error("CPF inválido");
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return toast.error("E-mail inválido");
    if (onlyDigits(f.whatsapp).length < 10) return toast.error("WhatsApp inválido");
    setSending(true);
    const { data, error } = await supabase.rpc("guardian_form_submit" as any, { _token: token, _data: f });
    setSending(false);
    const r = data as any;
    if (error || !r?.ok) return toast.error(r?.erro ?? error?.message ?? "Não foi possível enviar");
    setDone(true);
  };

  if (info === undefined) return <div className="min-h-screen grid place-items-center text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  if (info === null) return <div className="min-h-screen grid place-items-center p-6 text-center text-muted-foreground">Link inválido ou expirado. Peça um novo link à escola.</div>;
  if (done || info.enviado) return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center space-y-3">
        <CheckCircle2 className="size-12 text-primary mx-auto" />
        <h1 className="text-xl font-bold text-primary">Ficha do responsável enviada</h1>
        <p className="text-sm text-muted-foreground">Obrigado! Os dados foram vinculados à matrícula de <strong>{info.aluno}</strong>.</p>
      </div>
    </div>
  );

  const F = ({ k, label, type = "text", mask, cls = "", ph }: { k: keyof typeof empty; label: string; type?: string; mask?: (v: string) => string; cls?: string; ph?: string }) => (
    <div className={cls}>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={f[k]} placeholder={ph} onChange={e => set(k, mask ? mask(e.target.value) : e.target.value)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <form onSubmit={enviar} className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-5 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><ShieldCheck className="size-6" /> Ficha do responsável legal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aluno(a): <strong>{info.aluno}</strong> • Curso: {info.curso}. Preencha os dados do responsável pelo aluno menor de idade.
          </p>
        </div>

        <section className="grid md:grid-cols-2 gap-3">
          <h2 className="md:col-span-2 text-sm font-semibold text-primary">Dados pessoais</h2>
          {F({ k: "nome", label: "Nome completo *", cls: "md:col-span-2" })}
          {F({ k: "cpf", label: "CPF *", mask: maskCpf, ph: "000.000.000-00" })}
          {F({ k: "nascimento", label: "Data de nascimento *", type: "date" })}
          {F({ k: "rg", label: "RG *" })}
          {F({ k: "orgao_emissor", label: "Órgão emissor", ph: "Ex.: SSP/SP" })}
          {F({ k: "data_expedicao", label: "Data de expedição", type: "date" })}
          <div>
            <Label className="text-xs">Grau de parentesco *</Label>
            <Select value={f.parentesco} onValueChange={v => set("parentesco", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{PARENTESCOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid md:grid-cols-6 gap-3">
          <h2 className="md:col-span-6 text-sm font-semibold text-primary">Endereço</h2>
          <div className="md:col-span-2">
            <Label className="text-xs">CEP *</Label>
            <Input value={f.cep} placeholder="00000-000" onChange={e => { const v = maskCep(e.target.value); set("cep", v); buscaCep(v); }} />
          </div>
          {F({ k: "rua", label: "Rua *", cls: "md:col-span-4" })}
          {F({ k: "numero", label: "Número *", cls: "md:col-span-2" })}
          {F({ k: "complemento", label: "Complemento", cls: "md:col-span-4" })}
          {F({ k: "bairro", label: "Bairro *", cls: "md:col-span-2" })}
          {F({ k: "cidade", label: "Cidade *", cls: "md:col-span-3" })}
          {F({ k: "estado", label: "UF *", mask: v => v.toUpperCase().slice(0, 2) })}
        </section>

        <section className="grid md:grid-cols-2 gap-3">
          <h2 className="md:col-span-2 text-sm font-semibold text-primary">Contato</h2>
          {F({ k: "whatsapp", label: "WhatsApp *", mask: maskPhone, ph: "(00) 00000-0000" })}
          {F({ k: "email", label: "E-mail", type: "email" })}
        </section>

        <Button type="submit" className="w-full" disabled={sending}>
          {sending && <Loader2 className="size-4 animate-spin" />} Enviar ficha do responsável
        </Button>
      </form>
    </div>
  );
}
