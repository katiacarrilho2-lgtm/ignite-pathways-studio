import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Paperclip, FileCheck2 } from "lucide-react";

type Props = {
  installmentId: string;
  comprovantePath?: string | null;
  onChanged?: () => void;
  /** Botão compacto (só ícone), para ficar ao lado do boleto */
  compact?: boolean;
};

export const abrirComprovanteParcela = async (path: string) => {
  const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o comprovante");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
};

const ParcelaComprovante = ({ installmentId, comprovantePath, onChanged, compact }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo maior que 10 MB");
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `parcelas/${installmentId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("comprovantes")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (upErr) { setBusy(false); return toast.error(`Falha ao enviar: ${upErr.message}`); }
    const { error } = await supabase
      .from("installments")
      .update({ comprovante_path: path, comprovante_nome: file.name })
      .eq("id", installmentId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Comprovante anexado");
    onChanged?.();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }}
      />
      {comprovantePath ? (
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600 hover:text-emerald-700"
          onClick={() => abrirComprovanteParcela(comprovantePath)}
          onContextMenu={(e) => { e.preventDefault(); inputRef.current?.click(); }}
          title="Ver comprovante anexado (clique com o botão direito para substituir)"
        >
          <FileCheck2 className="size-4" />{!compact && <span className="ml-1">Comprovante</span>}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          title="Anexar comprovante de pagamento"
        >
          <Paperclip className="size-4" />{compact ? (busy ? <span className="ml-1">…</span> : null) : <span className="ml-1">{busy ? "Enviando…" : "Anexar comprovante"}</span>}
        </Button>
      )}
    </>
  );
};

export default ParcelaComprovante;
