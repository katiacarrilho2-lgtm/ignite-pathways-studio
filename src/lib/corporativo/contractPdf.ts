import jsPDF from "jspdf";
import { ContractClause, ContractData, contractTypeLabel } from "./contractTypes";
import { SIGNATURE_PNG } from "./signatureImage";

const BLUE: [number, number, number] = [15, 56, 113];
const GRAY: [number, number, number] = [90, 95, 105];
const TEXT: [number, number, number] = [40, 45, 55];

interface BuildArgs {
  titulo: string;
  tipo: string;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  data: ContractData;
  clausulas: ContractClause[];
}

const addFooter = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.6);
    doc.line(40, h - 36, w - 40, h - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Multplick — Educação Profissional e Corporativa", 40, h - 22);
    doc.text(`${i} / ${pages}`, w - 40, h - 22, { align: "right" });
  }
};

const ensureSpace = (doc: jsPDF, y: number, need = 80): number => {
  const h = doc.internal.pageSize.getHeight();
  if (y + need > h - 60) { doc.addPage(); return 60; }
  return y;
};

const paragraph = (doc: jsPDF, text: string, y: number, opts?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: "justify" | "left" }): number => {
  const size = opts?.size ?? 10.5;
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...(opts?.color ?? TEXT));
  const w = doc.internal.pageSize.getWidth() - 80;
  const lines = doc.splitTextToSize(text || "", w);
  doc.text(lines, 40, y, { align: opts?.align === "justify" ? "justify" : "left", maxWidth: w });
  return y + lines.length * (size + 3);
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "____/____/______");
const romano = (n: number) => {
  const r = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX"];
  return r[n - 1] || String(n);
};

