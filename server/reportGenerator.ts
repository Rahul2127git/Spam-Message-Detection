import { jsPDF } from "jspdf";

interface PredictionResult {
  verdict: "spam" | "ham";
  confidence: number;
  keywords: Array<{ word: string; weight: number }>;
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

export async function generateSpamDetectionPDF(
  message: string,
  prediction: PredictionResult,
  riskSummary: RiskSummary,
  recommendations: Recommendation[]
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Set colors
  const darkBg = "#0b0f19";
  const textColor = "#ffffff";
  const accentColor = "#00c2ff";
  const secondaryAccent = "#ff4d4f";

  // Background
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  let yPosition = margin;

  // Header Section
  doc.setTextColor(0, 194, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Spam Detection Report", margin, yPosition);

  yPosition += 8;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Report ID: RPT-${Date.now()}`, margin, yPosition);

  yPosition += 5;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);

  yPosition += 12;

  // Score Summary Box
  doc.setDrawColor(0, 194, 255);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, contentWidth, 20);

  doc.setTextColor(0, 194, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Score: ${riskSummary.score}/100`, margin + 5, yPosition + 8);

  const statusIcon = riskSummary.level === "critical" ? "⚠️" : riskSummary.level === "high" ? "⚠️" : "✓";
  const statusColor =
    riskSummary.level === "critical"
      ? [255, 77, 79]
      : riskSummary.level === "high"
        ? [255, 152, 0]
        : riskSummary.level === "medium"
          ? [255, 193, 7]
          : [76, 175, 80];

  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`${statusIcon} ${riskSummary.level.toUpperCase()}`, margin + 50, yPosition + 8);

  doc.setTextColor(76, 175, 80);
  doc.text(`✓ ${prediction.keywords.length} Key Indicators`, margin + 100, yPosition + 8);

  yPosition += 25;

  // Prediction Result Section
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Prediction Result", margin, yPosition);

  yPosition += 8;

  // Verdict Badge
  const verdictColor = prediction.verdict === "spam" ? [255, 77, 79] : [76, 175, 80];
  doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.rect(margin, yPosition, 40, 10, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(prediction.verdict.toUpperCase(), margin + 5, yPosition + 7);

  // Confidence Score
  doc.setTextColor(0, 194, 255);
  doc.setFontSize(11);
  doc.text(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, margin + 50, yPosition + 7);

  yPosition += 15;

  // Confidence Bar
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPosition, contentWidth, 3);

  const barWidth = (contentWidth * prediction.confidence) / 1;
  const barColor = prediction.verdict === "spam" ? [255, 77, 79] : [76, 175, 80];
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(margin, yPosition, Math.min(barWidth, contentWidth), 3, "F");

  yPosition += 8;

  // Message Content Section
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Message Content", margin, yPosition);

  yPosition += 6;
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const messageLines = doc.splitTextToSize(message, contentWidth - 4);
  const messageHeight = messageLines.length * 4;

  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, yPosition, contentWidth, messageHeight + 4);
  doc.text(messageLines, margin + 2, yPosition + 3);

  yPosition += messageHeight + 8;

  // Risk Assessment Section
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Risk Assessment", margin, yPosition);

  yPosition += 6;

  // Risk Level Box
  const riskBgColor =
    riskSummary.level === "critical"
      ? [255, 77, 79]
      : riskSummary.level === "high"
        ? [255, 152, 0]
        : riskSummary.level === "medium"
          ? [255, 193, 7]
          : [76, 175, 80];

  doc.setFillColor(riskBgColor[0], riskBgColor[1], riskBgColor[2]);
  doc.rect(margin, yPosition, 40, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(riskSummary.level.toUpperCase(), margin + 3, yPosition + 6);

  doc.setTextColor(0, 194, 255);
  doc.setFontSize(10);
  doc.text(`Risk Score: ${riskSummary.score}/100`, margin + 50, yPosition + 6);

  yPosition += 12;

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const riskLines = doc.splitTextToSize(riskSummary.description, contentWidth - 4);
  doc.text(riskLines, margin + 2, yPosition);

  yPosition += riskLines.length * 4 + 5;

  // Check if we need a new page
  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = margin;
  }

  // Top Keywords Section
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Top Keywords", margin, yPosition);

  yPosition += 7;

  prediction.keywords.slice(0, 5).forEach((kw, idx) => {
    const keywordText = `${idx + 1}. ${kw.word}`;
    const weight = (kw.weight * 100).toFixed(0);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.text(keywordText, margin + 5, yPosition);

    // Weight bar
    const barLength = (contentWidth - 60) * kw.weight;
    doc.setFillColor(0, 194, 255);
    doc.rect(margin + 50, yPosition - 2, barLength, 3, "F");

    doc.setTextColor(0, 194, 255);
    doc.setFontSize(8);
    doc.text(`${weight}%`, margin + 50 + barLength + 3, yPosition);

    yPosition += 6;
  });

  yPosition += 5;

  // Personalized Recommendations Section
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Personalized Recommendations", margin, yPosition);

  yPosition += 7;

  recommendations.forEach((rec, idx) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setTextColor(0, 194, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. ${rec.title}`, margin + 5, yPosition);

    yPosition += 5;

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const recLines = doc.splitTextToSize(rec.description, contentWidth - 10);
    doc.text(recLines, margin + 5, yPosition);

    yPosition += recLines.length * 3 + 3;
  });

  yPosition += 8;

  // Disclaimer
  if (yPosition > pageHeight - 20) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setDrawColor(255, 152, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, contentWidth, 15);

  doc.setTextColor(255, 152, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("⚠️ Important Notice", margin + 3, yPosition + 5);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const disclaimerLines = doc.splitTextToSize(
    "This report is generated by AI for informational purposes only. While we strive for high accuracy, no spam detection system is 100% accurate. Always exercise caution with suspicious messages and verify sender information independently.",
    contentWidth - 6
  );
  doc.text(disclaimerLines, margin + 3, yPosition + 9);

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text("Spam Message Detection System", margin, pageHeight - 5);
  doc.text(`Page ${doc.internal.pages.length - 1}`, pageWidth - margin - 10, pageHeight - 5);

  return Buffer.from(doc.output("arraybuffer"));
}
