import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, 
  XAxis, 
  YAxis, 
  Bar, 
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  Legend 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  DollarSign,
  Activity,
  PieChart,
  Scale
} from "lucide-react";

interface FinancialMetrics {
  quickRatio: number;
  currentRatio: number;
  workingCapital: number;
  debtToEquity: number;
  netProfitMargin: number;
  returnOnAssets: number;
}

interface Stats {
  totalTransactions: number;
  analyzedTransactions: number;
  predictionAccuracy: number;
  monthlyVolume: Array<{
    month: string;
    count: number;
  }>;
}

interface ForecastData {
  month: string;
  projected: number;
  actual: number;
}

export function Home() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: metrics } = useQuery<FinancialMetrics>({
    queryKey: ["/api/financial-metrics"],
  });

  const { data: forecast } = useQuery<ForecastData[]>({
    queryKey: ["/api/expense-forecast"],
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Financial Dashboard</h1>

      {/* Financial Health Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Ratio</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.quickRatio?.toFixed(2) ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Measures ability to pay short-term obligations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Ratio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.currentRatio?.toFixed(2) ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current assets to current liabilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Working Capital</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.workingCapital 
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact'
                  }).format(metrics.workingCapital)
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Available operating liquidity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Debt to Equity</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.debtToEquity?.toFixed(2) ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Financial leverage and risk
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Performance */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Expense Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast ?? []}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyVolume ?? []}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {metrics?.netProfitMargin > 0.15 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span>Net Profit Margin: {(metrics?.netProfitMargin * 100)?.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              {metrics?.returnOnAssets > 0.1 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span>Return on Assets: {(metrics?.returnOnAssets * 100)?.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              {metrics?.quickRatio < 1 && (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500">Quick ratio below recommended level</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
