import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProposalData, proposalTypeLabel } from "./types";
import { DANCING_SCRIPT_B64 } from "./signatureFont";
import { SIGNATURE_PNG } from "./signatureImage";
import { MULTPLICK_LOGO_B64, MULTPLICK_LOGO_W, MULTPLICK_LOGO_H } from "./logo";
import type { CompanySettings } from "./company";
import { DEFAULT_COMPANY, formatProposalLocalDate } from "./company";

const BLUE: [number, number, number] = [15, 56, 113];
const BLUE_LIGHT: [number, number, number] = [37, 99, 175];
const GRAY: [number, number, number] = [90, 95, 105];
const LIGHT: [number, number, number] = [235, 240, 248];
const GOLD: [number, number, number] = [196, 162, 86];

interface BuildArgs {
  titulo: string;
  tipo: string;
  validade_dias: number;
  data: ProposalData;
  numero?: string;
  /** quando false, oculta comissões/afiliados (versão para cliente) */
  incluir_comissoes?: boolean;
  /** assinatura manuscrita */
  assinatura_nome?: string;
  assinatura_cargo?: string;
  /** dados institucionais da Multplick (cabeçalho, rodapé, local de assinatura) */
  company?: CompanySettings;
  /** override do local/data exibido na assinatura (ex.: "São José do Rio Preto/SP, 12 de junho de 2026") */
  local_data_assinatura?: string;
}

let _fontRegistered = false;
const registerSignatureFont = (doc: jsPDF) => {
  if (_fontRegistered) {
    try { doc.setFont("DancingScript", "normal"); return; } catch { _fontRegistered = false; }
  }
  doc.addFileToVFS("DancingScript.ttf", DANCING_SCRIPT_B64);
  doc.addFont("DancingScript.ttf", "DancingScript", "normal");
  _fontRegistered = true;
};

// ====== LOGO / MARCA ======
/**
 * Desenha o logo oficial Multplick (com fallback tipográfico se a imagem falhar).
 * `targetW` = largura desejada em pontos. A altura é calculada mantendo proporção.
 * `topY` = topo do bloco (não baseline).
 */
const drawLogo = (doc: jsPDF, x: number, topY: number, targetW: number) => {
  const ratio = MULTPLICK_LOGO_H / MULTPLICK_LOGO_W;
  const h = targetW * ratio;
  try {
    doc.addImage(MULTPLICK_LOGO_B64, "PNG", x, topY, targetW, h, undefined, "FAST");
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(targetW * 0.18);
    doc.setTextColor(...BLUE);
    doc.text("Multplick", x, topY + h * 0.7);
  }
  return h;
};

const addHeaderFooter = (doc: jsPDF, numero: string | undefined, company: CompanySettings) => {
  const footerLine1Parts = [
    company.razao_social || company.nome_fantasia || "Multplick",
    company.cnpj ? `CNPJ ${company.cnpj}` : null,
    [company.cidade, company.uf].filter(Boolean).join("/"),
  ].filter(Boolean) as string[];
  const footerLine2Parts = [
    company.telefone,
    company.whatsapp ? `WhatsApp ${company.whatsapp}` : null,
    company.email,
    company.site,
  ].filter(Boolean) as string[];
  const footerLine3Parts = [
    company.instagram ? `Instagram ${company.instagram}` : null,
    company.facebook ? `Facebook ${company.facebook}` : null,
    company.linkedin ? `LinkedIn ${company.linkedin}` : null,
  ].filter(Boolean) as string[];

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    // pular capa
    if (i > 1) {
      drawLogo(doc, 40, 18, 65);
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(0.4);
      doc.line(40, 54, w - 40, 54);
      if (numero) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...BLUE);
        doc.text(`Proposta nº ${numero}`, w - 40, 32, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.text(new Date().toLocaleDateString("pt-BR"), w - 40, 44, { align: "right" });
      }
    }
    // footer institucional
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.6);
    doc.line(40, h - 56, w - 40, h - 56);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    let fy = h - 44;
    if (footerLine1Parts.length) { doc.text(footerLine1Parts.join("  •  "), 40, fy); fy += 9; }
    if (footerLine2Parts.length) { doc.text(footerLine2Parts.join("  •  "), 40, fy); fy += 9; }
    if (footerLine3Parts.length) { doc.text(footerLine3Parts.join("  •  "), 40, fy); }
    doc.text(`${i} / ${pages}`, w - 40, h - 22, { align: "right" });
  }
};

const sectionTitle = (doc: jsPDF, text: string, y: number): number => {
  doc.setFillColor(...BLUE);
  doc.rect(40, y, 6, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLUE);
  doc.text(text.toUpperCase(), 52, y + 11);
  return y + 24;
};

