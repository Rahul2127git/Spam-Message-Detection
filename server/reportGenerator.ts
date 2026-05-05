import { jsPDF } from "jspdf";

interface PredictionResult {
  verdict: "spam" | "ham";
  confidence: number;
  keywords: Array<string | { word: string; weight?: number }>;
}

interface RiskSummary {
  level: "critical" | "high" | "medium" | "low";
  score: number;
  description: string;
}

interface Recommendation {
  title: string;
  description: string;
  icon: string;
}

const COLORS: { [key: string]: [number, number, number] } = {
  dark: [11, 15, 25],
  white: [255, 255, 255],
  cyan: [0, 194, 255],
  red: [255, 77, 79],
  green: [76, 175, 80],
  orange: [255, 152, 0],
  gray: [100, 100, 100],
  lightGray: [200, 200, 200],
};

function getRiskColor(level: string): [number, number, number] {
  switch (level.toLowerCase()) {
    case "critical":
      return [255, 77, 79];
    case "high":
      return [255, 152, 0];
    case "medium":
      return [255, 152, 0];
    case "low":
      return [76, 175, 80];
    default:
      return [200, 200, 200];
  }
}

function addPageHeader(doc: jsPDF, pageNum: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Top border
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(2);
  doc.line(margin, 8, pageWidth - margin, 8);
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Bottom border
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

  // Footer text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
  doc.text("Spam Message Detection System", margin, pageHeight - 3);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 3, { align: "right" });
}

