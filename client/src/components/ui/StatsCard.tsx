import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  accentColor?: string; // hex like #3B82F6
  accentBg?: string; // tailwind bg class
  icon?: ReactNode;
  trendLabel?: string;
  progressPercent?: number;
  footerText?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  accentColor = "#3B82F6",
  accentBg = "bg-blue-50",
  icon,
  trendLabel,
  progressPercent,
  footerText,
  className,
}: StatsCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-card shadow-sm p-4 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div
          className={cn("h-12 w-12 rounded-lg flex items-center justify-center", accentBg)}
          style={{ color: accentColor }}
        >
          {icon}
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 leading-tight">{value}</div>

      <div className="flex items-center gap-2">
        {trendLabel && (
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-semibold",
              accentBg,
              "text-gray-800"
            )}
          >
            {trendLabel}
          </span>
        )}
        {footerText && <span className="text-xs text-gray-500">{footerText}</span>}
      </div>

      {typeof progressPercent === "number" && (
        <div className="w-full h-1.5 rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%`, backgroundColor: accentColor }}
          />
        </div>
      )}
    </div>
  );
}

