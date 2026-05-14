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
  darkGray: [50, 50, 50],
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

function drawCircularGauge(
  doc: jsPDF,
  x: number,
  y: number,
  radius: number,
  score: number,
  maxScore: number = 100
): void {
  const percentage = score / maxScore;

  // Background circle
  doc.setFillColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
  doc.circle(x, y, radius, "F");

  // Outer border
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(1);
  doc.circle(x, y, radius, "S");

  // Draw arc for score (simplified - draw red arc for high scores, green for low)
  const arcColor = score > 70 ? COLORS.red : score > 40 ? COLORS.orange : COLORS.green;
  doc.setDrawColor(arcColor[0], arcColor[1], arcColor[2]);
  doc.setLineWidth(3);

  // Draw arc (simplified as multiple short lines)
  const startAngle = -90;
  const endAngle = startAngle + percentage * 360;
  const steps = Math.ceil(percentage * 360);

  for (let i = 0; i < steps; i++) {
    const angle1 = (startAngle + (i / steps) * percentage * 360) * (Math.PI / 180);
    const angle2 = (startAngle + ((i + 1) / steps) * percentage * 360) * (Math.PI / 180);

    const x1 = x + radius * Math.cos(angle1);
    const y1 = y + radius * Math.sin(angle1);
    const x2 = x + radius * Math.cos(angle2);
    const y2 = y + radius * Math.sin(angle2);

    doc.line(x1, y1, x2, y2);
  }

  // Center text
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text(String(Math.round(score)), x, y + 2, { align: "center" });

  // Denominator
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`/${maxScore}`, x, y + 8, { align: "center" });

  // Status label
  const statusColor = score > 70 ? COLORS.red : score > 40 ? COLORS.orange : COLORS.green;
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const statusText = score > 70 ? "At Risk" : score > 40 ? "Caution" : "Safe";
  doc.text(statusText, x, y + radius + 8, { align: "center" });
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
  recommendations: Recommendation[],
  skipTrendProjection: boolean = false
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
  doc.text(`Report ID: ${reportId} · Generated: ${dateStr}`, margin, yPosition);
  yPosition += 8;

  // Score Summary Bar
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(1.5);
  doc.rect(margin, yPosition, maxWidth, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2]);
  doc.text(`Score ${riskSummary.score}/100`, margin + 3, yPosition + 9);

  const spamCount = Math.round((riskSummary.score / 100) * 7);
  const hamCount = 7 - spamCount;
  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.setFontSize(9);
  doc.text(`& ${spamCount} flagged indicators`, 80, yPosition + 9);

  doc.setTextColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
  doc.text(`' ${hamCount} within normal range`, pageWidth - margin - 50, yPosition + 9);

  yPosition += 20;

  // Two-column layout: Score gauge (left) + Clinical Summary (right)
  const gaugeX = margin + 25;
  const gaugeY = yPosition + 20;
  const gaugeRadius = 15;

  // Draw circular gauge
  drawCircularGauge(doc, gaugeX, gaugeY, gaugeRadius, riskSummary.score, 100);

  // Clinical Summary (right side)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Detection Summary", gaugeX + 35, yPosition);
  yPosition += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  const summaryLines = doc.splitTextToSize(riskSummary.description, maxWidth - 50);
  doc.text(summaryLines, gaugeX + 35, yPosition);

  yPosition = gaugeY + gaugeRadius + 15;

  // Feature Analysis Table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Feature Analysis", margin, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.text("Signal Indicators", margin, yPosition);
  yPosition += 4;

  // Table header
  doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition - 2, maxWidth, 6, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
  doc.text("Feature", margin + 2, yPosition + 2);
  doc.text("Value", margin + 40, yPosition + 2);
  doc.text("Status", margin + 70, yPosition + 2);
  doc.text("Visual", margin + 90, yPosition + 2);

  yPosition += 8;

  // Table rows - show keywords as features
  doc.setFontSize(7);
  prediction.keywords.slice(0, 5).forEach((kw, index) => {
    const keyword = typeof kw === "string" ? kw : kw.word || "";
    const weight = typeof kw === "string" ? 0.8 : kw.weight || 0.8;

    // Feature name
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFont("helvetica", "normal");
    doc.text(keyword, margin + 2, yPosition);

    // Value
    doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.text(`${(weight * 100).toFixed(0)}%`, margin + 40, yPosition);

    // Status
    const statusColor = weight > 0.7 ? COLORS.red : weight > 0.4 ? COLORS.orange : COLORS.green;
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFont("helvetica", "bold");
    const statusText = weight > 0.7 ? "High" : weight > 0.4 ? "Medium" : "Low";
    doc.text(statusText, margin + 70, yPosition);

    // Visual bar
    doc.setFillColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
    doc.rect(margin + 90, yPosition - 1.5, 15, 2, "F");
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(margin + 90, yPosition - 1.5, 15 * weight, 2, "F");

    yPosition += 4;
  });

  yPosition += 4;

  // Risk Assessment Cards (2-column layout)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Risk Assessment", margin, yPosition);
  yPosition += 6;

  // Left card: Spam Risk
  const cardWidth = (maxWidth - 3) / 2;
  const cardHeight = 18;
  const cardX1 = margin;
  const cardX2 = margin + cardWidth + 3;

  // Left card background
  doc.setFillColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
  doc.rect(cardX1, yPosition, cardWidth, cardHeight, "F");
  doc.setDrawColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.setLineWidth(1);
  doc.rect(cardX1, yPosition, cardWidth, cardHeight, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.text("& Spam Risk", cardX1 + 2, yPosition + 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  doc.text("Risk Level", cardX1 + 2, yPosition + 9);

  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`${riskSummary.score}%`, cardX1 + 2, yPosition + 13);

  // Right card: Detection Confidence
  doc.setFillColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
  doc.rect(cardX2, yPosition, cardWidth, cardHeight, "F");
  doc.setDrawColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
  doc.setLineWidth(1);
  doc.rect(cardX2, yPosition, cardWidth, cardHeight, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
  doc.text("' Confidence", cardX2 + 2, yPosition + 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  doc.text("Safe Level", cardX2 + 2, yPosition + 9);

  doc.setTextColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(prediction.confidence * 100)}%`, cardX2 + 2, yPosition + 13);

  yPosition += cardHeight + 6;

  addPageFooter(doc, currentPage, totalPages);

  // PAGE 2: TREND & RECOMMENDATIONS
  doc.addPage();
  doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  addPageHeader(doc, 2);

  yPosition = contentStartY + 5;
  currentPage = 2;

  if (!skipTrendProjection) {
        // Trend Projection (simplified visualization)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      doc.text("Detection Trend Projection", margin, yPosition);
      yPosition += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
      doc.text("5-point timeline generated from extracted indicators", margin, yPosition);
      yPosition += 8;

      // Draw simplified line chart
      const chartX = margin + 5;
      const chartY = yPosition;
      const chartWidth = maxWidth - 10;
      const chartHeight = 20;

      // Chart background
      doc.setFillColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
      doc.rect(chartX, chartY, chartWidth, chartHeight, "F");
      doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
      doc.setLineWidth(0.5);
      doc.rect(chartX, chartY, chartWidth, chartHeight, "S");

      // Draw trend line (simulated)
      doc.setDrawColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
      doc.setLineWidth(1);
      const points = 5;
      const xStep = chartWidth / (points - 1);
      const baseY = chartY + chartHeight - 3;

      for (let i = 0; i < points - 1; i++) {
        const x1 = chartX + i * xStep;
        const y1 = baseY - (riskSummary.score / 100) * (chartHeight - 6);
        const x2 = chartX + (i + 1) * xStep;
        const y2 = baseY - (riskSummary.score / 100) * (chartHeight - 6) + (Math.random() - 0.5) * 3;
        doc.line(x1, y1, x2, y2);

        // Draw point
        doc.setFillColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
        doc.circle(x1, y1, 1, "F");
      }

      // Draw last point
      doc.setFillColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
      doc.circle(chartX + (points - 1) * xStep, baseY - (riskSummary.score / 100) * (chartHeight - 6), 1, "F");

      // X-axis labels
      doc.setFontSize(7);
      doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
      const months = ["Jan", "Feb", "Mar", "Apr", "May"];
      for (let i = 0; i < points; i++) {
        const x = chartX + i * xStep;
        doc.text(months[i], x - 2, chartY + chartHeight + 3);
      }

  yPosition += chartHeight + 12;
  }

  // Personalized Action Plan
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.text("Personalized Action Plan", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(8);
  let actionIndex = 0;
  for (const rec of recommendations) {
    if (yPosition > contentEndY - 20) break;

    // Number badge
    doc.setFillColor(COLORS.cyan[0], COLORS.cyan[1], COLORS.cyan[2]);
    doc.rect(margin, yPosition - 2, 5, 5, "F");
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`${actionIndex + 1}`, margin + 1.5, yPosition + 1);

    // Action text
    doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const actionLines = doc.splitTextToSize(rec.description, maxWidth - 10);
    doc.text(actionLines[0], margin + 8, yPosition + 1);

    yPosition += 5;
    actionIndex++;
  }

  yPosition += 4;

  // Medical Disclaimer (adapted for spam detection)
  doc.setFillColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2]);
  doc.rect(margin, yPosition, maxWidth, 14, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text("⚠ Spam Detection Disclaimer:", margin + 3, yPosition + 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const disclaimerText =
    "This report is generated by AI for demonstration purposes only and does not constitute professional spam filtering advice. Always consult qualified cybersecurity professionals for critical decisions.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, maxWidth - 6);
  disclaimerLines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, margin + 3, yPosition + 9 + i * 3);
  });

  addPageFooter(doc, currentPage, totalPages);

  // Generate PDF buffer
  return Buffer.from(doc.output("arraybuffer"));
}
