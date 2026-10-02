import jsPDF from "jspdf";
import QRCode from "qrcode";
import { DANCING_SCRIPT_B64 } from "@/lib/corporativo/signatureFont";
import { MULTPLICK_LOGO_B64 } from "@/lib/corporativo/logo";

const NAVY: [number, number, number] = [24, 43, 61];
const GOLD: [number, number, number] = [181, 143, 60];
const GOLD_LIGHT: [number, number, number] = [226, 211, 176];
const INK: [number, number, number] = [48, 52, 57];
const MUTED: [number, number, number] = [103, 105, 108];
const PAPER: [number, number, number] = [252, 250, 245];

export type CertificadoSnapshot = {
  aluno_nome?: string | null;
  aluno_cpf?: string | null;
  curso_titulo?: string | null;
  tipo?: string | null;
  titulo_documento?: string | null;
  carga_horaria_horas?: number | null;
  nota?: number | string | null;
  texto?: string | null;
  empresa?: string | null;
  cnpj?: string | null;
  responsavel_nome?: string | null;
  responsavel_cargo?: string | null;
  assinatura_url?: string | null;
  logo_url?: string | null;
  validacao_base_url?: string | null;
  incluir_historico?: boolean | null;
  incluir_conteudo?: boolean | null;
  conteudo_programatico?: string | null;
  historico_obs?: string | null;
};

export type CertificadoRecord = {
  numero: string;
  codigo_validacao?: string | null;
  emitido_em: string;
  status?: string | null;
  nota_final?: number | null;
  carga_horaria_horas?: number | null;
  snapshot?: CertificadoSnapshot | null;
};

const mascaraCpf = (cpf?: string | null) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : (cpf?.trim() || null);
};

const urlValidacao = (r: CertificadoRecord) => {
  const base = r.snapshot?.validacao_base_url || "https://multplick.live/validar-certificado";
  return `${base.replace(/\/$/, "")}/${r.codigo_validacao ?? ""}`;
};

const drawAcademicFrame = (doc: jsPDF, W: number, H: number) => {
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 20, "F");
  doc.rect(0, H - 20, W, 20, "F");
  doc.rect(0, 0, 20, H, "F");
  doc.rect(W - 20, 0, 20, H, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.rect(29, 29, W - 58, H - 58);
  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.65);
  doc.rect(35, 35, W - 70, H - 70);

  const corner = 30;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2.2);
  [[42, 42, 1, 1], [W - 42, 42, -1, 1], [42, H - 42, 1, -1], [W - 42, H - 42, -1, -1]].forEach(([x, y, sx, sy]) => {
    doc.line(x, y, x + sx * corner, y);
    doc.line(x, y, x, y + sy * corner);
  });
};

const drawSeal = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.circle(x, y, 35, "S");
  doc.setLineWidth(0.6);
  doc.circle(x, y, 29, "S");
  doc.setFont("times", "bold");
  doc.setTextColor(...GOLD);
  doc.setFontSize(8);
  doc.text("MULTPLICK", x, y - 8, { align: "center" });
  doc.setFontSize(17);
  doc.text("M", x, y + 8, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("DOCUMENTO AUTÊNTICO", x, y + 19, { align: "center" });
};

