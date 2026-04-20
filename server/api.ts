import { Express, Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { createPrediction, getOrCreateAnalytics, updateAnalytics } from "./db";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

const upload = multer({ storage: multer.memoryStorage() });
const MAX_BATCH_SIZE = 20; // Reduced to prevent timeout
const REQUEST_TIMEOUT = 600000; // 10 minutes timeout

async function classifyMessage(message: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a spam detection expert. Analyze the following message and determine if it is spam or legitimate (ham). 
          
Respond with a JSON object containing:
- verdict: "spam" or "ham"
- confidence: a number between 0 and 1 representing your confidence
- keywords: an array of top 5 keywords that influenced your decision, each with a weight between 0 and 1`,
        },
        {
          role: "user",
          content: `Analyze this message: "${message}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "spam_detection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              verdict: {
                type: "string",
                enum: ["spam", "ham"],
              },
              confidence: {
                type: "number",
              },
              keywords: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    weight: { type: "number" },
                  },
                  required: ["word", "weight"],
                },
              },
            },
            required: ["verdict", "confidence", "keywords"],
            additionalProperties: false,
          },
        },
      },
    });

    const message_content = response.choices[0]?.message?.content;
    if (!message_content || typeof message_content !== "string") {
      throw new Error("No response from LLM");
    }

    return JSON.parse(message_content);
  } catch (error) {
    console.error("Classification error:", error);
    throw error;
  }
}

