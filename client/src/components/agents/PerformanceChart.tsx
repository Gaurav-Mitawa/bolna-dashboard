import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PerformanceMetric } from "@/api/analytics";

interface PerformanceChartProps {
  metrics?: PerformanceMetric[];
}

const defaultMetrics = [
  { name: "Resolution Rate", value: 0 },
  { name: "Customer Satisfaction", value: 0 },
  { name: "Response Time", value: 0 },
  { name: "Accuracy", value: 0 },
];

export function PerformanceChart({ metrics }: PerformanceChartProps) {
  // Transform metrics for chart (use default if none provided)
  const performanceData = metrics && metrics.length > 0
    ? metrics.map((m) => ({
        metric: m.label,
        value: m.value,
      }))
    : defaultMetrics;

  return (
    <div className="h-72 flex items-center justify-center">
      <ResponsiveContainer width="92%" height="90%">
        <BarChart
          data={performanceData}
          layout="vertical"
          margin={{ top: 8, right: 8, bottom: 8, left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <YAxis
            type="category"
            dataKey="metric"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            width={120}
          />
          <Tooltip />
          <Bar
            dataKey="value"
            fill="#F97316"
            radius={[0, 6, 6, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


