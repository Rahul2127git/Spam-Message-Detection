import jsPDF from "jspdf";

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

  // Set default font to helvetica (better UTF-8 support)
  doc.setFont("helvetica");

  // Set colors
  const darkBg = [11, 15, 25];
  const textColor = [255, 255, 255];
  const accentColor = [0, 194, 255];
  const secondaryAccent = [255, 77, 79];
  const warningColor = [255, 152, 0];

  // Background
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  let yPosition = margin;

  // Header Section
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Spam Detection Report", margin, yPosition);
  yPosition += 12;

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Report ID: RPT-${Date.now()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 10;

  // Score Summary Box
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(1);
  doc.rect(margin, yPosition, contentWidth, 20);

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Score: ${riskSummary.score}/100`, margin + 5, yPosition + 8);

  doc.setTextColor(warningColor[0], warningColor[1], warningColor[2]);
  doc.text(`Risk Level: ${riskSummary.level.toUpperCase()}`, margin + 50, yPosition + 8);

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text("Key Indicators", margin + 100, yPosition + 8);

  yPosition += 25;

  // Prediction Result Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Prediction Result", margin, yPosition);
  yPosition += 8;

  // Verdict Badge
  const verdictColor = prediction.verdict === "spam" ? secondaryAccent : [76, 175, 80];
  doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.rect(margin, yPosition, 40, 10, "F");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(prediction.verdict.toUpperCase(), margin + 3, yPosition + 7);

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, margin + 50, yPosition + 7);

  yPosition += 15;

  // Confidence Bar
  const barWidth = contentWidth - 20;
  const barHeight = 6;
  doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
  doc.rect(margin, yPosition, barWidth, barHeight);

  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  const filledWidth = (barWidth * prediction.confidence) / 1;
  doc.rect(margin, yPosition, filledWidth, barHeight, "F");

  yPosition += 12;

  // Message Content Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Message Content", margin, yPosition);
  yPosition += 6;

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, yPosition, contentWidth, 20);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const messageLines = doc.splitTextToSize(message.substring(0, 200), contentWidth - 4);
  doc.text(messageLines, margin + 2, yPosition + 3);

  yPosition += 25;

  // Risk Assessment Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Risk Assessment", margin, yPosition);
  yPosition += 6;

  // Risk Badge
  doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.rect(margin, yPosition, 30, 8, "F");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(riskSummary.level.toUpperCase(), margin + 2, yPosition + 5.5);

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Risk Score: ${riskSummary.score}/100`, margin + 35, yPosition + 5.5);

  yPosition += 10;

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(9);
  const riskLines = doc.splitTextToSize(riskSummary.description, contentWidth);
  doc.text(riskLines, margin, yPosition);
  yPosition += riskLines.length * 4 + 5;

  // Top Keywords Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Top Keywords", margin, yPosition);
  yPosition += 6;

  prediction.keywords.slice(0, 5).forEach((kw, index) => {
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${index + 1}. ${kw.word}`, margin + 2, yPosition);

    // Keyword weight bar
    const keywordBarWidth = 60;
    doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
    doc.rect(margin + 25, yPosition - 2, keywordBarWidth, 3);

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    const keywordFilledWidth = keywordBarWidth * kw.weight;
    doc.rect(margin + 25, yPosition - 2, keywordFilledWidth, 3, "F");

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(8);
    doc.text(`${(kw.weight * 100).toFixed(0)}%`, margin + 90, yPosition);

    yPosition += 5;
  });

  yPosition += 5;

  // Personalized Recommendations Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Personalized Recommendations", margin, yPosition);
  yPosition += 6;

  recommendations.slice(0, 4).forEach((rec, index) => {
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${rec.title}`, margin + 2, yPosition);
    yPosition += 4;

    doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const recLines = doc.splitTextToSize(rec.description, contentWidth - 4);
    doc.text(recLines, margin + 4, yPosition);
    yPosition += recLines.length * 3 + 2;
  });

  yPosition += 5;

  // Important Notice Section
  doc.setFillColor(warningColor[0], warningColor[1], warningColor[2]);
  doc.rect(margin, yPosition, contentWidth, 25, "F");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Important Notice", margin + 3, yPosition + 4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const disclaimerLines = doc.splitTextToSize(
    "This report is generated by AI for informational purposes only. While we strive for high accuracy, no spam detection system is 100% accurate. Always exercise caution with suspicious messages and verify sender information independently.",
    contentWidth - 6
  );
  doc.text(disclaimerLines, margin + 3, yPosition + 8);

  // Footer
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8);
  doc.text("Spam Message Detection System", margin, pageHeight - 5);
  doc.text(`Page 1`, pageWidth - margin - 10, pageHeight - 5);

  return Buffer.from(doc.output("arraybuffer"));
}
