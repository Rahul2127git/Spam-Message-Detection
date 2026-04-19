import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, BarChart3, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface DemoResult {
  verdict: "spam" | "ham";
  confidence: number;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [demoMessage, setDemoMessage] = useState("");
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoPredict = async () => {
    if (!demoMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: demoMessage }),
      });

      if (!response.ok) throw new Error("Prediction failed");

      const data = await response.json();
      setDemoResult(data);
    } catch (error) {
      toast.error("Failed to get prediction");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-block mb-6">
              <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <p className="text-sm font-medium text-primary">
                  AI-Powered Spam Detection
                </p>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Detect Spam with{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                95%+ Accuracy
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              SpamShield AI uses advanced machine learning to instantly classify SMS and email messages. Protect your inbox from unwanted messages.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setLocation("/detector")}
              >
                Try Detector
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setLocation("/about")}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Demo Box */}
          <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6">Try It Now</h2>

              <div className="space-y-4">
                <Textarea
                  placeholder="Paste a message or email to test... (e.g., 'Congratulations! You've won a free iPhone. Click here to claim your prize!')"
                  value={demoMessage}
                  onChange={(e) => setDemoMessage(e.target.value)}
                  className="min-h-24"
                />

                <Button
                  onClick={handleDemoPredict}
                  disabled={isLoading || !demoMessage.trim()}
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

                {demoResult && (
                  <div className="mt-6 p-4 bg-muted rounded-lg border border-border animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Prediction Result
                        </p>
                        <p className="text-lg font-semibold">
                          {demoResult.verdict === "spam" ? "🚨 SPAM" : "✓ LEGITIMATE"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">
                          Confidence
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {(demoResult.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            Powerful Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Real-Time Detection</h3>
                <p className="text-muted-foreground">
                  Instant spam classification with confidence scores powered by advanced ML models.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Batch Processing</h3>
                <p className="text-muted-foreground">
                  Upload CSV files to analyze multiple messages at once. Perfect for large-scale filtering.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Track model performance, view confusion matrices, and monitor prediction trends.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features */}
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Keyword Highlighting</h4>
                <p className="text-sm text-muted-foreground">
                  See which keywords influenced the spam/ham decision
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">95%+ Accuracy</h4>
                <p className="text-sm text-muted-foreground">
                  Trained on combined datasets with rigorous validation
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">REST API</h4>
                <p className="text-sm text-muted-foreground">
                  Integrate spam detection into your own applications
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Dark/Light Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Comfortable viewing in any lighting condition
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Shield Your Inbox?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start detecting spam instantly. No signup required for the demo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/detector")}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/dashboard")}
            >
              View Analytics
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>
            SpamShield AI © 2026. Powered by advanced machine learning and LLM technology.
          </p>
        </div>
      </footer>
    </div>
  );
}
