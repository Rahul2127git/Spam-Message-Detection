"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Download, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";

interface PredictionResult {
  verdict: "spam" | "ham";
  confidence: number;
  keywords: Array<{ word: string; weight: number }>;
}

interface BatchResult {
  row: number;
  message: string;
  verdict: "spam" | "ham";
  confidence: number;
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

export default function Detector() {
  const [message, setMessage] = useState("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  // Generate risk summary based on prediction
  const generateRiskSummary = (pred: PredictionResult): RiskSummary => {
    if (pred.verdict === "spam") {
      if (pred.confidence > 0.95) {
        return {
          level: "critical",
          score: 95,
          description: "This message is almost certainly spam. Do not click any links or reply.",
        };
      } else if (pred.confidence > 0.8) {
        return {
          level: "high",
          score: 80,
          description: "This message is likely spam. Exercise caution with any links or attachments.",
        };
      } else {
        return {
          level: "medium",
          score: 60,
          description: "This message shows spam characteristics. Review carefully before interacting.",
        };
      }
    } else {
      if (pred.confidence > 0.95) {
        return {
          level: "low",
          score: 5,
          description: "This message appears to be legitimate. It's safe to interact with.",
        };
      } else if (pred.confidence > 0.8) {
        return {
          level: "low",
          score: 15,
          description: "This message is likely legitimate, but exercise normal caution.",
        };
      } else {
        return {
          level: "medium",
          score: 40,
          description: "This message has mixed characteristics. Review before taking action.",
        };
      }
    }
  };

  // Generate recommendations based on prediction
  const generateRecommendations = (pred: PredictionResult): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    if (pred.verdict === "spam") {
      recommendations.push({
        title: "Do Not Click Links",
        description: "Avoid clicking any links in this message as they may lead to phishing sites or malware.",
        icon: "🔗",
      });
      recommendations.push({
        title: "Do Not Reply",
        description: "Replying confirms your email is active and may result in more spam.",
        icon: "💬",
      });
      recommendations.push({
        title: "Mark as Spam",
        description: "Report this message to your email provider to help improve spam filters.",
        icon: "🚩",
      });
      recommendations.push({
        title: "Delete Immediately",
        description: "Remove this message from your inbox to keep your email clean.",
        icon: "🗑️",
      });
    } else {
      recommendations.push({
        title: "Safe to Open",
        description: "This message appears to be from a legitimate source.",
        icon: "✅",
      });
      recommendations.push({
        title: "Normal Caution",
        description: "Still exercise normal email safety practices with any attachments or links.",
        icon: "⚠️",
      });
      recommendations.push({
        title: "Verify Sender",
        description: "If unexpected, verify the sender's email address matches known contacts.",
        icon: "👤",
      });
    }

    return recommendations;
  };

  // Download report as TXT
  const handleDownloadReport = async () => {
    if (!prediction) {
      toast.error("No prediction to download");
      return;
    }

    try {
      const riskSummary = generateRiskSummary(prediction);
      const recommendations = generateRecommendations(prediction);

      const reportContent = `SPAM MESSAGE DETECTION REPORT
========================================
Generated: ${new Date().toLocaleString()}

MESSAGE CONTENT:
${message}

PREDICTION RESULT:
Verdict: ${prediction.verdict.toUpperCase()}
Confidence: ${(prediction.confidence * 100).toFixed(1)}%

RISK ASSESSMENT:
${riskSummary.description}
Risk Level: ${riskSummary.level.toUpperCase()}
Risk Score: ${riskSummary.score}/100

TOP KEYWORDS:
${prediction.keywords.map((kw) => `- ${kw.word} (${(kw.weight * 100).toFixed(0)}%)`).join("\n")}

PERSONALIZED RECOMMENDATIONS:
${recommendations.map((rec) => `- ${rec.icon} ${rec.title}: ${rec.description}`).join("\n")}

========================================
Report generated by Spam Message Detection System`;

      const blob = new Blob([reportContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spam-report-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report downloaded successfully");
    } catch (error) {
      toast.error("Failed to download report");
      console.error(error);
    }
  };

  const handlePredict = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to analyze");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error("Prediction failed");

      const data = await response.json();
      setPrediction(data);
      toast.success("Prediction completed!");
    } catch (error) {
      toast.error("Failed to get prediction");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/predict/batch", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Batch prediction failed");
      }

      setBatchResults(data.results || []);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Processed ${data.results.length} messages with ${data.errors.length} errors`);
      } else {
        toast.success(`Processed ${data.results.length} messages`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to process batch file";
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchDownload = async () => {
    if (!csvFile) {
      toast.error("Please upload a file first");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const response = await fetch("/api/predict/batch/download", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spam-predictions.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Results downloaded successfully");
    } catch (error) {
      toast.error("Failed to download results");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Spam Detector</h1>
            <p className="text-lg text-muted-foreground">
              Paste your message or email to check if it's spam or legitimate
            </p>
          </div>

          {/* Main Input Section */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Card */}
            <Card>
              <CardHeader>
                <CardTitle>Analyze Message</CardTitle>
                <CardDescription>Enter text to check</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your SMS or email message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-32"
                />
                <Button
                  onClick={handlePredict}
                  disabled={isLoading || !message.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Message"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            {prediction && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Prediction Result Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Prediction Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Verdict Badge */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`px-6 py-3 rounded-lg font-bold text-lg text-white ${
                          prediction.verdict === "spam" ? "bg-secondary" : "bg-green-500"
                        }`}
                      >
                        {prediction.verdict.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-2xl font-bold text-primary">
                          {(prediction.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Confidence Score</p>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ease-out ${
                            prediction.verdict === "spam"
                              ? "bg-gradient-to-r from-secondary to-red-600"
                              : "bg-gradient-to-r from-green-500 to-emerald-600"
                          }`}
                          style={{
                            width: `${prediction.confidence * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Keywords Heatmap */}
                    {prediction.keywords.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Top Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {prediction.keywords.slice(0, 5).map((kw, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-1 rounded-full text-sm font-medium transition-all"
                              style={{
                                backgroundColor: `rgba(0, 194, 255, ${0.3 + kw.weight * 0.7})`,
                                color: "#ffffff",
                              }}
                              title={`Weight: ${(kw.weight * 100).toFixed(0)}%`}
                            >
                              {kw.word}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Risk Summary and Recommendations - Below the grid */}
          {prediction && (
            <div className="grid md:grid-cols-2 gap-8 mt-8 animate-in fade-in duration-500">
              {/* Risk Summary Card */}
              <Card
                className={`border-2 ${
                  generateRiskSummary(prediction).level === "critical"
                    ? "border-red-500"
                    : generateRiskSummary(prediction).level === "high"
                      ? "border-orange-500"
                      : generateRiskSummary(prediction).level === "medium"
                        ? "border-yellow-500"
                        : "border-green-500"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {generateRiskSummary(prediction).level === "critical" ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : generateRiskSummary(prediction).level === "high" ? (
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    Risk Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-4 py-2 rounded-lg font-bold text-white ${
                          generateRiskSummary(prediction).level === "critical"
                            ? "bg-red-600"
                            : generateRiskSummary(prediction).level === "high"
                              ? "bg-orange-600"
                              : generateRiskSummary(prediction).level === "medium"
                                ? "bg-yellow-600"
                                : "bg-green-600"
                        }`}
                      >
                        {generateRiskSummary(prediction).level.toUpperCase()}
                      </div>
                      <div className="text-2xl font-bold">{generateRiskSummary(prediction).score}/100</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assessment</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {generateRiskSummary(prediction).description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Personalized Recommendations Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Personalized Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {generateRecommendations(prediction).map((rec, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl flex-shrink-0">{rec.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{rec.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Download Report Button */}
          {prediction && (
            <div className="mt-8">
              <Button onClick={handleDownloadReport} disabled={isLoading} className="w-full" size="lg">
                <FileText className="w-4 h-4 mr-2" />
                Download Full Report
              </Button>
            </div>
          )}

          {/* Batch Upload Section */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Batch Upload
              </CardTitle>
              <CardDescription>
                Upload a CSV file with any number of messages to analyze. Each row is processed sequentially.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.tsv,.xml"
                  onChange={handleBatchUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer block">
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV, Excel, JSON, TSV, XML • Unlimited rows • Max 10MB file size
                  </p>
                </label>
              </div>

              {batchResults.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Results ({batchResults.length} messages processed)</p>
                    <Button onClick={handleBatchDownload} disabled={isLoading} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-2">Message</th>
                          <th className="text-left py-2 px-2">Verdict</th>
                          <th className="text-left py-2 px-2">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((result, idx) => (
                          <tr key={idx} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2 px-2 truncate text-xs">{result.message.substring(0, 50)}...</td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  result.verdict === "spam"
                                    ? "bg-secondary/20 text-secondary"
                                    : "bg-green-500/20 text-green-500"
                                }`}
                              >
                                {result.verdict.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-2">{(result.confidence * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
