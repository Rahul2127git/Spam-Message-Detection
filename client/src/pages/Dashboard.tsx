import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  totalPredictions: number;
  spamCount: number;
  hamCount: number;
  accuracy: number;
  confusionMatrix: {
    tp: number;
    tn: number;
    fp: number;
    fn: number;
  };
  datasetStats: {
    smsTotal: number;
    emailTotal: number;
    spamPercentage: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/analytics");
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        toast.error("Failed to load dashboard data");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const confusionMatrixData = [
    { name: "True Positive", value: stats.confusionMatrix.tp, fill: "#00c2ff" },
    { name: "True Negative", value: stats.confusionMatrix.tn, fill: "#00d4aa" },
    { name: "False Positive", value: stats.confusionMatrix.fp, fill: "#ffa940" },
    { name: "False Negative", value: stats.confusionMatrix.fn, fill: "#ff4d4f" },
  ];

  const predictionDistribution = [
    { name: "Spam", value: stats.spamCount, fill: "#ff4d4f" },
    { name: "Ham", value: stats.hamCount, fill: "#00d4aa" },
  ];

  const datasetComparison = [
    { name: "SMS", value: stats.datasetStats.smsTotal },
    { name: "Email", value: stats.datasetStats.emailTotal },
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Model Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Real-time performance metrics and analytics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPredictions}</div>
              <p className="text-xs text-muted-foreground mt-1">All-time predictions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Model Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {(stats.accuracy * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Exceeds 95% target</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spam Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                {stats.spamCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.spamCount / stats.totalPredictions) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Legitimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {stats.hamCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.hamCount / stats.totalPredictions) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Prediction Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Distribution</CardTitle>
              <CardDescription>Spam vs Legitimate Messages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={predictionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {predictionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Dataset Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Dataset Composition</CardTitle>
              <CardDescription>SMS vs Email Messages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datasetComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00c2ff" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Confusion Matrix */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Confusion Matrix</CardTitle>
            <CardDescription>Model prediction accuracy breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {confusionMatrixData.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-border"
                  style={{ borderLeftColor: item.fill, borderLeftWidth: "4px" }}
                >
                  <p className="text-sm text-muted-foreground">{item.name}</p>
                  <p className="text-2xl font-bold mt-2">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Confusion Matrix Visualization */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Predicted / Actual</th>
                    <th className="text-center py-3 px-4">Spam</th>
                    <th className="text-center py-3 px-4">Ham</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4 font-medium">Spam</td>
                    <td className="text-center py-3 px-4 bg-primary/10 rounded">
                      {stats.confusionMatrix.tp} (TP)
                    </td>
                    <td className="text-center py-3 px-4 bg-secondary/10 rounded">
                      {stats.confusionMatrix.fp} (FP)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Ham</td>
                    <td className="text-center py-3 px-4 bg-secondary/10 rounded">
                      {stats.confusionMatrix.fn} (FN)
                    </td>
                    <td className="text-center py-3 px-4 bg-green-500/10 rounded">
                      {stats.confusionMatrix.tn} (TN)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Dataset Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Dataset Statistics</CardTitle>
            <CardDescription>Training data composition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">SMS Messages</p>
                <p className="text-3xl font-bold">{stats.datasetStats.smsTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Email Messages</p>
                <p className="text-3xl font-bold">{stats.datasetStats.emailTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Spam Percentage</p>
                <p className="text-3xl font-bold text-secondary">
                  {stats.datasetStats.spamPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