export function generateSpamDetectionPDF(
  message: string,
  prediction: PredictionResult,
  riskSummary: RiskSummary,
  recommendations: Recommendation[]
): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  const contentStartY = 15;
  const contentEndY = pageHeight - 10;
  let yPosition = contentStartY;
  let currentPage = 1;
  const totalPages = 2;

  // Set background color (dark theme)
  doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // PAGE 1: HEADER & SUMMARY
  addPageHeader(doc, currentPage);
  yPosition = contentStartY + 5;

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.text("Spam Detection Report", margin, yPosition);
  yPosition += 10;

  // Report ID and Generated date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  const reportId = `RPT-${Date.now()}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US");
  const timeStr = now.toLocaleTimeString("en-US");
  doc.text(`Report ID: ${reportId}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Generated: ${dateStr}, ${timeStr}`, margin, yPosition);
  yPosition += 8;

  // Score Summary Box
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(1.5);
  doc.rect(margin, yPosition, maxWidth, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.text(`Score: ${riskSummary.score}/100`, margin + 3, yPosition + 9);

  const riskColor = getRiskColor(riskSummary.level);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`Risk Level: ${riskSummary.level.toUpperCase()}`, 80, yPosition + 9);

  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.text("Key Indicators", pageWidth - margin - 35, yPosition + 9);

  yPosition += 20;

  // Prediction Result
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Prediction Result", margin, yPosition);
  yPosition += 6;

  // Verdict badge
  const verdictColor = prediction.verdict === "spam" ? COLORS.red : COLORS.green;
  doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.rect(margin, yPosition - 3, 30, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text(prediction.verdict.toUpperCase(), margin + 2, yPosition + 1);

  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, margin + 40, yPosition + 1);
  yPosition += 8;

  // Confidence bar
  const barWidth = maxWidth - 10;
  const barHeight = 3;
  doc.setFillColor(50, 50, 50);
  doc.rect(margin, yPosition, barWidth, barHeight, "F");
  doc.setFillColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.rect(margin, yPosition, barWidth * prediction.confidence, barHeight, "F");
  yPosition += 7;

  // Message Content Section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Message Content", margin, yPosition);
  yPosition += 5;

  // Message box
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(1);
  const messageLines = doc.splitTextToSize(message, maxWidth - 4);
  const maxMessageLines = 12;
  const messageBoxHeight = Math.min(maxMessageLines * 3.5 + 3, 50);
  doc.rect(margin, yPosition, maxWidth, messageBoxHeight, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);

  let msgY = yPosition + 2;
  messageLines.slice(0, maxMessageLines).forEach((line: string) => {
    if (msgY < yPosition + messageBoxHeight - 2) {
      doc.text(line, margin + 2, msgY);
      msgY += 3.5;
    }
  });

  if (messageLines.length > maxMessageLines) {
    doc.text("... (message truncated)", margin + 2, msgY);
  }

  yPosition += messageBoxHeight + 6;

  // Risk Assessment
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Risk Assessment", margin, yPosition);
  yPosition += 5;

  // Risk badge
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.rect(margin, yPosition - 2, 28, 6, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text(riskSummary.level.toUpperCase(), margin + 2, yPosition + 1);

  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Risk Score: ${riskSummary.score}/100`, margin + 35, yPosition + 1);
  yPosition += 7;

  // Risk description
  doc.setFontSize(8);
  doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  const riskLines = doc.splitTextToSize(riskSummary.description, maxWidth);
  doc.text(riskLines, margin, yPosition);
  yPosition += riskLines.length * 3.5 + 2;

  // Add page footer
  addPageFooter(doc, currentPage, totalPages);

  // PAGE 2: ANALYSIS RESULTS & RECOMMENDATIONS
  doc.addPage();
  doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  addPageHeader(doc, 2);

  yPosition = contentStartY + 5;
  currentPage = 2;

  // Analysis Results
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Analysis Results", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.text(`• Verdict: ${prediction.verdict.toUpperCase()}`, margin, yPosition);
  yPosition += 4;
  doc.text(`• Confidence Score: ${(prediction.confidence * 100).toFixed(1)}%`, margin, yPosition);
  yPosition += 4;
  doc.text(`• Risk Level: ${riskSummary.level.toUpperCase()}`, margin, yPosition);
  yPosition += 4;
  doc.text(`• Overall Risk Score: ${riskSummary.score}/100`, margin, yPosition);
  yPosition += 8;

  // Parameter Interpretation
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Parameter Interpretation", margin, yPosition);
  yPosition += 6;

  const parameters = [
    { name: "Confidence Score", value: `${(prediction.confidence * 100).toFixed(1)}%`, desc: "Certainty of prediction" },
    { name: "Risk Level", value: riskSummary.level.toUpperCase(), desc: "Severity assessment" },
    { name: "Message Type", value: prediction.verdict.toUpperCase(), desc: "Classification result" },
  ];

  doc.setFontSize(8);
  parameters.forEach((param: any) => {
    doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${param.name}:`, margin, yPosition);
    doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.setFont("helvetica", "normal");
    doc.text(`${param.value} - ${param.desc}`, margin + 50, yPosition);
    yPosition += 4;
  });

  yPosition += 4;

  // Top Keywords
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Top Keywords Detected", margin, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  prediction.keywords.slice(0, 5).forEach((kw, index) => {
    const keyword = typeof kw === "string" ? kw : kw.word || "";
    const weight = typeof kw === "string" ? 0.8 : kw.weight || 0.8;

    doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.setFont("helvetica", "normal");
    doc.text(`${index + 1}. ${keyword}`, margin, yPosition);

    // Progress bar
    const barX = margin + 50;
    const barWidth = 40;
    doc.setFillColor(50, 50, 50);
    doc.rect(barX, yPosition - 2, barWidth, 2, "F");
    doc.setFillColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.rect(barX, yPosition - 2, barWidth * weight, 2, "F");

    doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.text(`${(weight * 100).toFixed(0)}%`, barX + barWidth + 3, yPosition);

    yPosition += 4;
  });

  yPosition += 6;

  // Personalized Recommendations
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Personalized Recommendations", margin, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  let recIndex = 0;
  for (const rec of recommendations) {
    // Draw recommendation box
    doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.setLineWidth(0.5);
    const recHeight = 12;
    doc.rect(margin, yPosition, maxWidth, recHeight, "S");

    // Number badge
    doc.setFillColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.rect(margin, yPosition, 5, 5, "F");
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${recIndex + 1}`, margin + 1, yPosition + 3.5);

    // Title
    doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.setFont("helvetica", "bold");
    doc.text(rec.title, margin + 8, yPosition + 3.5);

    // Description
    doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(rec.description, maxWidth - 10);
    if (descLines.length > 0) {
      doc.text(descLines[0], margin + 8, yPosition + 8);
    }

    yPosition += recHeight + 2;
    recIndex++;

    if (yPosition > contentEndY - 15) {
      break;
    }
  }

  yPosition += 4;

  // Important Notice
  doc.setFillColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2]);
  doc.rect(margin, yPosition, maxWidth, 16, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text("⚠ Important Notice", margin + 3, yPosition + 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const noticeText =
    "This report is generated by an AI-powered spam detection system. While highly accurate, it may not be 100% perfect. Always use your judgment before taking action based on this analysis.";
  const noticeLines = doc.splitTextToSize(noticeText, maxWidth - 6);
  noticeLines.forEach((line: string, i: number) => {
    if (i < 2) {
      doc.text(line, margin + 3, yPosition + 9 + i * 3.5);
    }
  });

  addPageFooter(doc, currentPage, totalPages);

  // Generate PDF buffer
  return Buffer.from(doc.output("arraybuffer"));
}
