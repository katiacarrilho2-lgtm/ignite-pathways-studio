import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoUrl from "@/assets/multplick-logo.png";

type Attachment = { kind: string; title: string; url: string; mime?: string };
type Lesson = {
  id: string;
  title: string;
  lesson_type: "video" | "text" | "quiz" | "flip" | "accordion";
  content: any;
};
type Section = { id: string; title: string; lessons: Lesson[] };
type Course = { title: string; category?: string | null; slug?: string };

const A4 = { w: 595.28, h: 841.89 }; // pt
const MARGIN = { top: 70, bottom: 50, left: 40, right: 40 };
const CONTENT_W_PX = 720; // off-screen container width in CSS px

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apostila";

const loadImageDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
};

const renderBlockToCanvas = async (html: string): Promise<HTMLCanvasElement> => {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-99999px;top:0;width:${CONTENT_W_PX}px;background:#fff;color:#0f172a;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;padding:0;`;
  wrapper.innerHTML = `<div class="apostila-block">${html}</div>`;
  document.body.appendChild(wrapper);
  // basic prose-ish styles
  const style = document.createElement("style");
  style.textContent = `
    .apostila-block h1{font-size:24px;font-weight:700;color:#1e3a8a;margin:0 0 12px}
    .apostila-block h2{font-size:20px;font-weight:700;color:#1e3a8a;margin:16px 0 8px}
    .apostila-block h3{font-size:17px;font-weight:600;color:#1e3a8a;margin:12px 0 6px}
    .apostila-block p{margin:0 0 10px}
    .apostila-block ul,.apostila-block ol{margin:0 0 10px 22px}
    .apostila-block li{margin:0 0 4px}
    .apostila-block img{max-width:100%;height:auto;border-radius:6px;margin:8px 0}
    .apostila-block a{color:#1d4ed8;text-decoration:underline}
    .apostila-block blockquote{border-left:3px solid #cbd5e1;padding-left:10px;color:#475569;margin:0 0 10px}
    .apostila-block table{border-collapse:collapse;width:100%;margin:8px 0}
    .apostila-block th,.apostila-block td{border:1px solid #cbd5e1;padding:6px}
    .apostila-card{border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin:0 0 8px;background:#f8fafc}
    .apostila-card .label{font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.05em;margin-bottom:4px}
    .apostila-q{margin:0 0 10px}
    .apostila-q .qnum{font-weight:600;color:#0f172a}
    .apostila-q ol{list-style:lower-alpha;margin:4px 0 0 22px}
    .apostila-sectionTitle{font-size:22px;font-weight:800;color:#1e3a8a;border-bottom:2px solid #1e3a8a;padding-bottom:6px;margin:0 0 12px}
    .apostila-lessonTitle{font-size:18px;font-weight:700;color:#0f172a;margin:14px 0 6px}
    .apostila-attach{font-size:12px;color:#475569;margin:2px 0}
  `;
  wrapper.prepend(style);

  // Wait for images
  const imgs = Array.from(wrapper.querySelectorAll("img"));
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = () => res(null); })));

  const canvas = await html2canvas(wrapper, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  document.body.removeChild(wrapper);
  return canvas;
};

const attachmentsHtml = (atts?: Attachment[]) => {
  if (!atts?.length) return "";
  const items = atts.map(a => {
    const icon = a.kind === "video_link" ? "▶" : a.kind === "file" ? "📄" : "🔗";
    return `<div class="apostila-attach">${icon} <strong>${escapeHtml(a.title)}</strong> — ${escapeHtml(a.url)}</div>`;
  }).join("");
  return `<div style="margin-top:6px;padding:8px 10px;background:#f1f5f9;border-radius:6px"><div class="label" style="font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:4px">Materiais</div>${items}</div>`;
};

type Gabarito = { lessonTitle: string; questions: { q: string; correct: string; why?: string }[] };
export type ApostilaMode = "aluno" | "professor";

