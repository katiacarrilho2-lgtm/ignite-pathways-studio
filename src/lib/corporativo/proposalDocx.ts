import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat,
} from "docx";
import { saveAs } from "file-saver";
import { ProposalData, proposalTypeLabel } from "./types";

const BLUE = "0F3871";
const GRAY = "5A5F69";

const h = (text: string) =>
  new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: BLUE, size: 26, font: "Arial" })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
  });

const p = (text: string) =>
  new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });

const bullet = (text: string) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });

const kvRow = (k: string, v: string) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        shading: { fill: "EBF0F8", type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, color: BLUE, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 6360, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: v || "—", size: 20, font: "Arial" })] })],
      }),
    ],
  });

interface BuildArgs {
  titulo: string;
  tipo: string;
  validade_dias: number;
  data: ProposalData;
}

export const exportProposalDocx = async ({ titulo, tipo, validade_dias, data }: BuildArgs) => {
  const children: any[] = [];

  // Capa
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 60 },
    children: [new TextRun({ text: "MULTPLICK", bold: true, color: BLUE, size: 56, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: "Educação Profissional e Corporativa", color: GRAY, size: 22, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "PROPOSTA COMERCIAL", bold: true, color: GRAY, size: 22, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: titulo, bold: true, color: BLUE, size: 40, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: proposalTypeLabel(tipo), color: GRAY, size: 22, font: "Arial" })],
  }));
  if (data.razao_social) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Preparada para", bold: true, color: BLUE, size: 22, font: "Arial" })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.razao_social, size: 22, font: "Arial" })] }));
  }
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 },
    children: [new TextRun({ text: `Emitida em ${new Date().toLocaleDateString("pt-BR")} — Válida por ${validade_dias} dias`, color: GRAY, size: 18, font: "Arial" })],
    pageBreakBefore: false,
  }));

  // Página 2
  children.push(new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }));
  children.push(h("Apresentação Multplick"));
  children.push(p(data.apresentacao || "A Multplick é especialista em educação profissional e capacitação corporativa, com soluções modulares para empresas, indústrias, instituições públicas e parceiros licenciados."));

  children.push(h("Dados do Cliente"));
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 6360],
    rows: [
      kvRow("Razão Social", data.razao_social || "—"),
      kvRow("Nome Fantasia", data.nome_fantasia || "—"),
      kvRow("CNPJ/CPF", data.cnpj_cpf || "—"),
      kvRow("Cidade/UF", `${data.cidade || "—"}${data.uf ? " / " + data.uf : ""}`),
      kvRow("Contato", `${data.contato_nome || "—"}${data.contato_cargo ? " (" + data.contato_cargo + ")" : ""}`),
      kvRow("E-mail", data.contato_email || "—"),
      kvRow("Telefone", data.contato_telefone || "—"),
      kvRow("Colaboradores", data.colaboradores ? String(data.colaboradores) : "—"),
      kvRow("Modalidade", data.modalidade || "—"),
    ],
  }));

  if (data.diagnostico) { children.push(h("Diagnóstico")); children.push(p(data.diagnostico)); }
  if (data.beneficios?.length) { children.push(h("Benefícios")); data.beneficios.forEach((b) => children.push(bullet(b))); }
  if (data.cursos_recomendados?.length) { children.push(h("Cursos Recomendados")); data.cursos_recomendados.forEach((c) => children.push(bullet(c))); }
  if (data.cronograma?.length) { children.push(h("Cronograma Sugerido")); data.cronograma.forEach((c, i) => children.push(bullet(`Etapa ${i + 1}: ${c}`))); }

  const planoRows: TableRow[] = [];
  if (data.plano_licenciamento) planoRows.push(kvRow("Licenciamento", data.plano_licenciamento));
  if (data.plano_revenda) planoRows.push(kvRow("Revenda", data.plano_revenda));
  if (data.comissao_afiliado) planoRows.push(kvRow("Comissão Afiliado", data.comissao_afiliado));
  if (data.comissao_pj) planoRows.push(kvRow("Comissão Vendedor PJ", data.comissao_pj));
  if (planoRows.length) {
    children.push(h("Plano de Parceria / Comissionamento"));
    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 6360], rows: planoRows }));
  }

  children.push(h("Investimento"));
  children.push(new Paragraph({ children: [new TextRun({ text: data.investimento_texto || "A combinar", bold: true, color: BLUE, size: 32, font: "Arial" })] }));
  children.push(p(data.condicoes || "Condições comerciais a definir em contrato."));

  if (data.observacoes) { children.push(h("Observações")); children.push(p(data.observacoes)); }

  children.push(new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({ text: `Esta proposta é válida por ${validade_dias} dias a partir da data de emissão.`, italics: true, color: GRAY, size: 20, font: "Arial" })],
  }));

  // Assinaturas
  children.push(new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }));
  children.push(h("Aceite e Assinatura"));
  children.push(p("As partes abaixo declaram concordância com os termos descritos nesta proposta comercial, comprometendo-se à formalização do contrato correspondente."));
  children.push(new Paragraph({ spacing: { before: 1600 }, children: [new TextRun({ text: "_____________________________________            _____________________________________", font: "Arial", size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Multplick                                                            ${data.razao_social || "Cliente"}`, bold: true, color: BLUE, font: "Arial", size: 20 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Representante                                                       ${data.contato_nome || "Responsável"}${data.contato_cargo ? " — " + data.contato_cargo : ""}`, color: GRAY, font: "Arial", size: 18 })] }));
  children.push(new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: `${data.cidade || "____________"}${data.uf ? "/" + data.uf : ""}, ${new Date().toLocaleDateString("pt-BR")}.`, color: GRAY, font: "Arial", size: 20 })] }));

  const doc = new Document({
    creator: "Multplick",
    title: titulo,
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${titulo.replace(/[^a-z0-9 ]/gi, "").replace(/\s+/g, "_").toLowerCase() || "proposta"}.docx`);
};