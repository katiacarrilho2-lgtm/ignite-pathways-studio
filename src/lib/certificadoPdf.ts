import jsPDF from "jspdf";
import QRCode from "qrcode";
import { DANCING_SCRIPT_B64 } from "@/lib/corporativo/signatureFont";
import { MULTPLICK_LOGO_B64 } from "@/lib/corporativo/logo";

const NAVY: [number, number, number] = [12, 35, 74];
const BLUE: [number, number, number] = [23, 84, 166];
const GRAY: [number, number, number] = [95, 102, 115];
const GOLD: [number, number, number] = [186, 148, 62];

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
  return d.length === 11 ? `***.***.***-${d.slice(-2)}` : null;
};

const urlValidacao = (r: CertificadoRecord) => {
  const base = r.snapshot?.validacao_base_url || "https://multplick.live/validar-certificado";
  return `${base.replace(/\/$/, "")}/${r.codigo_validacao ?? ""}`;
};

export const buildCertificadoPdf = async (r: CertificadoRecord): Promise<jsPDF> => {
  const s = r.snapshot ?? {};
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Fundo e molduras
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 14, "F");
  doc.rect(0, H - 14, W, 14, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.rect(26, 26, W - 52, H - 52);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.rect(33, 33, W - 66, H - 66);

  // Logo
  try {
    doc.addImage(MULTPLICK_LOGO_B64, "PNG", W / 2 - 62, 48, 124, 42, undefined, "FAST");
  } catch { /* ignore */ }

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text((s.titulo_documento || "CERTIFICADO").toUpperCase(), W / 2, 122, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(W / 2 - 70, 132, W / 2 + 70, 132);

  // Nome do aluno
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...BLUE);
  doc.text(s.aluno_nome || "", W / 2, 172, { align: "center", maxWidth: W - 160 });

  // Texto
  const texto = (s.texto || "")
    .replace(/\[NOME DO ALUNO\]/g, s.aluno_nome || "")
    .replace(/\[NOME DO CURSO\]/g, s.curso_titulo || "");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12.5);
  doc.setTextColor(60, 66, 78);
  const linhas = doc.splitTextToSize(texto, W - 220);
  doc.text(linhas, W / 2, 205, { align: "center" });

  let y = 205 + linhas.length * 17 + 12;

  // Detalhes
  const detalhes: string[] = [];
  const ch = r.carga_horaria_horas ?? s.carga_horaria_horas ?? null;
  if (ch) detalhes.push(`Carga horária: ${ch} horas`);
  if (r.nota_final != null) detalhes.push(`Nota final: ${Number(r.nota_final).toFixed(2).replace(".", ",")}`);
  detalhes.push(`Emitido em ${new Date(r.emitido_em).toLocaleDateString("pt-BR")}`);
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  doc.text(detalhes.join("   •   "), W / 2, y, { align: "center" });
  y += 8;

  // Assinatura
  const sigY = H - 175;
  const sigX = W / 2;
  let assinaturaDesenhada = false;
  if (s.assinatura_url && s.assinatura_url.startsWith("data:image")) {
    try {
      doc.addImage(s.assinatura_url, "PNG", sigX - 70, sigY - 52, 140, 56, undefined, "FAST");
      assinaturaDesenhada = true;
    } catch { /* ignore */ }
  }
  if (!assinaturaDesenhada) {
    try {
      doc.addFileToVFS("DancingScript.ttf", DANCING_SCRIPT_B64);
      doc.addFont("DancingScript.ttf", "DancingScript", "normal");
      doc.setFont("DancingScript", "normal");
      doc.setFontSize(30);
      doc.setTextColor(...NAVY);
      doc.text(s.responsavel_nome || "Euclides Joaquim", sigX, sigY - 8, { align: "center" });
    } catch { /* ignore */ }
  }
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.7);
  doc.line(sigX - 110, sigY + 6, sigX + 110, sigY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text((s.responsavel_nome || "Euclides Joaquim").toUpperCase(), sigX, sigY + 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.setFontSize(9.5);
  doc.text(s.responsavel_cargo || "Coordenador", sigX, sigY + 35, { align: "center" });

  // Rodapé institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(s.empresa || "Multplick Formação Profissional", 60, H - 96);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  if (s.cnpj) doc.text(`CNPJ ${s.cnpj}`, 60, H - 83);
  doc.text(`Certificado nº ${r.numero}`, 60, H - 70);
  const cpfMask = mascaraCpf(s.aluno_cpf);
  if (cpfMask) doc.text(`CPF ${cpfMask}`, 60, H - 57);

  // QR Code
  try {
    const url = urlValidacao(r);
    const qr = await QRCode.toDataURL(url, { margin: 0, width: 300 });
    doc.addImage(qr, "PNG", W - 140, H - 152, 76, 76, undefined, "FAST");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Validação online", W - 102, H - 65, { align: "center" });
    doc.text(r.codigo_validacao ?? "", W - 102, H - 54, { align: "center" });
  } catch { /* ignore */ }

  if ((r.status ?? "ativo") !== "ativo") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.setTextColor(200, 60, 60);
    doc.text("CANCELADO", W / 2, H / 2, { align: "center", angle: 20 });
  }

  return doc;
};

export const baixarCertificadoPdf = async (r: CertificadoRecord) => {
  const doc = await buildCertificadoPdf(r);
  doc.save(`certificado-${r.numero}.pdf`);
};
