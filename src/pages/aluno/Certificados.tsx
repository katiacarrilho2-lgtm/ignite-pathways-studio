import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Award, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { baixarCertificadoPdf, type CertificadoRecord, type CertificadoSnapshot } from "@/lib/certificadoPdf";

type Row = CertificadoRecord & { id: string; course?: { title: string } | null };

const Certificados = () => {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixando, setBaixando] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id,numero,codigo_validacao,emitido_em,status,nota_final,carga_horaria_horas,snapshot,course:courses(title)")
        .order("emitido_em", { ascending: false });
      setList((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  const baixar = async (c: Row) => {
    setBaixando(c.id);
    try {
      await baixarCertificadoPdf({ ...c, snapshot: (c.snapshot ?? {}) as CertificadoSnapshot });
    } catch {
      toast.error("Não foi possível gerar o PDF agora.");
    }
    setBaixando(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Certificados</h1>
        <p className="text-muted-foreground text-sm">Baixe o PDF dos seus certificados emitidos.</p>
      </div>

      {loading && <div className="p-10 text-center text-muted-foreground">Carregando…</div>}

      {!loading && list.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Award className="size-12 mx-auto mb-3" />
          <p>Nenhum certificado emitido ainda.</p>
          <p className="text-xs mt-2">Ele aparece aqui automaticamente após a aprovação na avaliação.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => {
          const s = (c.snapshot ?? {}) as CertificadoSnapshot;
          const cancelado = (c.status ?? "ativo") !== "ativo";
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.titulo_documento ?? "Certificado"}</p>
                  <h2 className="font-semibold text-lg leading-tight">{s.curso_titulo ?? c.course?.title}</h2>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${cancelado ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {cancelado ? "Cancelado" : "Ativo"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-mono">{c.numero}</p>
                <p>Emitido em {new Date(c.emitido_em).toLocaleDateString("pt-BR")}</p>
                {c.nota_final != null && <p>Nota final: {Number(c.nota_final).toFixed(2).replace(".", ",")}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1 min-w-[150px]" disabled={baixando === c.id} onClick={() => baixar(c)}>
                  {baixando === c.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Baixar certificado
                </Button>
                {c.codigo_validacao && (
                  <Button variant="outline" asChild>
                    <a href={`/validar-certificado/${c.codigo_validacao}`} target="_blank" rel="noreferrer">
                      <ShieldCheck className="size-4" /> Validar
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Certificados;
