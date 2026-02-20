/**
 * Donut Card Component (Cluster X Design)
 * Displays a donut chart with header, subheader, center overlay, and bottom legend
 * Fully responsive across all device sizes
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// PROPS INTERFACE
// =============================================================================

export interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

interface DonutCardProps {
  title: string;
  subheader?: string;
  data: DonutChartData[];
  emptyMessage?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DonutCard({ title, subheader, data, emptyMessage }: DonutCardProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
        {/* Header: Title (Left) + Download Icon (Right) */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm sm:text-base font-semibold text-slate-800">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-300 hover:text-slate-500"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Subheader */}
        {subheader && (
          <p className="text-xs text-slate-500 mb-4 sm:mb-6">{subheader}</p>
        )}

        {/* Empty state message with responsive height */}
        <div
          className="flex items-center justify-center min-h-[200px] sm:min-h-[280px] lg:min-h-[320px]"
        >
          <p className="text-gray-400 text-center text-sm sm:text-base">
            {emptyMessage || "No data available"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate total for center display
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
      {/* Header: Title (Left) + Download Icon (Right) */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm sm:text-base font-semibold text-slate-800">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-300 hover:text-slate-500"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Subheader */}
      {subheader && (
        <p className="text-xs text-slate-500 mb-4 sm:mb-6">{subheader}</p>
      )}

      {/* Chart Container with Center Overlay - Responsive height */}
      <div className="relative w-full h-[240px] sm:h-[280px] lg:h-[320px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              cornerRadius={8}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [value, "Count"]}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Overlay: Massive Number + Tiny Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800">{total}</p>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Legend: Responsive flex wrap at bottom with Dot + Label */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 pt-4 border-t border-slate-100">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-600 whitespace-nowrap">
              <span className="hidden sm:inline">{entry.name}: </span>
              <span className="sm:hidden">{entry.name.split(' ')[0]}: </span>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

