import { jsPDF } from "jspdf";

interface PredictionResult {
  verdict: "spam" | "ham";
  confidence: number;
  keywords: string[];
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
  let yPosition = margin;

  // Set background color (dark theme)
  doc.setFillColor(11, 15, 25); // #0b0f19
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 194, 255); // #00c2ff cyan
  doc.text("Spam Detection Report", margin, yPosition);
  yPosition += 12;

  // Report ID and Generated date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const reportId = `RPT-${Date.now()}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  doc.text(`Report ID: ${reportId}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Generated: ${dateStr}, ${timeStr}`, margin, yPosition);
  yPosition += 10;

  // Score Summary Box with cyan border
  doc.setDrawColor(0, 194, 255); // Cyan border
  doc.setLineWidth(2);
  doc.rect(margin, yPosition, maxWidth, 12, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 194, 255);
  doc.text(`Score: ${riskSummary.score}/100`, margin + 3, yPosition + 8);

  const riskColor = getRiskColor(riskSummary.level);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`Risk Level: ${riskSummary.level.toUpperCase()}`, margin + 50, yPosition + 8);

  doc.setTextColor(0, 194, 255);
  doc.text("Key Indicators", margin + maxWidth - 35, yPosition + 8);

  yPosition += 18;

  // Prediction Result Section
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Prediction Result", margin, yPosition);
  yPosition += 8;

  // Verdict badge
  const verdictText = prediction.verdict.toUpperCase();
  const verdictColor = prediction.verdict === "spam" ? [255, 77, 79] : [76, 175, 80]; // Red for spam, green for ham
  doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.rect(margin, yPosition, 40, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(verdictText, margin + 2, yPosition + 6);

  // Confidence text
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 194, 255);
  doc.text(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, margin + 50, yPosition + 6);
  yPosition += 10;

  // Confidence bar
  const barWidth = maxWidth - 10;
  const barHeight = 4;
  doc.setFillColor(50, 50, 50); // Dark background
  doc.rect(margin + 5, yPosition, barWidth, barHeight, "F");
  const fillWidth = (barWidth * prediction.confidence) / 1;
  doc.setFillColor(0, 194, 255); // Cyan fill
  doc.rect(margin + 5, yPosition, fillWidth, barHeight, "F");
  yPosition += 8;

  // Message Content Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Message Content", margin, yPosition);
  yPosition += 6;

  // Message box with cyan border
  doc.setDrawColor(0, 194, 255);
  doc.setLineWidth(1);
  const messageLines = doc.splitTextToSize(message, maxWidth - 4);
  const messageBoxHeight = Math.max(messageLines.length * 4 + 2, 12);
  doc.rect(margin, yPosition, maxWidth, messageBoxHeight, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(messageLines, margin + 2, yPosition + 4);
  yPosition += messageBoxHeight + 6;

  // Risk Assessment Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Risk Assessment", margin, yPosition);
  yPosition += 6;

  // Risk badge
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.rect(margin, yPosition, 35, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(riskSummary.level.toUpperCase(), margin + 2, yPosition + 5);

  // Risk score
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 194, 255);
  doc.text(`Risk Score: ${riskSummary.score}/100`, margin + 50, yPosition + 5);
  yPosition += 8;

  // Risk description
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const riskLines = doc.splitTextToSize(riskSummary.description, maxWidth);
  doc.text(riskLines, margin, yPosition);
  yPosition += riskLines.length * 4 + 4;

  // Top Keywords Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Top Keywords", margin, yPosition);
  yPosition += 6;

  if (prediction.keywords && prediction.keywords.length > 0) {
    prediction.keywords.slice(0, 5).forEach((keyword, index) => {
      // Extract percentage from keyword string if present
      const percentMatch = keyword.match(/\((\d+)%\)/);
      const percent = percentMatch ? parseInt(percentMatch[1]) : 80 - index * 10;

      // Keyword number and name
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 194, 255);
      const keywordName = keyword.replace(/ \(\d+%\)/, "");
      doc.text(`${index + 1}. ${keywordName}`, margin, yPosition);

      // Progress bar
      const barStartX = margin + 30;
      const barWidth = 40;
      const barHeight = 3;
      doc.setFillColor(50, 50, 50);
      doc.rect(barStartX, yPosition - 2, barWidth, barHeight, "F");
      doc.setFillColor(0, 194, 255);
      doc.rect(barStartX, yPosition - 2, (barWidth * percent) / 100, barHeight, "F");

      // Percentage text
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text(`${percent}%`, barStartX + barWidth + 3, yPosition + 1);

      yPosition += 5;
    });
  }
  yPosition += 4;

  // Personalized Recommendations Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Personalized Recommendations", margin, yPosition);
  yPosition += 6;

  if (recommendations && recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 194, 255);
      doc.text(`${index + 1}. ${rec.title}`, margin, yPosition);
      yPosition += 4;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      const recLines = doc.splitTextToSize(rec.description, maxWidth - 5);
      doc.text(recLines, margin + 3, yPosition);
      yPosition += recLines.length * 3 + 2;
    });
  }

  yPosition += 4;

  // Important Notice Box
  doc.setFillColor(255, 152, 0); // Orange
  doc.rect(margin, yPosition, maxWidth, 18, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Important Notice", margin + 3, yPosition + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const noticeText =
    "This report is generated by AI for informational purposes only. While we strive for high accuracy, no spam detection system is 100% accurate. Always exercise caution with suspicious messages and verify sender information independently.";
  const noticeLines = doc.splitTextToSize(noticeText, maxWidth - 6);
  doc.text(noticeLines, margin + 3, yPosition + 9);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Spam Message Detection System", margin, pageHeight - 5);
  doc.text(`Page 1`, pageWidth - margin - 10, pageHeight - 5);

  // Generate PDF buffer
  return Buffer.from(doc.output("arraybuffer"));
}

function getRiskColor(level: string): [number, number, number] {
  switch (level.toLowerCase()) {
    case "critical":
      return [255, 77, 79]; // Red
    case "high":
      return [255, 152, 0]; // Orange
    case "medium":
      return [255, 193, 7]; // Yellow
    case "low":
      return [76, 175, 80]; // Green
    default:
      return [200, 200, 200]; // Gray
  }
}
