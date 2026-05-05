import { describe, expect, it } from "vitest";
import { generateSpamDetectionPDF } from "./reportGenerator";

describe("PDF Report Generation", () => {
  it("should generate a valid PDF buffer for spam prediction", () => {
    const message = "Click here to win free money! Limited time offer!";
    const prediction = {
      verdict: "spam" as const,
      confidence: 0.95,
      keywords: ["click", "free money", "limited time"],
    };
    const riskSummary = {
      level: "critical" as const,
      score: 95,
      description: "This message is almost certainly spam.",
    };
    const recommendations = [
      {
        title: "Do Not Click Links",
        description: "Avoid clicking any links in this message.",
        icon: "🔗",
      },
    ];

    const buffer = generateSpamDetectionPDF(message, prediction, riskSummary, recommendations);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should generate a valid PDF buffer for ham prediction", () => {
    const message = "Hi, how are you doing today?";
    const prediction = {
      verdict: "ham" as const,
      confidence: 0.98,
      keywords: ["greeting", "personal"],
    };
    const riskSummary = {
      level: "low" as const,
      score: 5,
      description: "This message appears to be legitimate.",
    };
    const recommendations = [
      {
        title: "Safe to Open",
        description: "This message appears to be from a legitimate source.",
        icon: "✅",
      },
    ];

    const buffer = generateSpamDetectionPDF(message, prediction, riskSummary, recommendations);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should handle keywords as objects with word and weight properties", () => {
    const message = "Test message";
    const prediction = {
      verdict: "spam" as const,
      confidence: 0.85,
      keywords: [
        { word: "urgent", weight: 0.9 },
        { word: "click", weight: 0.85 },
        { word: "now", weight: 0.8 },
      ],
    };
    const riskSummary = {
      level: "high" as const,
      score: 80,
      description: "This message is likely spam.",
    };
    const recommendations = [];

    const buffer = generateSpamDetectionPDF(message, prediction, riskSummary, recommendations);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should handle mixed keyword formats (strings and objects)", () => {
    const message = "Test message";
    const prediction = {
      verdict: "spam" as const,
      confidence: 0.9,
      keywords: ["urgent", { word: "click", weight: 0.85 }, "now"],
    };
    const riskSummary = {
      level: "high" as const,
      score: 85,
      description: "This message is likely spam.",
    };
    const recommendations = [];

    const buffer = generateSpamDetectionPDF(message, prediction, riskSummary, recommendations);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should generate PDF with all risk levels", () => {
    const riskLevels = ["critical", "high", "medium", "low"] as const;

    riskLevels.forEach((level) => {
      const buffer = generateSpamDetectionPDF(
        "Test message",
        {
          verdict: "spam",
          confidence: 0.8,
          keywords: ["test"],
        },
        {
          level,
          score: 50,
          description: `Risk level: ${level}`,
        },
        []
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.toString("utf-8", 0, 4)).toBe("%PDF");
    });
  });
});
