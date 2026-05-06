import jsPDF from "jspdf";

export interface PitchSection {
  key: string;
  title: string;
  bullets: string[];
}

export interface PitchDeckPdfData {
  title: string;
  category?: string | null;
  sections: PitchSection[];
  authorName?: string;
}

const BRAND = "IDESTRIM";
const SLOGAN = "Share Your Innovation";

function drawWatermark(doc: jsPDF, w: number, h: number) {
  doc.saveGraphicsState();
  // @ts-ignore — jsPDF supports GState for opacity
  doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(110);
  doc.setTextColor(40, 40, 40);
  doc.text(BRAND, w / 2, h / 2, { align: "center", angle: 30 });
  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
}

function drawFooter(doc: jsPDF, w: number, h: number, pageNum: number, total: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(BRAND, 40, h - 20);
  doc.text(`${pageNum} / ${total}`, w - 40, h - 20, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

export function generatePitchDeckPdf(data: PitchDeckPdfData): jsPDF {
  // 16:9 landscape — 960 x 540 pt
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540] });
  const w = 960;
  const h = 540;
  const total = data.sections.length + 1; // cover + sections

  // ---- Cover slide
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, w, h, "F");
  drawWatermark(doc, w, h);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(BRAND, 60, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 200, 230);
  doc.text(SLOGAN, 60, 88);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  const titleLines = doc.splitTextToSize(data.title, w - 120);
  doc.text(titleLines, 60, h / 2 - 10);

  if (data.category) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(160, 200, 250);
    doc.text(data.category, 60, h / 2 + 30 + (titleLines.length - 1) * 46);
  }

  if (data.authorName) {
    doc.setFontSize(12);
    doc.setTextColor(200, 210, 230);
    doc.text(`by ${data.authorName}`, 60, h - 60);
  }
  doc.setTextColor(0, 0, 0);
  drawFooter(doc, w, h, 1, total);

  // ---- Section slides
  data.sections.forEach((section, idx) => {
    doc.addPage([w, h], "landscape");
    // Light bg
    doc.setFillColor(250, 250, 252);
    doc.rect(0, 0, w, h, "F");
    drawWatermark(doc, w, h);

    // Accent bar
    doc.setFillColor(37, 99, 235);
    doc.rect(60, 70, 64, 6, "F");

    // Section title
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.text(section.title, 60, 120);

    // Bullets
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(45, 55, 72);
    let y = 180;
    const maxWidth = w - 120;
    section.bullets.forEach((b) => {
      const text = `•  ${b}`;
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, 60, y);
      y += lines.length * 24 + 8;
      if (y > h - 60) return;
    });

    drawFooter(doc, w, h, idx + 2, total);
  });

  return doc;
}

export function downloadPitchDeckPdf(data: PitchDeckPdfData) {
  const doc = generatePitchDeckPdf(data);
  const safe = data.title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "pitch-deck";
  doc.save(`${safe}.pdf`);
}
