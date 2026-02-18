import { cn } from "@/lib/utils";

type Status = "success" | "pending" | "error" | "default";

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

const colorMap: Record<Status, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  error: "bg-red-50 text-red-700 border border-red-200",
  default: "bg-gray-100 text-gray-700 border border-gray-200",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        colorMap[status] ?? colorMap.default,
        className
      )}
    >
      {label || status}
    </span>
  );
}