const paragraph = (doc: jsPDF, text: string, y: number, opts?: { size?: number; color?: [number, number, number] }): number => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(opts?.size ?? 10.5);
  doc.setTextColor(...(opts?.color ?? [40, 45, 55]));
  const w = doc.internal.pageSize.getWidth() - 80;
  const lines = doc.splitTextToSize(text || "", w);
  doc.text(lines, 40, y);
  return y + lines.length * (opts?.size ? opts.size + 3 : 13.5);
};

const ensureSpace = (doc: jsPDF, y: number, need = 80): number => {
  const h = doc.internal.pageSize.getHeight();
  if (y + need > h - 60) { doc.addPage(); return 70; }
  return y;
};

export const buildProposalPdf = ({
  titulo, tipo, validade_dias, data, numero,
  incluir_comissoes = true,
  assinatura_nome = "Kátia Joaquim",
  assinatura_cargo = "Diretora Comercial — Multplick",
  company,
  local_data_assinatura,
}: BuildArgs): jsPDF => {
  const comp: CompanySettings = { ...DEFAULT_COMPANY, ...(company || {}) };
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  registerSignatureFont(doc);

  // ============ CAPA ============
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, H, "F");

  // Gradiente decorativo simulado por barras
  for (let i = 0; i < 12; i++) {
    const alpha = 1 - i / 14;
    doc.setFillColor(Math.round(15 + i * 5), Math.round(56 + i * 6), Math.round(113 + i * 4));
    doc.rect(0, i * 6, W, 6, "F");
  }

  // faixa dourada
  doc.setFillColor(...GOLD);
  doc.rect(0, H * 0.58, W, 4, "F");

  // bloco branco inferior
  doc.setFillColor(255, 255, 255);
  doc.rect(0, H * 0.62, W, H * 0.38, "F");

  // logo grande no topo — caixa branca para garantir contraste sobre o azul
  const logoW = 220;
  const logoH = logoW * (MULTPLICK_LOGO_H / MULTPLICK_LOGO_W);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(40, 60, logoW + 32, logoH + 28, 8, 8, "F");
  drawLogo(doc, 56, 74, logoW);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("PROPOSTA COMERCIAL", 40, H * 0.50, { charSpace: 2 });

  if (numero) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD);
    doc.text(`Nº ${numero}`, 40, H * 0.50 + 16);
  }

  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const tLines = doc.splitTextToSize(titulo || "Proposta", W - 80);
  doc.text(tLines, 40, H * 0.70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...GRAY);
  doc.text(proposalTypeLabel(tipo), 40, H * 0.70 + tLines.length * 28 + 8);

  if (data.razao_social) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text("PREPARADA PARA", 40, H - 140);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(40, 45, 55);
    doc.text(data.razao_social, 40, H - 122);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...GRAY);
    if (data.contato_nome) doc.text(`${data.contato_nome}${data.contato_cargo ? " — " + data.contato_cargo : ""}`, 40, H - 106);
    if (data.cidade) doc.text(`${data.cidade}${data.uf ? "/" + data.uf : ""}`, 40, H - 92);
  }

  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY);
  doc.text(`Emitida em ${new Date().toLocaleDateString("pt-BR")}  •  Válida por ${validade_dias} dias`, 40, H - 50);

  // ============ PÁGINA 2+ ============
  doc.addPage();
  let y = 70;
  y = sectionTitle(doc, "Apresentação Multplick", y);
  y = paragraph(doc, data.apresentacao || "A Multplick é especialista em educação profissional e capacitação corporativa, com soluções modulares para empresas, indústrias, instituições públicas e parceiros licenciados. Atuamos nas modalidades EAD, ao vivo, híbrida e in company, com cursos técnicos, profissionalizantes, graduação, pós-graduação, EJA e treinamentos especializados.", y);

  y = ensureSpace(doc, y + 12, 160);
  y = sectionTitle(doc, "Dados do Cliente", y);
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 6, textColor: [40, 45, 55] },
    columnStyles: { 0: { fontStyle: "bold", textColor: BLUE, cellWidth: 140 } },
    body: [
      ["Razão Social", data.razao_social || "—"],
      ["Nome Fantasia", data.nome_fantasia || "—"],
      ["CNPJ/CPF", data.cnpj_cpf || "—"],
      ["Cidade/UF", `${data.cidade || "—"}${data.uf ? " / " + data.uf : ""}`],
      ["Contato", `${data.contato_nome || "—"}${data.contato_cargo ? " (" + data.contato_cargo + ")" : ""}`],
      ["E-mail", data.contato_email || "—"],
      ["Telefone", data.contato_telefone || "—"],
      ["Colaboradores", data.colaboradores ? String(data.colaboradores) : "—"],
      ["Modalidade", data.modalidade || "—"],
    ],
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 24;

  if (data.diagnostico) {
    y = ensureSpace(doc, y, 80);
    y = sectionTitle(doc, "Diagnóstico", y);
    y = paragraph(doc, data.diagnostico, y);
    y += 12;
  }

  if (data.beneficios?.length) {
    y = ensureSpace(doc, y, 80);
    y = sectionTitle(doc, "Benefícios", y);
    for (const b of data.beneficios) {
      y = ensureSpace(doc, y, 24);
      doc.setFillColor(...BLUE);
      doc.circle(46, y - 3, 2.5, "F");
      y = paragraph(doc, b, y, { size: 10.5 });
      y += 2;
    }
    y += 8;
  }

  if (data.cursos_recomendados?.length) {
    y = ensureSpace(doc, y, 100);
    y = sectionTitle(doc, "Cursos Recomendados", y);
    autoTable(doc, {
      startY: y,
      head: [["#", "Curso"]],
      body: data.cursos_recomendados.map((c, i) => [String(i + 1), c]),
      theme: "striped",
      headStyles: { fillColor: BLUE, textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { cellWidth: 36, halign: "center" } },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  if (data.cronograma?.length) {
    y = ensureSpace(doc, y, 100);
    y = sectionTitle(doc, "Cronograma Sugerido", y);
    autoTable(doc, {
      startY: y,
      head: [["Etapa", "Atividade"]],
      body: data.cronograma.map((c, i) => [`Etapa ${i + 1}`, c]),
      theme: "grid",
      headStyles: { fillColor: BLUE, textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      columnStyles: { 0: { cellWidth: 90, fontStyle: "bold" } },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // ============ Plano / Comissões — só na versão interna ============
  if (incluir_comissoes) {
    const planoRows: [string, string][] = [];
    if (data.plano_licenciamento) planoRows.push(["Licenciamento", data.plano_licenciamento]);
    if (data.plano_revenda) planoRows.push(["Revenda", data.plano_revenda]);
    if (data.comissao_afiliado) planoRows.push(["Comissão Afiliado", data.comissao_afiliado]);
    if (data.comissao_pj) planoRows.push(["Comissão Vendedor PJ", data.comissao_pj]);
    if (planoRows.length) {
      y = ensureSpace(doc, y, 100);
      y = sectionTitle(doc, "Plano de Parceria / Comissionamento (Uso Interno)", y);
      autoTable(doc, {
        startY: y,
        body: planoRows,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: { 0: { fontStyle: "bold", textColor: BLUE, cellWidth: 160 } },
      });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 24;
    }
  }

  // ============ Investimento ============
  y = ensureSpace(doc, y, 140);
  y = sectionTitle(doc, "Investimento", y);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(40, y, W - 80, 80, 8, 8, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(40, y, 40, y + 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BLUE);
  doc.text(data.investimento_texto || "A combinar", 56, y + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(data.condicoes || "Condições comerciais a definir em contrato.", 56, y + 58, { maxWidth: W - 112 });
  y += 100;

  if (data.observacoes) {
    y = ensureSpace(doc, y, 80);
    y = sectionTitle(doc, "Observações", y);
    y = paragraph(doc, data.observacoes, y);
    y += 12;
  }

  // ============ Validade ============
  y = ensureSpace(doc, y, 60);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Esta proposta é válida por ${validade_dias} dias a partir da data de emissão.`, 40, y);

  // ============ Assinaturas (com manuscrita) ============
  doc.addPage();
  y = 90;
  y = sectionTitle(doc, "Aceite e Assinatura", y);
  y = paragraph(doc, "As partes abaixo declaram concordância com os termos descritos nesta proposta comercial, comprometendo-se à formalização do contrato correspondente.", y);
  y += 60;

  const colW = (W - 80 - 30) / 2;

  // === MULTPLICK (assinatura manuscrita) ===
  // assinatura PNG sobre a linha
  try {
    const sigW = 110;
    const sigH = 70;
    doc.addImage(SIGNATURE_PNG, "PNG", 40 + (colW - sigW) / 2, y - 10, sigW, sigH, undefined, "FAST");
  } catch {
    doc.setFont("DancingScript", "normal");
    doc.setFontSize(32);
    doc.setTextColor(20, 30, 80);
    doc.text(assinatura_nome, 40 + 12, y + 50);
  }

  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.8);
  doc.line(40, y + 60, 40 + colW, y + 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(assinatura_nome, 40, y + 76);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(assinatura_cargo, 40, y + 90);

  // === CLIENTE (linha vazia) ===
  const xC = 40 + colW + 30;
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.8);
  doc.line(xC, y + 60, xC + colW, y + 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(data.razao_social || "Cliente", xC, y + 76);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`${data.contato_nome || "Responsável"}${data.contato_cargo ? " — " + data.contato_cargo : ""}`, xC, y + 90);

  y += 140;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const localData = local_data_assinatura || formatProposalLocalDate(comp);
  doc.text(`${localData}.`, 40, y);

  addHeaderFooter(doc, numero, comp);
  return doc;
};
