import jsPDF from "jspdf";
import { SIGNATURE_PNG } from "@/lib/corporativo/signatureImage";

const BLUE: [number, number, number] = [15, 56, 113];
const GRAY: [number, number, number] = [90, 95, 105];
const TEXT: [number, number, number] = [40, 45, 55];

export interface StudentContractInput {
  // Aluno
  full_name: string;
  cpf?: string | null;
  rg?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  // Curso
  course_title: string;
  course_workload?: string | null;
  course_modality?: string | null;
  // Combo (opcional): quando preenchido, a cláusula 1 lista todos os cursos.
  combo_items?: Array<{ title: string; modality?: string | null; workload?: string | null }> | null;
  // Acordo financeiro
  valor_total: string;          // "R$ 1.200,00"
  entrada?: string | null;
  parcelas?: string | null;     // "12x"
  valor_parcela?: string | null;
  primeiro_vencimento?: string | null; // dd/mm/aaaa
  forma_pagamento?: string | null;
  data_inicio?: string | null;
  data_termino?: string | null;
  // Extras
  observacoes?: string | null;
  // Escola
  escola_razao: string;
  escola_cnpj?: string | null;
  escola_endereco?: string | null;
  escola_cidade?: string | null;
  escola_uf?: string | null;
  representante_nome: string;
  representante_cargo: string;
}

const paragraph = (doc: jsPDF, text: string, y: number, opts?: { size?: number; bold?: boolean; align?: "justify" | "left"; color?: [number, number, number] }) => {
  const size = opts?.size ?? 10.5;
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...(opts?.color ?? TEXT));
  const w = doc.internal.pageSize.getWidth() - 80;
  const lines = doc.splitTextToSize(text || "", w);
  doc.text(lines, 40, y, { align: opts?.align ?? "left", maxWidth: w });
  return y + lines.length * (size + 3);
};

const ensure = (doc: jsPDF, y: number, need = 80) => {
  const h = doc.internal.pageSize.getHeight();
  if (y + need > h - 60) { doc.addPage(); return 60; }
  return y;
};

const addFooter = (doc: jsPDF, escola: string) => {
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
    doc.text(escola, 40, h - 22);
    doc.text(`${i} / ${pages}`, w - 40, h - 22, { align: "right" });
  }
};

