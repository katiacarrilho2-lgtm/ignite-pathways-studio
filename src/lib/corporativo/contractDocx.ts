import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import { ContractClause, ContractData, contractTypeLabel } from "./contractTypes";

const BLUE = "0F3871";
const GRAY = "5A5F69";

const h1 = (text: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: BLUE, size: 28, font: "Arial" })],
  });

const h = (text: string) =>
  new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: BLUE, size: 24, font: "Arial" })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
  });

const p = (text: string, opts?: { justify?: boolean }) =>
  new Paragraph({
    alignment: opts?.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    spacing: { after: 140, line: 320 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });

const kv = (k: string, v: string) =>
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${k}: `, bold: true, color: BLUE, size: 22, font: "Arial" }),
      new TextRun({ text: v, size: 22, font: "Arial" }),
    ],
  });

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "____/____/______");
const romano = (n: number) => {
  const r = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX"];
  return r[n - 1] || String(n);
};

interface BuildArgs {
  titulo: string;
  tipo: string;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  data: ContractData;
  clausulas: ContractClause[];
}

export const exportContractDocx = async ({ titulo, tipo, vigencia_inicio, vigencia_fim, data, clausulas }: BuildArgs) => {
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
    spacing: { after: 120 },
    children: [new TextRun({ text: "INSTRUMENTO CONTRATUAL", bold: true, color: GRAY, size: 22, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: titulo, bold: true, color: BLUE, size: 36, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: contractTypeLabel(tipo), color: GRAY, size: 22, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`, color: GRAY, size: 20, font: "Arial" })],
  }));

  // Página 2 — Qualificação
  children.push(new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }));
  children.push(h1(titulo));

  children.push(h("Contratada"));
  children.push(p(
    `${data.contratada_razao || "MULTPLICK EDUCAÇÃO PROFISSIONAL LTDA."}, inscrita no CNPJ sob o nº ${data.contratada_cnpj || "__.___.___/____-__"}, com sede em ${data.contratada_endereco || "__________"}, ${data.contratada_cidade || "_______"}${data.contratada_uf ? "/" + data.contratada_uf : ""}, neste ato representada por ${data.contratada_representante || "seu representante legal"}${data.contratada_cargo ? ", " + data.contratada_cargo : ""}, doravante denominada simplesmente CONTRATADA.`,
    { justify: true }));

  children.push(h("Contratante"));
  children.push(p(
    `${data.contratante_razao || "____________________"}, inscrita no CNPJ/CPF sob o nº ${data.contratante_cnpj || "__.___.___/____-__"}, com sede em ${data.contratante_endereco || "__________"}, ${data.contratante_cidade || "_______"}${data.contratante_uf ? "/" + data.contratante_uf : ""}, neste ato representada por ${data.contratante_representante || "seu representante legal"}${data.contratante_cargo ? ", " + data.contratante_cargo : ""}${data.contratante_cpf ? ", CPF nº " + data.contratante_cpf : ""}, doravante denominada CONTRATANTE.`,
    { justify: true }));

  if (data.objeto) {
    children.push(h("Objeto resumido"));
    children.push(p(data.objeto, { justify: true }));
  }

  // Cláusulas
  children.push(h("Cláusulas e Condições"));
  clausulas.forEach((c, i) => {
    children.push(new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [new TextRun({
        text: `CLÁUSULA ${romano(i + 1)} — ${(c.titulo || "").toUpperCase()}`,
        bold: true, color: BLUE, size: 22, font: "Arial",
      })],
    }));
    children.push(p(c.texto || "", { justify: true }));
  });

  // Condições particulares
  const extras: [string, string | undefined][] = [
    ["Valor", data.valor_texto],
    ["Forma de pagamento", data.forma_pagamento],
    ["Multa rescisória", data.multa_rescisoria],
    ["Comissão", data.comissao],
    ["Território", data.territorio],
    ["Exclusividade", data.exclusividade],
    ["Vigência", `${fmtDate(vigencia_inicio)} a ${fmtDate(vigencia_fim)}${data.prazo_meses ? ` (${data.prazo_meses} meses)` : ""}`],
    ["Foro eleito", data.foro_cidade ? `${data.foro_cidade}${data.foro_uf ? "/" + data.foro_uf : ""}` : undefined],
  ];
  const filled = extras.filter(([, v]) => v && String(v).trim());
  if (filled.length) {
    children.push(h("Condições particulares"));
    filled.forEach(([k, v]) => children.push(kv(k, v || "")));
  }

  if (data.observacoes) {
    children.push(h("Observações"));
    children.push(p(data.observacoes, { justify: true }));
  }

  // Assinaturas
  children.push(new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }));
  children.push(h("Assinaturas"));
  children.push(p(
    "E por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo identificadas.",
    { justify: true }));

  children.push(new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({
      text: `${data.contratante_cidade || data.contratada_cidade || "____________"}${(data.contratante_uf || data.contratada_uf) ? "/" + (data.contratante_uf || data.contratada_uf) : ""}, ${new Date().toLocaleDateString("pt-BR")}.`,
      color: GRAY, size: 22, font: "Arial",
    })],
  }));

  children.push(new Paragraph({ spacing: { before: 1400 }, children: [new TextRun({ text: "_____________________________________            _____________________________________", font: "Arial", size: 22 })] }));
  children.push(new Paragraph({ children: [
    new TextRun({ text: `${data.contratada_razao || "MULTPLICK"}`.padEnd(60), bold: true, color: BLUE, font: "Arial", size: 20 }),
    new TextRun({ text: `${data.contratante_razao || "CONTRATANTE"}`, bold: true, color: BLUE, font: "Arial", size: 20 }),
  ]}));
  children.push(new Paragraph({ children: [
    new TextRun({ text: `${data.contratada_representante || "Representante legal"}${data.contratada_cargo ? " — " + data.contratada_cargo : ""}`.padEnd(60), color: GRAY, font: "Arial", size: 18 }),
    new TextRun({ text: `${data.contratante_representante || "Representante legal"}${data.contratante_cargo ? " — " + data.contratante_cargo : ""}`, color: GRAY, font: "Arial", size: 18 }),
  ]}));

  children.push(new Paragraph({ spacing: { before: 800, after: 200 }, children: [new TextRun({ text: "TESTEMUNHAS", bold: true, color: BLUE, font: "Arial", size: 22 })] }));
  children.push(new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: "1) _________________________________   CPF: __________________________", font: "Arial", size: 20 })] }));
  children.push(new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: "2) _________________________________   CPF: __________________________", font: "Arial", size: 20 })] }));

  const doc = new Document({
    creator: "Multplick",
    title: titulo,
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${titulo.replace(/[^a-z0-9 ]/gi, "").replace(/\s+/g, "_").toLowerCase() || "contrato"}.docx`);
};