const fitCenteredText = (doc: jsPDF, text: string, maxWidth: number, preferred: number, minimum: number) => {
  let size = preferred;
  doc.setFontSize(size);
  while (size > minimum && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
};

export const buildCertificadoPdf = async (r: CertificadoRecord): Promise<jsPDF> => {
  const s = r.snapshot ?? {};
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ch = r.carga_horaria_horas ?? s.carga_horaria_horas ?? null;
  const dataEmissao = new Date(r.emitido_em).toLocaleDateString("pt-BR");
  const cancelado = r.status === "cancelado";

  drawAcademicFrame(doc, W, H);

  try {
    doc.addImage(MULTPLICK_LOGO_B64, "PNG", W / 2 - 59, 53, 118, 40, undefined, "FAST");
  } catch { /* logo opcional */ }
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text("FORMAÇÃO PROFISSIONAL E EXCELÊNCIA ACADÊMICA", W / 2, 105, { align: "center", charSpace: 1.6 });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 55, 114, W / 2 + 55, 114);

  doc.setFont("times", "bold");
  doc.setFontSize(31);
  doc.setTextColor(...NAVY);
  doc.text((s.titulo_documento || "CERTIFICADO DE CONCLUSÃO").toUpperCase(), W / 2, 155, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text("A Multplick Formação Profissional confere o presente certificado a", W / 2, 180, { align: "center" });

  const aluno = (s.aluno_nome || "").toUpperCase();
  doc.setFont("times", "bold");
  fitCenteredText(doc, aluno, W - 190, 27, 18);
  doc.setTextColor(...NAVY);
  doc.text(aluno, W / 2, 225, { align: "center" });
  const nomeWidth = Math.min(doc.getTextWidth(aluno) + 38, W - 190);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.3);
  doc.line(W / 2 - nomeWidth / 2, 234, W / 2 + nomeWidth / 2, 234);

  const textoBase = (s.texto || "Certificamos que [NOME DO ALUNO] concluiu com aproveitamento o curso [NOME DO CURSO], cumprindo integralmente os requisitos acadêmicos estabelecidos.")
    .replace(/\[NOME DO ALUNO\]/g, s.aluno_nome || "")
    .replace(/\[NOME DO CURSO\]/g, s.curso_titulo || "");
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  const linhas = doc.splitTextToSize(textoBase, W - 205);
  doc.text(linhas, W / 2, 267, { align: "center", lineHeightFactor: 1.35 });

  const detailsY = Math.min(333, 277 + linhas.length * 18);
  const detalhes = [
    ch ? `Carga horária total: ${ch} horas` : null,
    r.nota_final != null ? `Aproveitamento: ${Number(r.nota_final).toFixed(2).replace(".", ",")}` : null,
  ].filter(Boolean).join("  •  ");
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  if (detalhes) doc.text(detalhes, W / 2, detailsY, { align: "center" });

  const signatureY = 421;
  const signatureX = 240;
  let assinaturaDesenhada = false;
  if (s.assinatura_url?.startsWith("data:image")) {
    try {
      doc.addImage(s.assinatura_url, "PNG", signatureX - 65, signatureY - 52, 130, 52, undefined, "FAST");
      assinaturaDesenhada = true;
    } catch { /* assinatura opcional */ }
  }
  if (!assinaturaDesenhada) {
    try {
      doc.addFileToVFS("DancingScript.ttf", DANCING_SCRIPT_B64);
      doc.addFont("DancingScript.ttf", "DancingScript", "normal");
      doc.setFont("DancingScript", "normal");
      doc.setFontSize(26);
      doc.setTextColor(...NAVY);
      doc.text(s.responsavel_nome || "Euclides Joaquim", signatureX, signatureY - 9, { align: "center" });
    } catch { /* fonte opcional */ }
  }
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.55);
  doc.line(signatureX - 102, signatureY + 3, signatureX + 102, signatureY + 3);
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text((s.responsavel_nome || "Euclides Joaquim").toUpperCase(), signatureX, signatureY + 18, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(s.responsavel_cargo || "Diretor Acadêmico", signatureX, signatureY + 31, { align: "center" });

  drawSeal(doc, W / 2, signatureY - 1);

  const alunoSignX = W - 240;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.55);
  doc.line(alunoSignX - 102, signatureY + 3, alunoSignX + 102, signatureY + 3);
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text((s.aluno_nome || "ALUNO(A)").toUpperCase(), alunoSignX, signatureY + 18, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Assinatura do(a) aluno(a)", alunoSignX, signatureY + 31, { align: "center" });
  doc.setFontSize(8);
  doc.text(`Emitido em ${dataEmissao}`, alunoSignX, signatureY + 43, { align: "center" });

  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.5);
  doc.line(62, H - 88, W - 62, H - 88);
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(s.empresa || "Multplick Formação Profissional", 63, H - 70);
  doc.setFont("times", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  const rodape = [s.cnpj ? `CNPJ ${s.cnpj}` : null, `Registro nº ${r.numero}`, mascaraCpf(s.aluno_cpf) ? `CPF ${mascaraCpf(s.aluno_cpf)}` : null].filter(Boolean).join("  •  ");
  doc.text(rodape, 63, H - 56);

  try {
    const qr = await QRCode.toDataURL(urlValidacao(r), { margin: 0, width: 300 });
    doc.addImage(qr, "PNG", W - 112, H - 115, 52, 52, undefined, "FAST");
    doc.setFont("times", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...NAVY);
    doc.text("VALIDAÇÃO DIGITAL", W - 86, H - 57, { align: "center" });
    doc.setFont("courier", "normal");
    doc.setFontSize(6);
    doc.text(r.codigo_validacao ?? "", W - 86, H - 48, { align: "center" });
  } catch { /* QR opcional */ }

  if (cancelado) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(58);
    doc.setTextColor(184, 56, 56);
    doc.text("CANCELADO", W / 2, H / 2, { align: "center", angle: 20 });
  }

  const temHist = !!s.incluir_historico;
  const conteudo = (s.incluir_conteudo ? (s.conteudo_programatico || "") : "").trim();
  if (temHist || conteudo) {
    doc.addPage("a4", "landscape");
    drawAcademicFrame(doc, W, H);
    const margem = 58;
    const contentTop = 76;
    const contentBottom = H - 54;
    const leftWidth = temHist && conteudo ? 222 : W - margem * 2;
    const contentX = temHist && conteudo ? margem + 250 : margem;
    const contentWidth = temHist && conteudo ? W - contentX - margem : W - margem * 2;

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(temHist && conteudo ? "REGISTRO ACADÊMICO" : temHist ? "HISTÓRICO ACADÊMICO" : "CONTEÚDO PROGRAMÁTICO", margem, 59);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(margem, 66, W - margem, 66);

    if (temHist) {
      if (conteudo) {
        doc.setFillColor(246, 243, 236);
        doc.roundedRect(margem, contentTop, leftWidth, contentBottom - contentTop, 3, 3, "F");
      }
      const x = margem + (conteudo ? 18 : 0);
      let y = contentTop + (conteudo ? 24 : 4);
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...NAVY);
      doc.text("DADOS DO CERTIFICADO", x, y);
      y += 25;
      const itens: [string, string][] = [
        ["Aluno", s.aluno_nome || "—"], ["CPF", mascaraCpf(s.aluno_cpf) || "—"],
        ["Curso", s.curso_titulo || "—"], ["Carga horária", ch ? `${ch} horas` : "—"],
        ["Nota final", r.nota_final != null ? Number(r.nota_final).toFixed(2).replace(".", ",") : "—"],
        ["Situação", cancelado ? "Cancelado" : "Aprovado"], ["Emissão", dataEmissao], ["Registro", r.numero],
      ];
      const valueWidth = conteudo ? leftWidth - 36 : W - margem * 2;
      itens.forEach(([label, value]) => {
        doc.setFont("times", "bold"); doc.setFontSize(8); doc.setTextColor(...GOLD);
        doc.text(label.toUpperCase(), x, y);
        doc.setFont("times", "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
        const valueLines = doc.splitTextToSize(value, valueWidth);
        doc.text(valueLines, x, y + 12, { lineHeightFactor: 1.15 });
        y += 29 + Math.max(0, valueLines.length - 1) * 10;
      });
      if (s.historico_obs && y < contentBottom - 25) {
        doc.setFont("times", "italic"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
        doc.text(doc.splitTextToSize(s.historico_obs, valueWidth), x, y + 4, { lineHeightFactor: 1.2 });
      }
    }

    if (conteudo) {
      let yy = contentTop + 3;
      doc.setFont("times", "bold"); doc.setFontSize(13); doc.setTextColor(...NAVY);
      doc.text("CONTEÚDO PROGRAMÁTICO", contentX, yy + 11);
      yy += 30;
      const linhas2 = doc.splitTextToSize(conteudo, contentWidth);
      const fs = linhas2.length > 45 ? 8 : linhas2.length > 30 ? 9 : 10;
      const lh = fs * 1.34;
      doc.setFont("times", "normal"); doc.setFontSize(fs); doc.setTextColor(...INK);
      for (const linha of linhas2) {
        if (yy > contentBottom - 14) {
          doc.addPage("a4", "landscape");
          drawAcademicFrame(doc, W, H);
          yy = 60;
          doc.setFont("times", "normal"); doc.setFontSize(fs); doc.setTextColor(...INK);
        }
        doc.text(linha, contentX, yy);
        yy += lh;
      }
    }

    doc.setFont("times", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Documento vinculado ao certificado nº ${r.numero} • Valide pelo código ${r.codigo_validacao ?? "—"}`, W / 2, H - 34, { align: "center" });
  }

  return doc;
};

export const baixarCertificadoPdf = async (r: CertificadoRecord) => {
  const doc = await buildCertificadoPdf(r);
  doc.save(`certificado-${r.numero}.pdf`);
};