export const buildStudentContractPdf = (d: StudentContractInput): jsPDF => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("pt-BR");

  // ===== Cabeçalho =====
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MULTPLICK", 40, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Educação Profissional e Corporativa", 40, 54);
  doc.setFontSize(9);
  doc.text(today, W - 40, 36, { align: "right" });

  let y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLUE);
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS", 40, y, { maxWidth: W - 80 });
  y += 26;

  // ===== Partes =====
  y = paragraph(doc, "Pelo presente instrumento particular, de um lado:", y, { align: "justify" });
  y += 6;
  y = paragraph(doc,
    `CONTRATADA: ${d.escola_razao}${d.escola_cnpj ? ", inscrita no CNPJ sob o nº " + d.escola_cnpj : ""}${d.escola_endereco ? ", com sede em " + d.escola_endereco : ""}${d.escola_cidade ? ", " + d.escola_cidade : ""}${d.escola_uf ? "/" + d.escola_uf : ""}, neste ato representada por ${d.representante_nome}, ${d.representante_cargo}.`,
    y, { align: "justify" });
  y += 6;
  y = paragraph(doc,
    `CONTRATANTE (ALUNO): ${d.full_name}${d.cpf ? ", CPF nº " + d.cpf : ""}${d.rg ? ", RG nº " + d.rg : ""}${d.address ? ", residente em " + d.address : ""}${d.city ? ", " + d.city : ""}${d.state ? "/" + d.state : ""}${d.phone ? ", telefone " + d.phone : ""}${d.email ? ", e-mail " + d.email : ""}.`,
    y, { align: "justify" });
  y += 12;
  y = paragraph(doc, "Têm entre si justo e contratado o que segue:", y);
  y += 10;

  // ===== Cláusulas =====
  const clausula = (titulo: string, texto: string) => {
    y = ensure(doc, y, 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(titulo, 40, y);
    y += 14;
    y = paragraph(doc, texto, y, { align: "justify" });
    y += 8;
  };

  {
    const combo = (d.combo_items ?? []).filter(i => i && i.title && i.title.trim());
    if (combo.length > 0) {
      const descricaoItem = (it: { title: string; modality?: string | null; workload?: string | null }) => {
        const isT = /t[eé]cnic/i.test(it.title || "");
        const m = (it.modality || "").toLowerCase();
        const reg = m.includes("compet") ? "regime por competência"
          : m.includes("regular") ? "regime regular" : null;
        const trechoReg = isT && reg ? ` — curso técnico em ${reg}` : (reg ? ` — ${reg}` : "");
        const trechoCh = it.workload ? ` (carga horária: ${it.workload})` : "";
        return `• ${it.title}${trechoReg}${trechoCh}`;
      };
      const intro = `O presente contrato tem por objeto a prestação, pela CONTRATADA, dos serviços educacionais referentes ao COMBO de cursos abaixo, todos ofertados na modalidade EAD (Educação a Distância), conforme proposta pedagógica, conteúdo programático e cronograma divulgados pela CONTRATADA:`;
      clausula("CLÁUSULA 1ª — DO OBJETO (COMBO)", intro + "\n\n" + combo.map(descricaoItem).join("\n"));
    } else {
    const isTecnico = /t[eé]cnic/i.test(d.course_title || "");
    const modLower = (d.course_modality || "").toLowerCase();
    const regime =
      modLower.includes("compet") ? "regime por competência"
      : modLower.includes("regular") ? "regime regular"
      : null;
    const tecnicoTrecho = isTecnico && regime
      ? `, na modalidade curso técnico em ${regime}`
      : (regime ? `, em ${regime}` : "");
    const cargaTrecho = d.course_workload ? `, com carga horária de ${d.course_workload}` : "";
    clausula(
      "CLÁUSULA 1ª — DO OBJETO",
      `O presente contrato tem por objeto a prestação, pela CONTRATADA, dos serviços educacionais referentes ao curso "${d.course_title}"${tecnicoTrecho}${cargaTrecho}, ofertado na modalidade EAD (Educação a Distância), conforme proposta pedagógica, conteúdo programático e cronograma divulgados pela CONTRATADA.`,
    );
    }
  }

  if (d.data_inicio || d.data_termino) {
    clausula(
      "CLÁUSULA 2ª — DA VIGÊNCIA",
      `Os serviços terão início em ${d.data_inicio || "____/____/______"} e término previsto em ${d.data_termino || "____/____/______"}, podendo ser prorrogados conforme cronograma do curso.`,
    );
  }

  // Pagamento
  const partes: string[] = [];
  partes.push(`O valor total dos serviços é de ${d.valor_total}.`);
  if (d.entrada) partes.push(`Será paga entrada de ${d.entrada}.`);
  if (d.parcelas && d.valor_parcela) partes.push(`O saldo será dividido em ${d.parcelas} de ${d.valor_parcela}.`);
  else if (d.parcelas) partes.push(`Parcelamento: ${d.parcelas}.`);
  if (d.primeiro_vencimento) partes.push(`Primeiro vencimento em ${d.primeiro_vencimento}, e os demais nas mesmas datas dos meses subsequentes.`);
  if (d.forma_pagamento) partes.push(`Forma de pagamento: ${d.forma_pagamento}.`);
  partes.push("O atraso superior a 30 (trinta) dias autoriza a CONTRATADA a suspender o acesso do aluno até a regularização, sem prejuízo da cobrança dos valores devidos, acrescidos de juros de 1% ao mês e multa de 2%.");

  clausula("CLÁUSULA 3ª — DO ACORDO DE PAGAMENTO", partes.join(" "));

  clausula(
    "CLÁUSULA 4ª — DAS OBRIGAÇÕES DA CONTRATADA",
    "A CONTRATADA compromete-se a oferecer o conteúdo do curso conforme programa divulgado, disponibilizar material e/ou plataforma de estudo, emitir certificado ao aluno aprovado e prestar suporte pedagógico durante a vigência do curso.",
  );

  clausula(
    "CLÁUSULA 5ª — DAS OBRIGAÇÕES DO ALUNO",
    "O ALUNO obriga-se a frequentar as atividades, cumprir as avaliações, respeitar o regimento interno e efetuar pontualmente os pagamentos pactuados, bem como manter atualizados seus dados cadastrais e de contato.",
  );

  clausula(
    "CLÁUSULA 6ª — DA RESCISÃO",
    "O contrato poderá ser rescindido por iniciativa de qualquer das partes mediante comunicação prévia por escrito. Em caso de desistência do aluno, ficam devidos os valores correspondentes aos serviços efetivamente prestados até a data da rescisão, sem direito a restituição dos valores já pagos pelo período usufruído.",
  );

  clausula(
    "CLÁUSULA 7ª — DO FORO",
    `Fica eleito o foro da comarca de ${d.escola_cidade || "__________"}${d.escola_uf ? "/" + d.escola_uf : ""} para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.`,
  );

  if (d.observacoes && d.observacoes.trim()) {
    clausula("CLÁUSULA 8ª — DISPOSIÇÕES ADICIONAIS", d.observacoes.trim());
  }

  // ===== Assinaturas =====
  y = ensure(doc, y + 10, 220);
  y = paragraph(doc,
    "E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma.",
    y, { align: "justify" });
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`${d.escola_cidade || d.city || "____________"}${(d.escola_uf || d.state) ? "/" + (d.escola_uf || d.state) : ""}, ${today}.`, 40, y);
  y += 50;

  const colW = (W - 80 - 30) / 2;
  // CONTRATADA (já assinada)
  try {
    doc.addImage(SIGNATURE_PNG, "PNG", 40 + (colW - 110) / 2, y - 10, 110, 70, undefined, "FAST");
  } catch { /* ignore */ }
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.8);
  doc.line(40, y + 60, 40 + colW, y + 60);
  doc.line(40 + colW + 30, y + 60, 40 + colW + 30 + colW, y + 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(d.escola_razao, 40, y + 76, { maxWidth: colW });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`${d.representante_nome} — ${d.representante_cargo}`, 40, y + 90, { maxWidth: colW });
  doc.text("CONTRATADA", 40, y + 104);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE);
  doc.text(d.full_name, 40 + colW + 30, y + 76, { maxWidth: colW });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  if (d.cpf) doc.text(`CPF: ${d.cpf}`, 40 + colW + 30, y + 90);
  doc.text("CONTRATANTE (ALUNO)", 40 + colW + 30, y + 104);

  addFooter(doc, d.escola_razao);
  return doc;
};