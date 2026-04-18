import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { createPrediction, getOrCreateAnalytics, updateAnalytics } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Spam prediction router
  spam: router({
    predict: publicProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { message } = input;

        try {
          // Use LLM to classify the message
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a spam detection expert. Analyze the following message and determine if it is spam or legitimate (ham). 
                
Respond with a JSON object containing:
- verdict: "spam" or "ham"
- confidence: a number between 0 and 1 representing your confidence
- keywords: an array of top 5 keywords that influenced your decision, each with a weight between 0 and 1

Example response:
{
  "verdict": "spam",
  "confidence": 0.95,
  "keywords": [
    {"word": "free", "weight": 0.9},
    {"word": "click", "weight": 0.85},
    {"word": "prize", "weight": 0.8},
    {"word": "congratulations", "weight": 0.75},
    {"word": "limited", "weight": 0.7}
  ]
}`,
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
                      description: "Whether the message is spam or legitimate",
                    },
                    confidence: {
                      type: "number",
                      description: "Confidence score between 0 and 1",
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
                      description: "Top keywords influencing the decision",
                    },
                  },
                  required: ["verdict", "confidence", "keywords"],
                  additionalProperties: false,
                },
              },
            },
          });

          // Parse the LLM response
          const message_content = response.choices[0]?.message?.content;
          if (!message_content || typeof message_content !== 'string') throw new Error("No response from LLM");

          const result = JSON.parse(message_content);

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

          return {
            verdict: result.verdict,
            confidence: result.confidence,
            keywords: result.keywords,
          };
        } catch (error) {
          console.error("Prediction error:", error);
          throw new Error("Failed to predict spam classification");
        }
      }),
  }),

  // Analytics router
  analytics: router({
    getStats: publicProcedure.query(async () => {
      try {
        const stats = await getOrCreateAnalytics();
        if (!stats) {
          return {
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
          };
        }

        return {
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
        };
      } catch (error) {
        console.error("Analytics error:", error);
        throw new Error("Failed to fetch analytics");
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