export function registerAPIRoutes(app: Express) {
  // Single message prediction endpoint
  app.post("/api/predict", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const result = await classifyMessage(message);

      // Store prediction in database
      await createPrediction({
        message,
        verdict: result.verdict,
        confidence: result.confidence.toString(),
        keywords: JSON.stringify(result.keywords),
        messageType: "sms",
      });

      // Update analytics
      const currentAnalytics = await getOrCreateAnalytics();
      if (currentAnalytics) {
        const updates = {
          totalPredictions: currentAnalytics.totalPredictions + 1,
          spamCount:
            result.verdict === "spam"
              ? currentAnalytics.spamCount + 1
              : currentAnalytics.spamCount,
          hamCount:
            result.verdict === "ham"
              ? currentAnalytics.hamCount + 1
              : currentAnalytics.hamCount,
        };
        await updateAnalytics(updates);
      }

      res.json({
        verdict: result.verdict,
        confidence: result.confidence,
        keywords: result.keywords,
      });
    } catch (error) {
      console.error("Prediction error:", error);
      res.status(500).json({ error: "Failed to predict spam classification" });
    }
  });

  // Simplified batch prediction endpoint - CSV only, sequential processing
  app.post("/api/predict/batch", upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Set longer timeout for batch processing
      req.setTimeout(REQUEST_TIMEOUT);
      res.setTimeout(REQUEST_TIMEOUT);

      const results: any[] = [];
      const errors: any[] = [];

      return new Promise<void>((resolve) => {
        const stream = Readable.from([req.file.buffer]);

        stream
          .pipe(csv())
          .on("data", (row: any) => {
            // Collect rows but don't process yet
          })
          .on("end", async () => {
            // Re-parse to get rows
            const rows: any[] = [];
            const stream2 = Readable.from([req.file.buffer]);

            stream2
              .pipe(csv())
              .on("data", (row: any) => {
                rows.push(row);
              })
              .on("end", async () => {
                // Check batch size
                if (rows.length > MAX_BATCH_SIZE) {
                  res.status(400).json({
                    error: "Batch too large",
                    details: `Maximum ${MAX_BATCH_SIZE} rows allowed. Got ${rows.length} rows. Please split into smaller files.`,
                    maxSize: MAX_BATCH_SIZE,
                  });
                  resolve();
                  return;
                }

                // Process rows sequentially
                for (let i = 0; i < rows.length; i++) {
                  try {
                    const row = rows[i];
                    const messageText = row.message || row.text || row.content || Object.values(row)[0];

                    if (!messageText) {
                      errors.push({ row: i + 1, error: "No message text found" });
                      continue;
                    }

                    const prediction = await classifyMessage(String(messageText));

                    results.push({
                      row: i + 1,
                      message: String(messageText).substring(0, 100),
                      verdict: prediction.verdict,
                      confidence: prediction.confidence,
                    });

                    // Store in database
                    await createPrediction({
                      message: String(messageText),
                      verdict: prediction.verdict,
                      confidence: prediction.confidence.toString(),
                      keywords: JSON.stringify(prediction.keywords),
                      messageType: "sms",
                    });
                  } catch (error) {
                    errors.push({ row: i + 1, error: String(error) });
                  }
                }

                // Update analytics
                const currentAnalytics = await getOrCreateAnalytics();
                if (currentAnalytics && results.length > 0) {
                  const spamCount = results.filter((r) => r.verdict === "spam").length;
                  const hamCount = results.filter((r) => r.verdict === "ham").length;

                  await updateAnalytics({
                    totalPredictions: currentAnalytics.totalPredictions + results.length,
                    spamCount: currentAnalytics.spamCount + spamCount,
                    hamCount: currentAnalytics.hamCount + hamCount,
                  });
                }

                res.json({
                  results,
                  errors,
                  count: results.length,
                  errorCount: errors.length,
                  maxBatchSize: MAX_BATCH_SIZE,
                });
                resolve();
              })
              .on("error", (error: any) => {
                console.error("CSV parsing error:", error);
                res.status(400).json({
                  error: "Failed to parse CSV file",
                  details: error.message,
                });
                resolve();
              });
          })
          .on("error", (error: any) => {
            console.error("CSV parsing error:", error);
            res.status(400).json({
              error: "Failed to parse CSV file",
              details: error.message,
            });
            resolve();
          });
      });
    } catch (error) {
      console.error("Batch prediction error:", error);
      res.status(500).json({ error: "Failed to process batch predictions" });
    }
  });

  // Download batch results as CSV
  app.post("/api/predict/batch/download", upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      req.setTimeout(REQUEST_TIMEOUT);
      res.setTimeout(REQUEST_TIMEOUT);

      const results: any[] = [];

      return new Promise<void>((resolve) => {
        const stream = Readable.from([req.file.buffer]);

        stream
          .pipe(csv())
          .on("data", () => {
            // Placeholder
          })
          .on("end", async () => {
            // Re-parse to get rows
            const rows: any[] = [];
            const stream2 = Readable.from([req.file.buffer]);

            stream2
              .pipe(csv())
              .on("data", (row: any) => {
                rows.push(row);
              })
              .on("end", async () => {
                // Check batch size
                if (rows.length > MAX_BATCH_SIZE) {
                  res.status(400).json({
                    error: "Batch too large",
                    details: `Maximum ${MAX_BATCH_SIZE} rows allowed.`,
                  });
                  resolve();
                  return;
                }

                // Process rows
                for (let i = 0; i < rows.length; i++) {
                  try {
                    const row = rows[i];
                    const messageText = row.message || row.text || row.content || Object.values(row)[0];

                    if (!messageText) continue;

                    const prediction = await classifyMessage(String(messageText));

                    results.push({
                      row: i + 1,
                      message: String(messageText).substring(0, 100),
                      verdict: prediction.verdict,
                      confidence: prediction.confidence.toFixed(4),
                    });
                  } catch (error) {
                    // Skip errors in download
                  }
                }

                // Generate CSV
                const csvContent = [
                  "Row,Message,Verdict,Confidence",
                  ...results.map((r) => `${r.row},"${r.message.replace(/"/g, '""')}",${r.verdict},${r.confidence}`),
                ].join("\n");

                res.setHeader("Content-Type", "text/csv");
                res.setHeader("Content-Disposition", "attachment; filename=spam-predictions.csv");
                res.send(csvContent);
                resolve();
              })
              .on("error", (error: any) => {
                console.error("CSV parsing error:", error);
                res.status(400).json({ error: "Failed to parse CSV file" });
                resolve();
              });
          })
          .on("error", (error: any) => {
            console.error("CSV parsing error:", error);
            res.status(400).json({ error: "Failed to parse CSV file" });
            resolve();
          });
      });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to generate download" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", async (req: Request, res: Response) => {
    try {
      const stats = await getOrCreateAnalytics();

      if (!stats) {
        return res.json({
          totalPredictions: 0,
          spamCount: 0,
          hamCount: 0,
          accuracy: 0.95,
          confusionMatrix: {
            tp: 0,
            tn: 0,
            fp: 0,
            fn: 0,
          },
          datasetStats: {
            smsTotal: 0,
            emailTotal: 0,
            spamPercentage: 0,
          },
        });
      }

      res.json({
        totalPredictions: stats.totalPredictions,
        spamCount: stats.spamCount,
        hamCount: stats.hamCount,
        accuracy: parseFloat(stats.accuracy),
        confusionMatrix: {
          tp: stats.truePositives,
          tn: stats.trueNegatives,
          fp: stats.falsePositives,
          fn: stats.falseNegatives,
        },
        datasetStats: {
          smsTotal: stats.smsTotal,
          emailTotal: stats.emailTotal,
          spamPercentage: parseFloat(stats.spamPercentage),
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
}
