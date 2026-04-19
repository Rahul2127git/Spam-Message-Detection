import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Download } from "lucide-react";
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

export default function Detector() {
  const [message, setMessage] = useState("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

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

      if (!response.ok) throw new Error("Batch prediction failed");

      const data = await response.json();
      setBatchResults(data.results);
      toast.success(`Processed ${data.results.length} messages`);
    } catch (error) {
      toast.error("Failed to process batch file");
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

            {/* Results Card */}
            {prediction && (
              <Card className="animate-in fade-in duration-500">
                <CardHeader>
                  <CardTitle>Prediction Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Verdict Badge */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-6 py-3 rounded-lg font-bold text-lg text-white ${
                        prediction.verdict === "spam"
                          ? "bg-secondary"
                          : "bg-green-500"
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
                              backgroundColor: `rgba(0, 194, 255, ${
                                0.3 + kw.weight * 0.7
                              })`,
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
            )}
          </div>

          {/* Batch Upload Section */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Batch Upload
              </CardTitle>
              <CardDescription>
                Upload a file with messages to analyze multiple items at once. Supports CSV, Excel, JSON, TSV, and XML formats.
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
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer block"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported: CSV, Excel (.xlsx, .xls), JSON, TSV, XML (max 10MB)
                  </p>
                </label>
              </div>

              {batchResults.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        Results ({batchResults.length} messages processed)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Spam: {batchResults.filter(r => r.verdict === 'spam').length} | Ham: {batchResults.filter(r => r.verdict === 'ham').length}
                      </p>
                    </div>
                    <Button
                      onClick={handleBatchDownload}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
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
                            <td className="py-2 px-2 truncate text-xs">
                              {result.message.substring(0, 50)}...
                            </td>
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
                            <td className="py-2 px-2">
                              {(result.confidence * 100).toFixed(1)}%
                            </td>
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