const teacherNotesHtml = (lesson: Lesson) => {
  const notes: string[] = lesson.content?.teacher_notes ?? [];
  if (!notes.length) return "";
  return `<div class="apostila-card" style="background:#eff6ff;border-color:#93c5fd"><div class="label">Orientações do professor</div><ul>${notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul></div>`;
};

const lessonHtml = (lesson: Lesson, gabaritoCollector: Gabarito[], mode: ApostilaMode = "aluno"): string => {
  const atts: Attachment[] = lesson.content?.attachments ?? [];
  const title = `<div class="apostila-lessonTitle">${escapeHtml(lesson.title)}</div>`;
  let body = "";
  switch (lesson.lesson_type) {
    case "text":
      body = lesson.content?.html ?? "<p><em>(sem conteúdo)</em></p>";
      break;
    case "video": {
      const yt = lesson.content?.youtube;
      body = yt?.url
        ? `<p><em>Aula em vídeo:</em> ${escapeHtml(yt.title ?? "assista no portal")} — ${escapeHtml(yt.url)}</p>`
        : `<p><em>Aula em vídeo. Assista no portal.</em></p>`;
      break;
    }
    case "flip": {
      const items: { front: string; back: string }[] = lesson.content?.items ?? [];
      body = items.map((it, i) =>
        `<div class="apostila-card"><div class="label">Cartão ${i + 1} · Frente</div><div>${escapeHtml(it.front)}</div><div class="label" style="margin-top:6px">Verso</div><div>${escapeHtml(it.back)}</div></div>`
      ).join("");
      break;
    }
    case "accordion": {
      const items: { title: string; body: string }[] = lesson.content?.items ?? [];
      body = items.map(it =>
        `<div class="apostila-card"><div style="font-weight:600;margin-bottom:4px">${escapeHtml(it.title)}</div><div>${escapeHtml(it.body).replace(/\n/g, "<br>")}</div></div>`
      ).join("");
      break;
    }
    case "quiz": {
      const questions: { question: string; options: string[]; correct: number; explanation?: string }[] = lesson.content?.questions ?? [];
      body = questions.map((q, i) => {
        const opts = q.options.map(o => `<li>${escapeHtml(o)}</li>`).join("");
        const inline = mode === "professor"
          ? `<div style="color:#15803d;font-size:12px;margin-top:4px">Resposta: ${escapeHtml(String.fromCharCode(97 + (q.correct ?? 0)) + ") " + (q.options[q.correct] ?? ""))}${q.explanation ? ` — ${escapeHtml(q.explanation)}` : ""}</div>`
          : "";
        return `<div class="apostila-q"><div class="qnum">${i + 1}. ${escapeHtml(q.question)}</div><ol>${opts}</ol>${inline}</div>`;
      }).join("");
      gabaritoCollector.push({
        lessonTitle: lesson.title,
        questions: questions.map(q => ({
          q: q.question,
          correct: String.fromCharCode(97 + (q.correct ?? 0)) + ") " + (q.options[q.correct] ?? ""),
          why: q.explanation,
        })),
      });
      break;
    }
  }
  const notes = mode === "professor" ? teacherNotesHtml(lesson) : "";
  return title + body + notes + attachmentsHtml(atts);
};


