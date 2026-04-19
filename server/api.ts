import { Express, Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { createPrediction, getOrCreateAnalytics, updateAnalytics } from "./db";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import * as xml2js from "xml2js";

const upload = multer({ storage: multer.memoryStorage() });

// Parallel processing limit to avoid overwhelming the LLM
const PARALLEL_LIMIT = 3;

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

// Extract rows from different file formats
async function extractRowsFromFile(
  buffer: Buffer,
  filename: string
): Promise<any[]> {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "csv":
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from([buffer]);
        stream
          .pipe(csv())
          .on("data", (row) => results.push(row))
          .on("end", () => resolve(results))
          .on("error", reject);
      });

    case "xlsx":
    case "xls":
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet);

    case "json":
      const jsonData = JSON.parse(buffer.toString("utf-8"));
      return Array.isArray(jsonData) ? jsonData : [jsonData];

    case "tsv":
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from([buffer]);
        stream
          .pipe(csv({ separator: "\t" }))
          .on("data", (row) => results.push(row))
          .on("end", () => resolve(results))
          .on("error", reject);
      });

    case "xml":
      const parser = new xml2js.Parser();
      const parsed = await parser.parseStringPromise(buffer.toString("utf-8"));
      const records = parsed.root?.record || [];
      return Array.isArray(records) ? records : [records];

    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

// Process rows with parallel limit for speed
async function processRowsInParallel(
  rows: any[],
  callback: (row: any, index: number) => Promise<any>
) {
  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < rows.length; i += PARALLEL_LIMIT) {
    const batch = rows.slice(i, i + PARALLEL_LIMIT);
    const promises = batch.map((row, idx) =>
      callback(row, i + idx).catch((error) => ({
        error,
        index: i + idx,
      }))
    );

    const batchResults = await Promise.all(promises);

    for (const result of batchResults) {
      if (result && "error" in result) {
        errors.push({ row: result.index + 1, error: String(result.error) });
      } else if (result) {
        results.push(result);
      }
    }
  }

  return { results, errors };
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

  // Optimized batch prediction endpoint with multi-format support
  app.post("/api/predict/batch", upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Extract rows from file based on format
      let rows: any[] = [];
      try {
        rows = await extractRowsFromFile(req.file.buffer, req.file.originalname);
      } catch (error) {
        return res.status(400).json({
          error: "Failed to parse file",
          details: String(error),
          supportedFormats: ["CSV", "XLSX", "XLS", "JSON", "TSV", "XML"],
        });
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: "No data found in file" });
      }

      // Process rows in parallel with limit
      const { results, errors } = await processRowsInParallel(
        rows,
        async (row, index) => {
          const messageText = row.message || row.text || row.content || Object.values(row)[0];

          if (!messageText) {
            throw new Error("No message text found");
          }

          const prediction = await classifyMessage(String(messageText));

          // Store in database
          await createPrediction({
            message: String(messageText),
            verdict: prediction.verdict,
            confidence: prediction.confidence.toString(),
            keywords: JSON.stringify(prediction.keywords),
            messageType: "sms",
          });

          return {
            row: index + 1,
            message: String(messageText).substring(0, 100),
            verdict: prediction.verdict,
            confidence: prediction.confidence,
          };
        }
      );

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
        supportedFormats: ["CSV", "XLSX", "XLS", "JSON", "TSV", "XML"],
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

      // Extract rows from file
      let rows: any[] = [];
      try {
        rows = await extractRowsFromFile(req.file.buffer, req.file.originalname);
      } catch (error) {
        return res.status(400).json({ error: "Failed to parse file" });
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: "No data found in file" });
      }

      // Process rows in parallel
      const { results } = await processRowsInParallel(
        rows,
        async (row, index) => {
          const messageText = row.message || row.text || row.content || Object.values(row)[0];

          if (!messageText) {
            throw new Error("No message text found");
          }

          const prediction = await classifyMessage(String(messageText));

          return {
            row: index + 1,
            message: String(messageText).substring(0, 100),
            verdict: prediction.verdict,
            confidence: prediction.confidence.toFixed(4),
          };
        }
      );

      // Generate CSV
      const csvContent = [
        "Row,Message,Verdict,Confidence",
        ...results.map((r) => `${r.row},"${r.message}",${r.verdict},${r.confidence}`),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=spam-predictions.csv");
      res.send(csvContent);
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
