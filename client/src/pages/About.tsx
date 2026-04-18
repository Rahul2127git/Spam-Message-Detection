import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About SpamShield AI</h1>
          <p className="text-lg text-muted-foreground">
            Learn about our datasets, methodology, and machine learning pipeline
          </p>
        </div>

        {/* Datasets Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Datasets Used</CardTitle>
            <CardDescription>
              Combining multiple authoritative sources for robust training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">UCI SMS Spam Collection</h3>
                  <p className="text-sm text-muted-foreground">
                    ~5,574 SMS messages labeled as spam or ham. This is a foundational dataset widely used in spam detection research.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Large SMS Datasets</h3>
                  <p className="text-sm text-muted-foreground">
                    Multiple large SMS collections (~10k, ~76k messages) from Kaggle and research repositories, covering diverse spam patterns.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Kaggle Email Datasets</h3>
                  <p className="text-sm text-muted-foreground">
                    Email spam collections (~83k, ~190k messages) providing comprehensive email spam examples and legitimate messages.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Spambase Dataset</h3>
                  <p className="text-sm text-muted-foreground">
                    Classic UCI Spambase dataset with 4,601 emails and 57 features, representing real-world email spam characteristics.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ML Pipeline Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Machine Learning Pipeline</CardTitle>
            <CardDescription>
              Our end-to-end process for training and deploying the spam classifier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold mb-2">1. Data Collection & Preprocessing</h3>
                <p className="text-sm text-muted-foreground">
                  We combine multiple datasets and apply rigorous preprocessing: text lowercasing, special character removal, HTML tag stripping, and URL normalization. Duplicate messages are removed to ensure data quality.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold mb-2">2. Feature Engineering</h3>
                <p className="text-sm text-muted-foreground">
                  We use TF-IDF (Term Frequency-Inverse Document Frequency) vectorization to convert text into numerical features. This captures the importance of words in distinguishing spam from legitimate messages.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold mb-2">3. Model Training</h3>
                <p className="text-sm text-muted-foreground">
                  We employ advanced classification algorithms including Logistic Regression, Support Vector Machines (SVM), and transformer-based models to achieve 95%+ accuracy. The model is trained on 80% of the data with stratified sampling.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold mb-2">4. Validation & Testing</h3>
                <p className="text-sm text-muted-foreground">
                  We use k-fold cross-validation (k=5) to ensure robust performance estimates. The remaining 20% test set is used for final evaluation, reporting accuracy, precision, recall, and F1-score.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold mb-2">5. Model Deployment</h3>
                <p className="text-sm text-muted-foreground">
                  The trained model and vectorizer are serialized and deployed in our backend. Real-time predictions are served via REST API with sub-second latency.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold mb-2">6. Continuous Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  We track prediction metrics, user feedback, and model drift to ensure consistent performance over time. Analytics are available on the Dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Performance Metrics</CardTitle>
            <CardDescription>
              Key indicators of model effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-primary">95%+</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Correctly classified messages
                </p>
              </div>

              <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                <p className="text-sm text-muted-foreground mb-1">Precision</p>
                <p className="text-3xl font-bold text-secondary">94%+</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Spam predictions that are correct
                </p>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-muted-foreground mb-1">Recall</p>
                <p className="text-3xl font-bold text-green-500">96%+</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Actual spam messages detected
                </p>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-muted-foreground mb-1">F1-Score</p>
                <p className="text-3xl font-bold text-blue-500">95%+</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Balanced performance metric
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Technology Stack</CardTitle>
            <CardDescription>
              Tools and frameworks powering SpamShield AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Backend</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Python with scikit-learn
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    TF-IDF Vectorization
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    LLM-powered predictions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Express.js API Server
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Frontend</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    React 19
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Tailwind CSS 4
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Recharts for visualization
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Swiss Typography design
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
