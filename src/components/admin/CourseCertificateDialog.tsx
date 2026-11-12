import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { baixarCertificadoPdf } from "@/lib/certificadoPdf";

const DEFAULT_TEXT = 'Certificamos que [NOME DO ALUNO] concluiu o curso livre "[NOME DO CURSO]", promovido pela Multplick Formação Profissional, cumprindo os critérios estabelecidos para esta formação.';

export const buildConteudoFromSections = (sections: { title: string; lessons?: { title: string; lesson_type?: string }[] }[]) =>
  sections
    .filter((s) => !/avalia[cç][aã]o final/i.test(s.title))
    .map((s) => {
      const aulas = (s.lessons ?? [])
        .filter((l) => (l.lesson_type ?? "text") === "text" || l.lesson_type === "video")
        .filter((l) => !/^(quiz|flashcards|videoaula)\b/i.test(l.title))
        .map((l) => `   • ${l.title}`);
      return [s.title, ...aulas].join("\n");
    })
    .join("\n");

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseId: string;
  courseTitle: string;
  sections: { title: string; lessons?: { title: string; lesson_type?: string }[] }[];
};

export const CourseCertificateDialog = ({ open, onOpenChange, courseId, courseTitle, sections }: Props) => {
  const [texto, setTexto] = useState("");
  const [horas, setHoras] = useState<string>("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("courses").select("certificado_texto_custom,certificado_texto_modo,carga_horaria_horas,conteudo_programatico").eq("id", courseId).maybeSingle()
      .then(({ data }) => {
        const d: any = data ?? {};
        setTexto(d.certificado_texto_custom || DEFAULT_TEXT);
        setHoras(d.carga_horaria_horas ? String(d.carga_horaria_horas) : "");
        setConteudo(d.conteudo_programatico || buildConteudoFromSections(sections));
      });
  }, [open, courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("courses").update({
      certificado_texto_modo: "personalizado",
      certificado_texto_custom: texto.trim() || null,
      carga_horaria_horas: horas ? Number(horas) : null,
      conteudo_programatico: conteudo.trim() || null,
    } as any).eq("id", courseId);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Certificado do curso salvo"); onOpenChange(false); }
  };

  const preview = async () => {
    const { data: st } = await supabase.from("certificate_settings").select("*").limit(1).maybeSingle();
    const s: any = st ?? {};
    await baixarCertificadoPdf({
      numero: "MODELO", emitido_em: new Date().toISOString(), status: "ativo",
      carga_horaria_horas: horas ? Number(horas) : null,
      snapshot: {
        aluno_nome: "Nome do Aluno Exemplo", curso_titulo: courseTitle, titulo_documento: "CERTIFICADO DE CONCLUSÃO",
        texto, carga_horaria_horas: horas ? Number(horas) : null,
        empresa: s.empresa || "Multplick Formação Profissional", cnpj: s.cnpj, responsavel_nome: s.responsavel_nome || "Euclides Joaquim",
        responsavel_cargo: s.responsavel_cargo || "Coordenador", assinatura_url: s.assinatura_url, logo_url: s.logo_url,
        validacao_base_url: s.validacao_base_url, incluir_conteudo: !!conteudo.trim(), conteudo_programatico: conteudo,
      },
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Certificado do curso</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Texto do certificado</Label>
            <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Use [NOME DO ALUNO] e [NOME DO CURSO] — são trocados automaticamente.</p>
          </div>
          <div className="w-40">
            <Label>Carga horária (horas)</Label>
            <Input type="number" min={0} value={horas} onChange={(e) => setHoras(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Conteúdo programático (verso do certificado)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConteudo(buildConteudoFromSections(sections))}>Preencher com os módulos do curso</Button>
            </div>
            <Textarea rows={12} value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={preview}>Ver modelo em PDF</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar certificado"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
