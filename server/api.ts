import { Express, Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { createPrediction, getOrCreateAnalytics, updateAnalytics } from "./db";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

const upload = multer({ storage: multer.memoryStorage() });

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

  // Batch prediction endpoint - improved with proper async handling
  app.post("/api/predict/batch", upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const results: any[] = [];
      const errors: any[] = [];
      const rows: any[] = [];

      // First, collect all rows
      const stream = Readable.from([req.file.buffer]);

      return new Promise<void>((resolve) => {
        stream
          .pipe(csv())
          .on("data", (row: any) => {
            rows.push(row);
          })
          .on("end", async () => {
            // Process all rows sequentially to ensure completion
            for (let i = 0; i < rows.length; i++) {
              try {
                const row = rows[i];
                const messageText = row.message || row.text || Object.values(row)[0];

                if (!messageText) {
                  errors.push({ row: i + 1, error: "No message text found" });
                  continue;
                }

                const prediction = await classifyMessage(messageText);

                results.push({
                  row: i + 1,
                  message: messageText.substring(0, 100),
                  verdict: prediction.verdict,
                  confidence: prediction.confidence,
                });

                // Store in database
                await createPrediction({
                  message: messageText,
                  verdict: prediction.verdict,
                  confidence: prediction.confidence.toString(),
                  keywords: JSON.stringify(prediction.keywords),
                  messageType: "sms",
                });
              } catch (error) {
                errors.push({ row: i + 1, error: String(error) });
              }
            }

            // Update analytics once after all predictions
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
      });
    } catch (error) {
      console.error("Batch prediction error:", error);
      res.status(500).json({ error: "Failed to process batch predictions" });
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

  // Batch results download endpoint
  app.post("/api/predict/batch/download", upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const results: any[] = [];
      const rows: any[] = [];

      const stream = Readable.from([req.file.buffer]);

      return new Promise<void>((resolve) => {
        stream
          .pipe(csv())
          .on("data", (row: any) => {
            rows.push(row);
          })
          .on("end", async () => {
            // Process all rows
            for (let i = 0; i < rows.length; i++) {
              try {
                const row = rows[i];
                const messageText = row.message || row.text || Object.values(row)[0];

                if (!messageText) continue;

                const prediction = await classifyMessage(messageText);

                results.push({
                  message: messageText,
                  verdict: prediction.verdict,
                  confidence: (prediction.confidence * 100).toFixed(2) + "%",
                  keywords: prediction.keywords.map((k: any) => k.word).join(", "),
                });

                // Store in database
                await createPrediction({
                  message: messageText,
                  verdict: prediction.verdict,
                  confidence: prediction.confidence.toString(),
                  keywords: JSON.stringify(prediction.keywords),
                  messageType: "sms",
                });
              } catch (error) {
                console.error("Error processing row:", error);
              }
            }

            // Generate CSV response
            if (results.length === 0) {
              res.status(400).json({ error: "No valid messages to process" });
              resolve();
              return;
            }

            const csv_headers = ["message", "verdict", "confidence", "keywords"];
            const csv_rows = results.map((r) =>
              csv_headers
                .map((h) => {
                  const value = r[h as keyof typeof r];
                  // Escape quotes and wrap in quotes if contains comma
                  if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                  }
                  return value;
                })
                .join(",")
            );

            const csv_content = [csv_headers.join(","), ...csv_rows].join("\n");

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=spam-predictions.csv");
            res.send(csv_content);

            resolve();
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
}
