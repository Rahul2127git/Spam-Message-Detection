import { Router } from "express";
import { generateSpamDetectionPDF } from "./reportGenerator";

export const reportRouter = Router();



export interface PredictionResult {
  verdict: "spam" | "ham";
  confidence: number;
  keywords: string[];
}

interface ReportRequest {
  message: string;
  prediction: {
    verdict: "spam" | "ham";
    confidence: number;
    keywords: Array<{ word: string; weight: number }>;
  };
  riskSummary: {
    level: "critical" | "high" | "medium" | "low";
    score: number;
    description: string;
  };
  recommendations: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

reportRouter.post("/generate-report", async (req, res) => {
  try {
    const { message, prediction, riskSummary, recommendations } = req.body as ReportRequest;

    if (!message || !prediction || !riskSummary || !recommendations) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert keywords array to string array
    const keywordsArray = prediction.keywords.map((k) => `${k.word} (${Math.round(k.weight * 100)}%)`);
    const pdfBuffer = generateSpamDetectionPDF(
      message,
      { ...prediction, keywords: keywordsArray },
      riskSummary,
      recommendations
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="spam-detection-report-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});