export const buildContractPdf = ({ titulo, tipo, vigencia_inicio, vigencia_fim, data, clausulas }: BuildArgs): jsPDF => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ===== CAPA =====
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, H * 0.62, W, H * 0.38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("MULTPLICK", 40, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Educação Profissional e Corporativa", 40, 110);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INSTRUMENTO CONTRATUAL", 40, H * 0.55);

  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const tLines = doc.splitTextToSize(titulo || "Contrato", W - 80);
  doc.text(tLines, 40, H * 0.70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...GRAY);
  doc.text(contractTypeLabel(tipo), 40, H * 0.70 + tLines.length * 26 + 8);

  if (data.contratante_razao) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BLUE);
    doc.text("Partes contratantes", 40, H - 130);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...GRAY);
    doc.text(`${data.contratada_razao || "Multplick"}`, 40, H - 110);
    doc.text(`${data.contratante_razao}`, 40, H - 94);
  }

  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 40, H - 50);

  // ===== PÁGINA 2 — QUALIFICAÇÃO =====
  doc.addPage();
  let y = 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLUE);
  doc.text((titulo || "CONTRATO").toUpperCase(), W / 2, y, { align: "center" });
  y += 10;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1);
  doc.line(W / 2 - 60, y, W / 2 + 60, y);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text("CONTRATADA", 40, y); y += 14;
  y = paragraph(doc,
    `${data.contratada_razao || "MULTPLICK EDUCAÇÃO PROFISSIONAL LTDA."}, inscrita no CNPJ sob o nº ${data.contratada_cnpj || "__.___.___/____-__"}, com sede em ${data.contratada_endereco || "__________"}, ${data.contratada_cidade || "_______"}${data.contratada_uf ? "/" + data.contratada_uf : ""}, neste ato representada por ${data.contratada_representante || "seu representante legal"}${data.contratada_cargo ? ", " + data.contratada_cargo : ""}, doravante denominada simplesmente CONTRATADA.`,
    y, { align: "justify" });
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text("CONTRATANTE", 40, y); y += 14;
  y = paragraph(doc,
    `${data.contratante_razao || "____________________"}, inscrita no CNPJ/CPF sob o nº ${data.contratante_cnpj || "__.___.___/____-__"}, com sede em ${data.contratante_endereco || "__________"}, ${data.contratante_cidade || "_______"}${data.contratante_uf ? "/" + data.contratante_uf : ""}, neste ato representada por ${data.contratante_representante || "seu representante legal"}${data.contratante_cargo ? ", " + data.contratante_cargo : ""}${data.contratante_cpf ? ", CPF nº " + data.contratante_cpf : ""}, doravante denominada CONTRATANTE.`,
    y, { align: "justify" });
  y += 16;

  // Bloco resumo
  doc.setDrawColor(220, 226, 236);
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(40, y, W - 80, 70, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("OBJETO RESUMIDO", 52, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  const objLines = doc.splitTextToSize(data.objeto || contractTypeLabel(tipo), W - 104);
  doc.text(objLines.slice(0, 3), 52, y + 32);
  y += 88;

  // Cláusulas
  y = ensureSpace(doc, y, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLUE);
  doc.text("CLÁUSULAS E CONDIÇÕES", 40, y);
  y += 18;

  clausulas.forEach((c, i) => {
    y = ensureSpace(doc, y, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    const title = `CLÁUSULA ${romano(i + 1)} — ${c.titulo || ""}`.trim();
    doc.text(title, 40, y);
    y += 14;
    y = paragraph(doc, c.texto || "", y, { align: "justify" });
    y += 10;
  });

  // Valor / forma pagamento / etc
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
    y = ensureSpace(doc, y + 6, 100);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BLUE);
    doc.text("CONDIÇÕES PARTICULARES", 40, y);
    y += 14;
    filled.forEach(([k, v]) => {
      y = ensureSpace(doc, y, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BLUE);
      doc.text(`${k}:`, 40, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      const lines = doc.splitTextToSize(v || "", W - 200);
      doc.text(lines, 160, y);
      y += Math.max(14, lines.length * 13);
    });
  }

  if (data.observacoes) {
    y = ensureSpace(doc, y + 10, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BLUE);
    doc.text("OBSERVAÇÕES", 40, y);
    y += 14;
    y = paragraph(doc, data.observacoes, y, { align: "justify" });
  }

  // ===== ASSINATURAS =====
  doc.addPage();
  y = 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLUE);
  doc.text("ASSINATURAS", 40, y);
  y += 24;

  y = paragraph(doc,
    "E por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo identificadas.",
    y, { align: "justify" });
  y += 40;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`${data.contratante_cidade || data.contratada_cidade || "____________"}${(data.contratante_uf || data.contratada_uf) ? "/" + (data.contratante_uf || data.contratada_uf) : ""}, ${new Date().toLocaleDateString("pt-BR")}.`, 40, y);
  y += 60;

  const colW = (W - 80 - 30) / 2;
  const drawSig = (x: number, label1: string, label2: string, withSignature = false) => {
    if (withSignature) {
      try {
        const sigW = 110;
        const sigH = 70;
        doc.addImage(SIGNATURE_PNG, "PNG", x + (colW - sigW) / 2, y - 10, sigW, sigH, undefined, "FAST");
      } catch { /* ignore */ }
    }
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.8);
    doc.line(x, y + 60, x + colW, y + 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
    doc.text(label1, x, y + 76);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const ls = doc.splitTextToSize(label2, colW);
    doc.text(ls, x, y + 90);
  };
  drawSig(40,
    data.contratada_razao || "MULTPLICK",
    `${data.contratada_representante || "Kátia Joaquim"} — ${data.contratada_cargo || "Diretora Comercial"}`,
    true);
  drawSig(40 + colW + 30,
    data.contratante_razao || "CONTRATANTE",
    `${data.contratante_representante || "Representante legal"}${data.contratante_cargo ? " — " + data.contratante_cargo : ""}${data.contratante_cpf ? "\nCPF: " + data.contratante_cpf : ""}`);

  y += 150;
  // Testemunhas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("TESTEMUNHAS", 40, y);
  y += 20;
  const drawWit = (x: number) => {
    doc.setDrawColor(...GRAY);
    doc.line(x, y + 40, x + colW, y + 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("Nome:", x, y + 56);
    doc.text("CPF:", x, y + 70);
  };
  drawWit(40);
  drawWit(40 + colW + 30);

  addFooter(doc);
  return doc;
};