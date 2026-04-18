import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createPrediction, getOrCreateAnalytics, updateAnalytics } from "./db";

describe("Spam Prediction System", () => {
  beforeAll(async () => {
    // Initialize analytics record
    const analytics = await getOrCreateAnalytics();
    expect(analytics).toBeDefined();
  });

  it("should create a spam prediction record", async () => {
    const result = await createPrediction({
      message: "Congratulations! You've won a free iPhone. Click here to claim.",
      verdict: "spam",
      confidence: "0.95",
      keywords: JSON.stringify([
        { word: "congratulations", weight: 0.9 },
        { word: "free", weight: 0.85 },
        { word: "click", weight: 0.8 },
      ]),
      messageType: "sms",
    });

    expect(result).toBeDefined();
  });

  it("should create a ham prediction record", async () => {
    const result = await createPrediction({
      message: "Hi, can we meet tomorrow at 3pm?",
      verdict: "ham",
      confidence: "0.98",
      keywords: JSON.stringify([
        { word: "meet", weight: 0.3 },
        { word: "tomorrow", weight: 0.2 },
      ]),
      messageType: "sms",
    });

    expect(result).toBeDefined();
  });

  it("should update analytics counters", async () => {
    const initialAnalytics = await getOrCreateAnalytics();
    expect(initialAnalytics).toBeDefined();

    if (initialAnalytics) {
      const initialTotal = initialAnalytics.totalPredictions;

      await updateAnalytics({
        totalPredictions: initialTotal + 2,
        spamCount: initialAnalytics.spamCount + 1,
        hamCount: initialAnalytics.hamCount + 1,
      });

      const updatedAnalytics = await getOrCreateAnalytics();
      expect(updatedAnalytics?.totalPredictions).toBe(initialTotal + 2);
    }
  });

  it("should retrieve analytics data", async () => {
    const analytics = await getOrCreateAnalytics();

    expect(analytics).toBeDefined();
    expect(analytics?.totalPredictions).toBeGreaterThanOrEqual(0);
    expect(analytics?.spamCount).toBeGreaterThanOrEqual(0);
    expect(analytics?.hamCount).toBeGreaterThanOrEqual(0);
    expect(analytics?.accuracy).toBeDefined();
  });

  it("should parse confidence as a number", async () => {
    const analytics = await getOrCreateAnalytics();

    if (analytics) {
      const accuracy = parseFloat(analytics.accuracy);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    }
  });

  it("should validate verdict values", async () => {
    const spamResult = await createPrediction({
      message: "Test spam message",
      verdict: "spam",
      confidence: "0.9",
      keywords: JSON.stringify([]),
      messageType: "sms",
    });

    const hamResult = await createPrediction({
      message: "Test ham message",
      verdict: "ham",
      confidence: "0.1",
      keywords: JSON.stringify([]),
      messageType: "sms",
    });

    expect(spamResult).toBeDefined();
    expect(hamResult).toBeDefined();
  });
});
