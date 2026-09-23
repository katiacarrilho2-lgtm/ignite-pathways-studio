import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldX, Search, Loader2 } from "lucide-react";

type Resultado = {
  encontrado: boolean;
  status?: string;
  numero?: string;
  aluno_nome?: string;
  cpf_mascarado?: string | null;
  curso_titulo?: string;
  titulo_documento?: string;
  carga_horaria_horas?: number | null;
  emitido_em?: string;
  empresa?: string;
  cancelado_em?: string | null;
};

const ValidarCertificado = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [busca, setBusca] = useState(codigo ?? "");
  const [res, setRes] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(false);

  const validar = async (cod: string) => {
    if (!cod.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("certificado_validar", { _codigo: cod.trim() });
    setRes(error ? { encontrado: false } : (data as unknown as Resultado));
    setLoading(false);
  };

  useEffect(() => {
    if (codigo) validar(codigo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  const ativo = res?.encontrado && res.status === "ativo";

  return (
    <>
      <section className="bg-primary text-primary-foreground py-14">
        <div className="container max-w-3xl">
          <h1 className="text-2xl md:text-4xl font-bold">Validação de certificado</h1>
          <p className="opacity-90 mt-2 text-sm md:text-base">
            Informe o código impresso no certificado ou use o QR Code do documento.
          </p>
        </div>
      </section>

      <div className="container max-w-3xl py-10 space-y-6">
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => { e.preventDefault(); navigate(`/validar-certificado/${busca.trim()}`); validar(busca); }}
        >
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value.toUpperCase())}
            placeholder="Digite o código do certificado"
            className="h-12 text-base"
          />
          <Button type="submit" size="lg" className="h-12">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Validar
          </Button>
        </form>

        {res && (
          <div className={`rounded-xl border p-6 md:p-8 ${ativo ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
            {ativo ? (
              <>
                <div className="flex items-center gap-3 text-primary">
                  <ShieldCheck className="size-8" />
                  <h2 className="text-xl md:text-2xl font-bold">CERTIFICADO AUTÊNTICO</h2>
                </div>
                <dl className="mt-6 grid gap-3 text-sm">
                  <div><dt className="text-muted-foreground">Aluno</dt><dd className="font-medium">{res.aluno_nome}</dd></div>
                  {res.cpf_mascarado && <div><dt className="text-muted-foreground">CPF</dt><dd className="font-medium">{res.cpf_mascarado}</dd></div>}
                  <div><dt className="text-muted-foreground">Formação</dt><dd className="font-medium">{res.curso_titulo}</dd></div>
                  <div><dt className="text-muted-foreground">Documento</dt><dd className="font-medium">{res.titulo_documento}</dd></div>
                  {res.carga_horaria_horas ? <div><dt className="text-muted-foreground">Carga horária</dt><dd className="font-medium">{res.carga_horaria_horas} horas</dd></div> : null}
                  <div><dt className="text-muted-foreground">Número</dt><dd className="font-mono font-medium">{res.numero}</dd></div>
                  <div><dt className="text-muted-foreground">Emitido em</dt><dd className="font-medium">{res.emitido_em ? new Date(res.emitido_em).toLocaleDateString("pt-BR") : "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Instituição</dt><dd className="font-medium">{res.empresa}</dd></div>
                </dl>
              </>
            ) : res.encontrado ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-destructive">
                  <ShieldX className="size-8" />
                  <h2 className="text-xl md:text-2xl font-bold">CERTIFICADO CANCELADO</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  O certificado nº {res.numero} consta no sistema, porém está com situação cancelada
                  {res.cancelado_em ? ` desde ${new Date(res.cancelado_em).toLocaleDateString("pt-BR")}` : ""}.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-destructive">
                <ShieldX className="size-8" />
                <h2 className="text-xl md:text-2xl font-bold">CERTIFICADO NÃO LOCALIZADO</h2>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ValidarCertificado;