export const generateApostila = async (
  course: Course,
  sections: Section[],
  studentName?: string | null,
  mode: ApostilaMode = "aluno"
) => {
  const isProf = mode === "professor";
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const logo = await loadImageDataUrl(logoUrl);

  // Collect gabarito as we render
  const gabarito: Gabarito[] = [];

  // ---- Cover (page 1) ----
  if (logo) {
    const w = 180, h = 70;
    pdf.addImage(logo, "PNG", (A4.w - w) / 2, 160, w, h, undefined, "FAST");
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(30, 58, 138);
  pdf.text(isProf ? "GUIA DO PROFESSOR" : "APOSTILA DO CURSO", A4.w / 2, 290, { align: "center" });
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(course.title, A4.w - 100);
  pdf.text(titleLines, A4.w / 2, 340, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(100, 116, 139);
  if (course.category) pdf.text(course.category, A4.w / 2, 380, { align: "center" });
  if (isProf) pdf.text("Material de uso exclusivo do instrutor", A4.w / 2, 410, { align: "center" });
  if (studentName && !isProf) pdf.text(`Aluno(a): ${studentName}`, A4.w / 2, 500, { align: "center" });
  pdf.text(`Gerada em ${new Date().toLocaleDateString("pt-BR")}`, A4.w / 2, 520, { align: "center" });


  // ---- Content pages ----
  const contentW = A4.w - MARGIN.left - MARGIN.right;
  const contentH = A4.h - MARGIN.top - MARGIN.bottom;

  const addBlockCanvas = async (canvas: HTMLCanvasElement) => {
    const ratio = canvas.height / canvas.width;
    const drawW = contentW;
    const drawH = drawW * ratio;

    if (drawH <= contentH) {
      pdf.addPage();
      pdf.addImage(canvas, "PNG", MARGIN.left, MARGIN.top, drawW, drawH, undefined, "FAST");
      return;
    }

    // Slice tall canvases across pages
    const pxPerPt = canvas.width / drawW;
    const sliceHpx = Math.floor(contentH * pxPerPt);
    let offset = 0;
    while (offset < canvas.height) {
      const sh = Math.min(sliceHpx, canvas.height - offset);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sh;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, offset, canvas.width, sh, 0, 0, canvas.width, sh);
      pdf.addPage();
      pdf.addImage(slice, "PNG", MARGIN.left, MARGIN.top, drawW, sh / pxPerPt, undefined, "FAST");
      offset += sh;
    }
  };

  for (const section of sections) {
    let html = `<div class="apostila-sectionTitle">${escapeHtml(section.title)}</div>`;
    for (const lesson of section.lessons) {
      html += lessonHtml(lesson, gabarito);
    }
    const canvas = await renderBlockToCanvas(html);
    await addBlockCanvas(canvas);
  }

  // ---- Gabarito ----
  if (gabarito.length) {
    let html = `<div class="apostila-sectionTitle">Gabarito dos Quizzes</div>`;
    gabarito.forEach(g => {
      html += `<div class="apostila-lessonTitle">${escapeHtml(g.lessonTitle)}</div>`;
      html += g.questions.map((q, i) => `<div style="margin:4px 0"><strong>${i + 1}.</strong> ${escapeHtml(q.q)}<br><span style="color:#15803d">Resposta: ${escapeHtml(q.correct)}</span></div>`).join("");
    });
    const canvas = await renderBlockToCanvas(html);
    await addBlockCanvas(canvas);
  }

  // ---- Header / footer / watermark on every page ----
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);

    // Watermark (skip cover)
    if (p > 1) {
      pdf.saveGraphicsState();
      // @ts-ignore - GState exists at runtime
      pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }));
      if (logo) {
        const w = 400, h = 155;
        pdf.addImage(logo, "PNG", (A4.w - w) / 2, (A4.h - h) / 2, w, h, undefined, "FAST");
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(90);
        pdf.setTextColor(30, 58, 138);
        pdf.text("MULTPLICK", A4.w / 2, A4.h / 2, { align: "center", angle: -30 });
      }
      pdf.restoreGraphicsState();

      // Header
      if (logo) pdf.addImage(logo, "PNG", MARGIN.left, 25, 90, 32, undefined, "FAST");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(course.title, A4.w - MARGIN.right, 45, { align: "right" });
      pdf.setDrawColor(226, 232, 240);
      pdf.line(MARGIN.left, 62, A4.w - MARGIN.right, 62);
    }

    // Footer
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text("multplick.live", MARGIN.left, A4.h - 25);
    pdf.text(`Página ${p} de ${total}`, A4.w - MARGIN.right, A4.h - 25, { align: "right" });
  }

  const filename = `apostila-${slugify(course.slug || course.title)}.pdf`;
  pdf.save(filename);
};