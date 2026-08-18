import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildStudentContractPdf } from "@/lib/contracts/studentContractPdf";

export type ContractStudent = {
  full_name: string;
  cpf?: string | null;
  rg?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
};

const fmtBR = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "");

export function StudentContractDialog({
  student,
  courses,
  defaultCourseTitle,
  defaultValorTotal,
  defaultParcelas,
  defaultValorParcela,
  defaultPrimeiroVenc,
}: {
  student: ContractStudent;
  courses?: string[];
  defaultCourseTitle?: string;
  defaultValorTotal?: string;
  defaultParcelas?: string;
  defaultValorParcela?: string;
  defaultPrimeiroVenc?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [curso, setCurso] = useState(defaultCourseTitle || courses?.[0] || "");
  const [modalidade, setModalidade] = useState("");
  const [carga, setCarga] = useState("");
  const [valorTotal, setValorTotal] = useState(defaultValorTotal || "");
  const [entrada, setEntrada] = useState("");
  const [parcelas, setParcelas] = useState(defaultParcelas || "");
  const [valorParcela, setValorParcela] = useState(defaultValorParcela || "");
  const [primeiroVenc, setPrimeiroVenc] = useState(defaultPrimeiroVenc || "");
  const [formaPgto, setFormaPgto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [obs, setObs] = useState("");

  const gerar = async () => {
    if (!curso.trim()) return toast.error("Informe o curso.");
    if (!valorTotal.trim()) return toast.error("Informe o valor total.");
    setBusy(true);
    try {
      const { data: company } = await supabase
        .from("company_settings")
        .select("razao_social, cnpj, endereco, cidade, uf, responsavel_nome, responsavel_cargo")
        .eq("singleton", true)
        .maybeSingle();

      const pdf = buildStudentContractPdf({
        full_name: student.full_name || "Aluno",
        cpf: student.cpf,
        rg: student.rg,
        address: student.address,
        city: student.city,
        state: student.state,
        phone: student.phone,
        email: student.email,
        course_title: curso,
        course_modality: modalidade || null,
        course_workload: carga || null,
        valor_total: valorTotal,
        entrada: entrada || null,
        parcelas: parcelas || null,
        valor_parcela: valorParcela || null,
        primeiro_vencimento: fmtBR(primeiroVenc) || null,
        forma_pagamento: formaPgto || null,
        data_inicio: fmtBR(dataInicio) || null,
        data_termino: fmtBR(dataTermino) || null,
        observacoes: obs || null,
        escola_razao: company?.razao_social ?? "Multplick Educação Profissional e Corporativa",
        escola_cnpj: company?.cnpj ?? null,
        escola_endereco: company?.endereco ?? null,
        escola_cidade: company?.cidade ?? null,
        escola_uf: company?.uf ?? null,
        representante_nome: company?.responsavel_nome ?? "Kátia Joaquim",
        representante_cargo: company?.responsavel_cargo ?? "Diretora Comercial",
      });
      const safe = (student.full_name || "aluno").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40);
      pdf.save(`Contrato_${safe}.pdf`);
      toast.success("Contrato gerado!");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar contrato");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="hero" onClick={() => setOpen(true)}>
        <FileSignature className="size-4" /> Gerar contrato
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar contrato do aluno</DialogTitle>
            <DialogDescription>{student.full_name} — os dados cadastrais do aluno são preenchidos automaticamente.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Curso</Label>
              {courses && courses.length > 0 ? (
                <Select value={curso} onValueChange={setCurso}>
                  <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="Nome do curso" />
              )}
            </div>
            <div>
              <Label>Modalidade / regime</Label>
              <Input value={modalidade} onChange={(e) => setModalidade(e.target.value)} placeholder="Ex.: por competência" />
            </div>
            <div>
              <Label>Carga horária</Label>
              <Input value={carga} onChange={(e) => setCarga(e.target.value)} placeholder="Ex.: 260 horas" />
            </div>
            <div>
              <Label>Valor total *</Label>
              <Input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="R$ 1.200,00" />
            </div>
            <div>
              <Label>Entrada</Label>
              <Input value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="R$ 200,00" />
            </div>
            <div>
              <Label>Parcelas</Label>
              <Input value={parcelas} onChange={(e) => setParcelas(e.target.value)} placeholder="12x" />
            </div>
            <div>
              <Label>Valor da parcela</Label>
              <Input value={valorParcela} onChange={(e) => setValorParcela(e.target.value)} placeholder="R$ 100,00" />
            </div>
            <div>
              <Label>1º vencimento</Label>
              <Input type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Input value={formaPgto} onChange={(e) => setFormaPgto(e.target.value)} placeholder="PIX / Boleto / Cartão" />
            </div>
            <div>
              <Label>Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Término previsto</Label>
              <Input type="date" value={dataTermino} onChange={(e) => setDataTermino(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações (cláusula adicional)</Label>
              <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={gerar} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StudentContractDialog;
