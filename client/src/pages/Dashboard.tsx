/**
 * Dashboard Page with Outbound/Inbound toggle and donut charts
 * Data comes from Bolna API executions
 * Fully responsive across all device sizes
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentApi, executionsApi, BolnaExecution } from "@/lib/bolnaApi";
import { callProcessorApi } from "@/api/callProcessorApi";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, LayoutGrid, PhoneCall, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatISO } from "date-fns";
import {
  DateFilter,
  DateRangeFilter,
  getDefaultDateRange,
} from "@/components/dashboard/DateFilter";
import { DonutCard } from "@/components/dashboard/shared/DonutCard";
import { cn } from "@/lib/utils";

// Colors for charts
const COLORS = {
  blue: "#3B82F6",
  red: "#EF4444",
  orange: "#F97316",
  purple: "#8B5CF6",
  green: "#10B981",
  yellow: "#EAB308",
};

type DashboardMode = "outbound" | "inbound";

// Extract intent — prefer LLM-derived intent, fall back to keyword matching
function extractIntent(execution: BolnaExecution, _mode: DashboardMode, llmIntent?: string): string {
  // If we have an LLM-derived intent, use it directly
  if (llmIntent) {
    switch (llmIntent) {
      case "booked":
        return "Booked";
      case "not_interested":
        return "Not Interested";
      case "queries":
      default:
        return "Queries";
    }
  }

  // Fallback: client-side keyword matching
  const data = execution.extracted_data || {};
  const transcript = execution.transcript?.toLowerCase() || "";

  if (data.intent === "not_interested" ||
    transcript.includes("not interested") ||
    transcript.includes("no thanks") ||
    transcript.includes("don't want")) {
    return "Not Interested";
  }
  if (data.intent === "booked" ||
    transcript.includes("book") ||
    transcript.includes("schedule") ||
    transcript.includes("appointment")) {
    return "Booked";
  }
  return "Queries";
}

// Extract call status
function extractCallStatus(execution: BolnaExecution, mode: DashboardMode): string {
  if (mode === "outbound") {
    const status = execution.status;
    const data = execution.extracted_data || {};
    const transcript = execution.transcript?.toLowerCase() || "";

    // Check if call resulted in scheduling/booking
    const isScheduled = data.intent === "booked" ||
      data.intent === "scheduled" ||
      transcript.includes("book") ||
      transcript.includes("schedule") ||
      transcript.includes("appointment");

    // Map statuses to 4 categories
    if (status === "completed") {
      return isScheduled ? "Scheduled" : "Answered";
    } else if (status === "busy") {
      return "Busy";
    } else {
      // Map all other statuses to No-answer (no-answer, failed, call-disconnected, canceled, etc.)
      return "No-answer";
    }
  } else {
    // Inbound - check time
    const hour = new Date(execution.created_at).getHours();
    if (hour >= 9 && hour < 17) {
      return "Office Hours";
    }
    return "Non-Office Hours";
  }
}

// Quick stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{title}</p>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mt-1">{value}</h3>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trendUp ? "text-green-600" : "text-red-600"
            )}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 ml-3">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [mode, setMode] = useState<DashboardMode>("outbound");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(getDefaultDateRange());

  // Fetch all agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentApi.getAll(),
  });

  // Fetch executions with date range filter
  const { data: executionsData, isLoading: executionsLoading } = useQuery({
    queryKey: ["dashboard-executions", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agents || agents.length === 0) return [];
      const allExecutions = await Promise.all(
        agents.slice(0, 10).map((agent) =>
          executionsApi.getByAgent(agent.id, {
            page_size: 100,
            from: formatISO(dateRange.start),
            to: formatISO(dateRange.end),
          })
        )
      );
      return allExecutions.flatMap((r) => r.data || []);
    },
    enabled: !!agents && agents.length > 0,
  });

  // Fetch LLM-processed calls from backend
  const { data: processedCalls = [] } = useQuery({
    queryKey: ["processed-calls"],
    queryFn: callProcessorApi.getProcessedCalls,
    refetchInterval: 5 * 60 * 1000, // refetch every 5 min to stay in sync with auto-polling
  });

  // Build a lookup: execution_id → llm intent
  const llmIntentMap = useMemo(() => {
    const map = new Map<string, string>();
    processedCalls.forEach((c) => {
      if (c.llm_analysis?.intent) {
        map.set(c.call_id, c.llm_analysis.intent);
      }
    });
    return map;
  }, [processedCalls]);

  const isLoading = agentsLoading || executionsLoading;

  // Filter executions by mode and date range
  const filteredExecutions = useMemo(() => {
    if (!executionsData) return [];
    return executionsData.filter((e) => {
      const callType = e.telephony_data?.call_type;
      const modeMatch = mode === "outbound"
        ? callType === "outbound"
        : callType === "inbound";

      if (!modeMatch) return false;

      // Filter by date range
      const executionDate = new Date(e.created_at);
      return executionDate >= dateRange.start && executionDate <= dateRange.end;
    });
  }, [executionsData, mode, dateRange]);

  // Calculate quick stats
  const totalCalls = filteredExecutions.length;
  const completedCalls = filteredExecutions.filter(e => e.status === "completed").length;
  const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  // Calculate chart data — same 3 categories for both modes
  const intentData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredExecutions.forEach((e) => {
      const llmIntent = llmIntentMap.get(e.id);
      const intent = extractIntent(e, mode, llmIntent);
      counts[intent] = (counts[intent] || 0) + 1;
    });

    return [
      { name: "Queries", value: counts["Queries"] || 0, color: COLORS.green },
      { name: "Booked", value: counts["Booked"] || 0, color: COLORS.blue },
      { name: "Not Interested", value: counts["Not Interested"] || 0, color: COLORS.red },
    ];
  }, [filteredExecutions, mode, llmIntentMap]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredExecutions.forEach((e) => {
      const status = extractCallStatus(e, mode);
      counts[status] = (counts[status] || 0) + 1;
    });

    if (mode === "outbound") {
      return [
        {
          name: "Answered",
          value: counts["Answered"] || 0,
          color: COLORS.blue,
        },
        {
          name: "Scheduled",
          value: counts["Scheduled"] || 0,
          color: COLORS.green,
        },
        {
          name: "Busy",
          value: counts["Busy"] || 0,
          color: COLORS.orange,
        },
        {
          name: "No-answer",
          value: counts["No-answer"] || 0,
          color: COLORS.red,
        },
      ];
    } else {
      return [
        {
          name: "Office Hours",
          value: counts["Office Hours"] || 0,
          color: COLORS.green,
        },
        {
          name: "Non-Office Hours",
          value: counts["Non-Office Hours"] || 0,
          color: COLORS.orange,
        },
      ];
    }
  }, [filteredExecutions, mode]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        {/* Left side - Title and description */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {mode === "outbound" ? "Outbound" : "Inbound"} Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {mode === "outbound"
                ? "Real-time analytics and campaign management"
                : "Track incoming calls and lead performance"}
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DateFilter value={dateRange} onChange={setDateRange} />
          <Select
            value={mode}
            onValueChange={(v: string) => setMode(v as DashboardMode)}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="default"
            className="bg-orange-500 hover:bg-orange-600 h-9 sm:h-10 text-xs sm:text-sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Calls"
          value={totalCalls.toLocaleString()}
          icon={PhoneCall}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          title="Completed"
          value={completedCalls.toLocaleString()}
          icon={PhoneCall}
          trend="+8%"
          trendUp={true}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={LayoutGrid}
          trend="+5%"
          trendUp={true}
        />
        <StatCard
          title="Avg Duration"
          value="2:45"
          icon={PhoneCall}
          trend="-3%"
          trendUp={false}
        />
      </div>

      {/* Donut Charts - Responsive grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <DonutCard
          title="Call Intent"
          subheader={mode === "outbound" ? "AI-powered lead intent analysis" : "AI-powered inquiry analysis"}
          data={intentData}
        />
        <DonutCard
          title="Call Status"
          subheader={mode === "outbound" ? "Call outcome breakdown" : "Call timing breakdown"}
          data={statusData}
        />
      </div>
    </div>
  );
}
